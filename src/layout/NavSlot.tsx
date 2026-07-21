import { NavLink } from "react-router-dom";
import type { ModuleManifest } from "../core/types";

export function NavSlot({ manifest }: { manifest: ModuleManifest }) {
  if (manifest.nav.placeholder || !manifest.nav.enabled || !manifest.route) {
    return (
      <div className="axiom-nav-slot axiom-nav-slot-disabled" title={manifest.note}>
        {manifest.name}
      </div>
    );
  }

  return (
    <NavLink
      to={manifest.route}
      className={({ isActive }) =>
        isActive ? "axiom-nav-slot axiom-nav-slot-active" : "axiom-nav-slot"
      }
    >
      {manifest.name}
    </NavLink>
  );
}
