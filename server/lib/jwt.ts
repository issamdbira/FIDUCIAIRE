// =============================================================================
// Le Fiduciaire — JWT Utility
// =============================================================================
// Lot 8-0.3 : en production (NODE_ENV=production ou VERCEL=1), JWT_SECRET doit
// être défini et faire >= 32 caractères. Sinon, le module refuse de se charger
// (throw) → le serveur ne démarre pas. Le fallback dev reste pour le dev local
// et les tests, mais ne peut JAMAIS fuiter en production.

import jwt from "jsonwebtoken";

const MIN_JWT_SECRET_LENGTH = 32;

/** Lot 8-0.3 — résolution exportée pour test. Lit process.env et throw en prod si invalide. */
export function resolveJwtSecret(): string {
  const value = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (isProduction) {
    if (!value) {
      throw new Error(
        "[jwt] FATAL: JWT_SECRET est requis en production (NODE_ENV=production ou VERCEL=1). " +
        "Référez-vous à la variable d'environnement dans Vercel → Settings → Environment Variables."
      );
    }
    if (value.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `[jwt] FATAL: JWT_SECRET fait ${value.length} caractères — le minimum requis en production est ${MIN_JWT_SECRET_LENGTH}. ` +
        "Générez un secret de >= 64 caractères avec `openssl rand -hex 32`."
      );
    }
    return value;
  }

  // Dev / test — fallback pour ne pas bloquer le développeur
  return value || "fiduciaire-dev-secret-changez-moi";
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
}

/** Sign a JWT with user info + unique jti */
export function signToken(payload: { userId: string; email: string; role: string }): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = crypto.randomUUID();
  const now = new Date();

  // Parse expiry duration to compute expiresAt
  const expiresMs = parseExpiry(JWT_EXPIRES_IN);
  const expiresAt = new Date(now.getTime() + expiresMs);

  const token = jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    JWT_SECRET,
    // Typage des nouveaux @types/jsonwebtoken : expiresIn attend number | StringValue
    // (type gabarit du paquet « ms ») — un string générique doit être affirmé.
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"], jwtid: jti }
  );

  return { token, jti, expiresAt };
}

/** Verify and decode a JWT */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Parse JWT_EXPIRES_IN like "7d", "24h", "60m" to ms */
function parseExpiry(exp: string): number {
  const match = exp.match(/^(\d+)(d|h|m|s)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "d": return val * 24 * 60 * 60 * 1000;
    case "h": return val * 60 * 60 * 1000;
    case "m": return val * 60 * 1000;
    case "s": return val * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
