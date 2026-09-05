/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mot de passe d'accès au panneau d'administration (/admin). Défaut : "fiduciaire2026". */
  readonly VITE_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
