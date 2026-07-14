import { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, ClickAwayListener, IconButton, Stack, Tooltip } from "@mui/material";

export function Screen({ description, children }: { title: string; description: string; children: React.ReactNode }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Stack spacing={2.25}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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
