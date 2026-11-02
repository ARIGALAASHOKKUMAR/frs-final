import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const EMPTY = {
  id: "",
  name: "",
  username: "",
  password: "",
  mobile: "",
  designation: "",
  dateOfJoining: "",
  division: "",
  district: "",
};

// ---------- helpers ----------

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(d) {
  if (!d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// parse a stored "YYYY-MM-DD" (or ISO) string into a Date, safely
function parseStoredDate(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null; // e.g. 2026-02-30
  }
  return date;
}

// ---------- inline DateField ----------

function DateField({ label, value, onChange, maximumDate }) {
  const [show, setShow] = useState(false);

  function handleChange(event, date) {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "dismissed") return;
    }
    if (date) onChange(date);
    if (Platform.OS === "ios") setShow(false);
  }

  return (
    <View>
      <Text style={common.label}>{label}</Text>
      <TouchableOpacity
        style={[common.input, { justifyContent: "center" }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? palette.text : (palette.muted || "#888") }}>
          {value ? formatDisplay(value) : "Select date"}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value || maximumDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ---------- main component ----------

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/api/employees");
      setEmployees(result.employees);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setEditorVisible(true);
  }

  function openEdit(employee) {
    setEditingId(employee.id);
    setForm({
      ...EMPTY,
      ...employee,
      password: "",
      dateOfJoining: String(employee.dateOfJoining || "").slice(0, 10),
    });
    setEditorVisible(true);
  }

  async function save() {
    if (
      !form.id.trim() ||
      !form.name.trim() ||
      !form.username.trim() ||
      !form.designation.trim() ||
      !form.dateOfJoining ||
      (!editingId && !form.password)
    ) {
      Alert.alert(
        "Missing details",
        "Fill the required employee fields and date of joining."
      );
      return;
    }

    // Final guard: date must be a real YYYY-MM-DD not in the future
    const parsed = parseStoredDate(form.dateOfJoining);
    if (!parsed) {
      Alert.alert("Invalid date", "Please pick a valid date of joining.");
      return;
    }
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (parsed > todayMidnight) {
      Alert.alert("Invalid date", "Date of joining cannot be in the future.");
      return;
    }

    const payload = { ...form };
    if (editingId && !payload.password) delete payload.password;

    setSaving(true);
    try {
      await apiRequest(
        editingId
          ? `/api/employees/${encodeURIComponent(editingId)}`
          : "/api/employees",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      setEditorVisible(false);
      await loadEmployees();
    } catch (e) {
      Alert.alert("Could not save employee", e.message);
    } finally {
      setSaving(false);
    }
  }

  function remove(employee) {
    Alert.alert(
      "Delete employee",
      `Delete ${employee.name} (${employee.id}) and their related attendance, face template, and leave records?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(
                `/api/employees/${encodeURIComponent(employee.id)}`,
                { method: "DELETE" }
              );
              await loadEmployees();
            } catch (e) {
              Alert.alert("Could not delete employee", e.message);
            }
          },
        },
      ]
    );
  }

  const field = (key, label, placeholder, props = {}) => (
    <View key={key}>
      <Text style={common.label}>{label}</Text>
      <TextInput
        style={common.input}
        value={String(form[key] ?? "")}
        onChangeText={(value) => setForm((old) => ({ ...old, [key]: value }))}
        placeholder={placeholder}
        {...props}
      />
    </View>
  );

  // Date field wired to form.dateOfJoining
  const joiningDateValue = parseStoredDate(form.dateOfJoining);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={common.content}>
        <View style={common.row}>
          <View>
            <Text style={common.title}>Employees</Text>
            <Text style={common.subtitle}>{employees.length} employee(s)</Text>
          </View>
          <TouchableOpacity
            onPress={openCreate}
            style={{ backgroundColor: palette.green, borderRadius: 12, padding: 12 }}
          >
            <Ionicons name="person-add-outline" size={21} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.green} style={{ marginTop: 28 }} />
        ) : error ? (
          <View style={common.card}>
            <Text style={{ color: palette.red }}>{error}</Text>
            <TouchableOpacity onPress={loadEmployees}>
              <Text style={[common.green, { marginTop: 12 }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          employees.map((employee) => (
            <View key={employee.id} style={common.card}>
              <View style={common.row}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}
                  >
                    {employee.name}
                  </Text>
                  <Text style={common.subtitle}>
                    {employee.id} · {employee.designation || "No designation"}
                  </Text>
                  <Text style={common.subtitle}>
                    Joined: {String(employee.dateOfJoining || "—").slice(0, 10)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEdit(employee)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="create-outline" size={21} color={palette.green} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(employee)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={21} color={palette.red} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={editorVisible}
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#f5f8f5", paddingTop: 30 }}>
          <View
            style={[common.row, { paddingHorizontal: 18, paddingBottom: 10 }]}
          >
            <Text style={common.title}>
              {editingId ? "Update Employee" : "Create Employee"}
            </Text>
            <TouchableOpacity onPress={() => setEditorVisible(false)}>
              <Ionicons name="close" size={25} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={common.content}>
            {field("id", "Employee ID *", "e.g. APFD001", {
              autoCapitalize: "characters",
            })}
            {field("name", "Full name *", "Employee name")}
            {field("username", "Login username *", "Login username", {
              autoCapitalize: "none",
            })}
            {!editingId
              ? field("password", "Temporary password *", "Set temporary password", {
                  secureTextEntry: true,
                })
              : field("password", "New password (optional)", "Leave blank to keep current", {
                  secureTextEntry: true,
                })}
            {field("designation", "Designation *", "Designation")}

            {/* Calendar picker instead of free-text date */}
            <DateField
              label="Date of joining *"
              value={joiningDateValue}
              onChange={(d) =>
                setForm((old) => ({ ...old, dateOfJoining: toISODate(d) }))
              }
              maximumDate={todayMidnight}
            />

            {field("mobile", "Mobile", "Mobile number", {
              keyboardType: "phone-pad",
            })}
            {field("division", "Division", "Division")}
            {field("district", "District", "District")}

            <TouchableOpacity
              disabled={saving}
              onPress={save}
              style={common.button}
            >
              <Text style={common.buttonText}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create Employee"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}