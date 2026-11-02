import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { apiRequest } from "./api";
import { common, palette } from "./CommonStyles";
export default function LeaveHistory({ refreshKey = 0 }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  React.useEffect(() => { let alive = true; setLoading(true); apiRequest("/api/leaves").then((data) => alive && setItems(data.requests)).catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false)); return () => { alive = false; }; }, [refreshKey]);
  return <ScrollView contentContainerStyle={common.content}><Text style={common.title}>Leave History</Text>{loading ? <ActivityIndicator color={palette.green} style={{ marginTop: 30 }} /> : error ? <Text style={common.subtitle}>{error}</Text> : items.length ? items.map((item) => <View key={item.id} style={common.card}><Text style={{ color: palette.text, fontWeight: "800", fontSize: 16 }}>▦  {item.leaveType} request</Text><Text style={common.subtitle}>{String(item.fromDate).slice(0, 10)} – {String(item.toDate).slice(0, 10)}</Text><Text style={[common.green, { marginTop: 8 }]}>{item.status}</Text></View>) : <View style={common.card}><Text style={common.subtitle}>No leave requests yet.</Text></View>}</ScrollView>;
}
