import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import HomeIcon from "@mui/icons-material/Home";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { createTheme } from "@mui/material";
import type { AppStep, Role } from "../domain/scheduleTypes";

export const theme = createTheme({
  palette: {
    primary: { main: "#245886" },
    background: { default: "#f5f7f8" },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});

export const STEPS: Array<{ id: AppStep; label: string }> = [
  { id: "home", label: "홈" },
  { id: "settings", label: "일정편집" },
  { id: "votes", label: "투표결과" },
  { id: "generate", label: "일정표" },
  { id: "members", label: "명단" },
];

export const STEP_ICONS: Record<AppStep, React.ReactElement> = {
  home: <HomeIcon fontSize="small" />,
  settings: <EditCalendarIcon fontSize="small" />,
  votes: <FactCheckIcon fontSize="small" />,
  generate: <CalendarMonthIcon fontSize="small" />,
  members: <PeopleAltIcon fontSize="small" />,
};

export const ROLE_LABELS: Role[] = ["정", "부", "향", "향합", "초1", "초2", "십자가"];
