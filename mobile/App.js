import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.240.173:3001";

const EMPLOYEE = {
  id: "EMP001",
  name: "Demo Employee",
  username: "employee",
  password: "123456",
};

const STORAGE_KEY = `attendance_v1_${EMPLOYEE.id}`;

//changes

// Uses the phone's local calendar date.
function dateKey(value = new Date()) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
      activeOpacity={0.8}
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
      <AttendanceApp />
    </SafeAreaProvider>
  );
}

function AttendanceApp() {
  const cameraRef = useRef(null);
  const busyRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [records, setRecords] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  const [tab, setTab] = useState("home");
  const [now, setNow] = useState(new Date());

  // null | register | clockIn | clockOut
  const [action, setAction] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadHistory();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadHistory() {
    setStorageReady(false);
    setStorageError("");

    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

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

      if (!valid) {
        throw new Error("Stored attendance history could not be read.");
      }

      setRecords(parsed);
      setStorageReady(true);
    } catch (error) {
      setStorageError(
        error.message || "Unable to load attendance history."
      );
    }
  }

  const today = records.find((record) => record.date === dateKey(now));
  const activeRecord = records.find((record) => !record.clockOut);

  // An unfinished shift stays available for checkout after midnight.
  const displayedRecord = activeRecord || today;

  const canClockIn = storageReady && !activeRecord && !today;
  const canClockOut = storageReady && Boolean(activeRecord);

  function login() {
    if (
      username.trim() === EMPLOYEE.username &&
      password === EMPLOYEE.password
    ) {
      setLoggedIn(true);
      setPassword("");
      setTab("home");
      setMessage("");
      return;
    }

    Alert.alert(
      "Invalid login",
      "Use username: employee\nPassword: 123456"
    );
  }

  const logout = async () => {
  if (busyRef.current) return;

  try {
    await AsyncStorage.removeItem(STORAGE_KEY);

    setRecords([]);
    setAction(null);
    setLoggedIn(false);
    setTab("home");
    setUsername("");
    setPassword("");
    setMessage("");

    Alert.alert(
      "Logout",
      "Logged out and attendance history cleared."
    );
  } catch (error) {
    console.log("Logout error:", error);

    Alert.alert(
      "Logout failed",
      error instanceof Error ? error.message : String(error)
    );
  }
};
  async function openCamera(nextAction) {
    if (busyRef.current || !storageReady) return;

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
            {
              text: "Open settings",
              onPress: () => Linking.openSettings(),
            },
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
    if (busyRef.current || !cameraReady || !cameraRef.current || !action) {
      return;
    }

    busyRef.current = true;
    setBusy(true);

    const currentAction = action;
    let timeout;

    try {
      const image = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!image?.base64) {
        throw new Error("Unable to capture image. Please try again.");
      }

      const endpoint =
        currentAction === "register" ? "register" : "compare";

      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}/api/face/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
        setMessage("Face registered successfully.");
        setAction(null);
        Alert.alert(
          "Registration successful",
          data?.message || "You can now clock in using your face."
        );
        return;
      }

      // HTTP success alone does NOT mean the face matched.
      if (data?.matched !== true) {
        const text = "Face did not match. Attendance was not recorded.";
        setMessage(text);
        Alert.alert("Verification failed", text);
        return;
      }

      // Record the time only after successful verification.
      const verifiedAt = new Date();
      const timestamp = verifiedAt.toISOString();
      let updatedRecords;

      if (currentAction === "clockIn") {
        const alreadyOpen = records.some((record) => !record.clockOut);
        const alreadyToday = records.some(
          (record) => record.date === dateKey(verifiedAt)
        );

        if (alreadyOpen || alreadyToday) {
          throw new Error("You have already clocked in.");
        }

        updatedRecords = [
          {
            id: `${EMPLOYEE.id}-${verifiedAt.getTime()}`,
            date: dateKey(verifiedAt),
            clockIn: timestamp,
            clockOut: null,
          },
          ...records,
        ];
      } else {
        const openRecord = records.find((record) => !record.clockOut);

        if (!openRecord) {
          throw new Error("No active clock-in was found.");
        }

        if (verifiedAt.getTime() < Date.parse(openRecord.clockIn)) {
          throw new Error("Please correct your phone's date and time.");
        }

        updatedRecords = records.map((record) =>
          record.id === openRecord.id
            ? { ...record, clockOut: timestamp }
            : record
        );
      }

      // Show success only after local persistence succeeds.
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedRecords)
        );
      } catch {
        throw new Error(
          "Face matched, but attendance could not be saved. Please retry."
        );
      }

      setRecords(updatedRecords);
      setNow(verifiedAt);
      setAction(null);

      const label = currentAction === "clockIn" ? "Clock-in" : "Clock-out";
      const text = `Face matched! ${label} recorded at ${formatTime(timestamp)}.`;

      setMessage(text);
      Alert.alert(`${label} successful`, text);
    } catch (error) {
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

  if (!loggedIn) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>FA</Text>
          </View>

          <Text style={styles.title}>Face Attendance</Text>
          <Text style={styles.subtitle}>
            Sign in to mark your office attendance
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Employee login</Text>

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              onSubmitEditing={login}
            />

            <Button title="Login" onPress={login} />
            <Text style={styles.demo}>
              Demo login: employee / 123456
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cameraTitle =
    action === "register"
      ? "Register Face"
      : action === "clockIn"
      ? "Verify Face to Clock In"
      : "Verify Face to Clock Out";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Face Attendance</Text>
          <Text style={styles.subtitle}>{EMPLOYEE.id}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {["home", "history"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tab, tab === item && styles.activeTab]}
            onPress={() => setTab(item)}
          >
            <Text
              style={[
                styles.tabText,
                tab === item && styles.activeTabText,
              ]}
            >
              {item === "home" ? "Home" : "History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {storageError ? (
          <View style={styles.card}>
            <Text style={styles.error}>{storageError}</Text>
            <Button title="Retry loading history" onPress={loadHistory} />
          </View>
        ) : !storageReady ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : tab === "home" ? (
          <>
            <Text style={styles.welcome}>Hello, {EMPLOYEE.name}</Text>
            <Text style={styles.subtitle}>{formatDate(now)}</Text>

            <View style={styles.clockCard}>
              <Text style={styles.clockLabel}>CURRENT TIME</Text>
              <Text style={styles.clock}>{formatTime(now)}</Text>
              <Text style={styles.clockStatus}>
                {activeRecord
                  ? "You are clocked in"
                  : today?.clockOut
                  ? "Attendance completed"
                  : "Ready to start your day"}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {activeRecord && activeRecord.date !== dateKey(now)
                  ? `Open shift · ${formatDate(activeRecord.clockIn)}`
                  : "Today's attendance"}
              </Text>

              <View style={styles.timeRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.label}>Clock in</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(displayedRecord?.clockIn)}
                  </Text>
                </View>

                <View style={styles.timeColumn}>
                  <Text style={styles.label}>Clock out</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(displayedRecord?.clockOut)}
                  </Text>
                </View>
              </View>

              <Text style={styles.duration}>
                Duration: {duration(displayedRecord, now)}
              </Text>

              <Button
                title="Clock In"
                onPress={() => openCamera("clockIn")}
                disabled={!canClockIn || busy}
              />
              <Button
                title="Clock Out"
                onPress={() => openCamera("clockOut")}
                disabled={!canClockOut || busy}
                danger
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Face registration</Text>
              <Text style={styles.subtitle}>
                Register your face before marking attendance.
              </Text>
              <Button
                title="Register / Re-register Face"
                onPress={() => openCamera("register")}
                disabled={busy}
                secondary
              />
            </View>

            {!!message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.welcome}>Attendance history</Text>
            <Text style={styles.subtitle}>
              {records.length} attendance record(s)
            </Text>

            {records.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.subtitle}>
                  No attendance yet. Your first clock-in will appear here.
                </Text>
              </View>
            ) : (
              records.map((record) => (
                <View key={record.id} style={styles.card}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.cardTitle}>
                      {formatDate(record.clockIn)}
                    </Text>
                    <Text
                      style={[
                        styles.badge,
                        !record.clockOut && styles.activeBadge,
                      ]}
                    >
                      {record.clockOut ? "Completed" : "Active"}
                    </Text>
                  </View>

                  <Text style={styles.historyLine}>
                    Clock in: {formatTime(record.clockIn)}
                  </Text>
                  <Text style={styles.historyLine}>
                    Clock out: {formatTime(record.clockOut)}
                    {record.clockOut &&
                    dateKey(record.clockOut) !== record.date
                      ? ` (${formatDate(record.clockOut)})`
                      : ""}
                  </Text>
                  <Text style={styles.duration}>
                    Duration: {duration(record, now)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={action !== null}
        animationType="slide"
        onRequestClose={closeCamera}
      >
        <SafeAreaView style={styles.cameraScreen}>
          <Text style={styles.cameraTitle}>{cameraTitle}</Text>
          <Text style={styles.cameraHint}>
            Keep your face centered and use good lighting.
          </Text>

          {action !== null && permission?.granted && (
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                onCameraReady={() => setCameraReady(true)}
                onMountError={() => {
                  setCameraReady(false);
                  Alert.alert(
                    "Camera error",
                    "Unable to open the camera. Close and try again."
                  );
                }}
              />
            </View>
          )}

          {busy && (
            <View style={styles.processing}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.subtitle}>
                {action === "register"
                  ? "Registering face..."
                  : "Verifying face and saving attendance..."}
              </Text>
            </View>
          )}

          <Button
            title={
              busy
                ? "Processing..."
                : !cameraReady
                ? "Starting camera..."
                : action === "register"
                ? "Capture & Register"
                : "Capture & Verify"
            }
            onPress={captureAndSubmit}
            disabled={busy || !cameraReady}
          />
          <Button
            title="Cancel"
            onPress={closeCamera}
            disabled={busy}
            secondary
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f6fb" },
  loginContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  logoText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: { color: "#64748b", fontSize: 14, lineHeight: 21 },
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
    color: "#0f172a",
    marginBottom: 10,
  },
  label: { color: "#64748b", fontSize: 14, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  button: {
    padding: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButton: { backgroundColor: "#eaf0ff" },
  secondaryButtonText: { color: "#2563eb" },
  dangerButton: { backgroundColor: "#dc2626" },
  disabled: { opacity: 0.4 },
  demo: {
    textAlign: "center",
    color: "#64748b",
    marginTop: 18,
    fontSize: 13,
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 21, fontWeight: "800", color: "#0f172a" },
  logout: { color: "#dc2626", fontWeight: "700", padding: 8 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 12,
  },
  tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 9 },
  activeTab: { backgroundColor: "#fff" },
  tabText: { color: "#64748b", fontWeight: "700" },
  activeTabText: { color: "#2563eb" },
  content: { padding: 20, paddingBottom: 40 },
  welcome: { fontSize: 23, fontWeight: "800", color: "#0f172a" },
  clockCard: {
    backgroundColor: "#1d4ed8",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    alignItems: "center",
  },
  clockLabel: { color: "#bfdbfe", fontSize: 12, letterSpacing: 2 },
  clock: { color: "#fff", fontSize: 40, fontWeight: "800", marginVertical: 8 },
  clockStatus: { color: "#dbeafe", fontSize: 15 },
  timeRow: { flexDirection: "row", marginVertical: 10 },
  timeColumn: { flex: 1 },
  timeValue: { color: "#0f172a", fontWeight: "800", fontSize: 23 },
  duration: { color: "#2563eb", fontWeight: "700", marginTop: 12 },
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
    backgroundColor: "#e0e7ff",
    borderRadius: 12,
    marginTop: 18,
  },
  messageText: { color: "#1e3a8a", lineHeight: 22 },
  error: { color: "#b91c1c", lineHeight: 22 },
  cameraScreen: { flex: 1, backgroundColor: "#f3f6fb", padding: 20 },
  cameraTitle: { fontSize: 23, fontWeight: "800", color: "#0f172a" },
  cameraHint: { color: "#64748b", marginTop: 8, marginBottom: 20 },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  processing: { alignItems: "center", paddingTop: 16, gap: 8 },
});