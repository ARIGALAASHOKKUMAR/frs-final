import { StyleSheet } from "react-native";

export const palette = { green: "#075b38", deep: "#043d28", pale: "#eff7ef", orange: "#ed8b19", text: "#14251d", muted: "#68756e", border: "#e3e9e4", white: "#fff", red: "#bc3932" };
export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f8f5" },
  content: { padding: 18, paddingBottom: 32 },
  card: { backgroundColor: palette.white, borderRadius: 18, padding: 17, marginTop: 14, borderWidth: 1, borderColor: palette.border,justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  title: { color: palette.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  label: { color: palette.text, fontSize: 14, fontWeight: "700", marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "#d5ddd6", borderRadius: 13, padding: 13, color: palette.text, fontSize: 15, marginBottom: 14, backgroundColor: "#fff" },
  button: { minHeight: 48, borderRadius: 13, backgroundColor: palette.green, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  green: { color: palette.green, fontWeight: "800" },
});
