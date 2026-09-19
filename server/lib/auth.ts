/**
 * Auth — bcrypt hash/verify + JWT sign/verify.
 * Toutes les fonctions sont async pour compatibilité serverless.
 *
 * Lot 8-0.3 : le fallback JWT_SECRET n'est utilisé qu'en dev/test.
 * En production (NODE_ENV=production ou VERCEL=1) :
 *   - JWT_SECRET manquant → FATAL (crash)
 *   - JWT_SECRET < 16 chars → FATAL (crash)
 *   - JWT_SECRET 16-31 chars → WARNING (démarre mais recommande régénération)
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 10;
const MIN_JWT_SECRET_LENGTH = 16;       // minimum absolu (crash si inférieur)
const RECOMMENDED_JWT_SECRET_LENGTH = 32; // recommandé (warning si inférieur)

function resolveJwtSecret(): string {
  const value = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (isProduction) {
    if (!value) {
      throw new Error(
        "[auth] FATAL: JWT_SECRET est requis en production."
      );
    }
    if (value.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `[auth] FATAL: JWT_SECRET fait ${value.length} caractères — minimum absolu ${MIN_JWT_SECRET_LENGTH}.`
      );
    }
    if (value.length < RECOMMENDED_JWT_SECRET_LENGTH) {
      console.warn(
        `[auth] WARNING: JWT_SECRET fait ${value.length} caractères — recommandation ${RECOMMENDED_JWT_SECRET_LENGTH}.`
      );
    }
    return value;
  }
  return value || "dev-secret-change-in-prod";
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ─── Mot de passe ───

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ───

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
