import { Chip, Stack, Typography } from "@mui/material";
import type { Role } from "../../domain/scheduleTypes";

export function RoleBadges({ roles }: { roles: Role[] }) {
  if (roles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        선택된 역할 없음
      </Typography>
    );
  }

  return (
    <Stack
      direction="row"
      sx={{
        flex: 1,
        flexWrap: "nowrap",
        gap: 0.75,
        minWidth: 0,
        overflowX: "auto",
        py: 0.25,
      }}
    >
      {roles.map((role) => (
        <Chip
          key={role}
          label={role}
          color="primary"
          variant="filled"
          size="small"
          sx={{
            flex: "0 0 auto",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontWeight: 800,
          }}
        />
      ))}
    </Stack>
  );
}
