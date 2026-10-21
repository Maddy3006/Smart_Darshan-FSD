# Smart Darshan

**A real-time queue and crowd management system for temples, using virtual tokens and predictive analytics.**

Devotees often wait for hours because crowds are unplanned and nobody can see the queue. Smart Darshan spreads arrivals across bookable time slots, counts people at the gates with QR scans, shows live waiting times to everyone, and predicts crowds hour by hour with a machine-learning model.

Built with **MongoDB, Express, React, Node.js**, **Socket.IO** for live updates, and a **Python (Flask + scikit-learn)** prediction service.

---

## Features

| Who | What they can do |
|---|---|
| **Devotee** (web / mobile) | Search temples, see live wait times per darshan lane, view the hourly crowd forecast with suggested low-crowd times, book a slot for a group, get a QR token, track queue position live, get reminders, cancel. |
| **Devotee without a smartphone** | Get a printed token at the counter or self-service kiosk, read the entrance display board, or SMS `STATUS <code>` to get their position. |
| **Gate staff** | Scan QR tokens at the entry and exit gates (camera or typed code), issue walk-in tokens, run kiosk mode. |
| **Temple admin** | Live crowd dashboard, occupancy alerts, pause/resume entry, today's actual vs predicted footfall, 7-day forecast, crowd trends and heatmap, ML model retraining, slot capacity, announcements, staff accounts, darshan types, festival calendar. |
| **Superadmin** | Onboard temples with their admin, activate/deactivate temples, manage any temple. |

## Architecture

```mermaid
flowchart LR
  subgraph Access[Devotee access layer]
    Web[React web app]
    Kiosk[Kiosk / counter]
    SMS[SMS via Twilio]
  end
  subgraph API[Application server: Node.js, Express, Socket.IO]
    Booking[Slot booking and QR tokens]
    Queue[Queue manager and wait-time engine]
    Notify[Notifications: in-app and SMS]
  end
  subgraph DB[(MongoDB)]
    Records[Users, temples, slots, tokens]
    Footfall[Hourly footfall logs]
  end
  subgraph ML[Prediction service: Python, scikit-learn]
    Train[Random Forest per temple]
    Predict[Hourly forecast and low-crowd slots]
  end
  Gate[QR scan at entry and exit gates] --> Queue
  Access --> API --> DB
  Footfall --> Train --> Predict --> API
  API -- live queue position and wait time --> Display[Display boards, dashboards, devotee phones]
```

## Project structure

```
MERN_stack_project/
├── client/                     React (Vite + Tailwind CSS)
│   └── src/
│       ├── pages/public/       Home, TempleDetail, TokenStatus, DisplayBoard, TrackToken
│       ├── pages/devotee/      BookDarshan, MyTokens, Profile
│       ├── pages/staff/        Scanner, WalkinCounter, Kiosk
│       ├── pages/admin/        Dashboard, Analytics, Slots, Announcements, StaffAccounts, Settings
│       ├── pages/super/        SuperTemples
│       ├── components/         UI kit, layouts, charts, QR scanner, token ticket
│       ├── context/            AuthContext (JWT), SocketContext (Socket.IO rooms)
│       ├── hooks/              useFetch, useLiveTemple
│       └── lib/                api client, formatting, constants
├── server/                     Node.js + Express + Socket.IO + Mongoose
│   └── src/
│       ├── models/             User, Temple, Slot, Token, FootfallLog, Announcement, Alert
│       ├── routes/             auth, temples, tokens, staff, admin, superadmin (+ zod schemas)
│       ├── controllers/        request handlers
│       ├── services/           booking, scanning, live stats (wait-time engine), slots,
│       │                       forecast + ML client, alerts, notifications, SMS, stats
│       ├── middleware/         auth (JWT + roles), templeScope, validate, errorHandler
│       ├── sockets/            Socket.IO rooms and emit helpers
│       ├── jobs/               cron: expire tokens, reminders, slot sync, model retraining
│       └── scripts/            seed, simulate, localDb
└── ml-service/                 Python Flask + scikit-learn
    ├── app.py                  /health, /train, /predict endpoints
    └── model.py                features, Random Forest training, evaluation
```

## Getting started

### Prerequisites

- **Node.js 20.19+** (22 recommended)
- **Python 3.8+** with pip
- MongoDB: nothing to install for local development (see below), or a free **MongoDB Atlas** cluster

### 1. Install

```bash
npm run setup
```

This installs the root, server and client packages, plus the Python requirements (`flask`, `pandas`, `scikit-learn`, `joblib`).

### 2. Configure

```bash
cp server/.env.example server/.env
```

The defaults work for local development. To use **MongoDB Atlas**, set `MONGO_URI` in `server/.env` to your connection string.

### 3. Run everything

```bash
npm run dev
```

This starts four processes together:

| Name | What | URL |
|---|---|---|
| `db` | Local MongoDB (downloads the binary on the first run; data kept in `.data/`). Skipped automatically if MongoDB already runs on port 27017. | `mongodb://127.0.0.1:27017` |
| `api` | Express + Socket.IO API. Loads demo data automatically if the database is empty. | http://localhost:5000 |
| `ml` | Python prediction service | http://127.0.0.1:8000 |
| `web` | React app | **http://localhost:5173** |

You can also run them separately: `npm run dev:db`, `npm run dev:api`, `npm run dev:ml`, `npm run dev:web`.

### Demo accounts

Created by the seed script. In development the login page lists them so you can fill the form in one click.

| Role | Email | Password |
|---|---|---|
| Devotee | `devotee@smartdarshan.in` | `Devotee@123` |
| Gate staff | `staff.venkateswara@smartdarshan.in` | `Staff@123` |
| Temple admin | `admin.venkateswara@smartdarshan.in` | `Admin@123` |
| Superadmin | `superadmin@smartdarshan.in` | `Super@123` |

There are also `staff.murugan@…`, `admin.murugan@…`, `staff.mahalakshmi@…` and `admin.mahalakshmi@…` accounts for the other two temples. These passwords are public, so on a deployed site change them (log in, open `/profile`) or seed with `DEMO_PASSWORD` – see [DEPLOYMENT.md](DEPLOYMENT.md).

Accounts live in MongoDB and survive restarts, so you only log in again when the 7-day JWT expires. The seed generates 90 days of history ending on the day it runs — if the database has been sitting for a few weeks the charts go sparse and the upcoming bookings run out, so run `npm run backfill` to top it up without losing any accounts.

### Useful scripts

```bash
npm run seed -- --reset          # wipe and reload demo data (3 temples, 90 days of history), then train models
npm run seed -- --reset --24h    # same, but temples are open 24 hours (for testing at night)
npm run backfill                 # top up stale demo data in place - keeps every account and past token
npm run simulate                 # simulate a busy gate: walk-ins, entry and exit scans
npm run simulate -- --temple=murugan --speed=3 --surge   # faster, and the queue keeps growing
npm run build                    # production build of the React app
npm run db:copy -- "<uri>"       # copy the local database to another MongoDB (e.g. Atlas)
```

**Demo tip:** run `npm run simulate -- --surge`, then open the admin dashboard, the display board (`/display/sri-venkateswara-swamy-temple`) and a token status page side by side. Wait times, occupancy and alerts update live.

---

## How it works

### Slots and tokens: online and walk-in in one system

- Each temple has **darshan types** (for example Sarva, Special Entry, Senior Citizen). Each type has its own slot length, capacity and queue lane.
- Slots are generated automatically for the booking window (default 7 days). **Festival days get extra capacity** (default 1.5×).
- Every slot's capacity is split into an **online quota** and a **walk-in quota** (for example 50/50).
- **Every token belongs to a slot**, whether it was booked online or issued at the counter or kiosk. Walk-ins are placed in the earliest slot today with room.
- **Walk-in release:** within 60 minutes of a slot starting, unsold online seats become available to walk-ins.
- **No overbooking:** the capacity check and the seat increment happen in a single atomic MongoDB update, so two devotees racing for the last seats can never both get them:

  ```js
  Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $lte: [{ $add: ['$onlineBooked', groupSize] }, '$onlineCapacity'] } },
    { $inc: { onlineBooked: groupSize } },
  );
  ```
  (see `server/src/services/bookingService.js`)

Token lifecycle: `booked` → `checked_in` (entry scan) → `completed` (exit scan). Tokens can also become `cancelled`, or `expired` when the slot is missed. Devotees still in the queue after 3 hours are completed automatically.

### Live queue and wait-time engine

The QR scan at the gates is the "sensor". For each lane (`server/src/services/liveStats.js`):

```
inQueue    = people scanned in at the entry gate and not yet out
throughput = people who exited in the last 15 minutes / minutes observed
             (uses the lane's designed capacity until enough exits are seen)
waitMin    = inQueue / throughput
```

A devotee's position counts the people who entered the same lane before them. After every scan the snapshot is recomputed and pushed over Socket.IO to temple pages, display boards and dashboards.

**Crowd control:** alerts fire when the queue reaches 90% and 100% of the temple's safe limit. Admins can pause entry with a reason, which gate scanners enforce and devotees see instantly. Entry can optionally pause automatically at 100%.

### Predictive analytics (ml-service)

- **Data:** every entry and exit scan is added to an hourly `FootfallLog` (temple, date, hour, weekday, festival flag, entries). The seed script generates 90 days of realistic history: morning and evening peaks, weekend and festival surges.
- **Features:** hour, day of week, month, weekend flag, festival flag, and hour encoded cyclically (sin/cos).
- **Model:** `RandomForestRegressor` (200 trees), one per temple, evaluated on a 20% test split. The service reports **R²**, **MAE**, and the MAE of a simple "average for this weekday and hour" baseline, so you can show how much the model improves on it. Feature importances appear on the Analytics page.
- **Output:** expected visitors per hour, a crowd level (low / moderate / high against capacity), the peak hour and the **3 least crowded hours**. These appear on the temple page, the booking page and the display board.
- **Training:** automatically at API startup (untrained temples), after seeding, nightly at 02:30, or from the **Retrain** button on the Analytics page.
- **Fallback:** if the Python service is down, forecasts use historical averages, so the app keeps working.

### Notifications and SMS

- **In-app:** booking confirmations, "you are in the queue", slot reminders (30 minutes before) and expiry notices arrive through Socket.IO as toasts, plus browser notifications if enabled.
- **SMS (Twilio):** booking, walk-in token, reminder and cancellation messages. Without Twilio credentials, messages are printed in the API console (`[sms:mock]`), so everything works in development. To enable real SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` in `server/.env`.
- **Inbound SMS for basic phones:** point your Twilio number's messaging webhook to `POST /api/sms/inbound`. Supported commands:
  - `STATUS SD-7K4P9Q` returns queue position or slot time
  - `WAIT venkateswara` returns live waiting times for a temple
  - `TEMPLES` returns the temple list

  You can test it without Twilio:
  ```bash
  curl -X POST http://localhost:5000/api/sms/inbound -d "Body=WAIT murugan"
  ```

### Security notes

- Passwords are hashed with bcrypt; sessions use JWT (`Authorization: Bearer`).
- Role-based access: `devotee`, `staff`, `admin`, `superadmin`. Staff and admins are locked to their own temple on the server (`templeScope` middleware); the temple id is never taken from the URL.
- All request bodies are validated with zod. Login and register are rate-limited. `helmet` sets security headers.
- The prediction service accepts requests only with the shared `ML_API_KEY` (when set), and the API refuses to start in production without `MONGO_URI` and `JWT_SECRET`.
- The public token page masks the devotee's name and never shows the phone number. The token code acts as the secret.

---

## API overview

All routes are prefixed with `/api`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/me/password` |
| Public | `GET /temples`, `GET /temples/:idOrSlug`, `GET /temples/:id/slots?date=&darshanTypeId=`, `GET /temples/:id/live`, `GET /temples/:id/forecast?date=`, `GET /temples/:id/announcements` |
| Tokens | `POST /tokens` (book), `GET /tokens/mine?scope=`, `GET /tokens/:code` (status + queue position), `POST /tokens/:code/cancel` |
| Staff | `GET /staff/context`, `GET /staff/walkin/slots`, `POST /staff/walkin`, `POST /staff/scan` `{code, action: entry\|exit}`, `GET /staff/tokens` |
| Admin | `GET/PATCH /admin/temple`, `POST/PATCH /admin/temple/darshan-types`, `GET /admin/slots`, `POST /admin/slots/sync`, `PATCH /admin/controls`, `GET/POST/PATCH /admin/announcements`, `GET/POST/PATCH /admin/staff`, `GET /admin/stats/today`, `GET /admin/stats/trends`, `GET /admin/forecast/week`, `GET /admin/forecast/model`, `POST /admin/forecast/train`, `GET /admin/alerts`, `POST /admin/alerts/acknowledge` |
| Superadmin | `GET /superadmin/overview`, `GET/POST /superadmin/temples`, `PATCH /superadmin/temples/:id` |
| Other | `GET /health`, `POST /sms/inbound` (Twilio webhook) |

A superadmin chooses which temple the admin and staff endpoints act on with the `X-Temple-Id` header.

**Socket.IO:** clients emit `subscribe` with `{type: 'temple' | 'token' | 'admin', id}`. The server emits `live:update`, `slot:update`, `token:update`, `announcement:new`, `alert:new` and `notification` (the last one to the logged-in user's room).

---

## Notes and troubleshooting

- **Camera scanning needs `localhost` or HTTPS.** On a phone opened over your LAN IP (`http://192.168.x.x`), browsers block the camera; type the token code instead, or serve the app over HTTPS.
- **"No slots" late at night:** the demo temples close at around 9 PM. Run `npm run seed -- --reset --24h` to test at any hour.
- **Prediction service offline:** start it with `npm run dev:ml`. The Analytics page shows its status; forecasts fall back to historical averages meanwhile.
- **Port 27017 in use:** you already have MongoDB running. `npm run dev:db` detects this and exits, and the API uses it.

### Deploying

The project deploys for free on **Render** (API, website and prediction service, from `render.yaml`) with a **MongoDB Atlas** database. Step-by-step guide: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
npm run db:copy -- "<atlas connection string>"   # copy the local database (accounts, temples, history) to Atlas
```
