import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useBackButtonClose } from "../hooks/useBackButtonClose";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_PROMPT_DISMISSED_UNTIL_KEY = "pwa.installPrompt.dismissedUntil";

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("safari") && !userAgent.includes("chrome") && !userAgent.includes("crios") && !userAgent.includes("fxios");
}

function isPromptSnoozed() {
  const dismissedUntil = Number(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_UNTIL_KEY));
  return Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil;
}

function snoozePromptForToday() {
  const dismissedUntil = new Date();
  dismissedUntil.setHours(24, 0, 0, 0);
  window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_UNTIL_KEY, String(dismissedUntil.getTime()));
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  const isIosSafari = useMemo(() => isIosDevice() && isSafariBrowser(), []);

  useEffect(() => {
    if (isStandaloneMode() || isPromptSnoozed()) return;

    if (isIosSafari) {
      setOpen(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isIosSafari]);

  const canInstallDirectly = Boolean(installPrompt);
  const shouldShowIosGuide = isIosSafari && !canInstallDirectly;
  useBackButtonClose(open && (canInstallDirectly || shouldShowIosGuide), closeForNow);

  if (!open || (!canInstallDirectly && !shouldShowIosGuide)) {
    return null;
  }

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }

    setOpen(false);
  }

  function closeForNow() {
    setOpen(false);
  }

  function closeForToday() {
    snoozePromptForToday();
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={closeForNow} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>앱으로 설치할까요?</DialogTitle>
      <DialogContent>
        {canInstallDirectly ? (
          <Typography variant="body2" color="text.secondary">
            홈 화면에 설치하면 브라우저 주소창 없이 복사단 일정표를 바로 실행할 수 있습니다.
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              iPhone 또는 iPad에서는 Safari의 공유 버튼을 누른 뒤 홈 화면에 추가를 선택하세요.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              설치 후에는 홈 화면 아이콘으로 복사단 일정표를 바로 실행할 수 있습니다.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <Button onClick={closeForNow}>나중에</Button>
        <Button onClick={closeForToday}>오늘 하루 보지 않기</Button>
        {canInstallDirectly && (
          <Button variant="contained" onClick={installApp}>
            설치하기
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
