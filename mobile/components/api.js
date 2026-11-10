import AsyncStorage from "@react-native-async-storage/async-storage";

// Set EXPO_PUBLIC_API_URL to an address the device can reach before running Expo.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://frs-backend-5.onrender.com")
  .trim()
  .replace(/\/$/, "");

// export const API_URL =  "http://192.168.240.106:3001";

const TOKEN_KEY = "frs_session_token";

export async function apiRequest(path, options = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function saveSession(token, employee) {
  await AsyncStorage.multiSet([[TOKEN_KEY, token], ["frs_employee", JSON.stringify(employee)]]);
}
export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, "frs_employee"]);
}
export async function getSessionToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function getSavedEmployee() {
  const raw = await AsyncStorage.getItem("frs_employee");
  return raw ? JSON.parse(raw) : null;
}
