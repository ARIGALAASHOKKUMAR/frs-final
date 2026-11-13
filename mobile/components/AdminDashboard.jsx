import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const STATUS_ITEMS = [
  { status: "In Office", label: "In office", color: "#16a34a" },
  { status: "WFH", label: "Work from home", color: "#168be1" },
  { status: "Leave", label: "On leave", color: "#f59e0b" },
  { status: "Not Clocked In", label: "Not clocked in", color: "#f97316" },
];
const point = (cx, cy, radius, angle) => {
  const radians = (angle * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
};
const dateLabel = (value) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "Today";

function PieChart({ items, total, selected, onSelect }) {
  const segments = [];
  let angle = -90;
  items.filter((item) => item.count > 0).forEach((item) => {
    const sweep = (item.count / total) * 360;
    const endAngle = angle + sweep;
    if (sweep >= 359.99) {
      segments.push(<Circle key={item.status} cx="110" cy="110" r="98" fill={item.color} onPress={() => onSelect(item.status)} />);
    } else {
      const [x1, y1] = point(110, 110, 98, angle);
      const [x2, y2] = point(110, 110, 98, endAngle);
      const large = sweep > 180 ? 1 : 0;
      const path = `M 110 110 L ${x1} ${y1} A 98 98 0 ${large} 1 ${x2} ${y2} Z`;
      segments.push(<Path key={item.status} d={path} fill={item.color} onPress={() => onSelect(item.status)} />);
    }
    angle = endAngle;
  });
  return <View style={{ width: 220, height: 220, alignSelf: "center" }}>
    <Svg width="220" height="220" viewBox="0 0 220 220">
      {total > 0 ? segments : <Circle cx="110" cy="110" r="98" fill="#e8eee9" />}
      <Circle cx="110" cy="110" r="57" fill="#fff" />
    </Svg>
    <View style={{ position: "absolute", left: 53, top: 53, width: 114, height: 114, borderRadius: 57, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: palette.deep, fontWeight: "800", fontSize: 15, textAlign: "center" }}>{selected || "Employees"}</Text>
      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 3 }}>{total} total</Text>
    </View>
  </View>;
}

export default function AdminDashboard({ onEmployees, onLeaves, onAttendance }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Not Clocked In");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/employees"),
      apiRequest("/api/leaves"),
      apiRequest("/api/attendance/team-status"),
    ])
      .then(([employees, leaves, attendance]) => setSummary({
        employeeCount: employees.employees.length,
        pending: leaves.requests.filter((item) => item.status === "Pending").length,
        date: attendance.date,
        employees: attendance.employees || [],
      }))
      .catch((e) => setError(e.message));
  }, []);

  const statusItems = useMemo(() => STATUS_ITEMS.map((item) => ({
    ...item,
    employees: (summary?.employees || []).filter((employee) => employee.status === item.status),
    count: (summary?.employees || []).filter((employee) => employee.status === item.status).length,
  })), [summary]);
  const total = summary?.employeeCount || 0;
  const selected = statusItems.find((item) => item.status === selectedStatus) || statusItems[0];
  const card = (label, value, icon, action) => <TouchableOpacity onPress={action} style={[common.card, { flex: 1, alignItems: "center", paddingVertical: 23 }]}><Ionicons name={icon} size={27} color={palette.green} /><Text style={{ fontSize: 26, fontWeight: "900", color: palette.deep, marginTop: 10 }}>{value}</Text><Text style={common.subtitle}>{label}</Text></TouchableOpacity>;

  return <ScrollView contentContainerStyle={common.content}>
    <Text style={common.title}>Admin Dashboard</Text>
    <Text style={common.subtitle}>Manage employees, attendance, and leave requests.</Text>
    {!summary && !error ? <ActivityIndicator color={palette.green} style={{ marginTop: 24 }} /> : null}
    {error ? <Text style={[common.subtitle, { color: palette.red, marginTop: 16 }]}>{error}</Text> : null}
    <View style={{ flexDirection: "row", gap: 10 }}>
      {card("Employees", summary?.employeeCount ?? "—", "people-outline", onEmployees)}
      {card("Pending leaves", summary?.pending ?? "—", "calendar-outline", onLeaves)}
    </View>

    {summary && <View style={common.card}>
      <View style={[common.row, { marginBottom: 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.deep, fontWeight: "900", fontSize: 19 }}>Team Attendance</Text>
          <Text style={common.subtitle}>Today’s employee status</Text>
        </View>
        <Text style={{ color: palette.deep, fontWeight: "800" }}>{dateLabel(summary.date)}</Text>
      </View>
      <PieChart items={statusItems} total={total} selected={selected?.label} onSelect={(status) => setSelectedStatus(status)} />
      {statusItems.map((item) => <TouchableOpacity key={item.status} onPress={() => setSelectedStatus(item.status)} activeOpacity={0.75} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: item.color, marginRight: 10 }} />
        <Text style={{ flex: 1, color: palette.text, fontWeight: selectedStatus === item.status ? "800" : "500" }}>{item.label}</Text>
        <Text style={{ color: item.color, fontWeight: "900", fontSize: 17 }}>{item.count}</Text>
        <Ionicons name="chevron-forward" size={17} color={palette.muted} style={{ marginLeft: 8 }} />
      </TouchableOpacity>)}
      <View style={{ marginTop: 17 }}>
        <Text style={{ color: palette.deep, fontSize: 16, fontWeight: "900" }}>{selected?.label} · {selected?.count}</Text>
        {selected?.employees.length ? selected.employees.map((employee) => <TouchableOpacity key={employee.employeeId} onPress={onAttendance} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <Text style={{ color: palette.text, fontWeight: "800" }}>{employee.name}</Text>
          <Text style={common.subtitle}>{employee.employeeId}{employee.leaveType ? ` · ${employee.leaveType}` : ""}</Text>
        </TouchableOpacity>) : <Text style={common.subtitle}>No employees in this status today.</Text>}
      </View>
    </View>}

    <TouchableOpacity style={common.button} onPress={onAttendance}><Text style={common.buttonText}>View Attendance History</Text></TouchableOpacity>
    <TouchableOpacity style={[common.button, { backgroundColor: palette.orange }]} onPress={onLeaves}><Text style={common.buttonText}>Review Leave Requests</Text></TouchableOpacity>
    <TouchableOpacity style={[common.button, { backgroundColor: palette.deep }]} onPress={onEmployees}><Text style={common.buttonText}>Manage Employees</Text></TouchableOpacity>
  </ScrollView>;
}
