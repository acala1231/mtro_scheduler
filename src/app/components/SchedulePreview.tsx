import type { RefObject } from "react";
import { Box } from "@mui/material";
import type { GenerateScheduleResult, Role, ScheduleSettings } from "../../domain/scheduleTypes";
import { assignmentDisplayName, isMissingAssignment } from "../assignmentDisplay";
import { ROLE_LABELS } from "../appConstants";
import { monthTitle } from "../appUtils";

function selectedPreviewRoles(settings: ScheduleSettings, displayDate: string): Set<Role> {
  const schedule = settings.serviceSchedules.find((item) => item.displayDate === displayDate);
  return new Set([...(schedule?.baseRoles ?? []), ...(schedule?.subRoles ?? [])]);
}

export function SchedulePreview({
  refNode,
  month,
  settings,
  result,
}: {
  refNode: RefObject<HTMLDivElement | null>;
  month: string;
  settings: ScheduleSettings;
  result: GenerateScheduleResult;
}) {
  return (
    <Box className="preview-wrap">
      <div className="schedule-preview" ref={refNode}>
        <div className="schedule-title" style={{ background: settings.titleColor }}>
          {monthTitle(month)} 성인 복사단 일정
        </div>
        <table className="service-table">
          <thead>
            <tr style={{ background: settings.headerColor }}>
              <th>날짜</th>
              {ROLE_LABELS.map((role) => (
                <th key={role}>{role === "향" ? "향로" : role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.serviceRows.map((row) => {
              const selectedRoles = selectedPreviewRoles(settings, row.displayDate);
              return (
                <tr key={row.displayDate}>
                  <th>
                    <div>{row.displayDate}</div>
                    {row.note && <div className="schedule-note">{row.note}</div>}
                  </th>
                  {ROLE_LABELS.map((role) => {
                    const isSelected = selectedRoles.has(role);
                    return (
                      <td key={role} className={isSelected && isMissingAssignment(row.roles[role]) ? "missing" : ""}>
                        {isSelected ? assignmentDisplayName(row.roles[role]) : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className="car-table">
          <thead>
            <tr style={{ background: settings.headerColor }}>
              <th>{monthTitle(month)}</th>
              <th>차량봉사</th>
              <th className="car-table-spacer" aria-hidden="true"></th>
              <th className="car-table-spacer" aria-hidden="true"></th>
              <th className="car-table-spacer" aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {result.carRows.map((row) => (
              <tr key={row.displayDate}>
                <th>
                  <div>{row.displayDate}</div>
                  {row.note && <div className="schedule-note">{row.note}</div>}
                </th>
                <td className={isMissingAssignment(row.name) ? "missing" : ""}>{assignmentDisplayName(row.name)}</td>
                <td className="car-table-spacer" aria-hidden="true"></td>
                <td className="car-table-spacer" aria-hidden="true"></td>
                <td className="car-table-spacer" aria-hidden="true"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}
