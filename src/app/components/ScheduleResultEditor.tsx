import { useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Chip, Grid, Stack, TextField, Typography } from "@mui/material";
import type { CarResultRow, GenerateScheduleResult, Role, ScheduleResultRow, ServiceSchedule } from "../../domain/scheduleTypes";
import { assignmentDisplayName, assignmentInputValue, isMissingAssignment } from "../assignmentDisplay";
import { ROLE_LABELS } from "../appConstants";
import { EditableAccordionItem } from "./EditableAccordionItem";

function cloneServiceRow(row: ScheduleResultRow): ScheduleResultRow {
  return {
    ...row,
    roles: { ...row.roles },
  };
}

function ServiceResultItem({
  row,
  rowIndex,
  visibleRoles,
  isEditing,
  onToggleEdit,
  onSave,
}: {
  row: ScheduleResultRow;
  rowIndex: number;
  visibleRoles: Role[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: (rowIndex: number, row: ScheduleResultRow) => void;
}) {
  const [draft, setDraft] = useState(() => cloneServiceRow(row));

  useEffect(() => {
    if (!isEditing) setDraft(cloneServiceRow(row));
  }, [isEditing, row]);

  function updateRole(role: Role, name: string) {
    setDraft((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: name,
      },
    }));
  }

  function save() {
    onSave(rowIndex, draft);
    onToggleEdit();
  }

  function cancel() {
    setDraft(cloneServiceRow(row));
    onToggleEdit();
  }

  return (
    <EditableAccordionItem title={row.displayDate} isEditing={isEditing} onToggleEdit={onToggleEdit} onSaveEdit={save} onCancelEdit={cancel}>
      {isEditing ? (
        <Grid container spacing={1}>
          {visibleRoles.map((role) => (
            <Grid size={{ xs: 12, md: 6 }} key={role}>
              <TextField
                size="small"
                label={role === "향" ? "향로" : role}
                value={assignmentInputValue(draft.roles[role])}
                onChange={(event) => updateRole(role, event.target.value)}
                fullWidth
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <TextField size="small" label="메모" value={draft.note ?? ""} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} fullWidth />
          </Grid>
        </Grid>
      ) : (
        <Stack spacing={1}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
            {visibleRoles.map((role) => (
              <Chip
                key={role}
                label={`${role === "향" ? "향로" : role} ${assignmentDisplayName(row.roles[role])}`}
                variant="outlined"
                color={isMissingAssignment(row.roles[role]) ? "warning" : "default"}
              />
            ))}
          </Stack>
          {row.note && (
            <Typography variant="body2" color="text.secondary">
              {row.note}
            </Typography>
          )}
        </Stack>
      )}
    </EditableAccordionItem>
  );
}

function CarResultItem({
  row,
  rowIndex,
  isEditing,
  onToggleEdit,
  onSave,
}: {
  row: CarResultRow;
  rowIndex: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: (rowIndex: number, row: CarResultRow) => void;
}) {
  const [draft, setDraft] = useState(row);

  useEffect(() => {
    if (!isEditing) setDraft(row);
  }, [isEditing, row]);

  function save() {
    onSave(rowIndex, draft);
    onToggleEdit();
  }

  function cancel() {
    setDraft(row);
    onToggleEdit();
  }

  return (
    <EditableAccordionItem title={row.displayDate} isEditing={isEditing} onToggleEdit={onToggleEdit} onSaveEdit={save} onCancelEdit={cancel}>
      {isEditing ? (
        <Stack spacing={1}>
          <TextField
            size="small"
            label="차량봉사"
            value={assignmentInputValue(draft.name)}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            fullWidth
          />
          <TextField size="small" label="메모" value={draft.note ?? ""} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} fullWidth />
        </Stack>
      ) : (
        <Stack spacing={1}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
            <Chip label={assignmentDisplayName(row.name)} variant="outlined" color={isMissingAssignment(row.name) ? "warning" : "default"} />
          </Stack>
          {row.note && (
            <Typography variant="body2" color="text.secondary">
              {row.note}
            </Typography>
          )}
        </Stack>
      )}
    </EditableAccordionItem>
  );
}

export function ScheduleResultEditor({
  result,
  serviceSchedules,
  onServiceSave,
  onCarSave,
}: {
  result: GenerateScheduleResult;
  serviceSchedules: ServiceSchedule[];
  onServiceSave: (rowIndex: number, row: ScheduleResultRow) => void;
  onCarSave: (rowIndex: number, row: CarResultRow) => void;
}) {
  const [editingServiceRows, setEditingServiceRows] = useState<string[]>([]);
  const [editingCarRows, setEditingCarRows] = useState<string[]>([]);
  const toggleServiceRow = (displayDate: string) =>
    setEditingServiceRows((rows) => (rows.includes(displayDate) ? rows.filter((item) => item !== displayDate) : [...rows, displayDate]));
  const toggleCarRow = (displayDate: string) =>
    setEditingCarRows((rows) => (rows.includes(displayDate) ? rows.filter((item) => item !== displayDate) : [...rows, displayDate]));

  return (
    <Stack spacing={2}>
      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>복사일정 배정결과 ({result.serviceRows.length}개)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {result.serviceRows.map((row, rowIndex) => {
              const schedule = serviceSchedules.find((item) => item.displayDate === row.displayDate);
              const visibleRoles = schedule ? ([...schedule.baseRoles, ...schedule.subRoles] as Role[]) : ROLE_LABELS;
              return (
                <ServiceResultItem
                  key={row.displayDate}
                  row={row}
                  rowIndex={rowIndex}
                  visibleRoles={visibleRoles}
                  isEditing={editingServiceRows.includes(row.displayDate)}
                  onToggleEdit={() => toggleServiceRow(row.displayDate)}
                  onSave={onServiceSave}
                />
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>차량봉사 배정결과 ({result.carRows.length}개)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {result.carRows.map((row, rowIndex) => (
              <CarResultItem
                key={row.displayDate}
                row={row}
                rowIndex={rowIndex}
                isEditing={editingCarRows.includes(row.displayDate)}
                onToggleEdit={() => toggleCarRow(row.displayDate)}
                onSave={onCarSave}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
