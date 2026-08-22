# TypingAI Backend

REST API and real-time WebSocket server for the TypingAI typing practice platform. Built with **Express**, **MongoDB**, **Socket.IO**, and **TypeScript**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
  - [Auth](#auth-apiauthroutes)
  - [AI Text Generation](#ai-text-generation-apiai)
  - [Results](#results-apiresults)
  - [Sessions](#sessions-apisessions)
  - [Users](#users-apiusers)
- [WebSocket Events](#websocket-events)
- [Database Models](#database-models)
- [Scripts](#scripts)

---

## Features

- **JWT Authentication** — Register, login, password reset, email activation, and Google OAuth
- **AI-Powered Text Generation** — Generates typing exercises via the Groq API (LLaMA 3.1-8B)
- **Real-Time Multiplayer** — Socket.IO-based battleground rooms with live progress tracking
- **Session & Result Tracking** — Stores practice, test, and battle sessions with aggregated stats
- **Streak System** — Tracks daily activity streaks and learning progress
- **Email Notifications** — Password reset codes and account activation via Nodemailer

---

## Tech Stack

| Category       | Technology                        |
| -------------- | --------------------------------- |
| Runtime        | Node.js                           |
| Language       | TypeScript                        |
| Framework      | Express 4                         |
| Database       | MongoDB (Mongoose 7)              |
| Auth           | JWT, bcrypt, Google OAuth          |
| Real-time      | Socket.IO 4                       |
| AI             | Groq API (LLaMA 3.1-8B)           |
| Email          | Nodemailer (SMTP / Gmail)          |

---

## Prerequisites

- **Node.js** >= 18
- **MongoDB** instance (local or Atlas)
- **Groq API key** (for AI text generation)
- SMTP credentials (for email features)

---

## Getting Started

```bash
# 1. Clone the repository and navigate to the backend
cd TypingAI-backend

# 2. Install dependencies
npm install

# 3. Create a .env file (see Environment Variables below)
cp .env.example .env

# 4. Start the development server
npm run dev
```

The server starts on `http://localhost:5000` by default.

---

## Environment Variables

Create a `.env` file in the `TypingAI-backend` root:

```env
# Server
PORT=5000

# MongoDB
MONGO_URI=mongodb://localhost:27017/typing

# JWT
JWT_SECRET=your_jwt_secret_here

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="TypingAI <your_email@gmail.com>"

# Frontend URL (for activation links)
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Project Structure

```
src/
├── server.ts              # App entry point — Express + Socket.IO setup
├── controllers/
│   ├── aiController.ts    # AI text generation handler
│   ├── authController.ts  # Register, login, OAuth, password reset
│   ├── resultController.ts# Save & retrieve typing test results
│   └── userController.ts  # Profile, avatar, streaks, learning progress
├── middleware/
│   └── auth.ts            # JWT authentication middleware (requireAuth)
├── models/
│   ├── Session.ts         # Practice/test/battle session schema
│   ├── TestResult.ts      # Typing test result schema
│   └── User.ts            # User schema (auth, stats, streaks, learning)
├── routes/
│   ├── aiRoutes.ts        # POST /api/ai/generate
│   ├── authRoutes.ts      # /api/auth/* endpoints
│   ├── resultRoutes.ts    # /api/results/* endpoints
│   ├── sessionRoutes.ts   # /api/sessions/* endpoints
│   └── userRoutes.ts      # /api/users/* endpoints
├── sockets/
│   └── rooms.ts           # Multiplayer battleground room handlers
└── utils/
    ├── aiService.ts       # Groq API integration for text generation
    └── emailService.ts    # Nodemailer email templates & sender
```

---

## API Reference

All routes are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

### Auth (`/api/auth`)

| Method | Endpoint              | Auth | Description                                    |
| ------ | --------------------- | ---- | ---------------------------------------------- |
| POST   | `/register`           | No   | Register a new user (sends activation email)   |
| POST   | `/login`              | No   | Login with email & password, returns JWT       |
| POST   | `/google`             | No   | Google OAuth login/signup                      |
| GET    | `/activate`           | No   | Activate account via `?code=` query param      |
| POST   | `/forgot-password`    | No   | Send a 6-digit password reset code via email   |
| POST   | `/verify-reset-code`  | No   | Verify the reset code is valid                 |
| POST   | `/reset-password`     | No   | Reset password with valid reset code           |

### AI Text Generation (`/api/ai`)

| Method | Endpoint    | Auth | Description                                          |
| ------ | ----------- | ---- | ---------------------------------------------------- |
| POST   | `/generate` | No   | Generate typing text by topic, length, and difficulty |

**Request body:**
```json
{
  "topic": "technology",
  "length": "medium",
  "difficulty": "intermediate"
}
```
- `topic` (string, required)
- `length` (`"short"` | `"medium"` | `"long"`) — word counts: 50-70 / 120-150 / 250-300
- `difficulty` (string, optional)

### Results (`/api/results`)

| Method | Endpoint | Auth | Description                         |
| ------ | -------- | ---- | ----------------------------------- |
| POST   | `/`      | Yes  | Save a typing test result           |
| GET    | `/me`    | Yes  | Get current user's last 200 results |

### Sessions (`/api/sessions`)

| Method | Endpoint           | Auth | Description                                              |
| ------ | ------------------ | ---- | -------------------------------------------------------- |
| POST   | `/create`          | Yes  | Create a session and update user stats                   |
| GET    | `/user/:userId`    | Yes  | Paginated session list (filter by `?type=`)              |
| GET    | `/stats/:userId`   | Yes  | Aggregated stats per session type (count, avg WPM, etc.) |
| GET    | `/:sessionId`      | Yes  | Get a single session by ID                               |

### Users (`/api/users`)

| Method | Endpoint          | Auth | Description                              |
| ------ | ----------------- | ---- | ---------------------------------------- |
| GET    | `/me`             | Yes  | Get current user profile with stats      |
| PUT    | `/avatar`         | Yes  | Update avatar                            |
| GET    | `/progress`       | Yes  | Get streak and learning progress         |
| POST   | `/streak/record`  | Yes  | Record daily streak activity             |
| PUT    | `/learning`       | Yes  | Update learning progress & certificate   |

---

## WebSocket Events

The server uses Socket.IO for real-time multiplayer functionality. Connect to the root namespace (`/`).

### Client → Server

| Event             | Payload                         | Description                                |
| ----------------- | ------------------------------- | ------------------------------------------ |
| `room:create`     | `{ text }`                      | Create a new room (sender becomes host)    |
| `room:join`       | `{ roomId }`                    | Join an existing room                      |
| `room:leave`      | —                               | Leave the current room                     |
| `room:progress`   | `{ progress, wpm, accuracy }`   | Update typing progress (0-100%)            |
| `room:setText`    | `{ text }` (host only)          | Change the room's typing text              |
| `player:ready`    | —                               | Toggle player ready state                  |
| `race:start`      | — (host only)                   | Start the race (5-second countdown)        |
| `race:reset`      | —                               | Reset individual player state              |
| `time:request`    | —                               | Request server timestamp for clock sync    |

### Server → Client

| Event           | Description                                |
| --------------- | ------------------------------------------ |
| `room:state`    | Full room state update (players, progress) |
| `room:closed`   | Room has been closed                       |
| `room:error`    | Error message                              |
| `room:host`     | Host transferred notification              |
| `race:start`    | Race start timestamp (5s in future)        |
| `time:response` | Server timestamp for clock sync            |

---

## Database Models

### User

| Field               | Type            | Description                          |
| ------------------- | --------------- | ------------------------------------ |
| `email`             | String (unique) | User email                           |
| `passwordHash`      | String          | Bcrypt-hashed password               |
| `displayName`       | String          | Display name                         |
| `googleId`          | String          | Google OAuth ID (optional)           |
| `avatarId`          | String          | Selected avatar (`avatar-1` default) |
| `bestWPM`           | Number          | Highest recorded WPM                 |
| `averageAccuracy`   | Number          | Average accuracy                     |
| `totalTestsTaken`   | Number          | Test count                           |
| `totalPracticeSessions` | Number      | Practice session count               |
| `totalBattles`      | Number          | Battle count                         |
| `history`           | ObjectId[]      | References to TestResult documents   |
| `sessions`          | ObjectId[]      | References to Session documents      |
| `streak`            | Object          | `{ currentStreak, longestStreak, lastActiveDate }` |
| `learning`          | Object          | `{ completedLessons[], certificate }` |
| `isActivated`       | Boolean         | Email activation status              |

### TestResult

| Field      | Type     | Description              |
| ---------- | -------- | ------------------------ |
| `user`     | ObjectId | Reference to User        |
| `wpm`      | Number   | Words per minute         |
| `cpm`      | Number   | Characters per minute    |
| `accuracy` | Number   | Accuracy percentage      |
| `errors`   | Number   | Error count              |
| `duration` | Number   | Duration in seconds      |
| `text`     | String   | The typed text           |
| `room`     | String   | Room ID (if multiplayer) |

### Session

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `user`         | ObjectId | Reference to User                    |
| `type`         | String   | `practice` / `test` / `battle`       |
| `wpm`          | Number   | Words per minute                     |
| `cpm`          | Number   | Characters per minute                |
| `accuracy`     | Number   | Accuracy percentage                  |
| `errors`       | Number   | Error count                          |
| `duration`     | Number   | Duration in seconds                  |
| `text`         | String   | The typed text                       |
| `difficulty`   | String   | Difficulty level (optional)          |
| `mode`         | String   | Mode (optional)                      |
| `battleResult` | String   | `win` / `loss` / `draw` (optional)   |
| `opponent`     | String   | Opponent name (optional)             |

---

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start dev server with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/`                |
| `npm start`     | Run compiled server from `dist/server.js`    |
