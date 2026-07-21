import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Button, Stack } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import type { AppModel } from "./hooks/useAppModel";
import { GenerateScreen } from "./screens/GenerateScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { MembersScreen } from "./screens/MembersScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { VotesScreen } from "./screens/VotesScreen";

export function AppRoutes({ model }: { model: AppModel }) {
  const { step, goToStep } = model;

  return (
    <>
      <Routes>
        <Route path="/" element={(
          <HomeScreen
            month={model.month}
            selectedMonth={model.selectedMonth}
            monthAnchor={model.monthAnchor}
            memberError={model.memberError}
            setMonthAnchor={model.setMonthAnchor}
            setMonth={model.setMonth}
            selectMonth={model.selectMonth}
            setStep={goToStep}
          />
        )} />
        <Route path="/settings" element={(
          <SettingsScreen
            settings={model.settings}
            updateSettings={model.updateSettings}
            updateServiceSchedule={model.updateServiceSchedule}
            updateCarSchedule={model.updateCarSchedule}
            addServiceSchedule={model.addServiceSchedule}
            addCarSchedule={model.addCarSchedule}
            resetServiceSchedules={model.resetServiceSchedules}
            resetCarSchedules={model.resetCarSchedules}
            resetScheduleColors={model.resetScheduleColors}
          />
        )} />
        <Route path="/votes" element={<VotesScreen model={model.votesScreenModel} />} />
        <Route path="/generate" element={(
          <GenerateScreen
            month={model.month}
            settings={model.settings}
            members={model.sourceMembers}
            result={model.result}
            allIssues={model.allIssues}
            errorCount={model.counts.errors}
            canGenerate={model.canGenerate}
            schedulePreviewOpen={model.schedulePreviewOpen}
            previewRef={model.previewRef}
            runGenerate={model.runGenerate}
            setSchedulePreviewOpen={model.setSchedulePreviewOpen}
            downloadImage={model.downloadImage}
            updateServiceResult={model.updateServiceResult}
            updateCarResult={model.updateCarResult}
            goToStep={goToStep}
          />
        )} />
        <Route path="/members" element={(
          <MembersScreen
            memberQuery={model.memberQuery}
            memberSortKey={model.memberSortKey}
            membersFile={model.membersFile}
            visibleMembers={model.visibleMembers}
            memberError={model.memberError}
            memberSuccess={model.memberSuccess}
            importMembers={model.importMembers}
            clearMembers={model.clearMembers}
            addMember={model.addMember}
            updateMember={model.updateMember}
            deleteMember={model.deleteMember}
            setMemberQuery={model.setMemberQuery}
            setMemberSortKey={model.setMemberSortKey}
          />
        )} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {(step === "settings" || step === "votes") && (
        <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 2 }}>
          <Button
            variant="contained"
            endIcon={<ChevronRightIcon />}
            onClick={() => goToStep(step === "settings" ? "votes" : "generate")}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {step === "settings" ? "투표결과로" : "일정표 생성으로"}
          </Button>
        </Stack>
      )}
    </>
  );
}
