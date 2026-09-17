// =============================================================================
// Fake Prisma du modèle login_attempts — partagé entre les suites de tests
// =============================================================================
// Implémentation en mémoire (tableau de lignes) des trois seules méthodes
// utilisées par server/lib/rate-limiter.ts et session-cleanup.ts :
//   - findMany({ where: { email, createdAt: { gte } }, select }) ;
//   - create({ data: { email, ip } }) ;
//   - deleteMany({ where: { email } | { createdAt: { lt } } }).
//
// Utilisation (la factory vi.mock est hoistée → import dynamique obligatoire) :
//
//   vi.mock("../lib/prisma.js", async () => {
//     const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
//     const mock = { /* ...autres modèles... */ login_attempts: creerFakeLoginAttempts() };
//     return { default: mock, prisma: mock, initLog: [], initMode: "none", initError: null };
//   });
//
// Puis, dans beforeEach : (prisma.login_attempts as FakeLoginAttempts).__reset();
// =============================================================================

import { vi } from "vitest";

export interface LigneTentative {
  id: string;
  email: string;
  ip: string | null;
  createdAt: Date;
}

export interface FakeLoginAttempts {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  /** Vide les lignes — à appeler dans beforeEach (isolation entre cas). */
  __reset(): void;
  /** Accès direct aux lignes pour semer un état (vieillissement, etc.). */
  __lignes(): LigneTentative[];
}

interface Filtre {
  email?: string;
  createdAt?: { gte?: Date | string; lt?: Date | string };
}

function ts(d: Date | string | undefined): number | null {
  return d === undefined ? null : new Date(d).getTime();
}

export function creerFakeLoginAttempts(): FakeLoginAttempts {
  const lignes: LigneTentative[] = [];
  let seq = 0;

  return {
    findMany: vi.fn(async (args: { where?: Filtre } = {}) => {
      const where = args.where ?? {};
      const gte = ts(where.createdAt?.gte);
      return lignes
        .filter((l) => where.email === undefined || l.email === where.email)
        .filter((l) => gte === null || l.createdAt.getTime() >= (gte as number))
        .map((l) => ({ ip: l.ip, createdAt: l.createdAt }));
    }),

    create: vi.fn(async (args: { data: { email: string; ip?: string | null } }) => {
      const ligne: LigneTentative = {
        id: `la-${++seq}`,
        email: args.data.email,
        ip: args.data.ip ?? null,
        createdAt: new Date(),
      };
      lignes.push(ligne);
      return { ...ligne };
    }),

    deleteMany: vi.fn(async (args: { where?: Filtre } = {}) => {
      const where = args.where ?? {};
      const lt = ts(where.createdAt?.lt);
      const avant = lignes.length;
      for (let i = lignes.length - 1; i >= 0; i--) {
        const l = lignes[i];
        const okEmail = where.email === undefined || l.email === where.email;
        const okDate = lt === null || l.createdAt.getTime() < (lt as number);
        if (okEmail && okDate) lignes.splice(i, 1);
      }
      return { count: avant - lignes.length };
    }),

    __reset() {
      lignes.length = 0;
    },

    __lignes() {
      return lignes;
    },
  };
}
