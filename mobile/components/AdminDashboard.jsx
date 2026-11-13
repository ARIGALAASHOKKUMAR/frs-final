import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

export default function AdminDashboard({ onEmployees, onLeaves, onAttendance }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([apiRequest("/api/employees"), apiRequest("/api/leaves")])
      .then(([employees, leaves]) => setCounts({ employees: employees.employees.length, pending: leaves.requests.filter((item) => item.status === "Pending").length }))
      .catch((e) => setError(e.message));
  }, []);
  const card = (label, value, icon, action) => <TouchableOpacity onPress={action} style={[common.card, { flex: 1, alignItems: "center", paddingVertical: 23 }]}><Ionicons name={icon} size={27} color={palette.green} /><Text style={{ fontSize: 26, fontWeight: "900", color: palette.deep, marginTop: 10 }}>{value}</Text><Text style={common.subtitle}>{label}</Text></TouchableOpacity>;
  return <ScrollView contentContainerStyle={common.content}><Text style={common.title}>Admin Dashboard</Text><Text style={common.subtitle}>Manage employees, attendance, and leave requests.</Text>{!counts && !error ? <ActivityIndicator color={palette.green} style={{ marginTop: 24 }} /> : null}{error ? <Text style={[common.subtitle, { color: palette.red, marginTop: 16 }]}>{error}</Text> : null}<View style={{ flexDirection: "row", gap: 10 }}>{card("Employees", counts?.employees ?? "—", "people-outline", onEmployees)}{card("Pending leaves", counts?.pending ?? "—", "calendar-outline", onLeaves)}</View><TouchableOpacity style={common.button} onPress={onAttendance}><Text style={common.buttonText}>View Attendance History</Text></TouchableOpacity><TouchableOpacity style={[common.button, { backgroundColor: palette.orange }]} onPress={onLeaves}><Text style={common.buttonText}>Review Leave Requests</Text></TouchableOpacity><TouchableOpacity style={[common.button, { backgroundColor: palette.deep }]} onPress={onEmployees}><Text style={common.buttonText}>Manage Employees</Text></TouchableOpacity></ScrollView>;
}
