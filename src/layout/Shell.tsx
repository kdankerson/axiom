import { Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { discoverModules } from "../core/moduleRegistry";
import { Home } from "./Home";

const modules = discoverModules();

export function Shell() {
  return (
    <HashRouter>
      <div className="axiom-shell">
        <Sidebar modules={modules} />
        <main className="axiom-main">
          <Suspense fallback={<p>Loading...</p>}>
            <Routes>
              <Route path="/" element={<Home />} />
              {modules
                .filter((m) => m.Component && m.manifest.route)
                .map(({ manifest, Component }) => (
                  <Route key={manifest.id} path={manifest.route} element={Component && <Component />} />
                ))}
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  );
}
