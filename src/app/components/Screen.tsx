import { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, ClickAwayListener, IconButton, Stack, Tooltip, Typography } from "@mui/material";

export function Screen({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Stack component="main" spacing={2.25}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>{title}</Typography>
        <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
          <Box>
            <Tooltip
              title={description}
              arrow
              open={tooltipOpen}
              onOpen={() => setTooltipOpen(true)}
              onClose={() => setTooltipOpen(false)}
              disableTouchListener
              placement="left"
              slotProps={{
                tooltip: {
                  sx: {
                    maxWidth: 280,
                    whiteSpace: "pre-line",
                    lineHeight: 1.55,
                  },
                },
              }}
            >
              <IconButton
                size="small"
                aria-label="화면 설명"
                onClick={() => setTooltipOpen((open) => !open)}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </ClickAwayListener>
      </Box>
      {children}
    </Stack>
  );
}
