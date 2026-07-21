import "dayjs/locale/ko";
import { Container } from "@mui/material";
import { AppRoutes } from "./AppRoutes";
import { AppShell } from "./components/AppShell";
import { useAppModel } from "./hooks/useAppModel";

export { AppBackButton, RouteFocusHeading } from "./components/AppShell";

export function App() {
  const model = useAppModel();

  return (
    <AppShell
      step={model.step}
      month={model.month}
      menuAnchor={model.menuAnchor}
      setMenuAnchor={model.setMenuAnchor}
      goToStep={model.goToStep}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <AppRoutes model={model} />
      </Container>
    </AppShell>
  );
}
