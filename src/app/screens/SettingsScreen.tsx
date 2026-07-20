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
    <Screen>
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
