import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAgentStream, type AgentEvent } from "./useAgentStream";

interface ToolBlock {
  kind: "tool";
  id: string;
  name: string;
  input: unknown;
  result?: { content: unknown; isError: boolean };
}
type Block =
  | { kind: "text"; text: string }
  | ToolBlock
  | { kind: "final"; text: string }
  | { kind: "error"; message: string };

function deriveBlocks(events: AgentEvent[]): Block[] {
  const toolIndex = new Map<string, ToolBlock>();
  const blocks: Block[] = [];

  for (const event of events) {
    if (event.type === "assistant") {
      const content = (event.message as { content?: unknown[] } | undefined)?.content ?? [];
      for (const raw of content) {
        const block = raw as {
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: unknown;
        };
        if (block.type === "text" && block.text) {
          blocks.push({ kind: "text", text: block.text });
        } else if (block.type === "tool_use" && block.id && block.name) {
          const toolBlock: ToolBlock = {
            kind: "tool",
            id: block.id,
            name: block.name,
            input: block.input,
          };
          toolIndex.set(block.id, toolBlock);
          blocks.push(toolBlock);
        }
      }
    } else if (event.type === "user") {
      const content = (event.message as { content?: unknown[] } | undefined)?.content ?? [];
      for (const raw of content) {
        const block = raw as {
          type: string;
          tool_use_id?: string;
          content?: unknown;
          is_error?: boolean;
        };
        if (block.type === "tool_result" && block.tool_use_id) {
          const toolBlock = toolIndex.get(block.tool_use_id);
          if (toolBlock) {
            toolBlock.result = { content: block.content, isError: !!block.is_error };
          }
        }
      }
    } else if (event.type === "result") {
      blocks.push({ kind: "final", text: String(event.result ?? "") });
    } else if (event.type === "error") {
      blocks.push({ kind: "error", message: String(event.message ?? "unknown error") });
    }
  }

  return blocks;
}

export function AgentRunner() {
  const { events, running, run, cancel } = useAgentStream();
  const [task, setTask] = useState("");
  const blocks = useMemo(() => deriveBlocks(events), [events]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task.trim() || running) return;
    void run(task);
  }

  return (
    <div className="axiom-agents">
      <h1>Agents</h1>
      <form className="axiom-agents-input" onSubmit={handleSubmit}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe a coding task..."
          disabled={running}
        />
        {running ? (
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        ) : (
          <button type="submit">Run</button>
        )}
      </form>
      <div className="axiom-agents-log">
        {blocks.map((block, i) => {
          if (block.kind === "text") {
            return (
              <p key={i} className="axiom-agents-text">
                {block.text}
              </p>
            );
          }
          if (block.kind === "tool") {
            return (
              <details key={block.id} className="axiom-agents-tool" open>
                <summary>
                  {`> running: ${block.name}`}
                  {block.result ? (block.result.isError ? " (error)" : " (done)") : " (running...)"}
                </summary>
                <pre>{JSON.stringify(block.input, null, 2)}</pre>
                {block.result && (
                  <pre className={block.result.isError ? "axiom-agents-tool-error" : ""}>
                    {typeof block.result.content === "string"
                      ? block.result.content
                      : JSON.stringify(block.result.content, null, 2)}
                  </pre>
                )}
              </details>
            );
          }
          if (block.kind === "final") {
            return (
              <div key={i} className="axiom-agents-final">
                {block.text}
              </div>
            );
          }
          return (
            <p key={i} className="axiom-agents-error">
              error: {block.message}
            </p>
          );
        })}
      </div>
    </div>
  );
}
