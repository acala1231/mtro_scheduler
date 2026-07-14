import { Box, Chip, Stack } from "@mui/material";
import type { Role } from "../../domain/scheduleTypes";

export function RoleToggles<T extends Role>({
  roles,
  selected,
  onChange,
}: {
  roles: readonly T[];
  selected: T[];
  onChange: (roles: T[]) => void;
}) {
  return (
    <Box sx={{ overflowX: "auto", pb: 0.5, mx: -0.5, px: 0.5 }}>
      <Stack direction="row" sx={{ gap: 0.75, width: "max-content", minWidth: "100%" }}>
        {roles.map((role) => {
          const enabled = selected.includes(role);
          return (
            <Chip
              key={role}
              label={role}
              color={enabled ? "primary" : "default"}
              variant={enabled ? "filled" : "outlined"}
              onClick={() => {
                if (enabled) onChange(selected.filter((item) => item !== role));
                else onChange([...selected, role]);
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
