/*
Run this in the Codex desktop DevTools console for the affected window.

How to open DevTools:
  Ctrl+Shift+I

What this script does:
  1. Reads the real thread state through Codex's own MCP bridge.
  2. Tries the official turn/interrupt flow for threads still in progress.
  3. If the backend already says a turn ended but the UI is still stuck,
     it replays a local "turn/completed" notification so the renderer updates.

What this script does NOT do:
  - no archive
  - no unarchive
  - no rollback
  - no cache reset
*/

(async () => {
  const hostId = new URLSearchParams(location.search).get("hostId") || "local";

  const threadIds = [
    "019cd1c3-10eb-75d2-be97-1de187b52f81",
    "019cc897-51a1-7320-927c-0d662300bc1f",
    "019cd240-830f-77f2-bcc8-3ecd36539735",
    "019cd253-596b-7311-a1fe-2bf19f000664",
  ];

  const APPLY_LOCAL_FALLBACK_IF_SERVER_STILL_IN_PROGRESS = true;
  const INTERRUPT_RETRY_COUNT = 3;
  const INTERRUPT_RETRY_WAIT_MS = 1200;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getLatestTurn(threadResult) {
    const thread = threadResult?.thread ?? threadResult ?? null;
    const turns = Array.isArray(thread?.turns) ? thread.turns : [];
    return {
      thread,
      latestTurn: turns.length > 0 ? turns[turns.length - 1] : null,
    };
  }

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

  function dispatchLocalNotification(method, params) {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "mcp-notification",
          hostId,
          method,
          params,
        },
      })
    );
  }

  function requestTasksReload() {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "tasks-reload-requested",
          hostId,
        },
      })
    );
  }

  async function readThread(threadId) {
    return sendMcpRequest("thread/read", {
      threadId,
      includeTurns: true,
    });
  }

  async function cleanBackgroundTerminals(threadId) {
    try {
      await sendMcpRequest("thread/backgroundTerminals/clean", { threadId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function interruptTurn(threadId, turnId) {
    return sendMcpRequest("turn/interrupt", {
      threadId,
      turnId,
    });
  }

  function replayCompletedNotification(threadId, turn) {
    dispatchLocalNotification("turn/completed", {
      threadId,
      turn: {
        id: turn.id,
        status: turn.status,
        error: turn.error ?? null,
      },
    });
  }

  function replayLocalInterruptedFallback(threadId, turn) {
    dispatchLocalNotification("turn/completed", {
      threadId,
      turn: {
        id: turn.id,
        status: "interrupted",
        error:
          turn.error ??
          {
            message: "Locally repaired stale UI state. The backend still reported inProgress.",
          },
      },
    });
  }

  const results = [];

  for (const threadId of threadIds) {
    const row = {
      threadId,
      beforeStatus: "",
      afterServerStatus: "",
      interruptAttempted: false,
      interruptOk: false,
      localReplayApplied: false,
      localFallbackApplied: false,
      cleanCalled: false,
      notes: [],
    };

    try {
      const initialRead = await readThread(threadId);
      const { thread, latestTurn } = getLatestTurn(initialRead);

      if (!thread) {
        row.notes.push("thread/read returned no thread");
        results.push(row);
        continue;
      }

      if (!latestTurn) {
        row.notes.push("thread has no turns");
        results.push(row);
        continue;
      }

      row.beforeStatus = latestTurn.status ?? "";

      let effectiveTurn = latestTurn;

      if (latestTurn.status === "inProgress") {
        row.interruptAttempted = true;

        try {
          await interruptTurn(threadId, latestTurn.id);
          row.interruptOk = true;
        } catch (error) {
          row.notes.push(`turn/interrupt failed: ${JSON.stringify(error)}`);
        }

        const cleanResult = await cleanBackgroundTerminals(threadId);
        row.cleanCalled = true;
        if (!cleanResult.ok) {
          row.notes.push(`backgroundTerminals/clean failed: ${JSON.stringify(cleanResult.error)}`);
        }

        for (let attempt = 0; attempt < INTERRUPT_RETRY_COUNT; attempt += 1) {
          await wait(INTERRUPT_RETRY_WAIT_MS);

          const reread = await readThread(threadId);
          const latest = getLatestTurn(reread).latestTurn;
          if (latest) {
            effectiveTurn = latest;
          }

          if (effectiveTurn && effectiveTurn.status !== "inProgress") {
            break;
          }
        }
      }

      row.afterServerStatus = effectiveTurn?.status ?? "";

      if (effectiveTurn && effectiveTurn.status !== "inProgress") {
        replayCompletedNotification(threadId, effectiveTurn);
        row.localReplayApplied = true;
      } else if (effectiveTurn && APPLY_LOCAL_FALLBACK_IF_SERVER_STILL_IN_PROGRESS) {
        replayLocalInterruptedFallback(threadId, effectiveTurn);
        row.localFallbackApplied = true;
        row.notes.push("applied local interrupted fallback because backend still said inProgress");
      } else if (effectiveTurn) {
        row.notes.push("backend still says inProgress, no local fallback applied");
      }
    } catch (error) {
      row.notes.push(`unexpected error: ${error?.message ?? String(error)}`);
    }

    results.push(row);
  }

  requestTasksReload();

  console.table(
    results.map((row) => ({
      threadId: row.threadId,
      beforeStatus: row.beforeStatus,
      afterServerStatus: row.afterServerStatus,
      interruptAttempted: row.interruptAttempted,
      interruptOk: row.interruptOk,
      localReplayApplied: row.localReplayApplied,
      localFallbackApplied: row.localFallbackApplied,
      notes: row.notes.join(" | "),
    }))
  );

  console.log("Codex stuck-thread status repair finished.", results);
  console.log("If the sidebar circles do not disappear immediately, press Ctrl+R once in this Codex window.");
})();
