import type { LoadedModule } from "../core/moduleRegistry";
import { AxolotlMascot } from "../pet/AxolotlMascot";
import { NavSlot } from "./NavSlot";

export function Sidebar({ modules }: { modules: LoadedModule[] }) {
  return (
    <nav className="axiom-sidebar">
      <div className="axiom-sidebar-header">
        <AxolotlMascot size="sm" />
        <div className="axiom-sidebar-brand">AXIOM</div>
      </div>
      {modules.map(({ manifest }) => (
        <NavSlot key={manifest.id} manifest={manifest} />
      ))}
    </nav>
  );
}
