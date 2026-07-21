import type { LoadedModule } from "../core/moduleRegistry";
import { NavSlot } from "./NavSlot";

export function Sidebar({ modules }: { modules: LoadedModule[] }) {
  return (
    <nav className="axiom-sidebar">
      <div className="axiom-sidebar-brand">AXIOM</div>
      {modules.map(({ manifest }) => (
        <NavSlot key={manifest.id} manifest={manifest} />
      ))}
    </nav>
  );
}
