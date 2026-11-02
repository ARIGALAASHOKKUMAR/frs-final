import React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { CameraView } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { common, palette } from "./CommonStyles";

export default function FaceRecognition({ visible, action, cameraRef, permission, cameraReady, busy, onReady, onMountError, onCapture, onCancel, Button }) {
  const title = action === "register" ? "Register Face" : action === "clockIn" ? "Verify Face to Clock In" : "Verify Face to Clock Out";
  return <Modal visible={visible} animationType="slide" onRequestClose={onCancel}><SafeAreaView style={{ flex: 1, backgroundColor: "#fbf5f3", padding: 20 }}><Text style={[common.title, { fontSize: 23 }]}>{title}</Text><Text style={common.subtitle}>Keep your face centered and use good lighting.</Text>{visible && permission?.granted && <View style={{ overflow: "hidden", borderRadius: 400, height: 300, backgroundColor: "#000", marginTop: 20 }}><CameraView ref={cameraRef} style={{ flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: "red" }} facing="front" onCameraReady={onReady} onMountError={onMountError} /></View>}{busy && <View style={{ alignItems: "center", paddingTop: 16, gap: 8 }}><ActivityIndicator size="large" color={palette.green} /><Text style={common.subtitle}>{action === "register" ? "Registering face..." : "Verifying face and saving attendance..."}</Text></View>}<View style={{ flex: 1 }} /><Button title={busy ? "Processing..." : !cameraReady ? "Starting camera..." : action === "register" ? "Capture & Register" : "Capture & Verify"} onPress={onCapture} disabled={busy || !cameraReady} /><Button title="Cancel" onPress={onCancel} disabled={busy} secondary /></SafeAreaView></Modal>;
}
