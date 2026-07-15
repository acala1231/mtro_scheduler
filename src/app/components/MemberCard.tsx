import { useState } from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, TextField, Typography } from "@mui/material";
import { BASE_ROLES, type BaseRole, type CountRole, type Member } from "../../domain/scheduleTypes";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ActionMenu } from "./ActionMenu";

export type MemberDraft = Pick<Member, "name" | "baptismalName" | "alias" | "roles">;

const OPTIONAL_COUNT_ROLES: CountRole[] = ["정", "부", "향", "향합", "초1", "초2", "십자가", "차량"];

function createMemberDraft(member: Member): MemberDraft {
  return {
    name: member.name,
    baptismalName: member.baptismalName,
    alias: member.alias,
    roles: { ...member.roles },
  };
}

function countLabel(role: CountRole, count: number) {
  return `${role} ${count}`;
}

function totalAssignmentCount(member: Member) {
  return OPTIONAL_COUNT_ROLES.reduce((sum, role) => sum + member.counts[role], 0);
}

export function MemberCard({
  member,
  startInEditMode = false,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  member: Member;
  startInEditMode?: boolean;
  onSave: (patch: MemberDraft) => boolean;
  onDelete: () => void;
  onCancelEdit?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [draft, setDraft] = useState<MemberDraft>(() => createMemberDraft(member));
  const currentRoles = isEditing ? draft.roles : member.roles;
  const { confirm, confirmDialog } = useConfirmDialog();

  function startEditing() {
    setDraft(createMemberDraft(member));
    setIsEditing(true);
  }

  function cancelEditing() {
    if (onCancelEdit) {
      onCancelEdit();
      return;
    }

    setDraft(createMemberDraft(member));
    setIsEditing(false);
  }

  function saveEditing() {
    if (onSave(draft)) {
      setIsEditing(false);
    }
  }

  function deleteMember() {
    confirm({
      title: "인원을 삭제할까요?",
      message: `${member.name} ${member.baptismalName ?? ""}`.trim() + " 명단을 삭제합니다.",
      confirmText: "삭제",
      confirmColor: "error",
      onConfirm: onDelete,
    });
  }

  function updateDraft(patch: Partial<MemberDraft>) {
    setDraft((current) => ({
      ...current,
      ...patch,
      roles: patch.roles ? { ...current.roles, ...patch.roles } : current.roles,
    }));
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField label="이름" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} fullWidth size="small" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="세례명"
                      value={draft.baptismalName ?? ""}
                      onChange={(event) => updateDraft({ baptismalName: event.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="별칭"
                      value={draft.alias ?? ""}
                      onChange={(event) => updateDraft({ alias: event.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
                  <Typography variant="h6">{member.name}</Typography>
                  {member.baptismalName && (
                    <Typography variant="body2" color="text.secondary">
                      {member.baptismalName}
                    </Typography>
                  )}
                  {member.alias && (
                    <Typography variant="body2" color="text.secondary">
                      {member.alias}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
            {!isEditing && (
              <Stack sx={{ flexShrink: 0, mt: -0.5 }}>
                <ActionMenu ariaLabel="명단 메뉴" items={[{ label: "수정", onClick: startEditing }, { label: "삭제", color: "error", onClick: deleteMember }]} />
              </Stack>
            )}
          </Stack>

          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
            {BASE_ROLES.map((role) => (
              <Chip
                key={role}
                label={role}
                onClick={
                  isEditing
                    ? () => updateDraft({ roles: { ...draft.roles, [role]: !draft.roles[role] } as Record<BaseRole, boolean> })
                    : undefined
                }
                color={currentRoles[role] ? "primary" : "default"}
                variant={currentRoles[role] ? "filled" : "outlined"}
                size="small"
                aria-pressed={isEditing ? currentRoles[role] : undefined}
                sx={isEditing ? { cursor: "pointer" } : undefined}
              />
            ))}
          </Stack>
          <Box sx={{ py: 1.25 }}>
            <Divider />
          </Box>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              이번 달 배정 횟수 총 {totalAssignmentCount(member)}회
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
              {OPTIONAL_COUNT_ROLES.filter((role) => member.counts[role] > 0).map((role) => (
                <Chip key={role} label={countLabel(role, member.counts[role])} size="small" variant="outlined" />
              ))}
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}>
            {isEditing ? (
              <>
                <Button variant="outlined" size="small" onClick={cancelEditing}>
                  취소
                </Button>
                <Button variant="contained" size="small" onClick={saveEditing}>
                  저장
                </Button>
              </>
            ) : (
              null
            )}
          </Stack>
        </Stack>
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
