import type { LoadedModule } from "../core/moduleRegistry";
import { useAgentRoster } from "../core/useAgentRoster";
import { AxolotlMascot } from "../pet/AxolotlMascot";
import { AgentRosterList } from "./AgentRosterList";
import { NavSlot } from "./NavSlot";

export function Sidebar({ modules }: { modules: LoadedModule[] }) {
  const { active, retired } = useAgentRoster();

  return (
    <nav className="axiom-sidebar">
      <div className="axiom-sidebar-header">
        <AxolotlMascot size="sm" />
        <div className="axiom-sidebar-brand">AXIOM</div>
      </div>
      {modules.map(({ manifest }) => (
        <div key={manifest.id}>
          <NavSlot manifest={manifest} />
          {manifest.id === "agents" && <AgentRosterList active={active} retired={retired} />}
        </div>
      ))}
    </nav>
  );
}
