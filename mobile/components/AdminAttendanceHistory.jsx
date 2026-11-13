import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const MIN_DATE = new Date(1900, 0, 1, 12);
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateFromKey = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
const displayDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Any date";
const time = (value) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const addDays = (value, amount) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return iso(date);
};

function AttendanceChart({ records, employees, employeeId, from, to }) {
  const today = iso(new Date());
  const end = to || today;
  const start = from || addDays(end, -6);
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const days = [];
  for (let date = new Date(startDate); date <= endDate && days.length < 7; date.setDate(date.getDate() + 1)) {
    days.push(iso(date));
  }
  const headcount = employeeId ? 1 : employees.length;
  const presentByDay = records.reduce((counts, record) => {
    const date = String(record.date).slice(0, 10);
    if (days.includes(date)) counts[date] = (counts[date] || new Set()).add(String(record.employeeId));
    return counts;
  }, {});

  return <View style={common.card}>
    <Text style={{ color: palette.deep, fontSize: 17, fontWeight: "800" }}>Daily attendance</Text>
    <Text style={common.subtitle}>{employeeId ? "Selected employee" : `${headcount} employees`} · Present vs absent</Text>
    {!headcount ? <Text style={[common.subtitle, { marginTop: 14 }]}>Employee data is unavailable.</Text> : <>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 14, marginBottom: 5 }}>
        <Text style={{ color: palette.green, fontSize: 12, fontWeight: "700" }}>● Present</Text>
        <Text style={{ color: palette.orange, fontSize: 12, fontWeight: "700" }}>● Absent</Text>
      </View>
      {days.map((day) => {
        const present = Math.min(headcount, presentByDay[day]?.size || 0);
        const absent = headcount - present;
        const presentWidth = `${present / headcount * 100}%`;
        const label = new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
        return <View key={day} style={{ flexDirection: "row", alignItems: "center", marginTop: 11 }}>
          <Text style={{ width: 54, color: palette.muted, fontSize: 12 }}>{label}</Text>
          <View style={{ flex: 1, height: 14, borderRadius: 7, overflow: "hidden", flexDirection: "row", backgroundColor: "#fbe8ce" }}>
            {present > 0 && <View style={{ width: presentWidth, height: 14, backgroundColor: palette.green }} />}
          </View>
          <Text style={{ width: 47, textAlign: "right", color: palette.text, fontSize: 12, fontWeight: "700" }}>{present}/{headcount}</Text>
        </View>;
      })}
      <Text style={[common.subtitle, { fontSize: 12, marginTop: 9 }]}>Daily count: present / total employees. {"\u00b7"} Absent: {headcount ? "total minus present" : "—"}.</Text>
    </>}
  </View>;
}

function DateFilter({ label, value, onChange, minimumDate, maximumDate }) {
  const openPicker = () => {
    const todayLimit = new Date();
    todayLimit.setHours(23, 59, 59, 999);
    DateTimePickerAndroid.open({
      value: dateFromKey(value),
      mode: "date",
      display: "calendar",
      minimumDate: minimumDate || MIN_DATE,
      maximumDate: maximumDate && maximumDate < todayLimit ? maximumDate : todayLimit,
      onValueChange: (_event, date) => {
        if (!date) return;
        // Keep the device's selected calendar day; don't round-trip via UTC.
        onChange(iso(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
      },
    });
  };
  return <View style={{ flex: 1 }}>
    <Text style={common.label}>{label}</Text>
    <TouchableOpacity style={[common.input, { justifyContent: "center" }]} onPress={openPicker}>
      <Text style={{ color: value ? palette.text : palette.muted }}>{value ? displayDate(value) : "Any date"}</Text>
    </TouchableOpacity>
  </View>;
}

export default function AdminAttendanceHistory() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest("/api/employees").then((r) => setEmployees(r.employees || [])).catch((e) => setError(e.message)); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (employeeId) params.set("employeeId", employeeId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const result = await apiRequest(`/api/attendance/admin-history?${params.toString()}`);
      setRecords(result.records || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [employeeId, from, to]);
  useEffect(() => { load(); }, [load]);
  return <ScrollView contentContainerStyle={common.content}>
    <Text style={common.title}>Employee Attendance</Text>
    <Text style={common.subtitle}>Review attendance records across employees and dates.</Text>
    <Text style={common.label}>Employee</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {[{ id: "", name: "All employees" }, ...employees].map((employee) => <TouchableOpacity key={employee.id || "all"} onPress={() => setEmployeeId(employee.id)} style={{ paddingHorizontal: 13, paddingVertical: 10, marginRight: 8, borderRadius: 20, backgroundColor: employeeId === employee.id ? palette.green : "#e8eee9" }}><Text style={{ color: employeeId === employee.id ? "#fff" : palette.deep, fontWeight: "700" }}>{employee.name}</Text></TouchableOpacity>)}
    </ScrollView>
    <View style={{ flexDirection: "row", gap: 10 }}>
      <DateFilter label="From" value={from} maximumDate={to ? dateFromKey(to) : undefined} onChange={(date) => { setFrom(date); if (to && date > to) setTo(date); }} />
      <DateFilter label="To" value={to} minimumDate={from ? dateFromKey(from) : undefined} onChange={setTo} />
    </View>
    <TouchableOpacity style={common.button} onPress={() => { setEmployeeId(""); setFrom(""); setTo(""); }}><Text style={common.buttonText}>Clear filters</Text></TouchableOpacity>
    {!loading && !error && <AttendanceChart records={records} employees={employees} employeeId={employeeId} from={from} to={to} />}
    <Text style={[common.subtitle, { marginVertical: 12 }]}>{records.length} record(s)</Text>
    {loading ? <ActivityIndicator color={palette.green} /> : error ? <Text style={{ color: palette.red }}>{error}</Text> : records.length === 0 ? <View style={common.card}><Text style={common.subtitle}>No attendance records match these filters.</Text></View> : records.map((r) => <View key={r.id} style={common.card}>
      <Text style={{ color: palette.deep, fontWeight: "800", fontSize: 16 }}>{r.name} · {r.employeeId}</Text>
      <Text style={common.subtitle}>{displayDate(String(r.date).slice(0, 10))}{r.designation ? ` · ${r.designation}` : ""}</Text>
      <Text style={[common.subtitle, { marginTop: 8 }]}>Clock in: {time(r.clockIn)}　 Clock out: {time(r.clockOut)}</Text>
      <Text style={[common.green, { marginTop: 5 }]}>{r.clockOut ? "Completed" : "Active"}</Text>
    </View>)}
  </ScrollView>;
}
