import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateValue = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
const displayDate = (value) => value ? dateValue(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Any date";
const time = (value) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const countDays = (from, to) => {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000) + 1);
};

function DateFilter({ label, value, onChange, minimumDate, maximumDate }) {
  const open = () => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    DateTimePickerAndroid.open({
      value: dateValue(value),
      mode: "date",
      display: "calendar",
      ...(minimumDate ? { minimumDate } : {}),
      maximumDate: maximumDate && maximumDate < todayEnd ? maximumDate : todayEnd,
      onValueChange: (_event, picked) => {
        if (picked) onChange(iso(new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12)));
      },
    });
  };
  return <View style={{ flex: 1 }}>
    <Text style={common.label}>{label}</Text>
    <TouchableOpacity style={[common.input, { justifyContent: "center" }]} onPress={open}>
      <Text style={{ color: value ? palette.text : palette.muted }}>{displayDate(value)}</Text>
    </TouchableOpacity>
  </View>;
}

function TableCell({ children, width, header }) {
  return <View style={{ width, minHeight: 44, justifyContent: "center", paddingHorizontal: 9, paddingVertical: 7, backgroundColor: header ? palette.deep : "#fff", borderBottomWidth: 1, borderColor: palette.border }}>
    <Text numberOfLines={1} style={{ color: header ? "#fff" : palette.text, fontWeight: header ? "800" : "600", fontSize: 12 }}>{children}</Text>
  </View>;
}

export default function FrsHistory({ records = [] }) {
  const [leaves, setLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    apiRequest("/api/leaves")
      .then((result) => setLeaves(result.requests || []))
      .catch((error) => setLeaveError(error.message))
      .finally(() => setLeaveLoading(false));
  }, []);

  const attendance = useMemo(() => records.filter((record) => {
    const day = record.date || iso(new Date(record.clockIn));
    return (!from || day >= from) && (!to || day <= to);
  }), [records, from, to]);
  const approvedLeaves = useMemo(() => leaves.filter((item) => {
    const start = String(item.fromDate).slice(0, 10);
    const end = String(item.toDate).slice(0, 10);
    const kind = String(item.leaveType).toLowerCase();
    const isLeave = !kind.includes("work from home") && !kind.includes("wfh") && !kind.includes("regularization");
    return item.status === "Approved" && isLeave && (!from || end >= from) && (!to || start <= to);
  }), [leaves, from, to]);
  const leaveDays = approvedLeaves.reduce((total, item) => {
    const start = String(item.fromDate).slice(0, 10);
    const end = String(item.toDate).slice(0, 10);
    const clippedStart = from && start < from ? from : start;
    const clippedEnd = to && end > to ? to : end;
    return total + countDays(clippedStart, clippedEnd);
  }, 0);

  return <ScrollView contentContainerStyle={common.content}>
    <Text style={common.title}>Attendance History</Text>
    <Text style={common.subtitle}>Filter dates to review your clock-in, clock-out, and approved leave history.</Text>
    <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
      <DateFilter label="From date" value={from} maximumDate={to ? dateValue(to) : undefined} onChange={(date) => { setFrom(date); if (to && date > to) setTo(date); }} />
      <DateFilter label="To date" value={to} minimumDate={from ? dateValue(from) : undefined} onChange={setTo} />
    </View>
    <TouchableOpacity style={[common.button, { backgroundColor: palette.deep }]} onPress={() => { setFrom(""); setTo(""); }}><Text style={common.buttonText}>Clear date filters</Text></TouchableOpacity>

    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={[common.card, { flex: 1, alignItems: "center" }]}>
        <Text style={{ color: palette.deep, fontSize: 24, fontWeight: "900" }}>{attendance.length}</Text>
        <Text style={common.subtitle}>Attendance days</Text>
      </View>
      <View style={[common.card, { flex: 1, alignItems: "center" }]}>
        <Text style={{ color: palette.deep, fontSize: 24, fontWeight: "900" }}>{leaveLoading ? "—" : leaveDays}</Text>
        <Text style={common.subtitle}>Approved leave days</Text>
      </View>
    </View>

    <View style={common.card}>
      <Text style={{ color: palette.deep, fontSize: 17, fontWeight: "900", marginBottom: 12 }}>Daily attendance table</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={{ flexDirection: "row" }}>
            <TableCell width={118} header>Date</TableCell>
            <TableCell width={100} header>Clock in</TableCell>
            <TableCell width={100} header>Clock out</TableCell>
            <TableCell width={105} header>Status</TableCell>
          </View>
          {attendance.length ? attendance.map((record) => {
            const day = record.date || iso(new Date(record.clockIn));
            const hasRequest = leaves.some((item) => item.status !== "Rejected" && String(item.fromDate).slice(0, 10) <= day && String(item.toDate).slice(0, 10) >= day);
            return <View key={record.id} style={{ flexDirection: "row" }}>
              <TableCell width={118}>{displayDate(day)}</TableCell>
              <TableCell width={100}>{time(record.clockIn)}</TableCell>
              <TableCell width={100}>{time(record.clockOut)}</TableCell>
              <TableCell width={105}>{record.clockOut ? "Complete" : hasRequest ? "Request submitted" : "Needs review"}</TableCell>
            </View>;
          }) : <Text style={[common.subtitle, { paddingVertical: 12 }]}>No attendance records in this date range.</Text>}
        </View>
      </ScrollView>
    </View>

    <View style={common.card}>
      <Text style={{ color: palette.deep, fontSize: 17, fontWeight: "900" }}>Approved leave history</Text>
      {leaveLoading ? <ActivityIndicator color={palette.green} style={{ marginTop: 15 }} /> : leaveError ? <Text style={[common.subtitle, { color: palette.red }]}>{leaveError}</Text> : approvedLeaves.length ? approvedLeaves.map((item) => <View key={item.id} style={{ paddingVertical: 11, borderBottomWidth: 1, borderColor: palette.border }}>
        <Text style={{ color: palette.text, fontWeight: "800" }}>{item.leaveType}</Text>
        <Text style={common.subtitle}>{String(item.fromDate).slice(0, 10)} – {String(item.toDate).slice(0, 10)} · {countDays(String(item.fromDate).slice(0, 10), String(item.toDate).slice(0, 10))} day(s)</Text>
      </View>) : <Text style={common.subtitle}>No approved leave in this date range.</Text>}
    </View>
  </ScrollView>;
}
