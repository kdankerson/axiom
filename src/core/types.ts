export interface ModuleManifest {
  id: string;
  name: string;
  icon: string;
  route?: string;
  version?: string;
  frontend?: {
    entry: string;
  };
  backend?: {
    enabled: boolean;
    router?: string;
    prefix?: string;
  };
  nav: {
    order: number;
    placeholder: boolean;
    enabled: boolean;
  };
  capabilities?: string[];
  note?: string;
}
