import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Modal, Text, View } from "react-native";
import {
  FaceCamera,
  useFaceCamera,
  useFaceValidation,
  useLivenessChallenge,
} from "@rbayuokt/expo-face-vision";
import { SafeAreaView } from "react-native-safe-area-context";
import { common, palette } from "./CommonStyles";

const GUIDE = { width: 0.84, height: 0.84, centerY: 0.5 };
const REQUIREMENTS = {
  singleFace: true,
  guide: GUIDE,
  minFaceSize: 0.22,
  lookingForward: true,
  stableFor: 400,
};

export default function FaceRecognition({
  visible,
  action,
  permission,
  busy,
  onReady,
  onMountError,
  onCapture,
  onCancel,
  Button,
}) {
  const title = action === "register"
    ? "Register Face"
    : action === "clockIn"
      ? "Verify Face to Clock In"
      : "Verify Face to Clock Out";
  const camera = useFaceCamera();
  const [ready, setReady] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const captureStarted = useRef(false);
  const livenessRef = useRef(null);
  const { validation } = useFaceValidation(REQUIREMENTS, { camera });

  const liveness = useLivenessChallenge({
    camera,
    steps: ["blink"],
    haptics: false,
    onPass: async () => {
      if (captureStarted.current || busy) return;
      captureStarted.current = true;
      try {
        const photo = await camera.takePhoto({ quality: 0.7 });
        setCapturedPhotoUri(photo.uri);
        setCameraPaused(true);
        const saved = await onCapture(photo);
        if (!saved && visible) {
          captureStarted.current = false;
          livenessRef.current?.reset();
          setCapturedPhotoUri(null);
          setCameraPaused(false);
        }
      } catch (error) {
        captureStarted.current = false;
        setCapturedPhotoUri(null);
        setCameraPaused(false);
        onMountError?.({ message: error?.message || "Unable to capture a face image." });
      }
    },
    onFail: () => {
      captureStarted.current = false;
    },
  });

  livenessRef.current = liveness;

  useEffect(() => {
    if (!visible) return;
    setReady(false);
    setCameraPaused(false);
    setCapturedPhotoUri(null);
    captureStarted.current = false;
    livenessRef.current?.reset();
  }, [visible]);

  useEffect(() => {
    if (ready && visible && !busy && !cameraPaused) liveness.start();
  }, [ready, visible, busy, cameraPaused]);

  const valid = Boolean(validation?.valid);
  const ringColor = busy || cameraPaused
    ? "#94a3b8"
    : valid
      ? palette.green
      : "#f59e0b";
  const hint = busy || cameraPaused
    ? action === "register"
      ? "Registering your face…"
      : "Verifying face"
    : !ready
      ? "Starting camera…"
      : valid
        ? liveness.text || "Face aligned. Blink once to capture."
        : validation?.issues?.some((issue) => issue.code === "NO_FACE")
          ? "Place your face inside the circle"
          : validation?.issues?.some((issue) => issue.code === "MULTIPLE_FACES")
            ? "Only one person should be in the frame"
            : "Center your face and look straight at the camera";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fbf5f3", padding: 20 }}>
        <Text style={[common.title, { fontSize: 23 }]}>{title}</Text>
        <Text style={common.subtitle}>
          Center your face. When the circle turns green, blink once to capture.
        </Text>

        <View
          style={{
            width: "84%",
            maxWidth: 320,
            aspectRatio: 1,
            alignSelf: "center",
            marginTop: 20,
            borderRadius: 999,
            borderWidth: 5,
            borderColor: ringColor,
            overflow: "hidden",
            backgroundColor: "#000",
          }}
        >
          {capturedPhotoUri && (cameraPaused || busy) ? (
            <>
              <Image
                source={{ uri: capturedPhotoUri }}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.42)",
                  gap: 12,
                }}
              >
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" ,textAlign: "center"}}>
                  {hint}
                </Text>
              </View>
            </>
          ) : visible && permission?.granted && !cameraPaused && !busy ? (
            <FaceCamera
              camera={camera}
              style={{ flex: 1 }}
              facing="front"
              inferenceFps={15}
              detection={{ performanceMode: "fast", classification: true, contours: true }}
              onCameraReady={() => {
                setReady(true);
                onReady?.();
              }}
              onCameraError={onMountError}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 15 }}>
                {busy ? "Camera paused while saving" : "Camera is paused"}
              </Text>
            </View>
          )}
        </View>

        {ready && !busy && !cameraPaused && (
          <View style={{ alignItems: "center", paddingTop: 16, gap: 8 }}>
            <Text style={common.subtitle}>{hint}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Button title="Cancel" onPress={onCancel} disabled={busy} secondary />
      </SafeAreaView>
    </Modal>
  );
}
