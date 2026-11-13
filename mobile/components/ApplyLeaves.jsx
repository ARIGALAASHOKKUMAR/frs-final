import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const LEAVE_TYPES = [
  { label: "Casual Leave", icon: "🌴" },
  { label: "Sick Leave", icon: "🤒" },
  { label: "Earned Leave", icon: "🏆" },
  { label: "Work From Home", icon: "🏠" },
  { label: "Attendance Regularization", icon: "📝" },
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

function fromISODate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
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
  function openPicker() {
    DateTimePickerAndroid.open({
      value: value || minimumDate || new Date(),
      mode: "date",
      display: "calendar",
      ...(minimumDate ? { minimumDate } : {}),
      onValueChange: (_event, date) => {
        if (date) onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
      },
    });
  }

  return (
    <View>
      <Text style={common.label}>{label}</Text>
      <TouchableOpacity
        style={[common.input, { justifyContent: "center" }]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? palette.text : (palette.muted || "#888") }}>
          {value ? formatDisplay(value) : "Select date"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

// ---------- main component ----------

export default function ApplyLeaves({ onApplied, initialType, initialDate, regularizationOnly = false, leaveOnly = false }) {
  const [type, setType] = useState(initialType || "Casual Leave");
  const [from, setFrom] = useState(() => fromISODate(initialDate));
  const [to, setTo] = useState(() => fromISODate(initialDate));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const rangeValid = !!(from && to && to >= from);
  const requestedDays = rangeValid ? daysBetween(from, to) : 0;
  const specialRequest = type === "Work From Home" || type === "Attendance Regularization";
  const overBalance = !specialRequest && requestedDays > LEAVE_BALANCE_DAYS;
  const visibleLeaveTypes = leaveOnly ? LEAVE_TYPES.filter((item) => !["Work From Home", "Attendance Regularization"].includes(item.label)) : LEAVE_TYPES;
  const reasonValid = reason.trim().length >= 3;
  const canSubmit = rangeValid && reasonValid && !busy && !overBalance;

  async function submit() {
    if (!rangeValid) {
      return Alert.alert("Invalid dates", "Please select valid from and to dates.");
    }
    if (to < from) {
      return Alert.alert("Invalid range", "To date cannot be before from date.");
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
      Alert.alert(
        regularizationOnly ? "Regularization submitted" : "Leave request submitted",
        "Your request is pending approval."
      );
      onApplied?.();
    } catch (error) {
      Alert.alert("Unable to apply", error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={common.content}>
      <Text style={common.title}>{regularizationOnly ? "Attendance Regularization" : "Apply Leave"}</Text>

      {!regularizationOnly && <View
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
      </View>}

      <View style={common.card}>
        {regularizationOnly ? <View style={{ marginBottom: 16 }}>
          <Text style={common.label}>Date to regularize</Text>
          <Text style={{ color: palette.deep, fontWeight: "800", fontSize: 16 }}>{formatDisplay(from)}</Text>
          <Text style={common.subtitle}>Enter the reason for the missed clock-out.</Text>
        </View> : <>
        <Text style={common.label}>Leave Type</Text>

        {/* Compact leave-type row — smaller padding, smaller icon/text */}
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {visibleLeaveTypes.map((item) => {
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
                  numberOfLines={2}
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
          minimumDate={undefined}
        />

        <DateField
          label="To Date"
          value={to}
          onChange={setTo}
          minimumDate={from || null}
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
        </>}

        <Text style={common.label}>Reason</Text>
        <TextInput
          style={[common.input, { minHeight: 90, textAlignVertical: "top" }]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder={regularizationOnly ? "Explain why you missed clock-out" : "Enter reason"}
        />

        <TouchableOpacity
          style={[common.button, !canSubmit && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!canSubmit}
        >
          <Text style={common.buttonText}>
            {busy ? "Submitting…" : regularizationOnly ? "Submit Regularization →" : "Apply Leave →"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
