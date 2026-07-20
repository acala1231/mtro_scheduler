import { useEffect, useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { HistoryAwareDialog } from "./HistoryAwareDialog";

export function ScreenDescriptionButton({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [description]);

  return (
    <>
      <IconButton color="primary" aria-label="현재 화면 설명 열기" onClick={() => setOpen(true)}><InfoOutlinedIcon /></IconButton>
      <HistoryAwareDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="screen-description-title">
        <DialogTitle id="screen-description-title">화면 사용 안내</DialogTitle>
        <DialogContent><Typography sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{description}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>확인</Button></DialogActions>
      </HistoryAwareDialog>
    </>
  );
}
