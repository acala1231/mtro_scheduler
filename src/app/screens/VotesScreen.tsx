import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ImageIcon from "@mui/icons-material/Image";
import TableViewIcon from "@mui/icons-material/TableView";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, Divider, IconButton, LinearProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { CarSchedule, Member, ServiceSchedule, ScheduleSettings, VoteData } from "../../domain/scheduleTypes";
import { Screen } from "../components/Screen";
import { VoteScheduleSections } from "../components/VoteScheduleSections";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useEffect, useRef, useState } from "react";
import { SAMPLE_VOTE_CSV } from "../../data/voteCsvRepository";
import { downloadTextFile } from "../../export/downloadTextFile";

function downloadSampleVoteCsv() {
  downloadTextFile(SAMPLE_VOTE_CSV, "vote-results.sample.csv", "text/csv;charset=utf-8");
}

export function VotesScreen({
  settings,
  members,
  votes,
  voteImageName,
  voteImagePreviewUrl,
  voteImageDialogOpen,
  voteImageZoom,
  voteConversionProgress,
  voteConversionError,
  isVoteConverting,
  voteCsvName,
  voteCsvError,
  isVoteCsvImporting,
  selectVoteCsv,
  clearVoteCsv,
  selectVoteImage,
  clearVoteImage,
  setVoteImageDialogOpen,
  setVoteImageZoom,
  resetVotes,
  replaceVoteSchedule,
}: {
  settings: ScheduleSettings;
  members: Member[];
  votes: VoteData;
  voteImageName: string;
  voteImagePreviewUrl: string;
  voteImageDialogOpen: boolean;
  voteImageZoom: number;
  voteConversionProgress: number;
  voteConversionError: string;
  isVoteConverting: boolean;
  voteCsvName: string;
  voteCsvError: string;
  isVoteCsvImporting: boolean;
  selectVoteCsv: (file: File | undefined) => void;
  clearVoteCsv: () => void;
  selectVoteImage: (file: File | undefined) => void;
  clearVoteImage: () => void;
  setVoteImageDialogOpen: (open: boolean) => void;
  setVoteImageZoom: (value: number | ((zoom: number) => number)) => void;
  resetVotes: (kind: "service" | "car") => void;
  replaceVoteSchedule: (kind: "service" | "car", schedule: ServiceSchedule | CarSchedule, names: string[]) => void;
}) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [importTab, setImportTab] = useState<"image" | "csv">("image");
  const isImporting = isVoteConverting || isVoteCsvImporting;
  const importGuardRef = useRef(false);
  useEffect(() => {
    importGuardRef.current = isImporting;
  }, [isImporting]);
  const startImport = (file: File | undefined, selectFile: (selectedFile: File | undefined) => void) => {
    if (!file || importGuardRef.current) return;
    importGuardRef.current = true;
    selectFile(file);
  };
  const resetVoteEntries = (kind: "service" | "car") => {
    confirm({
      title: kind === "service" ? "복사일정 투표결과를 초기화할까요?" : "차량봉사 투표결과를 초기화할까요?",
      message: kind === "service"
        ? "현재 입력된 복사일정 투표 명단과 가져오기에서 자동 추가된 복사일정을 삭제합니다. 직접 등록하거나 편집한 일정은 유지됩니다."
        : "현재 입력된 차량봉사 투표 명단과 가져오기에서 자동 추가된 차량봉사일정을 삭제합니다. 직접 등록하거나 편집한 일정은 유지됩니다.",
      confirmText: "초기화",
      confirmColor: "warning",
      onConfirm: () => resetVotes(kind),
    });
  };

  return (
    <Screen>
      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>카카오톡 투표결과 가져오기</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Tabs
            value={importTab}
            onChange={(_event, value: "image" | "csv") => setImportTab(value)}
            variant="fullWidth"
            aria-label="투표결과 가져오기 방식"
          >
            <Tab
              id="vote-import-tab-image"
              aria-controls="vote-import-panel-image"
              value="image"
              icon={<ImageIcon />}
              iconPosition="start"
              label="이미지 업로드"
              disabled={isImporting}
            />
            <Tab
              id="vote-import-tab-csv"
              aria-controls="vote-import-panel-csv"
              value="csv"
              icon={<TableViewIcon />}
              iconPosition="start"
              label="CSV 업로드"
              disabled={isImporting}
            />
          </Tabs>
          <Divider />
          <Box
            role="tabpanel"
            id="vote-import-panel-image"
            aria-labelledby="vote-import-tab-image"
            hidden={importTab !== "image"}
            sx={{ pt: 2 }}
          >
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">카카오톡 투표 화면을 캡처한 이미지를 선택하면 바로 분석합니다.</Typography>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <Button variant="contained" component="label" startIcon={<ImageIcon />} disabled={isImporting} sx={{ width: { xs: "100%", sm: "auto" } }}>
                    투표결과 이미지 선택
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) => {
                        startImport(event.target.files?.[0], selectVoteImage);
                        event.target.value = "";
                      }}
                    />
                  </Button>
                  {voteImageName && <Chip label={voteImageName} variant="outlined" onDelete={isImporting ? undefined : clearVoteImage} />}
                </Stack>
                {voteImagePreviewUrl && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => {
                      setVoteImageZoom(1);
                      setVoteImageDialogOpen(true);
                    }}
                    sx={{ border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", cursor: "pointer", p: 0, overflow: "hidden", width: "100%", maxWidth: 240 }}
                  >
                    <Box component="img" src={voteImagePreviewUrl} alt="업로드한 투표결과 미리보기" sx={{ display: "block", width: "100%", height: 120, objectFit: "contain" }} />
                  </Box>
                )}
                <Dialog fullScreen open={voteImageDialogOpen} onClose={() => setVoteImageDialogOpen(false)}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, p: 1 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      <IconButton aria-label="이미지 축소" onClick={() => setVoteImageZoom((zoom) => Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}><ZoomOutIcon /></IconButton>
                      <Button variant="outlined" size="small" onClick={() => setVoteImageZoom(1)}>{Math.round(voteImageZoom * 100)}%</Button>
                      <IconButton aria-label="이미지 확대" onClick={() => setVoteImageZoom((zoom) => Math.min(3, Number((zoom + 0.25).toFixed(2))))}><ZoomInIcon /></IconButton>
                    </Stack>
                    <IconButton aria-label="이미지 미리보기 닫기" onClick={() => setVoteImageDialogOpen(false)}><CloseIcon /></IconButton>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", p: 2 }}>
                    <Box component="img" src={voteImagePreviewUrl} alt="업로드한 투표결과 확대보기" sx={{ display: "block", width: `${voteImageZoom * 100}%`, minWidth: voteImageZoom > 1 ? `${voteImageZoom * 100}%` : "auto", maxWidth: "none", maxHeight: "none", objectFit: "contain" }} />
                  </Box>
                </Dialog>
                {isVoteConverting && (
                  <Stack spacing={0.75}>
                    <Typography variant="body2" color="text.secondary">이미지 분석 중 {voteConversionProgress}%</Typography>
                    <LinearProgress aria-label="이미지 분석 진행률" variant="determinate" value={voteConversionProgress} />
                  </Stack>
                )}
                {voteConversionError && <Alert severity="error">{voteConversionError}</Alert>}
            </Stack>
          </Box>
          <Box
            role="tabpanel"
            id="vote-import-panel-csv"
            aria-labelledby="vote-import-tab-csv"
            hidden={importTab !== "csv"}
            sx={{ pt: 2 }}
          >
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">구분, 날짜, 시간, 이름 순서의 CSV 파일을 선택하면 바로 투표결과를 가져옵니다.</Typography>
                <Box><Typography variant="caption" color="text.secondary">구분에는 복사일정 또는 차량봉사를 입력해 주세요.</Typography></Box>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadSampleVoteCsv} sx={{ width: { xs: "100%", sm: "auto" } }}>샘플 양식 다운로드</Button>
                  <Button variant="contained" component="label" startIcon={<UploadFileIcon />} disabled={isImporting} sx={{ width: { xs: "100%", sm: "auto" } }}>
                    투표결과 CSV 선택
                    <input
                      type="file"
                      accept="text/csv,.csv"
                      hidden
                      onChange={(event) => {
                        startImport(event.target.files?.[0], selectVoteCsv);
                        event.target.value = "";
                      }}
                    />
                  </Button>
                  {voteCsvName && <Chip label={voteCsvName} variant="outlined" onDelete={isImporting ? undefined : clearVoteCsv} />}
                </Stack>
                {isVoteCsvImporting && (
                  <Stack spacing={0.75}>
                    <Typography variant="body2" color="text.secondary">CSV 가져오는 중</Typography>
                    <LinearProgress aria-label="CSV 가져오기 진행률" />
                  </Stack>
                )}
                {voteCsvError && <Alert severity="error">{voteCsvError}</Alert>}
            </Stack>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>복사일정 투표결과 ({votes.serviceVotes.length}명)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" color="warning" disabled={isImporting} onClick={() => resetVoteEntries("service")}>
                초기화
              </Button>
            </Stack>
            <VoteScheduleSections
              entries={votes.serviceVotes}
              schedules={settings.serviceSchedules}
              members={members}
              onSaveSchedule={(schedule, names) => replaceVoteSchedule("service", schedule, names)}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>차량봉사 투표결과 ({votes.carVotes.length}명)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" color="warning" disabled={isImporting} onClick={() => resetVoteEntries("car")}>
                초기화
              </Button>
            </Stack>
            <VoteScheduleSections
              entries={votes.carVotes}
              schedules={settings.carSchedules}
              members={members}
              allowSpecialCarMember
              onSaveSchedule={(schedule, names) => replaceVoteSchedule("car", schedule, names)}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
      {confirmDialog}
    </Screen>
  );
}
