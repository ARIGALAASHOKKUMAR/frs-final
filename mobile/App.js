import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  StatusBar,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import Login from "./components/Login";
import FrsReport from "./components/FrsReport";
import FrsHistory from "./components/FrsHistory";
import FaceRecognition from "./components/FaceRecognition";
import Sidebar from "./components/Sidebar";
import LeaveHistory from "./components/LeaveHistory";
import ApplyLeaves from "./components/ApplyLeaves";
import Profile from "./components/Profile";
import AdminDashboard from "./components/AdminDashboard";
import EmployeeManagement from "./components/EmployeeManagement";
import AdminLeaveApprovals from "./components/AdminLeaveApprovals";
import Splash from "./components/Splash";
import { API_URL, apiRequest, clearSession, getSavedEmployee, getSessionToken } from "./components/api";

const EMPLOYEE = { id: "EMP001", name: "Demo Employee" };

const BRAND = {
  green: "#075b38",
  greenLight: "#0d7a4c",
  mint: "#d1fae5",
  mintSoft: "#f0fdf4",
  bg: "#f4f7f5",
  text: "#0f172a",
  muted: "#6b7280",
  danger: "#dc2626",
};

// Uses the phone's local calendar date.
function dateKey(value = new Date()) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeAttendanceRecord(record) {
  const clockIn = record.clockIn ?? record.clock_in ?? record.clockin;
  const clockOut = record.clockOut ?? record.clock_out ?? record.clockout ?? null;
  if (!clockIn || !Number.isFinite(Date.parse(clockIn))) {
    throw new Error("Attendance record is missing a valid clock-in time.");
  }
  return {
    ...record,
    id: String(record.id),
    date: dateKey(new Date(clockIn)),
    clockIn: new Date(clockIn).toISOString(),
    clockOut: clockOut ? new Date(clockOut).toISOString() : null,
  };
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function duration(record, now) {
  if (!record) return "--";
  const end = record.clockOut
    ? new Date(record.clockOut).getTime()
    : now.getTime();
  const minutes = Math.max(
    0,
    Math.floor((end - new Date(record.clockIn).getTime()) / 60000)
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Button({ title, onPress, disabled, secondary, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.green} />
      <AttendanceApp />
    </SafeAreaProvider>
  );
}

function AttendanceApp() {
  const cameraRef = useRef(null);
  const busyRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  const [loggedIn, setLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [employee, setEmployee] = useState(EMPLOYEE);
  const [faceStatus, setFaceStatus] = useState("unknown");
  const [leaveRefresh, setLeaveRefresh] = useState(0);

  const [records, setRecords] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  const [tab, setTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [now, setNow] = useState(new Date());

  const [action, setAction] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const faceRegistered = faceStatus === "registered";

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 1400);
    const timer = setInterval(() => setNow(new Date()), 1000);
    let active = true;
    async function restoreSession() {
      try {
        const [token, savedEmployee] = await Promise.all([getSessionToken(), getSavedEmployee()]);
        if (!active || !token || !savedEmployee) return;
        setEmployee(savedEmployee);
        setLoggedIn(true);
        if (savedEmployee.role === "admin") {
          setStorageReady(true);
          setTab("admin-home");
        } else {
          setStorageReady(false);
          setFaceStatus("loading");
          loadHistory();
          refreshFaceStatus();
        }
      } catch (error) {
        console.warn("Could not restore saved session:", error.message);
      }
    }
    restoreSession();
    return () => {
      active = false;
      clearTimeout(splashTimer);
      clearInterval(timer);
    };
  }, []);

  async function refreshFaceStatus() {
    setFaceStatus("loading");
    try {
      const status = await apiRequest("/api/face/status");
      setFaceStatus(status.registered === true ? "registered" : "unregistered");
    } catch (error) {
      console.warn("Face registration status request failed:", error.message);
      if (error.status === 401) {
        await clearSession();
        setLoggedIn(false);
        Alert.alert("Session expired", "Please sign in again to check your saved face registration.");
        return;
      }
      setFaceStatus("error");
    }
  }

  async function loadHistory() {
    setStorageReady(false);
    setStorageError("");
    try {
      const response = await apiRequest("/api/attendance");
      const parsed = response.records.map(normalizeAttendanceRecord);

      const valid =
        Array.isArray(parsed) &&
        parsed.every(
          (record) =>
            record &&
            typeof record.id === "string" &&
            typeof record.date === "string" &&
            Number.isFinite(Date.parse(record.clockIn)) &&
            (record.clockOut === null ||
              Number.isFinite(Date.parse(record.clockOut)))
        );

      if (!valid) throw new Error("Stored attendance history could not be read.");

      setRecords(parsed);
      setStorageReady(true);
    } catch (error) {
      setStorageError(error.message || "Unable to load attendance history.");
    }
  }

  const today = records.find((record) => record.date === dateKey(now));
  const activeRecord = records.find((record) => !record.clockOut);
  const displayedRecord = activeRecord || today;

  const canClockIn = storageReady && faceRegistered && !activeRecord && !today;
  const canClockOut = storageReady && faceRegistered && Boolean(activeRecord);

  const logout = async () => {
    if (busyRef.current) return;
    try {
      await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
      await clearSession();
      setRecords([]);
      setAction(null);
      setLoggedIn(false);
      setTab("home");
      setSidebarVisible(false);
      setFaceStatus("unknown");
      setMessage("");
      Alert.alert("Logout", "You have been signed out.");
    } catch (error) {
      Alert.alert(
        "Logout failed",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  async function openCamera(nextAction) {
    if (busyRef.current || !storageReady) return;

    if ((nextAction === "clockIn" || nextAction === "clockOut") && faceStatus !== "registered" && faceStatus !== "unregistered") {
      Alert.alert("Unable to check face registration", "Retry the registration status check before clocking attendance.");
      refreshFaceStatus();
      return;
    }

    if ((nextAction === "clockIn" || nextAction === "clockOut") && !faceRegistered) {
      Alert.alert("Face registration required", "Register your face before clocking in or out.");
      return;
    }

    if (nextAction === "clockIn" && !canClockIn) {
      Alert.alert("Attendance", "Clock-in is not available.");
      return;
    }
    if (nextAction === "clockOut" && !canClockOut) {
      Alert.alert("Attendance", "Please clock in first.");
      return;
    }

    try {
      const granted = permission?.granted
        ? permission
        : await requestPermission();

      if (!granted.granted) {
        Alert.alert(
          "Camera permission required",
          "Allow camera access to register or verify your face.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      setCameraReady(false);
      setMessage("");
      setAction(nextAction);
    } catch {
      Alert.alert("Camera error", "Unable to request camera permission.");
    }
  }

  function closeCamera() {
    if (busyRef.current) return;
    setAction(null);
    setCameraReady(false);
  }

  async function captureAndSubmit() {
    if (busyRef.current || !cameraReady || !cameraRef.current || !action) return;

    busyRef.current = true;
    setBusy(true);

    const currentAction = action;
    let timeout;

    try {
      const image = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!image?.base64)
        throw new Error("Unable to capture image. Please try again.");

      const endpoint = currentAction === "register" ? "register" : "compare";
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 30000);
      const token = await getSessionToken();

      const response = await fetch(`${API_URL}/api/face/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: image.base64 }),
        signal: controller.signal,
      });

      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (error.name === "AbortError") throw error;
        throw new Error("The backend returned an invalid JSON response.");
      }

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Face API request failed.");
      }

      if (currentAction === "register") {
        setFaceStatus("registered");
        setMessage("Face registered successfully.");
        setAction(null);
        Alert.alert(
          "Registration successful",
          data?.message || "You can now clock in using your face."
        );
        return;
      }

      if (data?.matched !== true) {
        const text = "Face did not match. Attendance was not recorded.";
        setMessage(text);
        Alert.alert("Verification failed", text);
        return;
      }

      const verifiedAt = new Date();
      const attendance = await apiRequest(
        `/api/attendance/${
          currentAction === "clockIn" ? "clock-in" : "clock-out"
        }`,
        { method: "POST", body: "{}" }
      );
      const saved = attendance.record;
      const updatedRecord = normalizeAttendanceRecord(saved);
      const updatedRecords =
        currentAction === "clockIn"
          ? [updatedRecord, ...records]
          : records.map((record) =>
              record.id === updatedRecord.id ? updatedRecord : record
            );
      setRecords(updatedRecords);
      setNow(verifiedAt);
      setAction(null);

      const label = currentAction === "clockIn" ? "Clock-in" : "Clock-out";
      const text = `Face matched! ${label}`;
      setMessage(text);
      Alert.alert(`${label} successful`, text);
    } catch (error) {
      if (/already have an active clock-in|already been recorded today/i.test(error.message || "")) {
        await loadHistory();
      }
      const text =
        error.name === "AbortError"
          ? "The face API timed out. Please try again."
          : error.message || "Unable to connect to the backend.";
      setMessage(text);
      Alert.alert("Unable to complete action", text);
    } finally {
      clearTimeout(timeout);
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (showSplash) return <Splash />;

  if (!loggedIn) {
    const onLogin = async (account) => {
      setEmployee(account);
      setLoggedIn(true);
      setStorageError("");
      if (account.role === "admin") {
        setRecords([]);
        setStorageReady(true);
        setFaceStatus("unknown");
        setTab("admin-home");
      } else {
        setStorageReady(false);
        setTab("home");
        setFaceStatus("loading");
        loadHistory();
        refreshFaceStatus();
      }
    };
    return (
      <SafeAreaView style={styles.screen}>
        <Login onLogin={onLogin} />
      </SafeAreaView>
    );
  }

  const selectTab = (key) => {
    setTab(key);
    setSidebarVisible(false);
  };

  const displayName = employee?.name || EMPLOYEE.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandMark}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              AP Forest Department
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {employee?.id || EMPLOYEE.id} · {displayName.split(" ")[0]}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{initials}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
            style={styles.logoutBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {employee?.role === "admin" ? (
        tab === "admin-home" ? (
          <AdminDashboard onEmployees={() => selectTab("employees")} onLeaves={() => selectTab("leave-approvals")} />
        ) : tab === "employees" ? (
          <EmployeeManagement />
        ) : tab === "leave-approvals" ? (
          <AdminLeaveApprovals />
        ) : (
          <Profile employee={employee} faceRegistered={false} onLogout={logout} />
        )
      ) : !storageReady && tab !== "profile" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND.green} />
          <Text style={styles.loadingText}>Loading attendance…</Text>
        </View>
      ) : storageError && tab !== "profile" ? (
        <View style={styles.content}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={26} color={BRAND.danger} />
            </View>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.error}>{storageError}</Text>
            <Button title="Retry loading" onPress={loadHistory} />
          </View>
        </View>
      ) : tab === "home" ? (
        <FrsReport
          employee={employee}
          now={now}
          record={displayedRecord}
          records={records}
          faceStatus={faceStatus}
          onRefreshFaceStatus={refreshFaceStatus}
          onClockIn={() => openCamera("clockIn")}
          onClockOut={() => openCamera("clockOut")}
          onRegisterFace={() => openCamera("register")}
        />
      ) : tab === "history" ? (
        <FrsHistory records={records} now={now} />
      ) : tab === "apply" ? (
        <ApplyLeaves
          onApplied={() => {
            setLeaveRefresh((value) => value + 1);
            setTab("leaves");
            setSidebarVisible(false);
          }}
        />
      ) : tab === "leaves" ? (
        <LeaveHistory refreshKey={leaveRefresh} />
      ) : (
        <Profile
          employee={employee}
          faceRegistered={faceRegistered}
          faceStatus={faceStatus}
          onLogout={logout}
        />
      )}

      <Sidebar
        visible={sidebarVisible}
        selected={tab}
        employee={employee}
        onClose={() => setSidebarVisible(false)}
        onNavigate={selectTab}
        onLogout={logout}
      />

      <FaceRecognition
        visible={action !== null}
        action={action}
        cameraRef={cameraRef}
        permission={permission}
        cameraReady={cameraReady}
        busy={busy}
        onReady={() => setCameraReady(true)}
        onMountError={() => {
          setCameraReady(false);
          Alert.alert(
            "Camera error",
            "Unable to open the camera. Close and try again."
          );
        }}
        onCapture={captureAndSubmit}
        onCancel={closeCamera}
        Button={Button}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.bg },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: BRAND.green,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  headerSub: { color: "#bbf7d0", fontSize: 12, marginTop: 2, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Tabs — wraps to next line when overflowing */
  tabBarWrapper: {
    backgroundColor: BRAND.green,
    paddingBottom: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: { color: "#dcfce7", fontWeight: "700", fontSize: 13 },
  activeTabText: { color: BRAND.green, fontWeight: "800" },

  /* Single-tab sub header with back button */
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BRAND.green,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  subHeaderTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  /* Content */
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: BRAND.muted, fontSize: 13, fontWeight: "600" },

  /* Error card */
  errorCard: {
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  errorIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 6,
  },
  error: { color: BRAND.danger, lineHeight: 22, textAlign: "center", fontSize: 13 },

  /* Legacy bits kept for child components that may reference them */
  loginContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: BRAND.green,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  logoText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: { color: BRAND.muted, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: BRAND.text,
    marginBottom: 10,
  },
  label: { color: BRAND.muted, fontSize: 14, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: BRAND.text,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  button: {
    padding: 16,
    backgroundColor: BRAND.green,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButton: { backgroundColor: BRAND.mint },
  secondaryButtonText: { color: BRAND.green },
  dangerButton: { backgroundColor: BRAND.danger },
  disabled: { opacity: 0.4 },
  demo: { textAlign: "center", color: BRAND.muted, marginTop: 18, fontSize: 13 },
  welcome: { fontSize: 23, fontWeight: "800", color: BRAND.text },
  clockCard: {
    backgroundColor: BRAND.green,
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    alignItems: "center",
  },
  clockLabel: { color: "#bbf7d0", fontSize: 12, letterSpacing: 2 },
  clock: { color: "#fff", fontSize: 40, fontWeight: "800", marginVertical: 8 },
  clockStatus: { color: "#dcfce7", fontSize: 15 },
  timeRow: { flexDirection: "row", marginVertical: 10 },
  timeColumn: { flex: 1 },
  timeValue: { color: BRAND.text, fontWeight: "800", fontSize: 23 },
  duration: { color: BRAND.green, fontWeight: "700", marginTop: 12 },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  activeBadge: { backgroundColor: "#fef3c7", color: "#92400e" },
  historyLine: { color: "#475569", fontSize: 15, marginTop: 8 },
  messageBox: {
    padding: 16,
    backgroundColor: BRAND.mint,
    borderRadius: 12,
    marginTop: 18,
  },
  messageText: { color: BRAND.green, lineHeight: 22 },
  cameraScreen: { flex: 1, backgroundColor: "#fbf5f3", padding: 20 },
  cameraTitle: { fontSize: 23, fontWeight: "800", color: BRAND.text },
  cameraHint: { color: BRAND.muted, marginTop: 8, marginBottom: 20 },
  cameraContainer: {
    overflow: "hidden",
    borderRadius: 400,
    height: 300,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  processing: { alignItems: "center", paddingTop: 16, gap: 8 },
});
