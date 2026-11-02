import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { common, palette } from "./CommonStyles";

export default function Profile({ employee, faceRegistered, faceStatus, onLogout }) {
  const name = employee?.name || "Ashok Kumar";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const details = [
    {
      icon: "person-circle-outline",
      label: "Account type",
      value: employee?.role === "admin" ? "Administrator" : "Employee",
    },
    {
      icon: "briefcase-outline",
      label: "Designation",
      value: employee?.designation || "Forest Range Officer",
    },
    {
      icon: "calendar-outline",
      label: "Date of joining",
      value: employee?.dateOfJoining ? String(employee.dateOfJoining).slice(0, 10) : "Not provided",
    },
    {
      icon: "business-outline",
      label: "Division",
      value: employee?.division || "Guntur Division",
    },
    {
      icon: "location-outline",
      label: "District",
      value: employee?.district || "Guntur",
    },
  ];

  const InfoRow = ({ icon, label, value, last }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#f1f5f9",
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: "#f0fdf4",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={palette.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: "#6b7280",
            letterSpacing: 0.5,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: palette.text,
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={[common.content, { paddingBottom: 40, gap: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 4 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: palette.text,
            letterSpacing: -0.3,
          }}
        >
          My Profile
        </Text>
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Manage your account details
        </Text>
      </View>

      {/* Avatar card */}
      <View style={[common.card, { alignItems: "center", paddingVertical: 26 }]}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: palette.green,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: palette.green,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 30,
              fontWeight: "800",
              letterSpacing: 1,
            }}
          >
            {initials}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: palette.text,
            marginTop: 14,
          }}
        >
          {name}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: "#f0fdf4",
            borderWidth: 1,
            borderColor: "#dcfce7",
          }}
        >
          <Ionicons name="id-card-outline" size={13} color={palette.green} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: palette.green,
              letterSpacing: 0.3,
            }}
          >
            {employee?.id || "EMP001"}
          </Text>
        </View>
      </View>

      {/* Details card */}
      <View style={[common.card, { paddingVertical: 6 }]}>
        {details.map((d, i) => (
          <InfoRow
            key={d.label}
            icon={d.icon}
            label={d.label}
            value={d.value}
            last={i === details.length - 1}
          />
        ))}
      </View>

      {/* Employee face status */}
      {employee?.role !== "admin" && <View style={common.card}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: faceRegistered ? "#dcfce7" : faceStatus === "error" ? "#fee2e2" : "#fef3c7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={faceRegistered ? "checkmark-circle" : faceStatus === "error" ? "help-circle" : "alert-circle"}
                size={22}
                color={faceRegistered ? "#166534" : faceStatus === "error" ? "#b91c1c" : "#92400e"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: palette.text,
                }}
              >
                Face Registration
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 2,
                }}
              >
                {faceRegistered ? "Your face is registered for attendance" : faceStatus === "error" ? "Could not verify registration status" : faceStatus === "loading" ? "Checking registration status" : "Register your face to clock in"}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: faceRegistered ? "#dcfce7" : faceStatus === "error" ? "#fee2e2" : "#fef3c7",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: faceRegistered ? "#166534" : faceStatus === "error" ? "#b91c1c" : "#92400e",
              }}
            >
              {faceRegistered ? "ACTIVE" : faceStatus === "error" ? "UNKNOWN" : faceStatus === "loading" ? "CHECKING" : "PENDING"}
            </Text>
          </View>
        </View>
      </View>}

      {/* Logout */}
      <TouchableOpacity
        onPress={onLogout}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 15,
          borderRadius: 14,
          backgroundColor: "#fef2f2",
          borderWidth: 1.5,
          borderColor: "#fecaca",
        }}
      >
        <Ionicons name="log-out-outline" size={19} color="#dc2626" />
        <Text
          style={{
            color: "#dc2626",
            fontWeight: "800",
            fontSize: 15,
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
