import { Alert, Button, Snackbar } from "@mui/material";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useBackButtonClose } from "../hooks/useBackButtonClose";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useBackButtonClose(needRefresh, () => setNeedRefresh(false));

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 88, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
              나중에
            </Button>
            <Button color="inherit" size="small" onClick={() => updateServiceWorker(true)}>
              새로고침
            </Button>
          </>
        }
        sx={{ alignItems: "center" }}
      >
        새 버전이 있습니다.
      </Alert>
    </Snackbar>
  );
}
