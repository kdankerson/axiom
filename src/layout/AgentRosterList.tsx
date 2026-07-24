import { useNavigate } from "react-router-dom";
import type { AgentRosterEntry } from "../core/useAgentRoster";

function Item({ entry, onSelect }: { entry: AgentRosterEntry; onSelect: (runId: string) => void }) {
  return (
    <button
      className={`axiom-agent-roster-item axiom-agent-roster-item-${entry.status}`}
      onClick={() => onSelect(entry.runId)}
      title={entry.task}
    >
      <span className="axiom-agent-roster-dot" />
      <span className="axiom-agent-roster-task">{entry.task}</span>
    </button>
  );
}

export function AgentRosterList({
  active,
  retired,
}: {
  active: AgentRosterEntry[];
  retired: AgentRosterEntry[];
}) {
  const navigate = useNavigate();

  if (active.length === 0 && retired.length === 0) return null;

  function select(runId: string) {
    navigate(`/agents?run=${runId}`);
  }

  return (
    <div className="axiom-agent-roster">
      {active.length > 0 && (
        <div className="axiom-agent-roster-section">
          <div className="axiom-agent-roster-heading">Active</div>
          {active.map((a) => (
            <Item key={a.runId} entry={a} onSelect={select} />
          ))}
        </div>
      )}
      {retired.length > 0 && (
        <div className="axiom-agent-roster-section">
          <div className="axiom-agent-roster-heading">Retired</div>
          {retired.map((a) => (
            <Item key={a.runId} entry={a} onSelect={select} />
          ))}
        </div>
      )}
    </div>
  );
}
