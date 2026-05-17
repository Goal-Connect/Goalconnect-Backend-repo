# ⚽ GoalConnect — Backend

Comprehensive backend for the GoalConnect platform (Node.js + Express + Mongoose).
This repository contains the server, API controllers, realtime socket logic, and email utilities. The frontend included in the workspace is only for manual testing and is not covered here.

---

## 🚀 Overview

- Language: Node.js
- Frameworks/libraries: Express, Mongoose, Socket.IO, Nodemailer
- Purpose: provide REST APIs, realtime messaging, user management, video uploads/processing, and admin moderation for the GoalConnect platform.

This README documents how to run, configure, and integrate with the backend found in the `backend/` folder.

---

## 📁 Project Layout (backend)

- `server.js` — bootstrap + HTTP server
- `src/app.js` — Express app config and middleware
- `src/config/` — DB and Swagger configuration
- `src/controllers/` — request handlers (auth, players, scouts, admin, messages, videos, etc.)
- `src/models/` — Mongoose schemas (User, Player, Scout, Academy, Message, Video, ...)
- `src/routes/` — Express routes grouped by resource
- `src/realtime/socket.js` — Socket.IO initialization and realtime handlers
- `src/utils/` — helpers (email, token utils, error response, helpers)
- `src/middleware/` — auth, role checks, upload middleware
- `scripts/` — helper scripts (seed, createAdmin, etc.)

Refer to files directly when you need to inspect implementation, for example: `backend/src/controllers/auth.controller.js`, `backend/src/realtime/socket.js`, `backend/src/utils/email.js`.

---

## ✅ Features

- JWT authentication and role-based authorization (`admin`, `academy`, `scout`, `player`)
- Registration, email verification, password reset flows
- Role-specific profiles: `Academy`, `Scout`, `Player` with population in `GET /api/auth/me`
- Player discovery and academy-managed players
- Video upload endpoints + privacy controls and lightweight analysis model
- Direct messaging with Socket.IO (real-time), plus REST fallback for conversations
- Admin moderation routes (approve/reject/suspend academies & scouts, moderate videos)
- Transactional email templates via Nodemailer (verification, password reset, welcome, login alert, account-approved, player account creation)

---

## 🛠️ Requirements

- Node.js 18+ (or recommended LTS)
- MongoDB (local or hosted; connection string in env)
- Optional: Cloudinary / storage credentials for video uploads

---

## ⚙️ Environment variables

Create a `.env` file in `backend/` or provide env vars via your deployment platform.

Example env vars used by the app:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/goalconnect
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Frontend URL used in email links
FRONTEND_URL=http://localhost:5173

# Email (SMTP) settings — dev: Mailtrap, prod: SendGrid/SES
EMAIL_SERVICE=                  # optional (e.g. SendGrid)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_pass
EMAIL_FROM=noreply@goalconnect.et

# Cloudinary or storage config (if used)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Other optional
NODE_ENV=development
```

Ensure `EMAIL_*` and `FRONTEND_URL` are set in production so transactional emails contain correct links.

---

## ▶️ Running locally

Install dependencies and start the server (from `backend/`):

```bash
cd backend
npm install
# development
npm run dev    # uses nodemon if configured, or `node server.js`
```

Server listens on `PORT` (default `5000`). API prefix: `/api` (e.g. `http://localhost:5000/api`).

---

## 🔐 Authentication & Authorization

- Authentication: JWT sent in `Authorization: Bearer <token>` header for REST endpoints.
- Socket.IO handshake expects the token in the `auth` object: `io(url, { auth: { token } })`.
- Roles: `admin`, `academy`, `scout`, `player`. Middleware enforces permissions and `requireApproved` protects routes that require account approval.

---

## 📬 Email / Notifications

Email utilities live in `backend/src/utils/email.js`. Implemented transactional emails:

- Verification email (on registration)
- Welcome email
- Password reset link and success notification
- Login alerts (IP/device)
- Player account creation (academy creates player)
- Account approved email (when admin approves academy or scout)

Emails are sent asynchronously and failures are logged — they don't block API responses.

---

## 💬 Messaging (Realtime)

- Socket.IO server: `backend/src/realtime/socket.js`.
- Main socket events:
	- `message:send` — send a message; server acknowledges with saved message and emits `message:received` to recipient.
	- `conversation:history` — request conversation history with another user.
	- `message:edit`, `message:delete` — edit/delete operations (sender only).

- Business rules enforced server-side:
	- Only a `scout` may **start** a new conversation (server checks for existing conversation before allowing a different role to start).
	- Cannot message yourself.

Messages are persisted to the `Message` model and the server serializes ObjectIds to strings before emitting to clients.

---

## 📚 API highlights

Key endpoints (full list available in `backend/src/routes`):

- `POST /api/auth/register` — register academy/scout (sends verification + welcome email)
- `POST /api/auth/login` — login (sends login alert email)
- `GET /api/auth/me` — current user + populated role profile
- `POST /api/messages` — send message (REST fallback)
- `GET /api/messages/:userId` — fetch conversation with a user
- `GET /api/players` and `GET /api/players/:id` — player discovery and details (academy populated)
- `POST /api/videos` — upload video (requires academy)
- Admin routes (protected):
	- `PUT /api/admin/academies/:id/approve` — approve academy (now sends approval email)
	- `PUT /api/admin/scouts/:id/approve` — approve scout (sends approval email)

See route definitions in `backend/src/routes/*.js` for validation details and access requirements.

---

## 📡 Deployed URLs & API docs

- Backend base URL (deployed): https://goalconnect-backend-repo-2.onrender.com
- Swagger / OpenAPI UI: https://goalconnect-backend-repo-2.onrender.com/api-docs

Use the Swagger UI to explore endpoints, models, and try requests against the deployed API (make sure to attach a valid `Authorization: Bearer <token>` for protected endpoints).

---

## 🧪 Testing & Manual QA

Manual smoke tests useful after deploying:

1. Register a scout/academy and check `GET /api/auth/me` and email inbox for verification link.
2. Admin approves academy/scout via admin routes; ensure approval email is received.
3. Create a player under an approved academy and check `sendPlayerAccountCreationEmail` flows.
4. Test Socket.IO chat with two users: connect both with valid tokens and exchange messages.

You can use the included frontend test page `frontend/index.html` for quick local verification (it is NOT production-ready).

---

## 🔧 Deployment notes

- Use environment-specific `EMAIL_*` settings (SendGrid/SES recommended for production).
- Run behind a process manager (`pm2`, Docker) and use HTTPS/WSS in production.
- Ensure `FRONTEND_URL` in env matches the deployed client so email links resolve correctly.

---

## 📞 Need help / Next steps

- I can add:
	- Email send queue/retries (Bull + Redis) for reliable delivery ✅
	- Public `GET /api/users/:id` endpoint that returns `user + profile` for other clients
	- Unit tests around `Scout.savePlayer` and messaging flows

Open an issue or request a specific enhancement and I'll implement it.

---

Made with ❤️ — GoalConnect backend

