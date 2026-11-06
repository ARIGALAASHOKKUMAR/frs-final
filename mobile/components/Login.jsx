import React, { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, apiRequest, saveSession } from "./api";
import { common, palette } from "./CommonStyles";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      console.log("api", API_URL,result);
      await saveSession(result.token, result.employee);
      onLogin(result.employee);
    } catch (error) { Alert.alert("Login failed", `${error.message}\n\nEmployee: employee / 123456\nAdmin: admin / admin123`); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={[common.content, { flexGrow: 1, justifyContent: "center" }]}>
    <View style={{ alignItems: "center", marginBottom: 24 }}><Text style={{ fontSize: 46 }}>🌿</Text><Text style={[common.title, { color: palette.green, marginTop: 8 }]}>AP Forest Department</Text><Text style={common.subtitle}>FRS · Face Recognition System</Text></View>
    <View style={common.card}>
      <Text style={common.label}>Employee ID </Text><TextInput style={common.input} placeholder="Enter employee ID" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
      <Text style={common.label}>Password</Text><TextInput style={common.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      <TouchableOpacity style={common.button} onPress={submit} disabled={busy}><Text style={common.buttonText}>{busy ? "Signing in…" : "Login →"}</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}
