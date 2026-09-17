// =============================================================================
// Le Fiduciaire — JWT Utility
// =============================================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-secret-changez-moi";
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
