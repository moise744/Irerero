# Irerero — Integrated Digital Platform for Early Childhood Development in Rwanda

[![CI](https://github.com/moise744/Irerero/actions/workflows/ci.yml/badge.svg)](https://github.com/moise744/Irerero/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Django 5.1](https://img.shields.io/badge/django-5.1-green.svg)](https://djangoproject.com/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/flutter-3.x-02569B.svg)](https://flutter.dev/)

**Computer & Software Engineering — Final Year Project**

> *"Irerero is not just a software project. It is a child health intervention."*

Irerero digitises growth monitoring, automates WHO-standard nutritional assessments, and enables evidence-based decision-making for Early Childhood Development centres across Rwanda — from village-level caregivers to national policy makers.

---

## ✨ Features

| Feature | Description |
|---------|------------|
| 📊 **WHO Growth Monitoring** | Z-score calculation (WAZ, HAZ, WHZ, BAZ, HCZ) using LMS method with interactive growth charts |
| 🚨 **Smart Alerts** | Automatic SAM/MAM/stunting/wasting detection with severity-based alert generation |
| 🤖 **AI Risk Prediction** | ML-powered malnutrition risk scoring using RandomForest (85%+ SAM sensitivity) |
| 📱 **Offline-First Mobile** | Flutter Android app works 30+ days offline with encrypted SQLite and background sync |
| 🌐 **Management Dashboard** | React web dashboard with real-time WebSocket alerts, charts, maps, and reporting |
| 📋 **Digital Referrals** | Generate PDF referral slips, track outcomes, send SMS reminders |
| 📈 **Trend Analysis** | 3-month and 6-month growth trajectory detection for proactive intervention |
| 📨 **SMS Notifications** | Parent alerts via Africa's Talking in Kinyarwanda |
| 🔧 **Smart Scale Integration** | BLE-connected embedded devices for automated measurements |
| 🔒 **Data Protection** | Rwanda Law No. 058/2021 compliant, Argon2 hashing, AES-256 mobile encryption |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Mobile App  │────▶│   Django REST    │◀────│  Web Dashboard   │
│  (Flutter)   │     │   API + ASGI     │     │  (React + Vite)  │
│  SQLite/BLE  │     │  Channels/WS     │     │  Tailwind CSS    │
└──────────────┘     └────────┬─────────┘     └──────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌──────────┐ ┌─────┐ ┌────────┐
              │PostgreSQL│ │Redis│ │ Celery  │
              │  (data)  │ │(MQ) │ │(tasks)  │
              └──────────┘ └─────┘ └────────┘
```

| Component | Technology | Role |
|-----------|-----------|------|
| **backend/** | Django 5, DRF, SimpleJWT, Channels, Celery | REST API, WebSockets, background tasks, AI engine |
| **web-dashboard/** | React 18, Vite, Tailwind, Recharts, Leaflet | Sector/district management dashboards |
| **mobile-app/** | Flutter 3, Dart, sqflite, BLE | Caregiver workflows, offline-first data entry |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** · **Node.js 18+** · **Flutter 3.x** (mobile only)

### 1. Backend API

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
daphne -b 0.0.0.0 -p 8000 irerero_backend.asgi:application
```

### 2. Web Dashboard

```bash
cd web-dashboard
npm install
npm run dev
```

Open **http://localhost:3000** and login with:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Irerero2025!` | System Admin |
| `sector01` | `Irerero2025!` | Sector Coordinator |
| `manager01` | `Irerero2025!` | Centre Manager |
| `caregiver01` | `Irerero2025!` | ECD Caregiver |

### 3. Mobile App (Optional)

```bash
cd mobile-app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

### Windows One-Liner

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-windows.ps1
```

> 📖 For detailed instructions including phone-on-Wi-Fi testing, see **[RUNNING.md](RUNNING.md)**

---

## 📁 Project Structure

```
Irerero/
├── backend/                # Django REST API
│   ├── ai/                 # ML predictor, trend analysis, alert engine
│   ├── alerts/             # Alert management
│   ├── attendance/         # Daily attendance tracking
│   ├── auth_module/        # JWT auth, roles, permissions
│   ├── children/           # Child registration & profiles
│   ├── irerero_backend/    # Django settings, URLs, ASGI/WSGI
│   ├── lms_data/           # WHO growth standard JSON tables
│   ├── measurements/       # Growth measurements & Z-scores
│   ├── notifications/      # Push notifications
│   ├── nutrition/          # SFP/OTP/TSFP programmes
│   ├── referrals/          # Digital referral system
│   ├── reports/            # PDF/Excel report generation
│   └── sync/               # Offline sync endpoints
├── web-dashboard/          # React management dashboard
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Dashboard, Children, Alerts, Reports...
│       ├── services/       # API client (Axios)
│       └── hooks/          # Custom React hooks
├── mobile-app/             # Flutter caregiver app
│   └── lib/
│       ├── screens/        # Auth, Home, Children, Measurements...
│       ├── models/         # Data models
│       ├── services/       # API, sync, BLE
│       ├── db/             # Local encrypted SQLite
│       └── ai/             # On-device Z-score calculator
├── documents/              # SRS, architecture, project docs
├── scripts/                # Dev helper scripts
├── .github/workflows/      # CI/CD pipeline
├── docker-compose.prod.yml # Production Docker stack
├── render.yaml             # Render.com deployment blueprint
└── Procfile                # Heroku/Render process file
```

---

## 🐳 Deployment

### Option 1: Docker (Production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This starts: PostgreSQL, Redis, Django API (Daphne), Celery worker, and Celery beat.

### Option 2: Render.com (One-Click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/moise744/Irerero)

The included `render.yaml` blueprint auto-provisions:
- **Backend API** — Python web service with Daphne
- **Dashboard** — Static site from `web-dashboard/dist`
- **PostgreSQL** — Managed database

### Option 3: Manual VPS

```bash
# Backend
cd backend
pip install -r requirements.txt gunicorn
python manage.py migrate
python manage.py collectstatic --noinput
daphne -b 0.0.0.0 -p 8000 irerero_backend.asgi:application

# Dashboard
cd web-dashboard
npm install && npm run build
# Serve dist/ with Nginx
```

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|------------|
| `DJANGO_SECRET_KEY` | Long random string (required in production) |
| `DJANGO_DEBUG` | `False` in production |
| `DB_ENGINE` | `django.db.backends.postgresql` for production |
| `REDIS_URL` | Redis connection string |
| `SMS_PROVIDER` | `mock` or `africas_talking` |

---

## 📊 API Endpoints

| Module | Endpoint | Description |
|--------|---------|-------------|
| Auth | `POST /api/v1/auth/login/` | JWT authentication |
| Children | `GET /api/v1/children/` | List/create children |
| Measurements | `POST /api/v1/measurements/` | Record growth data |
| Alerts | `GET /api/v1/alerts/` | View/manage alerts |
| Attendance | `POST /api/v1/attendance/` | Record attendance |
| Nutrition | `GET /api/v1/nutrition/` | Programme management |
| Referrals | `POST /api/v1/referrals/` | Create referrals |
| Reports | `GET /api/v1/reports/` | Generate reports |
| Sync | `POST /api/v1/sync/push/` | Offline data sync |
| Health | `GET /health/` | Health check |

---

## 🔬 Testing

```bash
# Backend
cd backend && python manage.py test --verbosity=2

# Dashboard build check
cd web-dashboard && npm run build

# API smoke test (PowerShell)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method POST `
  -Body '{"username":"caregiver01","password":"Irerero2025!"}' -ContentType "application/json"
```

---

## 📚 Documentation

| Document | Description |
|----------|------------|
| [SRS Document](documents/SRS_Document.md) | Software Requirements Specification (IEEE 830) |
| [RUNNING.md](RUNNING.md) | Detailed setup and running guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

Additional documents in `documents/`:
- System Architecture (`.docx`)
- Project Understanding Document (`.docx`)
- SRS Code Verification Report (`.md`)

---

## 🌍 SDG Alignment

- **SDG 2** Zero Hunger — malnutrition detection and intervention
- **SDG 3** Good Health — child health monitoring and referrals
- **SDG 4** Quality Education — ECD centre management
- **SDG 17** Partnerships — multi-stakeholder data sharing

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**moise744** — Computer & Software Engineering, Final Year Project 2026

- GitHub: [@moise744](https://github.com/moise744)
