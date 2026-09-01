import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DRAWER_OPEN, DRAWER_CLOSED } from "../lib/constants";
import { useSidebarOpen } from "../lib/sidebarState";
import Sidebar from "../components/layout/Sidebar";
import AnimatedBackground from "../components/layout/AnimatedBackground";
import AppButton from "../components/common/Button";
import AlertsPage from "./dashboard/AlertsPage";
import CamerasPage from "./dashboard/CamerasPage";
import AnalyticsPage from "./dashboard/AnalyticsPage";
import SettingsPage from "./dashboard/SettingsPage";
import TrainingJobsPanel from "../components/rules/TrainingJobsPanel";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTheme();
  const { user, logout } = useAuth();
  const [sidebarOpen, toggleSidebar] = useSidebarOpen();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const drawerWidth = sidebarOpen ? DRAWER_OPEN : DRAWER_CLOSED;

  const getPageFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const page = params.get("page") || "Alerts";
    return page === "Zones" ? "Camera Management" : page; // Zones page folded into the Rules wizard
  };

  const [selected, setSelected] = useState(getPageFromUrl);

  useEffect(() => {
    const page = getPageFromUrl();
    setSelected(page);
  }, [location.search]);

  const handleSelect = (item: string) => {
    if (item === "Rule Creation") {
      navigate("/rules");
      return;
    }
    navigate(`/dashboard?page=${encodeURIComponent(item)}`, { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: t.bg,
        fontFamily: "'Google Sans', 'Google Sans Text', Roboto, system-ui, sans-serif",
        position: "relative",
      }}
    >
      <AnimatedBackground />
      <Sidebar
        selected={selected}
        onSelect={handleSelect}
        open={sidebarOpen}
        onToggle={toggleSidebar}
        onSignOut={() => setSignOutOpen(true)}
        userName={user?.name || "Admin"}
        userEmail={user?.email || ""}
      />

      <Box
        sx={{
          flex: 1,
          ml: `${drawerWidth}px`,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          transition: "margin-left .25s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {selected === "Alerts" && <AlertsPage navigate={navigate} />}
        {selected === "Camera Management" && <CamerasPage />}
        {selected === "Analytics" && <AnalyticsPage />}
        {selected === "Settings" && <SettingsPage />}
        {selected === "Self-Learning" && <TrainingJobsPanel />}
      </Box>

      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            background: t.bgSecondary,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            minWidth: 360,
          },
        }}
      >
        <DialogTitle
          sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}
        >
          Sign out of ONVXP?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}
          >
            You'll be returned to the login screen. Any unsaved settings will be
            lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <AppButton variant="secondary" onClick={() => setSignOutOpen(false)}>
            Cancel
          </AppButton>
          <AppButton variant="danger" onClick={() => logout()}>
            Sign Out
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
