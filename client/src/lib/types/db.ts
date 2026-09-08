/* ─── Enums ─── */

export type WorkspaceMemberRole = "OWNER" | "ACCOUNTANT" | "HR_ADMIN";

export type ContactType = "CLIENT" | "VENDOR";

export type CivilStatus = "CELIBATAIRE" | "MARIE" | "DIVORCE" | "VEUF";

/* ─── Models ─── */

export interface Workspace {
  id: string;
  name: string;
  matriculeCnss: string;
  codeExploitation: string;
  matriculeFiscal: string;
  address: string;
  tauxAtMp: number;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  user: User;
  workspace: Workspace;
}

export interface Contact {
  id: string;
  workspaceId: string;
  name: string;
  type: ContactType;
  matriculeFiscal: string | null;
}

export interface Employee {
  id: string;
  workspaceId: string;
  matriculeCnss: string;
  firstName: string;
  lastName: string;
  baseSalary: number;
  civilStatus: CivilStatus;
  numberOfChildren: number;
  isActive: boolean;
}
