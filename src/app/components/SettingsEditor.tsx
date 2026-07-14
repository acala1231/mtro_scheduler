import { useEffect, useState, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from "@mui/material";
import dayjs from "dayjs";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { refreshCarSchedule, refreshServiceSchedule } from "../../domain/scheduleSettings";
import { BASE_ROLES, SUB_ROLES, type BaseRole, type CarSchedule, type ScheduleSettings, type ServiceSchedule, type SubRole } from "../../domain/scheduleTypes";
import { dateFromDayjs, dayjsFromTime, timeFromDayjs } from "../appUtils";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ActionMenu } from "./ActionMenu";
import { RoleBadges } from "./RoleBadges";
import { RoleToggles } from "./RoleToggles";

function useEditingKeys() {
  const [keys, setKeys] = useState<string[]>([]);

  return {
    keys,
    clear: () => setKeys([]),
    includes: (key: string) => keys.includes(key),
    add: (key: string) => setKeys((current) => (current.includes(key) ? current : [...current, key])),
    toggle: (key: string) => setKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key])),
    remove: (key: string) => setKeys((current) => current.filter((item) => item !== key)),
  };
}

function SettingsColorSection({
  settings,
  updateSettings,
  onReset,
}: {
  settings: ScheduleSettings;
  updateSettings: (settings: ScheduleSettings) => void;
  onReset: () => void;
}) {
  return (
    <Accordion disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 800 }}>일정표 색상 지정</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="outlined" color="warning" onClick={onReset}>
              초기화
            </Button>
          </Box>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
            <TextField
              label="제목색"
              type="color"
              value={settings.titleColor}
              onChange={(event) => updateSettings({ ...settings, titleColor: event.target.value })}
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="헤더색"
              type="color"
              value={settings.headerColor}
              onChange={(event) => updateSettings({ ...settings, headerColor: event.target.value })}
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function ScheduleDateTimeFields({
  date,
  time,
  displayDate,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  displayDate: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, md: 3 }}>
        <DatePicker label="날짜" value={dayjs(date)} onChange={(value) => onDateChange(dateFromDayjs(value, date))} slotProps={{ textField: { fullWidth: true } }} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TimePicker
          label="시간"
          value={dayjsFromTime(time)}
          onChange={(value) => onTimeChange(timeFromDayjs(value, time))}
          closeOnSelect
          ampm={false}
          format="HH:mm"
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField label="표시 문구" value={displayDate} fullWidth disabled />
      </Grid>
    </Grid>
  );
}

function ServiceScheduleCard({
  schedule,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  validationMessage,
}: {
  schedule: ServiceSchedule;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (schedule: ServiceSchedule) => void;
  onDelete: () => void;
  validationMessage?: string;
}) {
  const [draft, setDraft] = useState(schedule);
  const visibleSchedule = isEditing ? draft : schedule;

  useEffect(() => {
    if (!isEditing) setDraft(schedule);
  }, [isEditing, schedule]);

  function updateDraft(patch: Partial<ServiceSchedule>) {
    setDraft((current) => refreshServiceSchedule({ ...current, ...patch }));
  }

  function cancelEdit() {
    setDraft(schedule);
    onCancel();
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 800 }}>
                  {visibleSchedule.displayDate}
                </Typography>
              </Box>
              <RoleBadges roles={[...visibleSchedule.baseRoles, ...visibleSchedule.subRoles]} />
            </Stack>
            <Box sx={{ flexShrink: 0, ml: "auto" }}>
              <ActionMenu ariaLabel="복사 일정 메뉴" items={[{ label: "수정", onClick: onEdit }, { label: "삭제", color: "error", onClick: onDelete }]} />
            </Box>
          </Stack>

          {isEditing && (
            <>
              {validationMessage && <Alert severity="warning">{validationMessage}</Alert>}
              <ScheduleDateTimeFields
                date={draft.date}
                time={draft.time}
                displayDate={draft.displayDate}
                onDateChange={(date) => updateDraft({ date })}
                onTimeChange={(time) => updateDraft({ time })}
              />
              <RoleToggles roles={BASE_ROLES} selected={draft.baseRoles} onChange={(roles) => updateDraft({ baseRoles: roles as BaseRole[] })} />
              <RoleToggles roles={SUB_ROLES} selected={draft.subRoles} onChange={(roles) => updateDraft({ subRoles: roles as SubRole[] })} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button variant="outlined" onClick={cancelEdit}>
                  취소
                </Button>
                <Button color="error" onClick={onDelete}>
                  삭제
                </Button>
                <Button variant="contained" onClick={() => onSave(draft)}>
                  저장
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function CarScheduleCard({
  schedule,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  validationMessage,
}: {
  schedule: CarSchedule;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (schedule: CarSchedule) => void;
  onDelete: () => void;
  validationMessage?: string;
}) {
  const [draft, setDraft] = useState(schedule);
  const visibleSchedule = isEditing ? draft : schedule;

  useEffect(() => {
    if (!isEditing) setDraft(schedule);
  }, [isEditing, schedule]);

  function updateDraft(patch: Partial<CarSchedule>) {
    setDraft((current) => refreshCarSchedule({ ...current, ...patch }));
  }

  function cancelEdit() {
    setDraft(schedule);
    onCancel();
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box sx={{ minWidth: 92, flexShrink: 0 }}>
              <Typography noWrap sx={{ fontWeight: 800 }}>
                {visibleSchedule.displayDate}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }} />
            <Box sx={{ flexShrink: 0, ml: "auto" }}>
              <ActionMenu ariaLabel="차량봉사 일정 메뉴" items={[{ label: "수정", onClick: onEdit }, { label: "삭제", color: "error", onClick: onDelete }]} />
            </Box>
          </Stack>

          {isEditing && (
            <>
              {validationMessage && <Alert severity="warning">{validationMessage}</Alert>}
              <ScheduleDateTimeFields
                date={draft.date}
                time={draft.time}
                displayDate={draft.displayDate}
                onDateChange={(date) => updateDraft({ date })}
                onTimeChange={(time) => updateDraft({ time })}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button variant="outlined" onClick={cancelEdit}>
                  취소
                </Button>
                <Button color="error" onClick={onDelete}>
                  삭제
                </Button>
                <Button variant="contained" onClick={() => onSave(draft)}>
                  저장
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ScheduleListSection<TSchedule extends ServiceSchedule | CarSchedule>({
  title,
  schedules,
  editing,
  onAdd,
  onReset,
  renderCard,
}: {
  title: string;
  schedules: TSchedule[];
  editing: ReturnType<typeof useEditingKeys>;
  onAdd: () => TSchedule;
  onReset: () => void;
  renderCard: (schedule: TSchedule, index: number, isEditing: boolean) => ReactNode;
}) {
  function addSchedule() {
    const schedule = onAdd();
    editing.add(schedule.key);
  }

  return (
    <Accordion disableGutters defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 800 }}>
          {title} ({schedules.length}개)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, justifyContent: "space-between" }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addSchedule}>
              일정 추가
            </Button>
            <Button variant="outlined" color="warning" onClick={onReset}>
              초기화
            </Button>
          </Stack>
          {schedules.map((schedule, index) => renderCard(schedule, index, editing.includes(schedule.key)))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export function SettingsEditor({
  settings,
  updateSettings,
  updateService,
  updateCar,
  addServiceSchedule,
  addCarSchedule,
  resetServiceSchedules,
  resetCarSchedules,
  resetScheduleColors,
}: {
  settings: ScheduleSettings;
  updateSettings: (settings: ScheduleSettings) => void;
  updateService: (index: number, patch: Partial<ServiceSchedule>) => void;
  updateCar: (index: number, patch: Partial<CarSchedule>) => void;
  addServiceSchedule: () => ServiceSchedule;
  addCarSchedule: () => CarSchedule;
  resetServiceSchedules: () => void;
  resetCarSchedules: () => void;
  resetScheduleColors: () => void;
}) {
  const serviceEditing = useEditingKeys();
  const carEditing = useEditingKeys();
  const [serviceValidationMessages, setServiceValidationMessages] = useState<Record<string, string>>({});
  const [carValidationMessages, setCarValidationMessages] = useState<Record<string, string>>({});
  const { confirm, confirmDialog } = useConfirmDialog();

  function duplicateServiceScheduleMessage(index: number, schedule: ServiceSchedule) {
    const duplicate = settings.serviceSchedules.some((item, itemIndex) => itemIndex !== index && item.key === schedule.key);
    return duplicate ? `${schedule.displayDate} 일정이 이미 있습니다. 다른 날짜나 시간을 선택해 주세요.` : "";
  }

  function duplicateCarScheduleMessage(index: number, schedule: CarSchedule) {
    const duplicate = settings.carSchedules.some((item, itemIndex) => itemIndex !== index && item.key === schedule.key);
    return duplicate ? `${schedule.displayDate} 일정이 이미 있습니다. 다른 날짜나 시간을 선택해 주세요.` : "";
  }

  function clearServiceValidation(scheduleKey: string) {
    setServiceValidationMessages((messages) => ({ ...messages, [scheduleKey]: "" }));
  }

  function clearCarValidation(scheduleKey: string) {
    setCarValidationMessages((messages) => ({ ...messages, [scheduleKey]: "" }));
  }

  function removeServiceSchedule(index: number, scheduleKey: string) {
    updateSettings({ ...settings, serviceSchedules: settings.serviceSchedules.filter((_, i) => i !== index) });
    serviceEditing.remove(scheduleKey);
    clearServiceValidation(scheduleKey);
  }

  function removeCarSchedule(index: number, scheduleKey: string) {
    updateSettings({ ...settings, carSchedules: settings.carSchedules.filter((_, i) => i !== index) });
    carEditing.remove(scheduleKey);
    clearCarValidation(scheduleKey);
  }

  function deleteServiceSchedule(index: number, scheduleKey: string) {
    const schedule = settings.serviceSchedules[index];
    confirm({
      title: "복사일정을 삭제할까요?",
      message: `${schedule?.displayDate ?? "선택한"} 복사일정을 삭제합니다.`,
      confirmText: "삭제",
      confirmColor: "error",
      onConfirm: () => removeServiceSchedule(index, scheduleKey),
    });
  }

  function deleteCarSchedule(index: number, scheduleKey: string) {
    const schedule = settings.carSchedules[index];
    confirm({
      title: "차량봉사일정을 삭제할까요?",
      message: `${schedule?.displayDate ?? "선택한"} 차량봉사일정을 삭제합니다.`,
      confirmText: "삭제",
      confirmColor: "error",
      onConfirm: () => removeCarSchedule(index, scheduleKey),
    });
  }

  function resetServices() {
    confirm({
      title: "복사일정을 초기화할까요?",
      message: "현재 기준월의 일요일 기본 복사일정으로 다시 생성합니다.",
      confirmText: "초기화",
      confirmColor: "warning",
      onConfirm: () => {
        resetServiceSchedules();
        serviceEditing.clear();
        setServiceValidationMessages({});
      },
    });
  }

  function resetCars() {
    confirm({
      title: "차량봉사일정을 초기화할까요?",
      message: "현재 기준월의 일요일 기본 차량봉사일정으로 다시 생성합니다.",
      confirmText: "초기화",
      confirmColor: "warning",
      onConfirm: () => {
        resetCarSchedules();
        carEditing.clear();
        setCarValidationMessages({});
      },
    });
  }

  function resetColors() {
    confirm({
      title: "일정표 색상을 초기화할까요?",
      message: "일정표 제목색과 헤더색을 기본 색상으로 되돌립니다.",
      confirmText: "초기화",
      confirmColor: "warning",
      onConfirm: resetScheduleColors,
    });
  }

  return (
    <Stack spacing={2}>
      <SettingsColorSection settings={settings} updateSettings={updateSettings} onReset={resetColors} />
      <ScheduleListSection
        title="복사일정"
        schedules={settings.serviceSchedules}
        editing={serviceEditing}
        onAdd={addServiceSchedule}
        onReset={resetServices}
        renderCard={(schedule, index, isEditing) => {
          return (
            <ServiceScheduleCard
              key={schedule.key}
              schedule={schedule}
              isEditing={isEditing}
              validationMessage={serviceValidationMessages[schedule.key]}
              onEdit={() => {
                clearServiceValidation(schedule.key);
                serviceEditing.add(schedule.key);
              }}
              onCancel={() => {
                clearServiceValidation(schedule.key);
                serviceEditing.toggle(schedule.key);
              }}
              onSave={(nextSchedule) => {
                const message = duplicateServiceScheduleMessage(index, nextSchedule);
                if (message) {
                  setServiceValidationMessages((messages) => ({ ...messages, [schedule.key]: message }));
                  return;
                }
                clearServiceValidation(schedule.key);
                updateService(index, nextSchedule);
                serviceEditing.remove(schedule.key);
              }}
              onDelete={() => deleteServiceSchedule(index, schedule.key)}
            />
          );
        }}
      />
      <ScheduleListSection
        title="차량봉사일정"
        schedules={settings.carSchedules}
        editing={carEditing}
        onAdd={addCarSchedule}
        onReset={resetCars}
        renderCard={(schedule, index, isEditing) => {
          return (
            <CarScheduleCard
              key={schedule.key}
              schedule={schedule}
              isEditing={isEditing}
              validationMessage={carValidationMessages[schedule.key]}
              onEdit={() => {
                clearCarValidation(schedule.key);
                carEditing.add(schedule.key);
              }}
              onCancel={() => {
                clearCarValidation(schedule.key);
                carEditing.toggle(schedule.key);
              }}
              onSave={(nextSchedule) => {
                const message = duplicateCarScheduleMessage(index, nextSchedule);
                if (message) {
                  setCarValidationMessages((messages) => ({ ...messages, [schedule.key]: message }));
                  return;
                }
                clearCarValidation(schedule.key);
                updateCar(index, nextSchedule);
                carEditing.remove(schedule.key);
              }}
              onDelete={() => deleteCarSchedule(index, schedule.key)}
            />
          );
        }}
      />
      {confirmDialog}
    </Stack>
  );
}
