# AP Forest Department FRS

React Native / Expo attendance app with a Node/Express API and PostgreSQL persistence. The face registration and face comparison endpoints keep using the existing `face-api.js` models and `backend/faces.json` descriptor.

## Start PostgreSQL and the backend

The backend loads `backend/.env` automatically; shell environment variables override it. `backend/.env.example` uses the supplied Supabase project URL as its single project reference. `db.js` derives the direct PostgreSQL host from that URL. Set the database password for this Supabase project in `backend/.env`.

```sh
cd backend
npm install
npm start
```

On startup, the API creates the employee, attendance, and leave tables and inserts a demo user if it does not already exist:

- Username: `employee`
- Password: `123456`
- Administrator username: `admin`
- Administrator password: `admin123`

The administrator can create, update, and delete employees and approve or reject leave requests. Employee self-signup is disabled. Change the demo passwords before using the app with real users.

The default config targets the Supabase PostgreSQL database. Override it with `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, or `DATABASE_URL`. `PGSSL=true` enables SSL. The Supabase project URL and publishable key are not used by these server-side PostgreSQL APIs; the mobile client continues to call your Node API.

## Start the mobile app

Set `EXPO_PUBLIC_API_URL` to an address the phone can reach (your computer's LAN IP, port 3001), then start Expo:

```sh
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001 npm start
```

Replace `192.168.1.10` with your computer's LAN IP. A physical phone cannot reach the computer using `localhost`. The app's fallback address is the existing development address in `mobile/components/api.js`.

## Screens and API files

Each screen lives in `mobile/components/`: `Splash.jsx`, `Login.jsx`, `FrsReport.jsx` (dashboard), `FrsHistory.jsx`, `FaceRecognition.jsx`, `ApplyLeaves.jsx`, `LeaveHistory.jsx`, `Profile.jsx`, `AdminDashboard.jsx`, `EmployeeManagement.jsx`, and `AdminLeaveApprovals.jsx`. `App.js` owns navigation and the existing camera/face-match flow. Shared colors and reusable styles are in `CommonStyles.js`; API calls are in `api.js`.

Backend API modules are split into `auth.js`, `attendanceRoutes.js`, `leaveRoutes.js`, `employeeRoutes.js`, and `profileRoutes.js`. PostgreSQL configuration and schema initialization are in `db.js`. Face descriptors are stored per employee in `face_templates`; on first setup, the existing valid demo descriptor in `backend/faces.json` is imported for `EMP001` without changing that file. To verify stored face data, run `backend/queries/check_face_template.sql` in the Supabase SQL Editor.

## API routes

- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/attendance`, `POST /api/attendance/clock-in`, `POST /api/attendance/clock-out`
- `GET /api/leaves`, `POST /api/leaves`, `PATCH /api/leaves/:id/status` (admin)
- `GET /api/employees`, `POST /api/employees`, `PUT /api/employees/:id`, `DELETE /api/employees/:id` (admin)
- `GET /api/profile`
- `GET /api/face/status` (authenticated)
- Existing `POST /api/face/register` and `POST /api/face/compare`

Login returns a bearer token used by attendance, leave, profile, and logout routes. These credentials and session handling are for local development; replace the demo account and auth configuration for your deployment.
