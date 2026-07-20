import { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ko";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { saveLastMonth } from "../data/localScheduleStore";
import {
  type AppStep,
} from "../domain/scheduleTypes";
import { validateSettings, validateVotes, validateMembers } from "../domain/validators";
import { STEP_DESCRIPTIONS, STEP_ICONS, STEPS, theme } from "./appConstants";
import { firstDateOfMonth, issueCounts, monthFromDayjs, monthTitle } from "./appUtils";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import { ScreenDescriptionButton } from "./components/ScreenDescriptionButton";
import { useBackButtonClose } from "./hooks/useBackButtonClose";
import { useMembers } from "./hooks/useMembers";
import { useScheduleResult } from "./hooks/useScheduleResult";
import { useScheduleSnapshot } from "./hooks/useScheduleSnapshot";
import { useVoteOcr } from "./hooks/useVoteOcr";
import { useVoteCsvImport } from "./hooks/useVoteCsvImport";
import { GenerateScreen } from "./screens/GenerateScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { VotesScreen } from "./screens/VotesScreen";
import { MembersScreen } from "./screens/MembersScreen";

const WORKFLOW_STEPS: Array<{ id: AppStep; number: number; label: string }> = [
  { id: "home", number: 1, label: "홈" },
  { id: "settings", number: 2, label: "일정편집" },
  { id: "votes", number: 3, label: "투표결과" },
  { id: "generate", number: 4, label: "일정표" },
];

function stepFromHash(): AppStep | undefined {
  const hash = window.location.hash.replace(/^#/, "");
  return STEPS.some((item) => item.id === hash) ? (hash as AppStep) : undefined;
}

export function App() {
  const isApplyingHistoryRef = useRef(false);
  const [step, setStep] = useState<AppStep>(() => stepFromHash() ?? "home");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<HTMLElement | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [schedulePreviewOpen, setSchedulePreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const {
    month,
    setMonth,
    settings,
    votes,
    result,
    setSavedState,
    updateSettings,
    updateVotes,
    updateSettingsAndVotes,
    updateResult,
    invalidateResult,
  } = useScheduleSnapshot();

  const menuBackButtonClose = useBackButtonClose(Boolean(menuAnchor), () => setMenuAnchor(null));
  useBackButtonClose(Boolean(monthAnchor), () => setMonthAnchor(null));
  useBackButtonClose(schedulePreviewOpen, () => setSchedulePreviewOpen(false));

  useEffect(() => {
    const syncStepFromHash = () => {
      isApplyingHistoryRef.current = true;
      setStep(stepFromHash() ?? "home");
    };

    window.addEventListener("hashchange", syncStepFromHash);
    return () => window.removeEventListener("hashchange", syncStepFromHash);
  }, []);

  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }

    const currentStep = stepFromHash();
    if (currentStep === step || (!currentStep && step === "home")) return;
    window.history.pushState(null, "", step === "home" ? window.location.pathname + window.location.search : `#${step}`);
  }, [step]);

  const {
    sourceMembers,
    members,
    membersFile,
    memberError,
    importMembers,
    clearMembers,
    addMember,
    updateMember,
    deleteMember,
    visibleMembers: visibleMembersForQuery,
  } = useMembers({
    result,
    onMembersChanged: () => {
      invalidateResult();
    },
  });
  const allIssues = useMemo(() => {
    return [
      ...validateMembers(members),
      ...validateSettings(settings),
      ...validateVotes(settings, members, votes),
      ...(result?.issues ?? []),
    ];
  }, [result?.issues, settings, votes, members]);
  const counts = issueCounts(allIssues);
  const canGenerate = members.length > 0 && counts.errors === 0;
  const visibleMembers = visibleMembersForQuery(memberQuery);
  const selectedMonth = dayjs(firstDateOfMonth(month));
  const {
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
  } = useVoteOcr({ month, settings, members, updateSettingsAndVotes });
  const { voteCsvName, voteCsvError, isVoteCsvImporting, selectVoteCsv, clearVoteCsv } = useVoteCsvImport({ month, members, updateSettingsAndVotes });
  useBackButtonClose(voteImageDialogOpen, () => setVoteImageDialogOpen(false));
  const currentWorkflowIndex = WORKFLOW_STEPS.findIndex((item) => item.id === step);
  const appBarTitle = step === "home" ? "복사단 일정표" : (STEPS.find((item) => item.id === step)?.label ?? "복사단 일정표");
  const {
    addServiceSchedule,
    addCarSchedule,
    resetServiceSchedules,
    resetCarSchedules,
    resetScheduleColors,
    updateServiceSchedule,
    updateCarSchedule,
    resetVotes,
    replaceVoteSchedule,
    updateServiceResult,
    updateCarResult,
    runGenerate,
    downloadImage,
  } = useScheduleResult({
    month,
    settings,
    votes,
    result,
    sourceMembers,
    canGenerate,
    previewRef,
    updateSettings,
    updateVotes,
    updateSettingsAndVotes,
    updateResult,
    setSavedState,
  });

  function goToStep(next: AppStep) {
    setStep(next);
    menuBackButtonClose.closeWithoutHistoryBack();
  }

  function toggleSchedulePreview(open: boolean) {
    setSchedulePreviewOpen(open);
  }

  function selectMonth(value: Dayjs | null) {
    const nextMonth = monthFromDayjs(value);
    saveLastMonth(nextMonth);
    setMonth(nextMonth);
    setMonthAnchor(null);
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 9 }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Toolbar sx={{ position: "relative", gap: 1.5, justifyContent: "space-between" }}>
            <Box sx={{ width: 88, flexShrink: 0 }}>
              {step !== "home" && (
                <IconButton edge="start" color="primary" aria-label="홈으로 돌아가기" onClick={() => setStep("home")}>
                  <ArrowBackIcon />
                </IconButton>
              )}
            </Box>
            <Box
              sx={{
                position: "absolute",
                left: 104,
                right: 104,
                top: "50%",
                minWidth: 0,
                textAlign: "center",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <Typography
                component="h1"
                variant="h6"
                noWrap
                sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.25rem" } }}
              >
                {appBarTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {monthTitle(month)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", ml: "auto" }}>
              <ScreenDescriptionButton description={STEP_DESCRIPTIONS[step]} />
              <IconButton edge="end" color="primary" aria-label="화면 메뉴 열기" onClick={(event) => setMenuAnchor(event.currentTarget)}>
                <MenuIcon />
              </IconButton>
            </Stack>
          </Toolbar>
        </AppBar>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          {STEPS.map((item) => (
            <MenuItem
              key={item.id}
              selected={item.id === step}
              onClick={() => goToStep(item.id)}
              sx={{
                minWidth: 180,
                "&.Mui-selected .MuiListItemIcon-root": {
                  color: "primary.main",
                },
              }}
            >
              <ListItemIcon>{STEP_ICONS[item.id]}</ListItemIcon>
              {item.label}
            </MenuItem>
          ))}
        </Menu>

        <Container maxWidth="lg" sx={{ py: 3 }}>
          {step === "home" && (
            <HomeScreen
              month={month}
              selectedMonth={selectedMonth}
              monthAnchor={monthAnchor}
              memberError={memberError}
              setMonthAnchor={setMonthAnchor}
              setMonth={setMonth}
              selectMonth={selectMonth}
              setStep={setStep}
            />
          )}

          {step === "settings" && (
            <SettingsScreen
              settings={settings}
              updateSettings={updateSettings}
              updateServiceSchedule={updateServiceSchedule}
              updateCarSchedule={updateCarSchedule}
              addServiceSchedule={addServiceSchedule}
              addCarSchedule={addCarSchedule}
              resetServiceSchedules={resetServiceSchedules}
              resetCarSchedules={resetCarSchedules}
              resetScheduleColors={resetScheduleColors}
            />
          )}

          {step === "votes" && (
            <VotesScreen
              settings={settings}
              members={members}
              votes={votes}
              voteImageName={voteImageName}
              voteImagePreviewUrl={voteImagePreviewUrl}
              voteImageDialogOpen={voteImageDialogOpen}
              voteImageZoom={voteImageZoom}
              voteConversionProgress={voteConversionProgress}
              voteConversionError={voteConversionError}
              isVoteConverting={isVoteConverting}
              voteCsvName={voteCsvName}
              voteCsvError={voteCsvError}
              isVoteCsvImporting={isVoteCsvImporting}
              selectVoteCsv={selectVoteCsv}
              clearVoteCsv={clearVoteCsv}
              selectVoteImage={selectVoteImage}
              clearVoteImage={clearVoteImage}
              setVoteImageDialogOpen={setVoteImageDialogOpen}
              setVoteImageZoom={setVoteImageZoom}
              resetVotes={resetVotes}
              replaceVoteSchedule={replaceVoteSchedule}
            />
          )}

          {step === "generate" && (
            <GenerateScreen
              month={month}
              settings={settings}
              members={sourceMembers}
              result={result}
              allIssues={allIssues}
              errorCount={counts.errors}
              canGenerate={canGenerate}
              schedulePreviewOpen={schedulePreviewOpen}
              previewRef={previewRef}
              runGenerate={runGenerate}
              setSchedulePreviewOpen={toggleSchedulePreview}
              downloadImage={downloadImage}
              updateServiceResult={updateServiceResult}
              updateCarResult={updateCarResult}
            />
          )}

          {step === "members" && (
            <MembersScreen
              memberQuery={memberQuery}
              membersFile={membersFile}
              visibleMembers={visibleMembers}
              memberError={memberError}
              importMembers={importMembers}
              clearMembers={clearMembers}
              addMember={addMember}
              updateMember={updateMember}
              deleteMember={deleteMember}
              setMemberQuery={setMemberQuery}
            />
          )}

          {(step === "settings" || step === "votes") && (
            <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                endIcon={<ChevronRightIcon />}
                onClick={() => setStep(step === "settings" ? "votes" : "generate")}
              >
                다음
              </Button>
            </Stack>
          )}
        </Container>

        <Paper
          square
          elevation={4}
          sx={{
            position: "fixed",
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: (muiTheme) => muiTheme.zIndex.appBar,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack direction="row" sx={{ alignItems: "stretch", minHeight: 64, px: 0.75, py: 0.75 }}>
            {WORKFLOW_STEPS.map((item, index) => {
              const selected = item.id === step;
              const completed = currentWorkflowIndex >= 0 && index < currentWorkflowIndex;
              const color = selected ? "primary.main" : completed ? "text.primary" : "text.secondary";

              return (
                <Box key={item.id} sx={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center" }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setStep(item.id)}
                    sx={{
                      display: "flex",
                      flex: 1,
                      minWidth: 0,
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.35,
                      border: 0,
                      borderRadius: 1,
                      bgcolor: selected ? "#eaf3fb" : "transparent",
                      color,
                      cursor: "pointer",
                      px: 0.25,
                      py: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        color,
                        "& .MuiSvgIcon-root": {
                          fontSize: 20,
                        },
                      }}
                    >
                      {STEP_ICONS[item.id]}
                    </Box>
                    <Stack direction="row" spacing={0.4} sx={{ maxWidth: "100%", alignItems: "center", justifyContent: "center" }}>
                      <Typography variant="caption" sx={{ flexShrink: 0, fontWeight: 900 }}>
                        {item.number}
                      </Typography>
                      <Typography noWrap variant="caption" sx={{ minWidth: 0, fontWeight: selected ? 900 : 700 }}>
                        {item.label}
                      </Typography>
                    </Stack>
                  </Box>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRightIcon
                      aria-hidden="true"
                      sx={{
                        flexShrink: 0,
                        alignSelf: "center",
                        color: index < currentWorkflowIndex ? "primary.main" : "divider",
                        fontSize: 18,
                        mx: 0.1,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Paper>
        <PwaInstallPrompt />
        <PwaUpdatePrompt />
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
