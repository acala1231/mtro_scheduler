import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SAMPLE_MEMBERS_CSV, membersToCsv } from "../../data/memberCsv";
import { downloadTextFile } from "../../export/downloadTextFile";
import type { Member, MembersFile } from "../../domain/scheduleTypes";
import type { MemberSortKey } from "../../domain/memberSorting";
import { memberCountLabel } from "../memberListPresentation";
import { ActionMenu } from "../components/ActionMenu";
import { MemberCard, type MemberDraft } from "../components/MemberCard";
import { Screen } from "../components/Screen";
import { useBackButtonClose } from "../hooks/useBackButtonClose";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

function downloadSampleMembersCsv() {
  downloadTextFile(SAMPLE_MEMBERS_CSV, "members.sample.csv", "text/csv;charset=utf-8");
}

function downloadCurrentMembersCsv(members: Member[]) {
  downloadTextFile(membersToCsv(members), "members.csv", "text/csv;charset=utf-8");
}

export function MemberCountStatus({ query, visibleCount, totalCount }: { query: string; visibleCount: number; totalCount: number }) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      sx={{ flexShrink: 0 }}
    >
      {memberCountLabel(query, visibleCount, totalCount)}
    </Typography>
  );
}

export function MembersScreen({
  memberQuery,
  memberSortKey,
  membersFile,
  visibleMembers,
  memberError,
  memberSuccess,
  importMembers,
  clearMembers,
  addMember,
  updateMember,
  deleteMember,
  setMemberQuery,
  setMemberSortKey,
}: {
  memberQuery: string;
  memberSortKey: MemberSortKey;
  membersFile: MembersFile | null;
  visibleMembers: Array<{ key: string; member: Member; index: number }>;
  memberError: string;
  memberSuccess: string;
  importMembers: (file: File | undefined) => void;
  clearMembers: () => void;
  addMember: (patch: MemberDraft) => boolean;
  updateMember: (index: number, patch: MemberDraft) => boolean;
  deleteMember: (index: number) => void;
  setMemberQuery: (query: string) => void;
  setMemberSortKey: (sortKey: MemberSortKey) => void;
}) {
  const hasMembers = Boolean(membersFile?.members.length);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const confirmBackButtonClose = useBackButtonClose(confirmImportOpen, () => setConfirmImportOpen(false));
  const { confirm, confirmDialog } = useConfirmDialog();

  function openMemberFileInput() {
    fileInputRef.current?.click();
  }

  function handleImportButtonClick() {
    if (hasMembers) {
      setConfirmImportOpen(true);
      return;
    }

    openMemberFileInput();
  }

  function confirmImportMembers() {
    confirmBackButtonClose.closeWithoutHistoryBack();
    window.setTimeout(openMemberFileInput, 0);
  }

  function downloadMembersFile() {
    if (hasMembers && membersFile) {
      downloadCurrentMembersCsv(membersFile.members);
      return;
    }

    downloadSampleMembersCsv();
  }

  function deleteAllMembers() {
    confirm({
      title: "저장된 명단만 전체 삭제할까요?",
      message: "브라우저에 저장된 명단만 삭제합니다. 월별 일정과 투표결과는 유지됩니다. 필요한 경우 먼저 명단을 다운로드해 주세요.",
      confirmText: "전체 삭제",
      confirmColor: "error",
      onConfirm: clearMembers,
    });
  }

  return (
    <Screen>
      <Alert severity="info">명단은 현재 브라우저에만 저장됩니다. 기기 변경이나 브라우저 데이터 삭제에 대비해 명단을 주기적으로 다운로드해 백업해 주세요.</Alert>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Stack
                direction={{ xs: hasMembers ? "row" : "column", sm: "row" }}
                sx={{
                  width: { xs: hasMembers ? "auto" : "100%", sm: "auto" },
                  ml: "auto",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
                {!hasMembers && (
                  <>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadMembersFile} sx={{ width: { xs: "100%", sm: "auto" } }}>
                      샘플 양식 다운로드
                    </Button>
                    <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handleImportButtonClick} sx={{ width: { xs: "100%", sm: "auto" } }}>
                      파일로 명단 등록
                    </Button>
                  </>
                )}
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIsAddingMember(true)}>
                  인원 추가
                </Button>
                {hasMembers && (
                  <ActionMenu
                    ariaLabel="명단 파일 메뉴"
                    items={[
                      { label: "명단 다운로드", icon: <DownloadIcon fontSize="small" />, onClick: downloadMembersFile },
                      { label: "파일로 명단 등록", icon: <UploadFileIcon fontSize="small" />, onClick: handleImportButtonClick },
                      { label: "전체 삭제", color: "error", icon: <DeleteForeverIcon fontSize="small" />, onClick: deleteAllMembers },
                    ]}
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="text/csv,.csv"
                  hidden
                  onChange={(event) => {
                    importMembers(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </Stack>
            </Stack>
            {memberError && <Alert severity={membersFile ? "error" : "warning"}>{memberError}</Alert>}
            {memberSuccess && <Alert severity="success">{memberSuccess}</Alert>}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={confirmImportOpen} onClose={() => setConfirmImportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>명단을 다시 등록할까요?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            새 명단 파일을 등록하면 현재 브라우저에 저장된 명단이 선택한 파일의 내용으로 교체됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmImportOpen(false)}>취소</Button>
          <Button variant="contained" onClick={confirmImportMembers}>
            파일 선택
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}

      {(membersFile || isAddingMember) && (
        <>
          {membersFile && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
              <TextField size="small" label="이름·세례명·축일·별칭 검색" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="예: 홍길동, 베드로, 06/29" fullWidth />
              <FormControl size="small" sx={{ minWidth: { sm: 150 } }}>
                <InputLabel id="member-sort-label">정렬 기준</InputLabel>
                <Select
                  labelId="member-sort-label"
                  label="정렬 기준"
                  value={memberSortKey}
                  onChange={(event) => setMemberSortKey(event.target.value as MemberSortKey)}
                >
                  <MenuItem value="name">이름순</MenuItem>
                  <MenuItem value="baptismalName">세례명순</MenuItem>
                  <MenuItem value="feastDay">축일순</MenuItem>
                  <MenuItem value="assignmentCount">배정 적은순</MenuItem>
                  <MenuItem value="assignmentCountDesc">배정 많은순</MenuItem>
                </Select>
              </FormControl>
              <MemberCountStatus query={memberQuery} visibleCount={visibleMembers.length} totalCount={membersFile.members.length} />
            </Stack>
          )}
          <Grid container spacing={1.5}>
            {isAddingMember && (
              <Grid size={{ xs: 12, md: 6 }}>
                <MemberCard
                  member={{
                    name: "",
                    baptismalName: "",
                    feastDay: "",
                    alias: "",
                    roles: { 정: true, 부: true, 향: true, 향합: true },
                    counts: { 전체: 0, 정: 0, 부: 0, 향: 0, 향합: 0, 초1: 0, 초2: 0, 십자가: 0, 차량: 0 },
                  }}
                  startInEditMode
                  onSave={(patch) => {
                    const saved = addMember(patch);
                    if (saved) setIsAddingMember(false);
                    return saved;
                  }}
                  onCancelEdit={() => setIsAddingMember(false)}
                  onDelete={() => setIsAddingMember(false)}
                />
              </Grid>
            )}
            {visibleMembers.map(({ key, member, index }) => (
              <Grid size={{ xs: 12, md: 6 }} key={key}>
                <MemberCard member={member} onSave={(patch) => updateMember(index, patch)} onDelete={() => deleteMember(index)} />
              </Grid>
            ))}
          </Grid>
          {membersFile && memberQuery.trim() && visibleMembers.length === 0 && (
            <Alert severity="info">검색 결과가 없습니다.</Alert>
          )}
        </>
      )}
    </Screen>
  );
}
