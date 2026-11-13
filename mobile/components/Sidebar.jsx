import React from "react";
import { Modal, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const EMPLOYEE_ITEMS = [
  ["home", "Home", "home-outline"],
  ["history", "FRS History", "time-outline"],
  ["apply", "Apply Leave", "document-text-outline"],
  ["leaves", "Leave History", "calendar-outline"],
  ["profile", "Profile", "person-outline"],
];
const ADMIN_ITEMS = [
  ["admin-home", "Admin Dashboard", "grid-outline"],
  ["employees", "Manage Employees", "people-outline"],
  ["admin-attendance", "Attendance History", "time-outline"],
  ["leave-approvals", "Leave Approvals", "checkmark-done-outline"],
  ["profile", "Profile", "person-outline"],
];

export default function Sidebar({ visible, selected, employee, onClose, onNavigate, onLogout }) {
  const name = employee?.name || "Employee";
  const items = employee?.role === "admin" ? ADMIN_ITEMS : EMPLOYEE_ITEMS;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.38)" }}>
        <SafeAreaView style={{ width: "82%", maxWidth: 340, backgroundColor: "#f7faf7", flex: 1 }}>
          <View style={{ backgroundColor: "#075b38", padding: 22, paddingTop: 28 }}>
            <TouchableOpacity onPress={onClose} style={{ alignSelf: "flex-end", padding: 4 }}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginTop: 8 }}><Ionicons name="leaf" size={28} color="#fff" /></View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 14 }}>AP Forest Department</Text>
            <Text style={{ color: "#d1fae5", marginTop: 5 }}>{name}</Text>
            <Text style={{ color: "#bbf7d0", fontSize: 12, marginTop: 2 }}>{employee?.id || ""}</Text>
          </View>
          <View style={{ padding: 12, paddingTop: 18, gap: 5, flex: 1 }}>
            {items.map(([key, label, icon]) => {
              const active = selected === key;
              return <TouchableOpacity key={key} onPress={() => onNavigate(key)} activeOpacity={0.8} style={{ minHeight: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, backgroundColor: active ? "#e6f4eb" : "transparent" }}>
                <Ionicons name={icon} size={20} color={active ? "#075b38" : "#58665d"} />
                <Text style={{ marginLeft: 13, color: active ? "#075b38" : "#26342b", fontWeight: active ? "800" : "600", fontSize: 15 }}>{label}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity onPress={onLogout} style={{ minHeight: 54, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: "#e3e9e4", paddingHorizontal: 25, marginBottom: 8 }}><Ionicons name="log-out-outline" size={20} color="#bc3932" /><Text style={{ color: "#bc3932", fontWeight: "800", marginLeft: 13 }}>Logout</Text></TouchableOpacity>
        </SafeAreaView>
        <TouchableOpacity onPress={onClose} activeOpacity={1} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}
