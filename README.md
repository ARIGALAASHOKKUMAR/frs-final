# Face Register — React Native + Python API

A runnable development starter for **consented, one-to-one face verification**: enter a user ID, register three face photos, then compare a fresh photo against that ID. This is not a search across people and does not implement attendance, geofencing or authentication accounts.

## Included

- `mobile/App.js`: complete single-file React Native screen; camera permission, three-photo enrollment, verification, previews, consent, reset, deletion, request timeout and result timing.
- `mobile/setup.sh`: generates a blank Expo application and installs SDK-compatible camera, image manipulation and file-system packages. Node dependencies are not bundled. The generated project has its own package.json and lockfile.
- `backend/main.py`: FastAPI registration, verification, health and deletion endpoints with interactive Swagger docs.
- `backend/engine.py`: YuNet face detection, SFace alignment and embeddings; image count, face size, lighting and sharpness checks.
- SQLite persistence of normalized templates, not submitted photos. No separate database server is needed. Templates remain biometric data; this demo does not encrypt the database.
- Matching tests and API tests (API tests use a synthetic engine, not actual face images).

## 1. Start the backend (Mac/Linux)

Install Python 3.11 or 3.12. In a terminal:

```bash
cd FaceRegister/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python download_models.py
export API_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
printf '%s\n' "$API_TOKEN"
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

Copy the printed token into the app. It is intentionally generated at runtime, not included in the source. Keep this terminal running. Startup requires both model downloads and fails if the token is missing. Models download from the official OpenCV Zoo repository, approximately 37 MB total; internet access is needed once. Filenames are fixed but URLs follow upstream `main`; for controlled deployments pin the upstream revision and verify approved hashes.

Open `http://localhost:8000/docs` for request schemas or `http://localhost:8000/health` for readiness.

## 2. Start the React Native app

Install a current Node.js LTS release and Expo Go on your phone. Open another terminal:

```bash
cd FaceRegister/mobile
bash setup.sh
cd FaceMobile
npx expo start
```

Scan the QR code with Expo Go. The setup script generates the current blank Expo template so the native packages match its SDK, instead of supplying manually mixed versions. Keep the generated lockfile after setup. The app is intended for Android/iOS, not a browser.

In the app:

1. Replace the API address with your computer's LAN IP, for example `http://192.168.1.10:8000`.
2. Paste the token printed by the backend.
3. Enter an ID such as `employee_001` and allow camera access.
4. Capture three separate clear photos with small natural angle changes. Avoid full profile views.
5. Confirm consent and tap **Register my face**.
6. Switch to **Verify face**, capture a new photo and tap **Compare my face**.

The phone and computer must be on the same reachable network. **Do not use localhost on a physical phone**: it refers to the phone. Android emulator usually uses `http://10.0.2.2:8000`; iOS simulator can use `http://localhost:8000`. Allow port 8000 through your computer firewall. Expo's Metro tunnel does not tunnel this API. Native release builds can block plain HTTP; use HTTPS for a deployed API instead of enabling unrestricted cleartext traffic.

Photos are reduced to 960 pixels wide and JPEG-compressed before upload. The app removes its captured files on reset and successful submission; a crash can leave cache files for OS cleanup. The token is held only in memory, not saved to disk.

## API

All face endpoints require `Authorization: Bearer YOUR_TOKEN`. Multipart field names matter.

| Method | Path | Body / purpose |
|---|---|---|
| GET | `/health` | Model readiness; no token |
| POST | `/v1/faces/register` | `user_id` plus exactly three `photos` file fields |
| POST | `/v1/faces/verify` | `user_id` plus one `photo` file field |
| DELETE | `/v1/faces/{user_id}` | Delete the saved template |

Registration returns HTTP 201. An existing ID returns 409 and is never silently overwritten. Unknown IDs return 404. Invalid images or quality failures return 422; images above the per-file read limit return 413.

```bash
curl -X POST http://localhost:8000/v1/faces/register \
  -H "Authorization: Bearer $API_TOKEN" \
  -F 'user_id=employee_001' \
  -F 'photos=@front.jpg' -F 'photos=@angle1.jpg' -F 'photos=@angle2.jpg'

curl -X POST http://localhost:8000/v1/faces/verify \
  -H "Authorization: Bearer $API_TOKEN" \
  -F 'user_id=employee_001' -F 'photo=@new-selfie.jpg'
```

Example response (illustrative, not a measured benchmark):

```json
{"user_id":"employee_001","matched":true,"similarity":0.72,"threshold":0.45,"processing_ms":120.0,"liveness_checked":false}
```

## Accuracy and speed

YuNet detects the face; SFace creates an aligned numeric embedding. Enrollment checks pairwise consistency of the three samples and saves their normalized average. Verification compares one new embedding with that saved average using cosine similarity.

The default acceptance threshold is **0.45**, a starting point, not a validated operating point. OpenCV's example uses 0.363 for a specific benchmark. Our averaged-template pipeline and your cameras/users require independent calibration. Higher thresholds generally reduce false matches while increasing false rejections. A similarity of 0.72 does **not** mean 72% accuracy.

To change the threshold before starting the server:

```bash
export MATCH_THRESHOLD=0.50
```

Measure genuine and different-person pairs with consent, keep calibration and evaluation captures separate, and report false-accept and false-reject rates across lighting, glasses, camera devices and user groups. Do not pick a threshold using one person's photos alone.

For speed, models are loaded once, the detector is warmed at startup, images are bounded in size, and comparison uses a single stored vector. CPU inference runs off the async event loop. A lock protects OpenCV's mutable detector/recognizer objects; one process therefore serializes inference. This is suitable for a small demo, not high-volume service capacity. Measure warm p50/p95 on target hardware; initial recognition and network transfer can be slower. The app shows both API processing time (excluding multipart upload) and request round-trip time. No latency or accuracy guarantee is claimed.

## Before office production use

This starter **does not perform liveness / presentation-attack detection**. A photo or screen may pass. Blinking alone is not reliable anti-spoofing. Add an independently evaluated liveness solution and test replay attacks before using face results to authorize attendance or access.

The shared development token grants enrollment, verification and deletion for all IDs. Replace it with real user login, short-lived server-issued tokens, and server-side authorization binding the claimed user ID to the authenticated account. Never embed an administrative key in a production app. Add trusted enrollment and recovery processes.

Serve HTTPS, enforce request-body limits at the reverse proxy (for example 17 MB for three photos), rate-limit requests, cap concurrency, encrypt templates at rest, restrict filesystem permissions, and define consent/retention/deletion policies. The app-level file limit happens after multipart parsing; it is not a total transport-level body limit. SQLite deletion is logical deletion, not guaranteed forensic erasure of database pages or backups.

Inspect the separate model license files and upstream notices before distributing the model weights; downloads are not included in this archive:

- https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
- https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface

## Tests

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

API integration tests additionally need `httpx` installed. They substitute a deterministic fake engine to verify API semantics and persistence; they do not validate biometric accuracy. See `VALIDATION.md` for checks actually run in the delivery environment.

## Troubleshooting

- **Network request failed:** check LAN IP, same Wi-Fi, firewall, API health and HTTPS restrictions. Start the backend separately from Expo.
- **Missing model file:** run `python download_models.py` from the backend setup.
- **Already registered:** delete that ID explicitly before enrolling again. Do not overwrite templates automatically.
- **Inconsistent photos:** reset all photos, use the same person, face forward and improve light.
- **Blurry/dark image:** retake; quality cutoffs are heuristics and need device-specific evaluation.
- **Low match score:** improve enrollment and capture conditions first; lowering a threshold can increase false matches.

References: OpenCV DNN face recognition tutorial https://docs.opencv.org/4.10.0/d0/dd4/tutorial_dnn_face.html and Expo camera documentation https://docs.expo.dev/versions/latest/sdk/camera/ .
