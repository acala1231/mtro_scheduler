import { useState } from "react";
import { Alert, Button, Chip, Grid, Paper, Stack, TextField } from "@mui/material";
import type { CarSchedule, Member, ServiceSchedule, VoteEntry } from "../../domain/scheduleTypes";
import { EditableAccordionItem } from "./EditableAccordionItem";

const SPECIAL_CAR_MEMBER = "관리장님";

type DraftVoteRow = {
  id: string;
  name: string;
};

function createDraftRows(rows: Array<{ entry: VoteEntry; index: number }>): DraftVoteRow[] {
  return rows.map(({ entry, index }) => ({
    id: `${entry.scheduleKey}-${index}-${entry.name}`,
    name: entry.name,
  }));
}

export function VoteScheduleSections({
  entries,
  schedules,
  members,
  allowSpecialCarMember = false,
  onSaveSchedule,
}: {
  entries: VoteEntry[];
  schedules: Array<ServiceSchedule | CarSchedule>;
  members: Member[];
  allowSpecialCarMember?: boolean;
  onSaveSchedule: (schedule: ServiceSchedule | CarSchedule, names: string[]) => void;
}) {
  const [editingVoteKeys, setEditingVoteKeys] = useState<string[]>([]);
  const [validationMessages, setValidationMessages] = useState<Record<string, string>>({});
  const [draftRowsBySchedule, setDraftRowsBySchedule] = useState<Record<string, DraftVoteRow[]>>({});
  const memberNames = new Set(members.map((member) => member.name.trim()).filter(Boolean));
  const indexedEntries = entries.map((entry, index) => ({ entry, index }));
  const openEditingVote = (key: string, rows: Array<{ entry: VoteEntry; index: number }>) => {
    setValidationMessages((messages) => ({ ...messages, [key]: "" }));
    setDraftRowsBySchedule((drafts) => ({ ...drafts, [key]: createDraftRows(rows) }));
    setEditingVoteKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
  };
  const closeEditingVote = (key: string) => {
    setValidationMessages((messages) => ({ ...messages, [key]: "" }));
    setDraftRowsBySchedule((drafts) => {
      const next = { ...drafts };
      delete next[key];
      return next;
    });
    setEditingVoteKeys((keys) => keys.filter((item) => item !== key));
  };
  const saveEditingVote = (schedule: ServiceSchedule | CarSchedule, draftRows: DraftVoteRow[]) => {
    if (draftRows.some((row) => row.name.trim().length === 0)) {
      setValidationMessages((messages) => ({ ...messages, [schedule.key]: "이름을 입력하지 않은 항목이 있습니다. 이름을 입력하거나 해당 항목을 삭제해 주세요." }));
      return;
    }

    const duplicatedName = draftRows
      .map((row) => row.name.trim())
      .find((name, index, names) => names.indexOf(name) !== index);

    if (duplicatedName) {
      setValidationMessages((messages) => ({ ...messages, [schedule.key]: `중복된 이름이 있습니다: ${duplicatedName}` }));
      return;
    }

    const invalidName = draftRows.map((row) => row.name.trim()).find((name) => !memberNames.has(name) && !(allowSpecialCarMember && name === SPECIAL_CAR_MEMBER));
    if (invalidName) {
      setValidationMessages((messages) => ({ ...messages, [schedule.key]: `명단에 없는 이름입니다: ${invalidName}` }));
      return;
    }

    onSaveSchedule(
      schedule,
      draftRows.map((row) => row.name.trim()),
    );
    closeEditingVote(schedule.key);
  };

  function addDraftRow(scheduleKey: string) {
    setValidationMessages((messages) => ({ ...messages, [scheduleKey]: "" }));
    setDraftRowsBySchedule((drafts) => ({
      ...drafts,
      [scheduleKey]: [...(drafts[scheduleKey] ?? []), { id: `${scheduleKey}-new-${Date.now()}`, name: "" }],
    }));
  }

  function updateDraftRow(scheduleKey: string, rowId: string, name: string) {
    setValidationMessages((messages) => ({ ...messages, [scheduleKey]: "" }));
    setDraftRowsBySchedule((drafts) => ({
      ...drafts,
      [scheduleKey]: (drafts[scheduleKey] ?? []).map((row) => (row.id === rowId ? { ...row, name } : row)),
    }));
  }

  function removeDraftRow(scheduleKey: string, rowId: string) {
    setValidationMessages((messages) => ({ ...messages, [scheduleKey]: "" }));
    setDraftRowsBySchedule((drafts) => ({
      ...drafts,
      [scheduleKey]: (drafts[scheduleKey] ?? []).filter((row) => row.id !== rowId),
    }));
  };

  if (schedules.length === 0) return <Alert severity="warning">설정된 일정이 없습니다.</Alert>;

  return (
    <Stack spacing={1}>
      {schedules.map((schedule) => {
        const rows = indexedEntries.filter(({ entry }) => entry.scheduleKey === schedule.key);
        const isEditing = editingVoteKeys.includes(schedule.key);
        const validationMessage = validationMessages[schedule.key] ?? "";
        const draftRows = draftRowsBySchedule[schedule.key] ?? createDraftRows(rows);
        const invalidNames = draftRows
          .map((row) => row.name.trim())
          .filter((name) => name && !memberNames.has(name) && !(allowSpecialCarMember && name === SPECIAL_CAR_MEMBER));
        const duplicateNames = draftRows.reduce<string[]>((names, row, index) => {
          const name = row.name.trim();
          if (name && draftRows.some((otherRow, otherIndex) => otherIndex !== index && otherRow.name.trim() === name) && !names.includes(name)) {
            return [...names, name];
          }
          return names;
        }, []);
        return (
          <EditableAccordionItem
            key={schedule.key}
            title={schedule.displayDate}
            summaryEnd={<Chip label={`${rows.length}명`} size="small" color={rows.length > 0 ? "primary" : "default"} variant={rows.length > 0 ? "filled" : "outlined"} />}
            isEditing={isEditing}
            onToggleEdit={() => openEditingVote(schedule.key, rows)}
            onSaveEdit={() => saveEditingVote(schedule, draftRows)}
            onCancelEdit={() => closeEditingVote(schedule.key)}
          >
            {isEditing ? (
              <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    addDraftRow(schedule.key);
                  }}
                >
                  추가
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                {rows.map(({ entry, index }) => (
                  <Chip key={`${entry.scheduleKey}-${index}`} label={entry.name || "이름 없음"} variant="outlined" />
                ))}
              </Stack>
            )}
            {validationMessage && <Alert severity="warning">{validationMessage}</Alert>}
            {(isEditing ? draftRows.length : rows.length) === 0 && <Alert severity="info">아직 입력된 명단이 없습니다.</Alert>}
            {isEditing &&
              draftRows.map((row) => (
                <Paper variant="outlined" sx={{ p: 1.25 }} key={row.id}>
                  <Grid container spacing={1} sx={{ alignItems: "center" }}>
                    <Grid size={{ xs: 9, md: 10 }}>
                      <TextField
                        size="small"
                        label="이름"
                        value={row.name}
                        error={Boolean(validationMessage) && (row.name.trim().length === 0 || duplicateNames.includes(row.name.trim()) || invalidNames.includes(row.name.trim()))}
                        onChange={(event) => updateDraftRow(schedule.key, row.id, event.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 3, md: 2 }} sx={{ textAlign: "right" }}>
                      <Button color="error" onClick={() => removeDraftRow(schedule.key, row.id)}>
                        삭제
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
          </EditableAccordionItem>
        );
      })}
    </Stack>
  );
}
