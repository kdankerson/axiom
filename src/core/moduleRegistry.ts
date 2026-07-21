import React from "react";
import type { ModuleManifest } from "./types";

const manifests = import.meta.glob("../../modules/*/module.json", {
  eager: true,
  import: "default",
}) as Record<string, ModuleManifest>;

const frontendEntries = import.meta.glob("../../modules/*/frontend/index.tsx") as Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

function idFromManifestPath(path: string): string {
  return path.match(/modules\/([^/]+)\/module\.json$/)![1];
}

export interface LoadedModule {
  manifest: ModuleManifest;
  Component?: React.LazyExoticComponent<React.ComponentType>;
}

export function discoverModules(): LoadedModule[] {
  const loaded: LoadedModule[] = [];

  for (const path in manifests) {
    const id = idFromManifestPath(path);
    const manifest = manifests[path];
    const entryKey = `../../modules/${id}/frontend/index.tsx`;
    const load = frontendEntries[entryKey];
    const Component = load ? React.lazy(load) : undefined;
    loaded.push({ manifest, Component });
  }

  return loaded.sort((a, b) => a.manifest.nav.order - b.manifest.nav.order);
}
