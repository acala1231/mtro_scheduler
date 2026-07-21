import { useEffect, useRef, type ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar, Box, CssBaseline, IconButton, ListItemIcon, Menu, MenuItem,
  Paper, Stack, ThemeProvider, Toolbar, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useLocation, useNavigate } from "react-router-dom";
import type { AppStep } from "../../domain/scheduleTypes";
import { STEP_DESCRIPTIONS, STEP_ICONS, STEPS, theme } from "../appConstants";
import { monthTitle } from "../appUtils";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { ScreenDescriptionButton } from "./ScreenDescriptionButton";

const WORKFLOW_STEPS: Array<{ id: AppStep; label: string }> = [
  { id: "home", label: "홈" }, { id: "settings", label: "일정편집" },
  { id: "votes", label: "투표결과" }, { id: "generate", label: "일정표" },
];

export function AppBackButton() {
  const navigate = useNavigate();
  return <IconButton edge="start" color="primary" aria-label="이전 화면으로 돌아가기" onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>;
}

export function RouteFocusHeading({ children }: { children: ReactNode }) {
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    headingRef.current?.focus();
  }, [location.pathname]);
  return <Typography ref={headingRef} component="h1" tabIndex={-1} variant="h6" noWrap sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.25rem" } }}>{children}</Typography>;
}

interface AppShellProps {
  children: ReactNode;
  step: AppStep;
  month: string;
  menuAnchor: HTMLElement | null;
  setMenuAnchor: (anchor: HTMLElement | null) => void;
  goToStep: (step: AppStep) => void;
}

export function AppShell({ children, step, month, menuAnchor, setMenuAnchor, goToStep }: AppShellProps) {
  const currentWorkflowIndex = WORKFLOW_STEPS.findIndex((item) => item.id === step);
  const appBarTitle = step === "home" ? "복사단 일정표" : (STEPS.find((item) => item.id === step)?.label ?? "복사단 일정표");
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 9 }}>
          <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Toolbar sx={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr) 96px", gap: 1 }}>
              <Box>{step !== "home" && <AppBackButton />}</Box>
              <Box sx={{ minWidth: 0, textAlign: "center" }}>
                <RouteFocusHeading>{appBarTitle}</RouteFocusHeading>
                <Typography variant="body2" color="text.secondary" noWrap>{monthTitle(month)}</Typography>
              </Box>
              <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                <ScreenDescriptionButton description={STEP_DESCRIPTIONS[step]} />
                <IconButton edge="end" color="primary" aria-label="화면 메뉴 열기" onClick={(event) => setMenuAnchor(event.currentTarget)}><MenuIcon /></IconButton>
              </Stack>
            </Toolbar>
          </AppBar>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {STEPS.map((item) => (
              <MenuItem key={item.id} selected={item.id === step} onClick={() => goToStep(item.id)} sx={{ minWidth: 180, "&.Mui-selected .MuiListItemIcon-root": { color: "primary.main" } }}>
                <ListItemIcon>{STEP_ICONS[item.id]}</ListItemIcon>{item.label}
              </MenuItem>
            ))}
          </Menu>
          {children}
          <Paper square elevation={4} sx={{ position: "fixed", right: 0, bottom: 0, left: 0, zIndex: (muiTheme) => muiTheme.zIndex.appBar, borderTop: 1, borderColor: "divider" }}>
            <Stack direction="row" sx={{ alignItems: "stretch", minHeight: 64, px: 0.75, py: 0.75 }}>
              {WORKFLOW_STEPS.map((item, index) => {
                const selected = item.id === step;
                const completed = currentWorkflowIndex >= 0 && index < currentWorkflowIndex;
                const color = selected ? "primary.main" : completed ? "text.primary" : "text.secondary";
                return (
                  <Box key={item.id} sx={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center" }}>
                    <Box component="button" type="button" onClick={() => goToStep(item.id)} aria-current={selected ? "page" : undefined} sx={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.35, border: 0, borderRadius: 1, bgcolor: selected ? "action.selected" : "transparent", color, cursor: "pointer", px: 0.25, py: 0.5, minHeight: 48 }}>
                      <Box sx={{ display: "grid", placeItems: "center", color, "& .MuiSvgIcon-root": { fontSize: 20 } }}>{STEP_ICONS[item.id]}</Box>
                      <Stack direction="row" spacing={0.4} sx={{ maxWidth: "100%", alignItems: "center", justifyContent: "center" }}>
                        <Typography noWrap variant="caption" sx={{ minWidth: 0, fontWeight: selected ? 900 : 700 }}>{item.label}</Typography>
                      </Stack>
                    </Box>
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
