# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-03

### Added

#### Backend (Django REST API)
- JWT authentication with role-based access control (8 roles: caregiver, CHW, centre manager, sector coordinator, district officer, national officer, system admin, partner)
- Child registration and management (FR-014 to FR-018)
- Growth measurement recording — weight, height, MUAC, head circumference (FR-019 to FR-020)
- WHO Z-score calculation engine — WAZ, HAZ, WHZ, BAZ, HCZ using LMS method (FR-021)
- Nutritional status classification — normal, MAM, SAM, stunting, wasting (FR-022 to FR-023)
- Growth chart data with WHO percentile lines — P3, P15, P50, P85, P97 (FR-024)
- AI/ML risk prediction — RandomForest-based malnutrition risk scoring (AI-FR-011 to AI-FR-014)
- Trend analysis engine — 3-month and 6-month growth trajectory detection (FR-032 to FR-033)
- Alert generation — automatic SAM/MAM/stunting/wasting alerts with severity levels (FR-034 to FR-036)
- Digital referral system — generate, track, and follow up on health referrals (FR-054 to FR-056)
- SMS notifications via Africa's Talking — mock and production modes (FR-076 to FR-079)
- Attendance tracking — daily check-in/check-out (FR-001 to FR-006)
- Nutrition programme management — SFP/OTP/TSFP enrolment and tracking (FR-060 to FR-068)
- Report generation — monthly PDF reports, Excel/CSV export (FR-069 to FR-075)
- Offline sync support — push/pull endpoints with conflict resolution (FR-082 to FR-085)
- WebSocket real-time alerts via Django Channels
- Celery periodic tasks — attendance alerts, referral reminders, report generation
- WHO LMS data tables — JSON configuration files (NFR-026)
- Demo data seeding command (`seed_demo_data`)
- Health check endpoint
- Comprehensive API with 11 modules

#### Web Dashboard (React + Vite + Tailwind)
- Responsive login page with JWT authentication
- Dashboard overview — malnutrition statistics, centre performance charts
- Children management — list, search, filter, detailed profiles with 7 tabs
- Growth charts — interactive Recharts visualizations with WHO percentile overlays
- Alerts page — real-time alert feed via WebSocket
- Reports page — generate, view, and download monthly reports
- Users management — role-based user administration
- SMS inbox — message log viewer
- Geographic visualization — Leaflet maps for centre locations
- Dark mode support
- Mobile-responsive layout

#### Mobile App (Flutter — Android)
- Offline-first architecture — local SQLite with encrypted storage (NFR-018)
- Login with offline credential verification
- Home screen — centre overview and quick actions
- Child registration and profile management
- Growth measurement recording with embedded device support (ES-FR-001)
- Growth chart viewer with WHO percentile lines
- Attendance recording — swipe-based check-in/check-out
- Alert viewer with severity-based filtering
- Referral management — create and track referrals
- Nutrition programme tracking
- Background sync with WorkManager
- BLE device communication for smart scales
- Kinyarwanda and English localization (NFR-013)
- Local push notifications for offline alerts

#### Documentation
- Software Requirements Specification (SRS v1.0)
- System Architecture document
- Project Understanding document
- Running guide (RUNNING.md)
- Contributing guidelines
- SRS code verification report

#### DevOps
- Docker Compose for PostgreSQL + Redis
- Production Dockerfile for backend
- GitHub Actions CI/CD pipeline
- Windows development start script
- Environment variable configuration

### Security
- Argon2 password hashing with bcrypt fallback (NFR-020)
- JWT token rotation with blacklisting
- CORS configuration with LAN support
- Rwanda Law No. 058/2021 data protection compliance (§9)
- Parental consent workflow
- Role-based data access scoping

---

## [Unreleased]

### Planned
- iOS mobile app support
- DHIS2 data export integration
- Advanced ML model with CNN-based image analysis
- Multi-district dashboard aggregation
- Offline PDF generation on mobile
