import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import type { CarSchedule, Member, ServiceSchedule, ScheduleSettings, VoteData } from "../../domain/scheduleTypes";
import { Screen } from "../components/Screen";
import { VoteScheduleSections } from "../components/VoteScheduleSections";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

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
  selectVoteImage: (file: File | undefined) => void;
  clearVoteImage: () => void;
  setVoteImageDialogOpen: (open: boolean) => void;
  setVoteImageZoom: (value: number | ((zoom: number) => number)) => void;
  resetVotes: (kind: "service" | "car") => void;
  replaceVoteSchedule: (kind: "service" | "car", schedule: ServiceSchedule | CarSchedule, names: string[]) => void;
}) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const resetVoteEntries = (kind: "service" | "car") => {
    confirm({
      title: kind === "service" ? "복사일정 투표결과를 초기화할까요?" : "차량봉사 투표결과를 초기화할까요?",
      message: kind === "service"
        ? "현재 입력된 복사일정 투표 명단과 이미지에서 자동 추가된 복사일정을 삭제합니다. 직접 등록하거나 편집한 일정은 유지됩니다."
        : "현재 입력된 차량봉사 투표 명단과 이미지에서 자동 추가된 차량봉사일정을 삭제합니다. 직접 등록하거나 편집한 일정은 유지됩니다.",
      confirmText: "초기화",
      confirmColor: "warning",
      onConfirm: () => resetVotes(kind),
    });
  };

  return (
    <Screen
      title="투표"
      description={
        "카카오톡 투표결과 이미지를 선택하면 자동으로 투표 명단 입력을 시작합니다.\n입력된 결과는 복사일정과 차량봉사 일정별로 나뉘어 표시됩니다.\n각 일정 항목을 열어 이름을 추가, 수정, 삭제할 수 있습니다."
      }
    >
      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>카카오톡 투표결과 가져오기</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Button variant="outlined" component="label" disabled={isVoteConverting}>
                투표결과 이미지 선택
                <input type="file" accept="image/*" hidden onChange={(event) => selectVoteImage(event.target.files?.[0])} />
              </Button>
              {voteImageName && <Chip label={voteImageName} variant="outlined" onDelete={isVoteConverting ? undefined : clearVoteImage} />}
            </Stack>
            {voteImagePreviewUrl && (
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setVoteImageZoom(1);
                  setVoteImageDialogOpen(true);
                }}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  cursor: "pointer",
                  p: 0,
                  overflow: "hidden",
                  width: "100%",
                  maxWidth: 240,
                }}
              >
                <Box
                  component="img"
                  src={voteImagePreviewUrl}
                  alt="업로드한 투표결과 미리보기"
                  sx={{
                    display: "block",
                    width: "100%",
                    height: 120,
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
            <Dialog fullScreen open={voteImageDialogOpen} onClose={() => setVoteImageDialogOpen(false)}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, p: 1 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <IconButton aria-label="이미지 축소" onClick={() => setVoteImageZoom((zoom) => Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}>
                    <ZoomOutIcon />
                  </IconButton>
                  <Button variant="outlined" size="small" onClick={() => setVoteImageZoom(1)}>
                    {Math.round(voteImageZoom * 100)}%
                  </Button>
                  <IconButton aria-label="이미지 확대" onClick={() => setVoteImageZoom((zoom) => Math.min(3, Number((zoom + 0.25).toFixed(2))))}>
                    <ZoomInIcon />
                  </IconButton>
                </Stack>
                <IconButton aria-label="이미지 미리보기 닫기" onClick={() => setVoteImageDialogOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", p: 2 }}>
                <Box
                  component="img"
                  src={voteImagePreviewUrl}
                  alt="업로드한 투표결과 확대보기"
                  sx={{
                    display: "block",
                    width: `${voteImageZoom * 100}%`,
                    minWidth: voteImageZoom > 1 ? `${voteImageZoom * 100}%` : "auto",
                    maxWidth: "none",
                    maxHeight: "none",
                    objectFit: "contain",
                  }}
                />
              </Box>
            </Dialog>
            {isVoteConverting && (
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                  입력중 {voteConversionProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={voteConversionProgress} />
              </Stack>
            )}
            {voteConversionError && <Alert severity="error">{voteConversionError}</Alert>}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 800 }}>복사일정 투표결과 ({votes.serviceVotes.length}명)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" color="warning" disabled={isVoteConverting} onClick={() => resetVoteEntries("service")}>
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
              <Button variant="outlined" color="warning" disabled={isVoteConverting} onClick={() => resetVoteEntries("car")}>
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
