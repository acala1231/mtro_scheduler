import { Alert, LinearProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function VoteImportPanel({ description, children, processingLabel, progress, success, error }: {
  description: ReactNode;
  children: ReactNode;
  processingLabel?: string;
  progress?: number;
  success: string;
  error: string;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
      {children}
      {processingLabel && (
        <Stack spacing={0.75}>
          <Typography variant="body2" color="text.secondary">{processingLabel}</Typography>
          <LinearProgress aria-label={`${processingLabel} 진행률`} variant={progress === undefined ? "indeterminate" : "determinate"} value={progress} />
        </Stack>
      )}
      {success && <Alert severity="success">{success}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
