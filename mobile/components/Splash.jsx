import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { palette } from "./CommonStyles";
export default function Splash() {
  return <View style={{ flex: 1, backgroundColor: palette.deep, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 68 }}>🌿</Text><Text style={{ color: "white", fontSize: 25, fontWeight: "900", marginTop: 18 }}>Andhra Pradesh</Text><Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>Forest Department</Text><Text style={{ color: "white", fontSize: 56, fontWeight: "900", marginTop: 25 }}>FRS</Text><Text style={{ color: "#dceee1", fontSize: 16 }}>Face Recognition System</Text><ActivityIndicator color="#b1edc0" style={{ marginTop: 48 }} /></View>;
}
