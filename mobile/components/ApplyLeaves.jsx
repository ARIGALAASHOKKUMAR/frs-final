import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const LEAVE_TYPES = [
  { label: "Casual Leave", icon: "🌴" },
  { label: "Sick Leave", icon: "🤒" },
  { label: "Earned Leave", icon: "🏆" },
];

const LEAVE_BALANCE_DAYS = 18;

// ---------- helpers ----------

function daysBetween(from, to) {
  const MS = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS) + 1;
}

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

// ---------- inline DateField ----------

function DateField({ label, value, onChange, minimumDate }) {
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
          value={value || minimumDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ---------- main component ----------

export default function ApplyLeaves({ onApplied }) {
  const [type, setType] = useState("Casual Leave");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rangeValid = !!(from && to && to >= from);
  const requestedDays = rangeValid ? daysBetween(from, to) : 0;
  const overBalance = requestedDays > LEAVE_BALANCE_DAYS;
  const reasonValid = reason.trim().length >= 3;
  const canSubmit = rangeValid && reasonValid && !busy && !overBalance;

  async function submit() {
    if (!rangeValid) {
      return Alert.alert("Invalid dates", "Please select valid from and to dates.");
    }
    if (to < from) {
      return Alert.alert("Invalid range", "To date cannot be before from date.");
    }
    if (from < today) {
      return Alert.alert("Invalid date", "From date cannot be in the past.");
    }
    if (overBalance) {
      return Alert.alert(
        "Insufficient balance",
        `You requested ${requestedDays} days but only have ${LEAVE_BALANCE_DAYS} days left.`
      );
    }
    if (!reasonValid) {
      return Alert.alert(
        "Reason required",
        "Please enter a short reason (at least 3 characters)."
      );
    }

    setBusy(true);
    try {
      await apiRequest("/api/leaves", {
        method: "POST",
        body: JSON.stringify({
          leaveType: type,
          fromDate: toISODate(from),
          toDate: toISODate(to),
          reason: reason.trim(),
        }),
      });
      Alert.alert("Leave applied", "Your leave request is pending approval.");
      onApplied?.();
    } catch (error) {
      Alert.alert("Unable to apply", error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={common.content}>
      <Text style={common.title}>Apply Leave</Text>

      <View
        style={[
          common.card,
          { backgroundColor: palette.pale, flexDirection: "row", alignItems: "center" },
        ]}
      >
        <Text style={{ fontSize: 30, marginRight: 14 }}>▦</Text>
        <View>
          <Text style={common.subtitle}>Leave Balance</Text>
          <Text style={{ color: palette.green, fontWeight: "900", fontSize: 23 }}>
            {LEAVE_BALANCE_DAYS} Days
          </Text>
        </View>
      </View>

      <View style={common.card}>
        <Text style={common.label}>Leave Type</Text>

        {/* Compact leave-type row — smaller padding, smaller icon/text */}
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {LEAVE_TYPES.map((item) => {
            const selected = type === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setType(item.label)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  marginHorizontal: 2,
                  paddingVertical: 8,
                  paddingHorizontal: 2,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? palette.green : palette.pale,
                  borderWidth: 1,
                  borderColor: selected ? palette.green : "transparent",
                }}
              >
                <Text style={{ fontSize: 16, marginBottom: 2 }}>{item.icon}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: selected ? "white" : palette.text,
                    fontWeight: "600",
                    fontSize: 10,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <DateField
          label="From Date"
          value={from}
          onChange={(d) => {
            setFrom(d);
            if (to && d && to < d) setTo(d);
          }}
          minimumDate={today}
        />

        <DateField
          label="To Date"
          value={to}
          onChange={setTo}
          minimumDate={from || today}
        />

        {rangeValid && (
          <Text
            style={{
              marginTop: 4,
              marginBottom: 8,
              color: overBalance ? (palette.red || "#c0392b") : palette.green,
              fontWeight: "700",
            }}
          >
            {requestedDays} day{requestedDays > 1 ? "s" : ""} requested
            {overBalance ? ` — exceeds ${LEAVE_BALANCE_DAYS}-day balance` : ""}
          </Text>
        )}

        <Text style={common.label}>Reason</Text>
        <TextInput
          style={[common.input, { minHeight: 90, textAlignVertical: "top" }]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Enter reason"
        />

        <TouchableOpacity
          style={[common.button, !canSubmit && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!canSubmit}
        >
          <Text style={common.buttonText}>
            {busy ? "Submitting…" : "Apply Leave →"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}