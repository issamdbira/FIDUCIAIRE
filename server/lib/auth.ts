/**
 * Auth — bcrypt hash/verify + JWT sign/verify.
 * Toutes les fonctions sont async pour compatibilité serverless.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
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
