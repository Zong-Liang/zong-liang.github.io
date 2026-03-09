const net = require("net");
const crypto = require("crypto");

const PIPE_PATH = String.raw`\\.\pipe\codex-ipc`;

const DEFAULT_THREAD_IDS = [
  "019cd1c3-10eb-75d2-be97-1de187b52f81",
  "019cc897-51a1-7320-927c-0d662300bc1f",
  "019cd240-830f-77f2-bcc8-3ecd36539735",
  "019cd253-596b-7311-a1fe-2bf19f000664",
];

const REQUEST_TIMEOUT_MS = 12000;

function parseArgs(argv) {
  const args = {
    rounds: 3,
    delayMs: 1500,
    initOnly: false,
    threadIds: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part === "--init-only") {
      args.initOnly = true;
      continue;
    }

    if (part === "--rounds") {
      args.rounds = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (part === "--delay-ms") {
      args.delayMs = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (part === "--thread") {
      args.threadIds.push(String(argv[i + 1]));
      i += 1;
    }
  }

  if (!Number.isFinite(args.rounds) || args.rounds < 1) {
    throw new Error("--rounds must be a positive number");
  }

  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number");
  }

  return args;
}

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
      clientType: "external-fixer",
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

    if (message.type === "broadcast") {
      if (message.method === "client-status-changed") {
        return;
      }

      console.log("[codex-ipc] broadcast:", JSON.stringify(message));
      return;
    }

    if (message.type === "client-discovery-request") {
      this.writeFrame({
        type: "client-discovery-response",
        requestId: message.requestId,
        response: {
          canHandle: false,
        },
      });
      return;
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

      this.pending.set(requestId, {
        resolve,
        reject,
        timer,
      });
    });

    this.writeFrame(payload);
    return responsePromise;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new CodexIpcClient(PIPE_PATH);

  try {
    await client.connect();
    console.log(`[codex-ipc] connected as ${client.clientId}`);

    if (args.initOnly) {
      return;
    }

    const threadIds = args.threadIds.length > 0 ? args.threadIds : DEFAULT_THREAD_IDS;
    const results = [];

    for (let round = 1; round <= args.rounds; round += 1) {
      console.log(`[codex-ipc] interrupt round ${round}/${args.rounds}`);

      for (const conversationId of threadIds) {
        try {
          const response = await client.sendRequest("thread-follower-interrupt-turn", {
            conversationId,
          });

          results.push({
            round,
            conversationId,
            ok: response.resultType === "success",
            error: response.resultType === "success" ? "" : String(response.error || ""),
            result: response.result ?? null,
          });

          console.log(
            `[codex-ipc] ${conversationId} -> ${response.resultType}` +
              (response.resultType === "success" ? "" : ` (${response.error || "unknown"})`)
          );
        } catch (error) {
          results.push({
            round,
            conversationId,
            ok: false,
            error: error.message,
            result: null,
          });

          console.log(`[codex-ipc] ${conversationId} -> error (${error.message})`);
        }
      }

      if (round < args.rounds) {
        await wait(args.delayMs);
      }
    }

    console.log("");
    console.table(
      results.map((entry) => ({
        round: entry.round,
        conversationId: entry.conversationId,
        ok: entry.ok,
        error: entry.error,
      }))
    );

    console.log("");
    console.log("If a row shows `no-client-found`, open that stuck thread once in Codex and rerun this script.");
    console.log("If rows succeed, go back to Codex and press Ctrl+R once to refresh the UI.");
  } finally {
    client.dispose();
  }
}

main().catch((error) => {
  console.error("[codex-ipc] fatal:", error.message);
  process.exitCode = 1;
});
