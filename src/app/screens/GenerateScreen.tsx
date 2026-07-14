import type { RefObject } from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Alert, Box, Button, Dialog, IconButton, Paper, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { CarResultRow, GenerateScheduleResult, ScheduleResultRow, ScheduleSettings, ValidationIssue } from "../../domain/scheduleTypes";
import { SchedulePreview } from "../components/SchedulePreview";
import { ScheduleResultEditor } from "../components/ScheduleResultEditor";
import { Screen } from "../components/Screen";

export function GenerateScreen({
  month,
  settings,
  result,
  allIssues,
  errorCount,
  canGenerate,
  schedulePreviewOpen,
  previewRef,
  runGenerate,
  setSchedulePreviewOpen,
  downloadImage,
  updateServiceResult,
  updateCarResult,
}: {
  month: string;
  settings: ScheduleSettings;
  result: GenerateScheduleResult | undefined;
  allIssues: ValidationIssue[];
  errorCount: number;
  canGenerate: boolean;
  schedulePreviewOpen: boolean;
  previewRef: RefObject<HTMLDivElement | null>;
  runGenerate: () => void;
  setSchedulePreviewOpen: (open: boolean) => void;
  downloadImage: () => void;
  updateServiceResult: (rowIndex: number, row: ScheduleResultRow) => void;
  updateCarResult: (rowIndex: number, row: CarResultRow) => void;
}) {
  return (
    <Screen
      title="일정표"
      description={
        "일정표 생성을 누르면 설정과 투표결과를 기준으로 일정표를 만듭니다.\n생성 후 각 일정의 배정자와 메모를 직접 수정할 수 있습니다.\n배정할 사람이 없는 칸은 없음으로 표시됩니다.\n생성된 일정표는 PNG로 저장할 수 있습니다."
      }
    >
      {errorCount > 0 && (
        <Stack spacing={1}>
          {allIssues
            .filter((issue) => issue.severity === "error")
            .map((issue, index) => (
              <Alert severity="error" key={`${issue.code}-${index}`}>
                {issue.message}
              </Alert>
            ))}
        </Stack>
      )}
      <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Button variant="contained" size="large" disabled={!canGenerate} startIcon={<PlayArrowIcon />} onClick={runGenerate}>
          {result ? "일정표 다시 생성" : "일정표 생성"}
        </Button>
        {result && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: "auto", textAlign: "right" }}>
            마지막 생성 {dayjs(result.generatedAt).format("HH:mm:ss")}
          </Typography>
        )}
      </Stack>
      {result ? (
        <>
          <Box
            sx={{
              position: "fixed",
              left: -10000,
              top: 0,
              width: 940,
              height: 1,
              overflow: "hidden",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <SchedulePreview key={`export-${result.generatedAt}`} refNode={previewRef} month={month} settings={settings} result={result} />
          </Box>
          <ScheduleResultEditor
            result={result}
            serviceSchedules={settings.serviceSchedules}
            onServiceSave={updateServiceResult}
            onCarSave={updateCarResult}
          />
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" startIcon={<CalendarMonthIcon />} onClick={() => setSchedulePreviewOpen(true)}>
              미리보기
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadImage}>
              PNG 저장
            </Button>
          </Stack>
          <Dialog fullScreen open={schedulePreviewOpen} onClose={() => setSchedulePreviewOpen(false)}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, p: 1 }}>
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadImage}>
                PNG 저장
              </Button>
              <IconButton aria-label="미리보기 닫기" onClick={() => setSchedulePreviewOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
              <SchedulePreview key={`dialog-${result.generatedAt}`} refNode={{ current: null }} month={month} settings={settings} result={result} />
            </Box>
          </Dialog>
        </>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Typography>아직 생성된 일정표가 없습니다.</Typography>
          </Stack>
        </Paper>
      )}
    </Screen>
  );
}
