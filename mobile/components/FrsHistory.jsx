import React from "react";
import { ScrollView, Text, View } from "react-native";
import { common, palette } from "./CommonStyles";

function time(value) { return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function date(value) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function duration(record, now) {
  if (!record?.clockIn) return "—";
  const mins = Math.max(0, Math.floor(((record.clockOut ? new Date(record.clockOut) : now) - new Date(record.clockIn)) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
export default function FrsHistory({ records = [], now = new Date() }) {
  return <ScrollView contentContainerStyle={common.content}><Text style={common.title}>FRS History</Text><Text style={common.subtitle}>{records.length} attendance record(s)</Text>{records.length === 0 ? <View style={common.card}><Text style={common.subtitle}>No attendance yet. Your first clock-in will appear here.</Text></View> : records.map((record) => <View key={record.id} style={common.card}><View style={common.row}><Text style={{ color: palette.text, fontWeight: "800" }}>{date(record.clockIn)}</Text><Text style={{ color: palette.green, fontWeight: "800" }}>{record.clockOut ? "Present" : "Active"}</Text></View><Text style={common.subtitle}>Clock in: {time(record.clockIn)}</Text><Text style={common.subtitle}>Clock out: {time(record.clockOut)}</Text><Text style={[common.green, { marginTop: 8 }]}>Working hours: {duration(record, now)}</Text></View>)}</ScrollView>;
}
