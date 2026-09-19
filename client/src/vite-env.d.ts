/// <reference types="vite/client" />

// Lot 8-0.4 : VITE_ADMIN_PASSWORD est déprécié — la route /admin/conventions
// est désormais protégée par la même règle RBAC PROPRIETAIRE que /admin.
// Aucune variable d'environnement de mot de passe admin n'est plus nécessaire.
interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
