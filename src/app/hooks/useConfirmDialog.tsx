import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, type ButtonProps } from "@mui/material";
import { useBackButtonClose } from "./useBackButtonClose";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: ButtonProps["color"];
  onConfirm: () => void;
};

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialogBackButtonClose = useBackButtonClose(Boolean(options), () => setOptions(null));

  function closeDialog() {
    setOptions(null);
  }

  function confirmAction() {
    const onConfirm = options?.onConfirm;
    dialogBackButtonClose.closeWithoutHistoryBack();
    onConfirm?.();
  }

  const confirmDialog = (
    <Dialog open={Boolean(options)} onClose={closeDialog} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{options?.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {options?.message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>취소</Button>
        <Button variant="contained" color={options?.confirmColor ?? "primary"} onClick={confirmAction}>
          {options?.confirmText ?? "확인"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return {
    confirm: setOptions,
    confirmDialog,
  };
}
