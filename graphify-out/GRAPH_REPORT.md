# Graph Report - .  (2026-09-16)

## Corpus Check
- Corpus is ~38,021 words - fits in a single context window. You may not need a graph.

## Summary
- 832 nodes · 1847 edges · 38 communities detected
- Extraction: 74% EXTRACTED · 25% INFERRED · 1% AMBIGUOUS · INFERRED: 468 edges (avg confidence: 0.83)
- Token cost: 835,257 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_React Page Components|React Page Components]]
- [[_COMMUNITY_Alerting & Test Scenarios|Alerting & Test Scenarios]]
- [[_COMMUNITY_Mongoose Data Models|Mongoose Data Models]]
- [[_COMMUNITY_App Routing & Session Shell|App Routing & Session Shell]]
- [[_COMMUNITY_Documented System Concepts|Documented System Concepts]]
- [[_COMMUNITY_Server Middleware & Startup|Server Middleware & Startup]]
- [[_COMMUNITY_Darshan Token Screens|Darshan Token Screens]]
- [[_COMMUNITY_Flask Prediction Service|Flask Prediction Service]]
- [[_COMMUNITY_Admin Controller Handlers|Admin Controller Handlers]]
- [[_COMMUNITY_Announcements & API Client|Announcements & API Client]]
- [[_COMMUNITY_Forecast Jobs & ML Client|Forecast Jobs & ML Client]]
- [[_COMMUNITY_Auth & Superadmin Controllers|Auth & Superadmin Controllers]]
- [[_COMMUNITY_SMS & Gate Staff Endpoints|SMS & Gate Staff Endpoints]]
- [[_COMMUNITY_Seed Data & Footfall Logging|Seed Data & Footfall Logging]]
- [[_COMMUNITY_Booking & Notifications|Booking & Notifications]]
- [[_COMMUNITY_ML Service Integration|ML Service Integration]]
- [[_COMMUNITY_Gate Scanning & Slots|Gate Scanning & Slots]]
- [[_COMMUNITY_Forecast Model Pipeline|Forecast Model Pipeline]]
- [[_COMMUNITY_Live Stats & Slot Engine|Live Stats & Slot Engine]]
- [[_COMMUNITY_Booking Flow & Formatters|Booking Flow & Formatters]]
- [[_COMMUNITY_Brand Mark & Iconography|Brand Mark & Iconography]]
- [[_COMMUNITY_Dashboard, Board & Kiosk|Dashboard, Board & Kiosk]]
- [[_COMMUNITY_Live Snapshot Broadcasting|Live Snapshot Broadcasting]]
- [[_COMMUNITY_Chart Components|Chart Components]]
- [[_COMMUNITY_Analytics Page & Palette|Analytics Page & Palette]]
- [[_COMMUNITY_Auth Guards & SMS Replies|Auth Guards & SMS Replies]]
- [[_COMMUNITY_Crowd Simulator|Crowd Simulator]]
- [[_COMMUNITY_Timezone & Settings|Timezone & Settings]]
- [[_COMMUNITY_Public Temple Endpoints|Public Temple Endpoints]]
- [[_COMMUNITY_Crowd Level Thresholds|Crowd Level Thresholds]]
- [[_COMMUNITY_Cron Jobs & Retraining|Cron Jobs & Retraining]]
- [[_COMMUNITY_Express App Bootstrap|Express App Bootstrap]]
- [[_COMMUNITY_Client Session Plumbing|Client Session Plumbing]]
- [[_COMMUNITY_Login & Role Routing|Login & Role Routing]]
- [[_COMMUNITY_Account Provisioning|Account Provisioning]]
- [[_COMMUNITY_API Test Harness|API Test Harness]]
- [[_COMMUNITY_AppError Class|AppError Class]]
- [[_COMMUNITY_Time Format Validators|Time Format Validators]]

## God Nodes (most connected - your core abstractions)
1. `cx()` - 39 edges
2. `useFetch()` - 29 edges
3. `localDateStr()` - 28 edges
4. `useAuth()` - 21 edges
5. `number()` - 21 edges
6. `Button()` - 19 edges
7. `Card()` - 17 edges
8. `errorMessage()` - 17 edges
9. `End-to-end API test suite` - 17 edges
10. `Badge()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ML JSON Error Handlers` --semantically_similar_to--> `Central Error Handler`  [INFERRED] [semantically similar]
  ml-service/app.py → server/src/middleware/errorHandler.js
- `safely (re-entrancy wrapper)` --semantically_similar_to--> `Scan Handler (duplicate-scan guard)`  [INFERRED] [semantically similar]
  server/src/jobs/index.js → client/src/pages/staff/Scanner.jsx
- `Client Token Code Normalization (SD- prefix, uppercase)` --semantically_similar_to--> `findTokenByCode (code lookup helper)`  [INFERRED] [semantically similar]
  client/src/pages/public/TrackToken.jsx → server/src/controllers/tokenController.js
- `Environment Configuration` --references--> `Smart Darshan ML Flask Service`  [INFERRED]
  server/src/config/env.js → ml-service/app.py
- `ModelStore (per-temple model registry)` --semantically_similar_to--> `templeScope middleware`  [INFERRED] [semantically similar]
  ml-service/model.py → server/src/middleware/templeScope.js

## Hyperedges (group relationships)
- **Live Queue Push Pipeline (socket room to rendered lane)** — socketcontext_socketprovider, socketcontext_room_refcount, socketcontext_useroom, socketcontext_usesocketevent, uselivetemple_uselivetemple, livelanes_component, crowdmeter_component [INFERRED 0.85]
- **Role-Based Access Surface (guarded routes, gated nav, role-aware chrome)** — authcontext_authprovider, protectedroute_component, app_role_route_guarding, consolelayout_nav_config, consolelayout_temple_scope, publiclayout_navbar [INFERRED 0.85]
- **Accessible Analytics Stack (every chart readable as a table)** — chartframe_component, chartframe_table_view_toggle, forecastchart_component, trendcharts_dailytrendchart, trendcharts_weekheatmap, trendcharts_featureimportance [INFERRED 0.85]
- **Dual-Channel Token Issuance (online booking and walk-in kiosk)** — bookdarshan_submit, kiosk_issue, slots_page, settings_darshanTypeEditor [INFERRED 0.85]
- **Crowd Forecast Rendered Across Admin, Devotee and Public Surfaces** — analytics_weekForecast, bookdarshan_crowdAwareSlotPicker, templedetail_recommendedHours, displayboard_page [INFERRED 0.85]
- **Entry Pause Propagation from Admin Control to Every Gate Surface** — dashboard_setPaused, dashboard_pauseModal, displayboard_page, kiosk_page, settings_fieldsSchema [INFERRED 0.85]
- **Crowd Prediction Training Pipeline (Node cron to Python Random Forest)** — jobs_trainmodels, mlclient_mlhealth, forecastservice_traintemplemodel, app_trainendpoint, model_train, model_randomforest, admincontroller_trainmodel [INFERRED 0.85]
- **Multi-tenant Temple-Scoped Request Chain** — auth_authenticate, auth_requirerole, templescope_templescope, supertemples_templescopeswitch, admincontroller, staffcontroller [INFERRED 0.85]
- **Walk-in Token Issuance Flow (counter to live queue)** — walkincounter_page, staffcontroller_walkinslots, staffcontroller_issuewalkin, bookingservice_createwalkin, tokenview_serializeToken, livestats_getsnapshot [INFERRED 0.85]
- **Occupancy alert and automatic entry-pause loop** — alertService_checkOccupancy, alertService_lastLevels, alertService_raiseAlert, Alert_alertSchema, Temple_settings, Temple_controls, liveStats_schedulePublish [EXTRACTED 1.00]
- **Zero-install demo bootstrap: local DB, seed, live simulation** — localDb_script, seed_script, seedData_seedDatabase, seedData_generateFootfall, jobs_trainModels, simulate_script [INFERRED 0.85]
- **Role-tiered router pipeline: authenticate, requireRole, templeScope, validate** — index_apiRouter, templeRoutes_router, authRoutes_router, staffRoutes_router, adminRoutes_router, superadminRoutes_router, auth_requireRole, templeScope_templeScope, validate_validate, schemas_sharedValidators, User_ROLES [EXTRACTED 1.00]
- **Live wait-time engine (scan -> queue -> wait estimate)** — scanService_scanToken, footfallService_recordFootfall, liveStats_schedulePublish, liveStats_computeSnapshot, slotService_defaultThroughput, liveStats_tokenQueueInfo, sockets_emitTo [EXTRACTED 1.00]
- **Crowd forecast pipeline (footfall -> train -> predict -> fallback)** — footfallService_recordFootfall, forecastService_trainTempleModel, mlClient_mlTrain, mlClient_mlPredict, forecastService_getForecast, forecastService_historicalAverage, forecastService_retrainInBackground, statsService_todayStats [EXTRACTED 1.00]
- **Seat capacity lifecycle (generate -> reserve -> release -> report)** — slotService_buildSlotsForDate, slotService_syncSlots, bookingService_reserveSeats, bookingService_releaseSeats, slotService_slotAvailability, slotService_serializeSlot, bookingService_createWalkin [INFERRED 0.85]
- **Unified online and walk-in slot allocation flow** — readme_slot_system, readme_quota_split, readme_walkin_release_rule, readme_atomic_seat_reservation, readme_virtual_token, readme_token_lifecycle [EXTRACTED 1.00]
- **Gate scan to live wait-time broadcast pipeline** — readme_qr_scan_sensor, readme_wait_time_engine, readme_queue_position, readme_socketio_channels, readme_display_board, readme_crowd_control [EXTRACTED 1.00]
- **Footfall to crowd forecast ML pipeline** — readme_footfall_log, readme_feature_engineering, readme_random_forest_model, readme_baseline_comparison, readme_forecast_output, readme_model_retraining, readme_forecast_fallback [EXTRACTED 1.00]
- **Token status lifecycle expressed from schema to screen** — Token_statusLifecycle, Token_model, tokenController_myTokens, tokenView_canCancel, TokenStatus_queuePanel, TokenTicket_component [INFERRED 0.85]
- **QR / code round trip: ticket to public status page to code lookup** — TokenTicket_tokenUrl, TokenSlip_component, TrackToken_codeNormalization, TokenStatus_page, tokenRoutes_publicStatusEndpoint, tokenController_findTokenByCode [INFERRED 0.85]
- **Two-tier token visibility (full owner/staff view vs masked public view)** — tokenRoutes_publicStatusEndpoint, tokenController_canSeeFullToken, tokenController_getTokenStatus, tokenView_serializeToken, tokenView_nameMasking [INFERRED 0.85]

## Communities (49 total, 3 thin omitted)

### Community 0 - "React Page Components"
Cohesion: 0.06
Nodes (84): Analytics(), Announcements(), Dashboard(), Settings(), Slots(), StaffAccounts(), Login(), Register() (+76 more)

### Community 1 - "Alerting & Test Scenarios"
Cohesion: 0.05
Nodes (81): Temple controls (entry pause state), checkOccupancy() capacity guard, lastLevels in-memory escalation state, raiseAlert(), Forecast source assertion, Gate scan rejection scenarios, Seat-release-after-cancel assertion, Slot sync idempotency assertion (+73 more)

### Community 2 - "Mongoose Data Models"
Cohesion: 0.06
Nodes (54): Alert model (crowd alerts), Announcement model (admin notices), FootfallLog model (hourly entries/exits), Slot model (darshan time slots), DarshanType embedded subdocument, Temple mlModel metrics block, Temple settings (operational policy), Temple model (+46 more)

### Community 3 - "App Routing & Session Shell"
Cohesion: 0.08
Nodes (47): Lazy Route Code Splitting, Route Role Sets (CONSOLE_ROLES / ADMIN_ROLES), App Route Tree, AuthProvider (session state), Session Restore with Retry Backoff, sd:unauthorized Global Logout Event, useAuth hook, Unread Crowd Alert Badge (+39 more)

### Community 4 - "Documented System Concepts"
Cohesion: 0.07
Nodes (47): Client HTML App Shell, Brand Typography and Theme Color, React Module Entry Point (/src/main.jsx), Node.js Express Socket.IO API Server, Atomic Seat Reservation (No Overbooking), Weekday-Hour Average Baseline, Scheduled Cron Jobs, Crowd Control Alerts and Entry Pause (+39 more)

### Community 5 - "Server Middleware & Startup"
Cohesion: 0.1
Nodes (19): connectDB(), disconnectDB(), redact(), safely(), startJobs(), authenticate(), bearerToken(), optionalAuth() (+11 more)

### Community 6 - "Darshan Token Screens"
Cohesion: 0.14
Nodes (31): MyTokens page (devotee booking list), Upcoming / Past Scope Filter, TokenSlip (printable walk-in slip), Cancel Booking Flow (confirm modal), Live Status Update Strategy (socket rooms + throttle + poll), TokenStatus page (/t/:code live status), QueuePanel (queue state renderer), SMS "STATUS <code>" Fallback Channel (+23 more)

### Community 7 - "Flask Prediction Service"
Cohesion: 0.12
Nodes (13): Exception, json_body(), predict(), Smart Darshan prediction service (Flask).  Endpoints (called by the Node.js API,, train(), build_features(), ModelError, ModelStore (+5 more)

### Community 8 - "Admin Controller Handlers"
Cohesion: 0.13
Nodes (17): addDarshanType(), createAnnouncement(), listSlots(), runSlotSync(), statsToday(), statsTrends(), trainModel(), updateAnnouncement() (+9 more)

### Community 9 - "Announcements & API Client"
Cohesion: 0.16
Nodes (23): Optimistic Active Toggle, Admin Announcements Page, Publish Announcement Action, Announcement Type Tone Map, Axios API Client, errorMessage Helper, Confirm Booking Action, ROLE_LABELS Map (+15 more)

### Community 10 - "Forecast Jobs & ML Client"
Cohesion: 0.17
Nodes (17): modelStatus(), activeTemples(), publishAllSnapshots(), syncAllTemples(), tokenMaintenance(), trainModels(), clearForecastCache(), getForecast() (+9 more)

### Community 11 - "Auth & Superadmin Controllers"
Cohesion: 0.13
Nodes (12): createStaff(), updateStaff(), login(), register(), updateMe(), createTemple(), signToken(), getClient() (+4 more)

### Community 12 - "SMS & Gate Staff Endpoints"
Cohesion: 0.2
Nodes (18): escapeXml(), inboundSms(), templeWaitText(), tokenStatusText(), twiml(), context(), issueWalkin(), listTokens() (+10 more)

### Community 13 - "Seed Data & Footfall Logging"
Cohesion: 0.25
Nodes (17): buildFestivals(), clearDatabase(), createUser(), generateFootfall(), hourlyCapacityOf(), mulberry32(), seedDatabase(), recordFootfall() (+9 more)

### Community 14 - "Booking & Notifications"
Cohesion: 0.28
Nodes (17): cancelToken(), createOnlineBooking(), createTokenDoc(), createWalkin(), describeSlot(), emitSlotChanged(), fitsTotal(), releaseSeats() (+9 more)

### Community 15 - "ML Service Integration"
Cohesion: 0.15
Nodes (17): Temple Admin Controller, GET /health (ML), Smart Darshan ML Flask Service, GET /models/<templeId> (ML), mlHealth (ML service probe), ModelStore (per-temple model registry), emitTo (socket room emit), Staff / Gate Controller (+9 more)

### Community 16 - "Gate Scanning & Slots"
Cohesion: 0.18
Nodes (15): listSlots with per-status head counts, createWalkin, QR Gate Scanner Page, Scan Handler (duplicate-scan guard), Scan Result Panel, scanToken (gate scan rules), serializeSlot, issueWalkin (+7 more)

### Community 17 - "Forecast Model Pipeline"
Cohesion: 0.15
Nodes (15): weekForecast (7-day outlook), ML JSON Error Handlers, POST /predict (ML), POST /train (ML), recordFootfall, getForecast, tokenMaintenance job, build_features (feature engineering) (+7 more)

### Community 18 - "Live Stats & Slot Engine"
Cohesion: 0.24
Nodes (10): checkOccupancy(), raiseAlert(), computeSnapshot(), loadTemple(), publishSnapshot(), buildSlotsForDate(), defaultThroughput(), serializeSlot() (+2 more)

### Community 19 - "Booking Flow & Formatters"
Cohesion: 0.22
Nodes (14): Book Darshan Flow, Live Slot Seat Subscription, TOKEN_STATUS Vocabulary, addDays Date-String Arithmetic, fmtSlot Slot Range Formatter, number Indian-Grouping Formatter, rupees Currency Formatter, Public Home Page (+6 more)

### Community 20 - "Brand Mark & Iconography"
Cohesion: 0.24
Nodes (14): Smart Darshan Brand Mark, Browser Tab / Bookmark Icon Role, Rationale: Flat Geometric Temple Mark Legible at 16px, Hindu Temple / Darshan Domain Concept, Doorway as Queue-Entry Metaphor, Rounded-Square App Tile Background, Saffron on Deep Brown Palette (#7c2d12 / #fdba74 / #fed7aa), Arched Sanctum Doorway Cutout (+6 more)

### Community 21 - "Dashboard, Board & Kiosk"
Cohesion: 0.23
Nodes (13): Throttled Live Stats Refresh, Admin Crowd Dashboard, Pause Confirmation Modal, Pause/Resume Entry Control, Entrance Display Board, Temple QR Handoff, Unattended Reload Loop, waitLabel Wait-Time Formatter (+5 more)

### Community 22 - "Live Snapshot Broadcasting"
Cohesion: 0.21
Nodes (12): updateControls (entry pause), updateTemple (profile & settings), clearForecastCache, publishAllSnapshots job, getSnapshot (live crowd snapshot), publishSnapshot, schedulePublish (debounced broadcast), Temple Wait SMS Text (+4 more)

### Community 23 - "Chart Components"
Cohesion: 0.24
Nodes (10): Shared ChartTooltip, ChartFrame (legend + table view), Chart-to-Table Accessibility Toggle, ForecastChart, Devotee vs Admin Forecast Modes (showActual), ForecastTooltip (mode-aware), CrowdLevelBadge, DailyTrendChart (+2 more)

### Community 24 - "Analytics Page & Palette"
Cohesion: 0.28
Nodes (9): ML Model Metrics Panel, Admin Analytics Page, Retrain Model Action, Trend Window Selector, CHART_COLORS Palette, hourLabel, hourRange, WEEKDAYS Index Table (+1 more)

### Community 25 - "Auth Guards & SMS Replies"
Cohesion: 0.22
Nodes (9): authenticate middleware, optionalAuth middleware, requireRole guard, userFromJwt (token to live user), tokenQueueInfo (position & wait), Inbound SMS Webhook, Token Status SMS Text, TwiML Reply Writer (+1 more)

### Community 26 - "Crowd Simulator"
Cohesion: 0.5
Nodes (7): api(), issueWalkin(), main(), pick(), scanEntry(), scanExit(), weightedLane()

### Community 27 - "Timezone & Settings"
Cohesion: 0.25
Nodes (8): Asia/Kolkata Default Timezone, fmtDate, fmtDateStr Calendar-Date Formatter, fmtDateTime, fmtTime, todayIn Temple-Local Today, Festival Calendar Editor, Temple Settings Page

### Community 28 - "Public Temple Endpoints"
Cohesion: 0.52
Nodes (6): findActiveTemple(), getAnnouncements(), getLive(), getSlots(), getTemple(), getTempleForecast()

### Community 29 - "Crowd Level Thresholds"
Cohesion: 0.29
Nodes (7): 7-Day Crowd Forecast Selector, Ten-Minute Booking Cutoff, Crowd-Aware Slot Picker, localHourOf Slot Hour Helper, CROWD_LEVELS Scale, Wait-Time Colour Thresholds, currentHourIn Temple-Local Hour

### Community 30 - "Cron Jobs & Retraining"
Cohesion: 0.29
Nodes (7): trainModel (manual retrain), trainTempleModel, safely (re-entrancy wrapper), startJobs (cron scheduler), syncAllTemples job, trainModels job, syncSlots (slot generation)

### Community 31 - "Express App Bootstrap"
Cohesion: 0.6
Nodes (6): createApp (Express app factory), connectDB (retrying Mongo connect), Environment Configuration, Central Error Handler, notFound middleware, API Bootstrap (server.js main)

### Community 32 - "Client Session Plumbing"
Cohesion: 0.4
Nodes (5): Auth Request Interceptor, Session Expiry Response Interceptor, Guarded localStorage Wrapper, X-Temple-Id Scope Header, sd:unauthorized Window Event

### Community 33 - "Login & Role Routing"
Cohesion: 0.5
Nodes (5): homePathFor Role Landing Router, isConsoleRole Predicate, Demo Account Quick-Fill, Login Page, Register Page

### Community 34 - "Account Provisioning"
Cohesion: 0.4
Nodes (5): createStaff (provision staff account), signToken (JWT issuer), changePassword, login, register (devotee signup)

## Ambiguous Edges - Review These
- `useSocketEvent subscription hook` → `useThrottle (leading + trailing)`  [AMBIGUOUS]
  client/src/hooks/useFetch.js · relation: conceptually_related_to
- `Gate Scanner Confirmation Beep` → `Self-Service Token Kiosk`  [AMBIGUOUS]
  client/src/lib/sound.js · relation: conceptually_related_to
- `SETTING_FIELDS Crowd & Booking Rules` → `Ten-Minute Booking Cutoff`  [AMBIGUOUS]
  client/src/pages/devotee/BookDarshan.jsx · relation: conceptually_related_to
- `GET /api/health` → `localDb script (in-process MongoDB)`  [AMBIGUOUS]
  server/src/routes/index.js · relation: conceptually_related_to
- `isValidTwilioRequest (webhook signature)` → `Inbound SMS webhook scenarios`  [AMBIGUOUS]
  server/tests/api.test.mjs · relation: references
- `roomFor (room authorization)` → `Temple scoping / RBAC scenarios`  [AMBIGUOUS]
  server/tests/api.test.mjs · relation: conceptually_related_to
- `slugify` → `End-to-end API test suite`  [AMBIGUOUS]
  server/tests/api.test.mjs · relation: references
- `REST API Surface (/api)` → `Flask (>=3.0)`  [AMBIGUOUS]
  ml-service/requirements.txt · relation: conceptually_related_to
- `Cyclic Time Feature Set` → `NumPy (>=1.24)`  [AMBIGUOUS]
  ml-service/requirements.txt · relation: references
- `Arched Sanctum Doorway Cutout` → `Doorway as Queue-Entry Metaphor`  [AMBIGUOUS]
  client/public/favicon.svg · relation: conceptually_related_to
- `Hindu Temple / Darshan Domain Concept` → `Doorway as Queue-Entry Metaphor`  [AMBIGUOUS]
  client/public/favicon.svg · relation: conceptually_related_to
- `Token Status Lifecycle (booked -> checked_in -> completed / cancelled / expired)` → `Live Status Update Strategy (socket rooms + throttle + poll)`  [AMBIGUOUS]
  client/src/pages/public/TokenStatus.jsx · relation: conceptually_related_to
- `ACTIVE_STATUSES (seat-consuming states)` → `myTokens handler (scoped booking list)`  [AMBIGUOUS]
  server/src/controllers/tokenController.js · relation: conceptually_related_to
- `Token Actor Audit Fields (issuedBy / checkedInBy / completedBy)` → `serializeToken (token API DTO)`  [AMBIGUOUS]
  server/src/services/tokenView.js · relation: references

## Knowledge Gaps
- **65 isolated node(s):** `Smart Darshan prediction service (Flask).  Endpoints (called by the Node.js API,`, `Crowd prediction model for Smart Darshan.  Learns hourly footfall (people enteri`, `Turns raw rows ({hour, dayOfWeek, month, isFestival}) into model features.`, `MAE of a simple 'average for this weekday and hour' guess, to show the model add`, `Trains, saves and loads one model per temple.` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `useSocketEvent subscription hook` and `useThrottle (leading + trailing)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Gate Scanner Confirmation Beep` and `Self-Service Token Kiosk`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SETTING_FIELDS Crowd & Booking Rules` and `Ten-Minute Booking Cutoff`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `GET /api/health` and `localDb script (in-process MongoDB)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `isValidTwilioRequest (webhook signature)` and `Inbound SMS webhook scenarios`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `roomFor (room authorization)` and `Temple scoping / RBAC scenarios`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `slugify` and `End-to-end API test suite`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._