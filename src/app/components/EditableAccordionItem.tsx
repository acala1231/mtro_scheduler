import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack, Typography } from "@mui/material";

export function EditableAccordionItem({
  title,
  summaryEnd,
  children,
  isEditing,
  onToggleEdit,
  onSaveEdit,
  onCancelEdit,
  defaultExpanded = true,
  editLabel = "수정",
  saveLabel = "저장",
  cancelLabel = "취소",
}: {
  title: React.ReactNode;
  summaryEnd?: React.ReactNode;
  children: React.ReactNode;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  defaultExpanded?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <Accordion disableGutters defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%", pr: 1 }}>
          {typeof title === "string" ? <Typography sx={{ flex: 1, fontWeight: 700 }}>{title}</Typography> : <Box sx={{ flex: 1 }}>{title}</Box>}
          {summaryEnd}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          {children}
          {onToggleEdit && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              {isEditing && (
                <Button variant="outlined" size="small" onClick={onCancelEdit ?? onToggleEdit}>
                  {cancelLabel}
                </Button>
              )}
              <Button variant={isEditing ? "contained" : "outlined"} size="small" onClick={isEditing ? (onSaveEdit ?? onToggleEdit) : onToggleEdit}>
                {isEditing ? saveLabel : editLabel}
              </Button>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
