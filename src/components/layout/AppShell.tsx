import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="content">{children}</main>
      </div>
    </MotionProvider>
  );
}
