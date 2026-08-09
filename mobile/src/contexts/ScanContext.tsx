import { createContext, useContext, type ReactNode } from "react";

interface ScanContextValue {
  openScan: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({
  openScan,
  children,
}: ScanContextValue & { children: ReactNode }) {
  return (
    <ScanContext.Provider value={{ openScan }}>{children}</ScanContext.Provider>
  );
}

export function useOpenScan(): () => void {
  const ctx = useContext(ScanContext);
  if (!ctx) {
    throw new Error("useOpenScan must be used within ScanProvider");
  }
  return ctx.openScan;
}
