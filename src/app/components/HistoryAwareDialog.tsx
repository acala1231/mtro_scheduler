import { Dialog, type DialogProps } from "@mui/material";
import { useBackButtonClose } from "../hooks/useBackButtonClose";

export function HistoryAwareDialog({ open, onClose, ...props }: DialogProps) {
  useBackButtonClose(open, () => onClose?.({}, "backdropClick"));
  return <Dialog open={open} onClose={onClose} {...props} />;
}
