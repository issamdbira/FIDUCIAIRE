import { createContext, useContext, useState, type ReactNode } from "react";
import type { Workspace, WorkspaceMemberRole } from "@/lib/types/db";

interface WorkspaceWithRole {
  id: string;
  name: string;
  role: WorkspaceMemberRole;
}

interface WorkspaceContextValue {
  activeWorkspace: WorkspaceWithRole | null;
  setActiveWorkspace: (ws: WorkspaceWithRole) => void;
  workspaces: WorkspaceWithRole[];
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const MOCK_WORKSPACES: WorkspaceWithRole[] = [
  { id: "1", name: "ABC TUNIS SARL", role: "ACCOUNTANT" },
  { id: "2", name: "XYZ SERVICES", role: "OWNER" },
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceWithRole>(
    MOCK_WORKSPACES[0]
  );

  return (
    <WorkspaceContext.Provider
      value={{ activeWorkspace, setActiveWorkspace, workspaces: MOCK_WORKSPACES }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
