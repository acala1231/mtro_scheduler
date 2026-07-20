import { Stack } from "@mui/material";

export function Screen({ children }: { children: React.ReactNode }) {
  return <Stack component="main" spacing={2.25}>{children}</Stack>;
}
