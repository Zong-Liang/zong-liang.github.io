/*
Run this in the Codex desktop DevTools console for the affected window.

Open DevTools:
  Ctrl+Shift+I

This script talks to Codex through the same MCP bridge the app uses.
It tries two recovery steps for the known stuck threads from the local logs:
  1. interrupt any latest turn still marked inProgress
  2. archive + unarchive the thread to clear stale streaming UI state
*/

(async () => {
  const hostId = new URLSearchParams(location.search).get("hostId") || "local";

  const threads = [
    {
      label: "stuck-thread-1",
      threadId: "019cd1c3-10eb-75d2-be97-1de187b52f81",
      latestTurnId: "019cd1ed-896b-7300-aaca-b2858ff6455b",
      latestTurnStatus: "inProgress",
    },
    {
      label: "stuck-thread-2",
      threadId: "019cc897-51a1-7320-927c-0d662300bc1f",
      latestTurnId: "019cd1ef-d2b1-7fd1-95ae-5cf93fddb219",
      latestTurnStatus: "inProgress",
    },
    {
      label: "stuck-thread-3",
      threadId: "019cd240-830f-77f2-bcc8-3ecd36539735",
      latestTurnId: "019cd246-05b2-7812-8ed1-952dfa1af7e1",
      latestTurnStatus: "inProgress",
    },
    {
      label: "stuck-thread-4",
      threadId: "019cd253-596b-7311-a1fe-2bf19f000664",
      latestTurnId: "019cd257-db1e-7502-8744-824ffc62e17b",
      latestTurnStatus: "completed",
    },
  ];

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function sendMcpRequest(method, params) {
    const id = `${method}:${crypto.randomUUID()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error(`Timed out waiting for ${method}`));
      }, 30000);

      function onMessage(event) {
        const payload = event.data;
        if (!payload || payload.type !== "mcp-response" || payload.hostId !== hostId) {
          return;
        }

        const message = payload.message;
        if (!message || message.id !== id) {
          return;
        }

        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);

        if (message.error) {
          reject(message.error);
          return;
        }

        resolve(message.result);
      }

      window.addEventListener("message", onMessage);
      window.electronBridge.sendMessageFromView({
        type: "mcp-request",
        hostId,
        request: {
          id,
          method,
          params,
        },
      });
    });
  }

  const results = [];

  for (const thread of threads) {
    if (thread.latestTurnStatus !== "inProgress") {
      continue;
    }

    try {
      const result = await sendMcpRequest("turn/interrupt", {
        threadId: thread.threadId,
        turnId: thread.latestTurnId,
      });

      results.push({
        threadId: thread.threadId,
        step: "turn/interrupt",
        ok: true,
        result,
      });
    } catch (error) {
      results.push({
        threadId: thread.threadId,
        step: "turn/interrupt",
        ok: false,
        error,
      });
    }

    await wait(250);
  }

  for (const thread of threads) {
    try {
      const result = await sendMcpRequest("thread/archive", {
        threadId: thread.threadId,
      });

      results.push({
        threadId: thread.threadId,
        step: "thread/archive",
        ok: true,
        result,
      });
    } catch (error) {
      results.push({
        threadId: thread.threadId,
        step: "thread/archive",
        ok: false,
        error,
      });
    }

    await wait(250);
  }

  await wait(1200);

  for (const thread of threads) {
    try {
      const result = await sendMcpRequest("thread/unarchive", {
        threadId: thread.threadId,
      });

      results.push({
        threadId: thread.threadId,
        step: "thread/unarchive",
        ok: true,
        result,
      });
    } catch (error) {
      results.push({
        threadId: thread.threadId,
        step: "thread/unarchive",
        ok: false,
        error,
      });
    }

    await wait(250);
  }

  console.table(
    results.map((entry) => ({
      threadId: entry.threadId,
      step: entry.step,
      ok: entry.ok,
      error: entry.ok ? "" : JSON.stringify(entry.error),
    }))
  );

  console.log("Codex stuck-thread repair finished.", results);
  console.log("If the circles are still there, press Ctrl+R once to reload the window.");
})();
