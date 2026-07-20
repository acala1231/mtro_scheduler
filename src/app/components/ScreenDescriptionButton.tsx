import { useEffect, useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, ClickAwayListener, IconButton, Tooltip } from "@mui/material";

export function ScreenDescriptionButton({ description }: { description: string }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    setTooltipOpen(false);
  }, [description]);

  return (
    <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
      <Box>
        <Tooltip
          title={description}
          describeChild
          arrow
          open={tooltipOpen}
          onOpen={() => setTooltipOpen(true)}
          onClose={() => setTooltipOpen(false)}
          disableTouchListener
          placement="bottom-end"
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
            color="primary"
            aria-label="현재 화면 설명"
            onClick={() => setTooltipOpen((open) => !open)}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </ClickAwayListener>
  );
}
