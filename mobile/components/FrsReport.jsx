import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { common, palette } from "./CommonStyles";

export default function FrsReport({
  employee,
  now,
  record,
  records = [],
  faceStatus,
  onRefreshFaceStatus,
  onClockIn,
  onClockOut,
  onRegisterFace,
}) {
  const time =
    now?.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }) || "--:--";

  const date = now?.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const monthlyCount = records.filter((item) => {
    const d = new Date(item.clockIn);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  const isPresent = Boolean(record);
  const isClockedOut = Boolean(record?.clockOut);

  const fmt = (v) =>
    v
      ? new Date(v).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const ActionButton = ({ label, icon, color, onPress, disabled }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: disabled ? "#e5e7eb" : color,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? "#9ca3af" : "#fff"}
      />
      <Text
        style={{
          color: disabled ? "#9ca3af" : "#fff",
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      contentContainerStyle={[
        common.content,
        { paddingBottom: 40, gap: 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={{ paddingHorizontal: 4 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: palette.text,
            letterSpacing: -0.3,
          }}
        >
          Welcome, {employee?.name?.split(" ")[0] || "Ashok"} 👋
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginTop: 4,
          }}
        >
          Forest Department · {date}
        </Text>
      </View>

      {/* Clock / Status card */}
      <View
        style={[
          common.card,
          {
            paddingVertical: 22,
            alignItems: "center",
            borderRadius: 20,
            backgroundColor: palette.deep,
            borderColor: palette.deep,
          },
        ]}
      >
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 2,
          }}
        >
          CURRENT TIME
        </Text>

        <Text
          style={{
            color: "#fff",
            fontWeight: "800",
            fontSize: 36,
            marginTop: 6,
            letterSpacing: -0.5,
          }}
        >
          {time}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isPresent ? "#4ade80" : "#fbbf24",
            }}
          />
          <Text
            style={{
              color: "#ecfdf5",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {isPresent ? "You are present today" : "Ready to mark attendance"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", width: "100%", marginTop: 16, gap: 10 }}>
          <ActionButton
            label="Clock In"
            icon="log-in-outline"
            color={palette.green}
            onPress={onClockIn}
            disabled={faceStatus !== "registered" || isPresent}
          />
          <ActionButton
            label="Clock Out"
            icon="log-out-outline"
            color={palette.orange}
            onPress={onClockOut}
            disabled={faceStatus !== "registered" || !isPresent || isClockedOut}
          />
        </View>
      </View>

      {/* Today's details */}
      <View style={common.card}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <Ionicons name="today-outline" size={18} color={palette.green} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: palette.text,
            }}
          >
            Today's Details
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Clock In", value: fmt(record?.clockIn), icon: "enter-outline" },
            { label: "Clock Out", value: fmt(record?.clockOut), icon: "exit-outline" },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: "#f0fdf4",
                borderWidth: 1,
                borderColor: "#dcfce7",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={item.icon} size={14} color={palette.green} />
                <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600" }}>
                  {item.label.toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: palette.deep,
                  marginTop: 6,
                }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {faceStatus === "registered" ? (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: "#f0fdf4" }}>
            <Ionicons name="checkmark-circle" size={18} color={palette.green} />
            <Text style={{ color: palette.green, fontWeight: "700", fontSize: 14 }}>Face registration complete</Text>
          </View>
        ) : faceStatus === "unregistered" ? (
          <TouchableOpacity
            onPress={onRegisterFace}
            activeOpacity={0.85}
            style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: palette.green, backgroundColor: "#f0fdf4" }}
          >
            <Ionicons name="scan-outline" size={18} color={palette.green} />
            <Text style={{ color: palette.green, fontWeight: "700", fontSize: 14 }}>Face Registration</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: "#fff7ed", alignItems: "center" }}>
            <Text style={{ color: "#9a3412", fontWeight: "700", textAlign: "center" }}>
              {faceStatus === "error" ? "Could not check face registration status." : "Checking face registration…"}
            </Text>
            {faceStatus === "error" && <TouchableOpacity onPress={onRefreshFaceStatus} style={{ padding: 8 }}><Text style={{ color: palette.green, fontWeight: "800" }}>Retry status check</Text></TouchableOpacity>}
          </View>
        )}
      </View>

      {/* Monthly progress */}
      <View style={common.card}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="stats-chart-outline" size={18} color={palette.green} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: palette.text,
              }}
            >
              Monthly Attendance
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: palette.green,
            }}
          >
            {monthlyCount}/26
          </Text>
        </View>

        <View
          style={{
            height: 10,
            borderRadius: 6,
            backgroundColor: "#e5f3ea",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 10,
              width: `${Math.min(100, (monthlyCount / 26) * 100)}%`,
              borderRadius: 6,
              backgroundColor: palette.green,
            }}
          />
        </View>

        <Text
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 8,
          }}
        >
          {monthlyCount} day{monthlyCount === 1 ? "" : "s"} recorded this month
        </Text>
      </View>
    </ScrollView>
  );
}
