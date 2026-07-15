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
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SAMPLE_MEMBERS_CSV, membersToCsv } from "../../data/memberCsv";
import { downloadTextFile } from "../../export/downloadTextFile";
import type { Member, MembersFile } from "../../domain/scheduleTypes";
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

export function MembersScreen({
  memberQuery,
  membersFile,
  visibleMembers,
  memberError,
  importMembers,
  clearMembers,
  addMember,
  updateMember,
  deleteMember,
  setMemberQuery,
}: {
  memberQuery: string;
  membersFile: MembersFile | null;
  visibleMembers: Array<{ key: string; member: Member; index: number }>;
  memberError: string;
  importMembers: (file: File | undefined) => void;
  clearMembers: () => void;
  addMember: (patch: MemberDraft) => boolean;
  updateMember: (index: number, patch: MemberDraft) => boolean;
  deleteMember: (index: number) => void;
  setMemberQuery: (query: string) => void;
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
      title: "명단을 전체 삭제할까요?",
      message: "브라우저에 저장된 명단을 모두 삭제합니다. 필요한 경우 먼저 명단을 다운로드해 주세요.",
      confirmText: "전체 삭제",
      confirmColor: "warning",
      onConfirm: clearMembers,
    });
  }

  return (
    <Screen
      title="명단"
      description={
        "명단은 이 장치에만 저장됩니다.\n처음에는 샘플 양식을 내려받아 파일로 등록하거나 인원 추가로 직접 입력할 수 있습니다.\n명단이 등록된 뒤에는 각 카드의 메뉴에서 수정, 삭제할 수 있습니다.\n브라우저 사이트 데이터를 지우면 명단도 사라질 수 있으니 필요하면 명단 다운로드로 백업해 주세요.\n별칭은 카카오톡에 저장된 닉네임과 이름이 다를 경우 입력합니다."
      }
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Stack spacing={0.25}>
                <Typography variant="body2" color="text.secondary">
                  {membersFile ? `총 ${membersFile.members.length}명` : "총 0명"}
                </Typography>
              </Stack>
              <Stack
                direction={{ xs: hasMembers ? "row" : "column", sm: "row" }}
                sx={{
                  width: { xs: hasMembers ? "auto" : "100%", sm: "auto" },
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
                      { label: "전체 삭제", color: "warning", icon: <DeleteForeverIcon fontSize="small" />, onClick: deleteAllMembers },
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
            <TextField label="이름 검색" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="예: 홍길동" fullWidth />
          )}
          <Grid container spacing={1.5}>
            {isAddingMember && (
              <Grid size={{ xs: 12, md: 6 }}>
                <MemberCard
                  member={{
                    name: "",
                    baptismalName: "",
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
