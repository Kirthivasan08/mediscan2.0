# MediScan v2 — QR-Based Intelligent Medicine Information System

Karpaga Vinayaga College of Engineering & Technology | Anna University

---

## Quick Start

### Option 1: Docker (Recommended)
```bash
cp backend/.env.example backend/.env   # fill in your credentials
docker-compose up --build
```
- Frontend: http://localhost
- Backend API: http://localhost:5000/api

### Option 2: Manual
```bash
# Backend
cd backend
npm install
cp .env.example .env       # fill in your credentials
npm run seed               # load demo data
npm start                  # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm start                  # http://localhost:3000
```

---

## Demo Login Credentials
| Role        | Email                      | Password    |
|-------------|----------------------------|-------------|
| Admin       | admin@mediscan.com         | Test@1234   |
| Doctor      | doctor@mediscan.com        | Test@1234   |
| Pharmacist  | pharmacist@mediscan.com    | Test@1234   |
| Patient     | patient@mediscan.com       | Test@1234   |

---

## Features

### Core
- QR code generation for medicines and patients
- Barcode scanning support
- Drug interaction checker
- Expiry date tracking with automated alerts
- PDF report generation
- Bulk medicine import (XLSX)
- Audit logging
- Multi-language support (i18n)

### Roles
- **Patient** — View own treatments, medicines, QR card, download reports
- **Doctor** — Add treatments + prescribe medicines, view patient history
- **Pharmacist** — Scan patient QR → see current prescriptions instantly
- **Admin** — Full access, user management, analytics, audit log

### Authentication
- Local (email + password)
- Google OAuth 2.0
- GitHub OAuth

---

## Changes in This Version (Production Fix)

### New Features Added
1. **Doctor → Treatment Form**: Medicines can now be prescribed directly when adding a treatment. Search from database by name/brand/generic.
2. **Patient Dashboard**: Disease list with medicine details per condition.
3. **Pharmacist View**: Scan patient QR → see all ongoing treatments + active medicines instantly on scan result screen.
4. **Email Notifications**: Patient receives email when doctor adds prescription (with full medicine table).
5. **Treatment Update Email**: Patient notified when treatment status changes.

### Production Bugs Fixed
1. **Race Condition — Patient/Medicine ID**: Was using `countDocuments() + 1` (not atomic). Fixed with MongoDB atomic counter (`Counter` model).
2. **Expiry Status Never Updated**: Pre-save hook only runs on `.save()` — stored medicines never auto-updated. Added daily midnight cron to bulk-refresh all expiry statuses.
3. **Email Bug**: `sendWelcome` was wrapped in `if (email && email.sendWelcome)` — always falsy. Fixed.
4. **Validation Security Hole**: `allowUnknown: true` let arbitrary fields pass to DB. Changed to `stripUnknown: true`.
5. **Pagination Bug**: `page` not parseInt'd — `(page-1) * limit` was doing string math.
6. **ScanCount Race Condition**: Was doing `medicine.scanCount += 1; await medicine.save()` — concurrent scans could overwrite each other. Fixed with `$inc`.
7. **Patient Access Control**: Patient could view any treatment by ID. Added own-record check.
8. **Treatment Reassignment**: Doctor could change the patient field on PUT. Blocked.
9. **Password Reuse**: Change-password allowed setting same password. Added check.
10. **Provider Leak**: Login error message was different for "wrong provider" vs "not found" (information leak). Unified.
11. **MongoDB Reconnect**: `db.js` had no reconnect handling — silent disconnects crashed the server. Added event listeners.
12. **Graceful Shutdown**: Server had no SIGTERM/SIGINT handler. Added proper shutdown with timeout.
13. **CastError / TokenExpiredError**: Not handled in global error handler — returned 500. Added proper 400/401 responses.
14. **QR Overwrite on Update**: `PUT /medicines/:id` was accepting qrCode in body and overwriting generated QR. Now stripped.
15. **endDate < startDate**: Treatment model had no validation. Added pre-save check + Joi schema validation.

---

## Project Structure
```
mediscan/
├── backend/
│   ├── config/          # DB, logger, passport (OAuth)
│   ├── controllers/     # auth, medicine, treatment, report, import, interaction
│   ├── middleware/       # JWT auth, role authorize, Joi validate, audit log
│   ├── models/          # Counter, User, Medicine, Treatment, ScanLog, AuditLog
│   ├── routes/          # auth, medicines, treatments, extra (reports/import)
│   ├── utils/           # emailService, cronJobs, pdfService, seeder
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  # Navbar
│       ├── context/     # AuthContext, LangContext
│       ├── i18n/        # translations
│       └── pages/       # auth, dashboard, home, medicine, patient, scanner, admin, profile
└── docker-compose.yml
```

---

## Environment Variables (backend/.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=MediScan <your@gmail.com>
FRONTEND_URL=http://localhost:3000
```

---

*MediScan v2 — Anna University Project | 2024*
