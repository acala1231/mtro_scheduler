import type { CarSchedule, ScheduleSettings, ServiceSchedule } from "../../domain/scheduleTypes";
import { Screen } from "../components/Screen";
import { SettingsEditor } from "../components/SettingsEditor";

export function SettingsScreen({
  settings,
  updateSettings,
  updateServiceSchedule,
  updateCarSchedule,
  addServiceSchedule,
  addCarSchedule,
  resetServiceSchedules,
  resetCarSchedules,
  resetScheduleColors,
}: {
  settings: ScheduleSettings;
  updateSettings: (settings: ScheduleSettings) => void;
  updateServiceSchedule: (index: number, patch: Partial<ServiceSchedule>) => void;
  updateCarSchedule: (index: number, patch: Partial<CarSchedule>) => void;
  addServiceSchedule: () => ServiceSchedule;
  addCarSchedule: () => CarSchedule;
  resetServiceSchedules: () => void;
  resetCarSchedules: () => void;
  resetScheduleColors: () => void;
}) {
  return (
    <Screen
      title="설정"
      description={
        "해당 월에 사용할 복사일정과 차량봉사일정을 확인하고 수정합니다.\n일정 추가를 누르면 새 일정이 추가됩니다.\n초기화는 해당 월의 일요일 기본 일정으로 되돌립니다."
      }
    >
      <SettingsEditor
        settings={settings}
        updateSettings={updateSettings}
        updateService={updateServiceSchedule}
        updateCar={updateCarSchedule}
        addServiceSchedule={addServiceSchedule}
        addCarSchedule={addCarSchedule}
        resetServiceSchedules={resetServiceSchedules}
        resetCarSchedules={resetCarSchedules}
        resetScheduleColors={resetScheduleColors}
      />
    </Screen>
  );
}
