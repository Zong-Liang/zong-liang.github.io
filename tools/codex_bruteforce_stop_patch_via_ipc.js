const net = require("net");
const crypto = require("crypto");

const PIPE_PATH = String.raw`\\.\pipe\codex-ipc`;
const REQUEST_TIMEOUT_MS = 12000;

const FIX_PLAN = [
  {
    conversationId: "019cd1c3-10eb-75d2-be97-1de187b52f81",
    candidateTurnIndexes: [6, 7, 8, 9, 10, 11, 12],
  },
  {
    conversationId: "019cd240-830f-77f2-bcc8-3ecd36539735",
    candidateTurnIndexes: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    conversationId: "019cc897-51a1-7320-927c-0d662300bc1f",
    candidateTurnIndexes: [178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195],
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CodexIpcClient {
  constructor(pipePath) {
    this.pipePath = pipePath;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
    this.clientId = "initializing-client";
  }

  async connect() {
    if (this.socket) {
      return;
    }

    await new Promise((resolve, reject) => {
      const socket = net.createConnection(this.pipePath, () => {
        this.socket = socket;
        resolve();
      });

      socket.on("data", (chunk) => this.handleData(chunk));
      socket.on("error", reject);
      socket.on("close", () => {
        for (const [requestId, pending] of this.pending.entries()) {
          clearTimeout(pending.timer);
          pending.reject(new Error("IPC connection closed"));
          this.pending.delete(requestId);
        }
        this.socket = null;
      });
    });

    const initResponse = await this.sendRequest("initialize", {
      clientType: "external-stop-patcher",
    });

    if (initResponse.resultType !== "success") {
      throw new Error(`IPC initialize failed: ${initResponse.error || "unknown"}`);
    }

    this.clientId = initResponse.result?.clientId || this.clientId;
  }

  dispose() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 4) {
      const frameLength = this.buffer.readUInt32LE(0);
      if (this.buffer.length < 4 + frameLength) {
        return;
      }

      const frame = this.buffer.subarray(4, 4 + frameLength);
      this.buffer = this.buffer.subarray(4 + frameLength);

      let message;
      try {
        message = JSON.parse(frame.toString("utf8"));
      } catch (error) {
        console.warn("[codex-ipc] Failed to parse frame:", error.message);
        continue;
      }

      this.handleMessage(message);
    }
  }

  handleMessage(message) {
    if (message.type === "response" && typeof message.requestId === "string") {
      const pending = this.pending.get(message.requestId);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timer);
      this.pending.delete(message.requestId);
      pending.resolve(message);
      return;
    }

    if (message.type === "client-discovery-request") {
      this.writeFrame({
        type: "client-discovery-response",
        requestId: message.requestId,
        response: { canHandle: false },
      });
    }
  }

  async sendRequest(method, params, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    if (!this.socket || !this.socket.writable) {
      throw new Error("IPC socket is not connected");
    }

    const requestId = crypto.randomUUID();
    const payload = {
      type: "request",
      requestId,
      sourceClientId: this.clientId,
      version: 0,
      method,
      params,
    };

    const responsePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });
    });

    this.writeFrame(payload);
    return responsePromise;
  }

  sendBroadcast(method, params, version = 0) {
    this.writeFrame({
      type: "broadcast",
      method,
      sourceClientId: this.clientId,
      params,
      version,
    });
  }

  writeFrame(payload) {
    if (!this.socket || !this.socket.writable) {
      throw new Error("IPC socket is not connected");
    }

    const json = Buffer.from(JSON.stringify(payload), "utf8");
    const frame = Buffer.allocUnsafe(4 + json.length);
    frame.writeUInt32LE(json.length, 0);
    json.copy(frame, 4);
    this.socket.write(frame);
  }
}

async function sendPatch(client, conversationId, patch) {
  client.sendBroadcast(
    "thread-stream-state-changed",
    {
      conversationId,
      change: {
        type: "patches",
        patches: [patch],
      },
    },
    4
  );
}

async function main() {
  const client = new CodexIpcClient(PIPE_PATH);

  try {
    await client.connect();
    console.log(`[codex-ipc] connected as ${client.clientId}`);

    for (const fix of FIX_PLAN) {
      await sendPatch(client, fix.conversationId, {
        op: "replace",
        path: ["resumeState"],
        value: "resumed",
      });

      await sendPatch(client, fix.conversationId, {
        op: "replace",
        path: ["updatedAt"],
        value: Date.now(),
      });

      for (const turnIndex of fix.candidateTurnIndexes) {
        await sendPatch(client, fix.conversationId, {
          op: "replace",
          path: ["turns", turnIndex, "status"],
          value: "interrupted",
        });

        console.log(
          `[codex-ipc] patched ${fix.conversationId} -> turns[${turnIndex}].status = interrupted`
        );

        await wait(60);
      }
    }

    console.log("");
    console.log("Bruteforce stop patch finished.");
    console.log("Go back to Codex and press Ctrl+R once.");
    console.log("If the open thread still shows Stop, tell me which one is still visible after refresh.");
  } finally {
    client.dispose();
  }
}

main().catch((error) => {
  console.error("[codex-ipc] fatal:", error.message);
  process.exitCode = 1;
});
