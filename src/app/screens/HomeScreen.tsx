import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { Alert, Box, Button, Grid, IconButton, Paper, Popover, Stack, Typography } from "@mui/material";
import { MonthCalendar } from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";
import type { AppStep } from "../../domain/scheduleTypes";
import { monthTitle } from "../appUtils";
import { Screen } from "../components/Screen";

export function HomeScreen({
  month,
  selectedMonth,
  monthAnchor,
  memberError,
  setMonthAnchor,
  setMonth,
  selectMonth,
  setStep,
}: {
  month: string;
  selectedMonth: Dayjs;
  monthAnchor: HTMLElement | null;
  memberError: string;
  setMonthAnchor: (anchor: HTMLElement | null) => void;
  setMonth: (month: string) => void;
  selectMonth: (value: Dayjs | null) => void;
  setStep: (step: AppStep) => void;
}) {
  return (
    <Screen
      title="홈"
      description={
        "먼저 기준월을 선택한 뒤 일정편집, 투표결과 입력 순서로 진행합니다.\n기준월 영역을 누르면 월 선택 달력이 열립니다."
      }
    >
      <Paper
        variant="outlined"
        role="button"
        tabIndex={0}
        onClick={(event) => setMonthAnchor(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setMonthAnchor(event.currentTarget);
          }
        }}
        sx={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          p: 1,
          cursor: "pointer",
          "&:focus-visible": {
            outline: "3px solid",
            outlineColor: "primary.light",
            outlineOffset: 2,
          },
        }}
      >
        <Button
          variant="text"
          size="large"
          startIcon={<CalendarMonthIcon />}
          tabIndex={-1}
          sx={{ px: 2, fontWeight: 900, fontSize: "1.25rem" }}
        >
          {monthTitle(month)}
        </Button>
      </Paper>
      <Popover
        open={Boolean(monthAnchor)}
        anchorEl={monthAnchor}
        onClose={() => setMonthAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", px: 1, py: 0.5 }}>
            <IconButton aria-label="이전 연도" onClick={() => setMonth(selectedMonth.subtract(1, "year").format("YYYY-MM"))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {selectedMonth.format("YYYY년")}
            </Typography>
            <IconButton aria-label="다음 연도" onClick={() => setMonth(selectedMonth.add(1, "year").format("YYYY-MM"))}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          <MonthCalendar value={selectedMonth} onChange={selectMonth} referenceDate={selectedMonth} />
        </Box>
      </Popover>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<EditCalendarIcon />}
            onClick={() => setStep("settings")}
            sx={{
              minHeight: 104,
              position: "relative",
              justifyContent: "center",
              px: 3,
              fontSize: "1.1rem",
              fontWeight: 900,
              bgcolor: "#d6e9f8",
              borderColor: "#79acd3",
              color: "#164a73",
              "&:hover": {
                bgcolor: "#c4def1",
                borderColor: "#5f9ccc",
              },
            }}
          >
            일정편집
          </Button>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<FactCheckIcon />}
            onClick={() => setStep("votes")}
            sx={{
              minHeight: 104,
              position: "relative",
              justifyContent: "center",
              px: 3,
              fontSize: "1.1rem",
              fontWeight: 900,
              bgcolor: "#dde3ea",
              borderColor: "#8b97a6",
              color: "#344054",
              "&:hover": {
                bgcolor: "#ccd5df",
                borderColor: "#758397",
              },
            }}
          >
            투표결과 입력
          </Button>
        </Grid>
      </Grid>
      {memberError && <Alert severity="error">{memberError}</Alert>}
    </Screen>
  );
}
