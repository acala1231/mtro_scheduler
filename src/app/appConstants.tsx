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

export const STEP_DESCRIPTIONS: Record<AppStep, string> = {
  home: "먼저 기준월을 선택한 뒤 일정편집, 투표결과 입력 순서로 진행합니다.\n기준월 영역을 누르면 월 선택 달력이 열립니다.",
  settings: "해당 월에 사용할 복사일정과 차량봉사일정을 확인하고 수정합니다.\n일정 추가를 누르면 새 일정이 추가됩니다.\n초기화는 해당 월의 일요일 기본 일정으로 되돌립니다.",
  votes: "카카오톡 투표결과 이미지 또는 CSV 파일을 선택하면 자동으로 투표 명단 입력을 시작합니다.\n입력된 결과는 복사일정과 차량봉사 일정별로 나뉘어 표시됩니다.\n각 일정 항목을 열어 이름을 추가, 수정, 삭제할 수 있습니다.",
  generate: "일정표 생성을 누르면 설정과 투표결과를 기준으로 일정표를 만듭니다.\n생성 후 각 일정의 배정자와 메모를 직접 수정할 수 있습니다.\n배정할 사람이 없는 칸은 없음으로 표시됩니다.\n생성된 일정표는 PNG로 저장할 수 있습니다.",
  members: "명단은 이 장치에만 저장됩니다.\n처음에는 샘플 양식을 내려받아 파일로 등록하거나 인원 추가로 직접 입력할 수 있습니다.\n명단이 등록된 뒤에는 각 카드의 메뉴에서 수정, 삭제할 수 있습니다.\n브라우저 사이트 데이터를 지우면 명단도 사라질 수 있으니 필요하면 명단 다운로드로 백업해 주세요.\n별칭은 카카오톡에 저장된 닉네임과 이름이 다를 경우 입력합니다.",
};

export const ROLE_LABELS: Role[] = ["정", "부", "향", "향합", "초1", "초2", "십자가"];
