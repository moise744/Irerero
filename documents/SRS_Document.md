# Irerero — Software Requirements Specification (SRS)

**Version:** 1.0.0  
**Date:** May 3, 2026  
**Project:** Integrated Digital Platform for Early Childhood Development in Rwanda  
**Department:** Computer & Software Engineering — Final Year Project  
**Standard:** IEEE Std 830-1998

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Specific Requirements](#3-specific-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [External Interface Requirements](#6-external-interface-requirements)
7. [AI/ML Requirements](#7-aiml-requirements)
8. [Embedded System Requirements](#8-embedded-system-requirements)
9. [Legal & Compliance](#9-legal--compliance)
10. [Constraints & Assumptions](#10-constraints--assumptions)
11. [Appendices](#11-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the functional, non-functional, and domain-specific requirements for **Irerero** — an integrated digital platform designed to support Early Childhood Development (ECD) centres across Rwanda. The system automates growth monitoring, nutritional status classification, alert generation, referral tracking, and data-driven decision-making for children aged 0–8 years.

### 1.2 System Name

**Irerero** (Kinyarwanda for "ECD centre" — a place where children are nurtured).

### 1.3 Scope

The system comprises:

- **Mobile Application** (Flutter/Android) — offline-first caregiver tool for daily operations
- **Web Dashboard** (React/Vite) — management and analytics for sector/district coordinators
- **Backend API** (Django REST Framework) — centralised data management, AI analytics, real-time alerts
- **Embedded System Interface** — optional smart scale integration via BLE

**Scope Exclusions:**
- Electronic Medical Records (EMR) at health facilities
- Financial management for ECD centres
- Curriculum or lesson planning tools
- Children above age 8

### 1.4 Glossary

| Term | Definition |
|------|-----------|
| ECD | Early Childhood Development — integrated services for children birth to 6 years |
| WHO | World Health Organization — sets international child growth standards |
| Z-score | Statistical measure of deviation from WHO median for age and sex |
| WAZ | Weight-for-Age Z-score — underweight indicator |
| HAZ | Height-for-Age Z-score — stunting indicator |
| WHZ | Weight-for-Height Z-score — wasting indicator |
| MUAC | Mid-Upper Arm Circumference — rapid malnutrition assessment (6–59 months) |
| MAM | Moderate Acute Malnutrition — MUAC 11.5–12.4 cm or WHZ between −3 and −2 |
| SAM | Severe Acute Malnutrition — MUAC <11.5 cm or WHZ below −3 |
| Stunting | HAZ below −2 — chronic malnutrition, largely irreversible after age 3 |
| Wasting | WHZ below −2 — acute malnutrition, can be rapidly fatal if severe |
| RUTF | Ready-to-Use Therapeutic Food — peanut-based SAM treatment |
| LMS | Lambda-Mu-Sigma — WHO growth curve parameterisation method |
| CMAM | Community Management of Acute Malnutrition |
| CHW | Community Health Worker |
| DHIS2 | District Health Information System 2 — Rwanda's national health data platform |

### 1.5 References

1. Republic of Rwanda, Ministry of Education. Early Childhood Development Policy. Kigali, 2011.
2. Republic of Rwanda. National Standards for Early Childhood Development. Kigali, 2019.
3. World Health Organization. WHO Child Growth Standards (2006) — Methods and Development.
4. World Health Organization. WHO Growth Reference Data for 5–19 years (2007).
5. UNICEF. Programming Guide: Community Management of Acute Malnutrition (CMAM).
6. IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.
7. WHO. Global Action Plan on Child Wasting 2020–2025.
8. Republic of Rwanda. Law No. 058/2021 on Protection of Personal Data and Privacy.

---

## 2. Overall Description

### 2.1 Product Perspective

Irerero fills a gap between Rwanda's national ECD policy goals and the paper-based monitoring systems currently used in most ECD centres. It digitises growth monitoring workflows, automates WHO-standard calculations, and provides real-time analytics to enable evidence-based decision-making from centre level to national level.

### 2.2 User Classes

| Role | Description | Scope |
|------|-----------|-------|
| ECD Caregiver | Records attendance, measurements, manages children | Own centre |
| Community Health Worker | Supports caregivers with health assessments | Own centre |
| Centre Manager | Oversees centre operations, generates reports | Own centre |
| Sector ECD Coordinator | Monitors 5–15 centres in a sector | Own sector |
| District ECD Officer | Oversees 30+ centres across a district | Own district |
| National ECD Officer | Policy-level oversight | All data |
| System Administrator | Technical management, ML model config, user accounts | Full system |
| Development Partner | UNICEF, WFP, NGOs — aggregate analytics only | Anonymised data |

### 2.3 Operating Environment

**Web Dashboard:**
- Browsers: Chrome, Firefox, Edge (latest 2 versions)
- Minimum: 1024×768 resolution, 2 Mbps connection

**Mobile Application:**
- Android 8.0+ (API 26)
- Minimum 2 GB RAM, 16 GB storage
- Works fully offline; syncs when connectivity available (minimum once per week)

**Backend Server:**
- Python 3.11+, Django 5.x
- PostgreSQL 16 (production) / SQLite (development)
- Redis 7 (Celery task queue + Django Channels)

### 2.4 Design Constraints

- WHO growth algorithms must be used WITHOUT modification (LMS method)
- All recommendations must follow Rwanda's nationally approved CMAM protocol
- System must NOT make diagnostic claims — supports caregivers, does not replace medical professionals
- Embedded hardware cost ceiling: $150 USD per unit
- Server cost ceiling: $500 USD/month for national-scale deployment
- LMS data must be separable — mobile app must not require software update for WHO data changes

---

## 3. Specific Requirements

### 3.1 Attendance Module (FR-001 to FR-006)

| ID | Requirement |
|----|------------|
| FR-001 | System shall display a list of all enrolled children for daily attendance |
| FR-002 | Caregiver shall mark each child as present or absent with a single tap |
| FR-003 | System shall record check-in and check-out timestamps |
| FR-004 | System shall calculate daily, weekly, and monthly attendance rates |
| FR-005 | System shall flag children absent 3+ consecutive days for follow-up |
| FR-006 | Attendance data shall sync to server when connectivity is available |

### 3.2 Child Registration (FR-014 to FR-018)

| ID | Requirement |
|----|------------|
| FR-014 | System shall register a child with: full name, date of birth, sex, parent/guardian info |
| FR-015 | System shall assign a unique identifier to each child |
| FR-016 | System shall capture and store a child photo |
| FR-017 | System shall record parent/guardian mobile number for SMS notifications |
| FR-018 | Parental consent must be displayed in Kinyarwanda and recorded at registration |

### 3.3 Growth Monitoring (FR-019 to FR-031)

| ID | Requirement |
|----|------------|
| FR-019 | System shall record weight (kg), height/length (cm), MUAC (cm), head circumference (cm) |
| FR-020 | System shall calculate age in months from date of birth automatically |
| FR-021 | System shall compute Z-scores using WHO LMS method: WAZ, HAZ, WHZ, BAZ, HCZ |
| FR-022 | System shall classify nutritional status: Normal, MAM, SAM, Stunted, Wasted |
| FR-023 | System shall apply MUAC colour coding: Green (≥12.5), Yellow (11.5–12.4), Red (<11.5) |
| FR-024 | System shall render interactive growth charts with WHO percentile lines (P3, P15, P50, P85, P97) |
| FR-025 | Growth charts shall display child's measurements plotted over time |
| FR-026 | System shall support weight-for-age, height-for-age, weight-for-height, and BMI-for-age charts |
| FR-027 | Measurements shall be stored locally and synced to server |
| FR-028 | System shall accept measurements from embedded smart scale via BLE |
| FR-029 | System shall validate measurement ranges (e.g., weight 0.5–30 kg for 0–5 years) |
| FR-030 | System shall display measurement history for each child |
| FR-031 | Z-score calculation shall complete within 1 second offline (NFR-002) |

### 3.4 Trend Analysis & Alerts (FR-032 to FR-040)

| ID | Requirement |
|----|------------|
| FR-032 | System shall detect 3-month growth trends (improving, stable, declining) |
| FR-033 | System shall detect 6-month growth trajectories for chronic malnutrition risk |
| FR-034 | System shall auto-generate alerts when Z-score crosses −2 (MAM) or −3 (SAM) threshold |
| FR-035 | Alerts shall have severity levels: urgent (SAM), warning (MAM), information |
| FR-036 | System shall send SMS to parent/guardian when urgent alert is generated |
| FR-037 | System shall display alerts on dashboard with filtering by severity, centre, date |
| FR-038 | Alert wording shall emphasise severity without relying on colour alone (accessibility) |
| FR-039 | Caregiver shall be able to acknowledge and respond to alerts |
| FR-040 | System shall escalate unacknowledged urgent alerts after 48 hours |

### 3.5 Referral Management (FR-054 to FR-059)

| ID | Requirement |
|----|------------|
| FR-054 | System shall generate digital referral slips with child info, measurements, and Z-scores |
| FR-055 | Referral slips shall be exportable as PDF |
| FR-056 | System shall track referral status: pending, in-progress, completed, no-show |
| FR-057 | System shall send SMS reminder for pending referrals after 7 days |
| FR-058 | Caregiver shall record referral outcome (treatment received, outcome) |
| FR-059 | Referral history shall be visible in child profile |

### 3.6 Nutrition Programme (FR-060 to FR-068)

| ID | Requirement |
|----|------------|
| FR-060 | System shall support programme types: SFP, OTP, TSFP |
| FR-061 | System shall enrol children meeting criteria into appropriate programme |
| FR-062 | System shall track programme attendance and RUTF distribution |
| FR-063 | System shall flag children missing 3+ programme days in 14-day window |
| FR-064 | System shall record discharge criteria and discharge date |
| FR-065 | System shall generate programme performance statistics |
| FR-066 | Nutrition data shall be included in monthly reports |
| FR-067 | System shall track relapse within 6 months of discharge |
| FR-068 | Programme recommendations shall follow Rwanda CMAM protocol only |

### 3.7 Reports (FR-069 to FR-075)

| ID | Requirement |
|----|------------|
| FR-069 | System shall generate monthly ECD centre reports |
| FR-070 | Reports shall include: enrolment, attendance rates, malnutrition prevalence, referrals |
| FR-071 | Reports shall be exportable as PDF |
| FR-072 | District/sector dashboards shall aggregate data from multiple centres |
| FR-073 | Data shall be exportable as Excel/CSV |
| FR-074 | Reports shall be generated within 10 seconds (NFR-005) |
| FR-075 | System shall auto-generate monthly reports on 1st of each month |

### 3.8 SMS Notifications (FR-076 to FR-079)

| ID | Requirement |
|----|------------|
| FR-076 | System shall send SMS via Africa's Talking gateway |
| FR-077 | SMS content shall be in Kinyarwanda |
| FR-078 | System shall send weekly progress SMS to parents (Mondays 09:00) |
| FR-079 | SMS shall not contain sensitive health details on lock screen previews |

### 3.9 Offline & Sync (FR-082 to FR-085)

| ID | Requirement |
|----|------------|
| FR-082 | Mobile app shall function fully without internet connection |
| FR-083 | Data shall sync automatically when connectivity is detected |
| FR-084 | Sync shall use push/pull with conflict resolution (server-wins for concurrent edits) |
| FR-085 | Full sync shall complete within 2 minutes on 3G for 100 children with 1 month data |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|------------|
| NFR-001 | Performance | UI response < 2 seconds; growth chart rendering < 3 seconds |
| NFR-002 | Performance | Z-score calculation < 1 second offline |
| NFR-004 | Scalability | 500 concurrent users with < 3 second server response |
| NFR-005 | Performance | Report generation < 10 seconds |
| NFR-006 | Performance | Full sync < 2 minutes on 3G (100 children, 1 month data) |
| NFR-007 | Availability | 99.5% uptime; < 44 hours annual downtime; 48h maintenance notice |
| NFR-008 | Reliability | Mobile app autosaves continuously — no data loss on power failure |
| NFR-009 | Offline | Minimum 30 consecutive days offline operation |
| NFR-011 | Backup | 24-hour backup interval; 2-year retention; 4-hour recovery |
| NFR-012 | Usability | 2-day training sufficient for caregiver competence |
| NFR-013 | Localization | Kinyarwanda and English language support |
| NFR-017 | Usability | Max 35 taps for 30-child attendance; max 10 taps per measurement |
| NFR-018 | Security | AES-256 encrypted local SQLite database |
| NFR-020 | Security | Argon2 password hashing with bcrypt fallback |
| NFR-021 | Privacy | Rwanda Law No. 058/2021 compliance |
| NFR-024 | Scalability | Support 416 sectors, 3,000+ centres, 500,000+ children nationally |
| NFR-026 | Maintainability | WHO LMS data separable from application code (JSON config files) |

---

## 5. System Architecture

### 5.1 Architecture Overview

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

### 5.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Django 5.1, DRF 3.15, SimpleJWT | REST API, authentication |
| Async | Django Channels 4.1, Daphne 4.1 | WebSockets for real-time alerts |
| Database | PostgreSQL 16 / SQLite | Data persistence |
| Cache/MQ | Redis 7 | Task queue, channel layer |
| Tasks | Celery 5.4, django-celery-beat | Scheduled background jobs |
| AI/ML | scikit-learn 1.5, pandas 2.2, SHAP | Malnutrition risk prediction |
| PDF | WeasyPrint 62.3 | Referral slips, reports |
| SMS | Africa's Talking 1.2 | Parent notifications |
| Dashboard | React 18, Vite 5, Tailwind 3 | Management UI |
| Charts | Recharts 2.12, Leaflet 1.9 | Data visualization, maps |
| State | Zustand 4.5, React Query 5.51 | Client state management |
| Mobile | Flutter 3.x, Dart | Android caregiver app |
| Local DB | sqflite + SQLCipher | Encrypted offline storage |
| BLE | flutter_blue_plus | Smart scale communication |

### 5.3 API Endpoints

| Module | Base Path | Description |
|--------|----------|-------------|
| Auth | `/api/v1/auth/` | Login, logout, token refresh |
| Users | `/api/v1/users/` | User CRUD, role management |
| Children | `/api/v1/children/` | Child registration and profiles |
| Measurements | `/api/v1/measurements/` | Growth data recording |
| Alerts | `/api/v1/alerts/` | Alert management |
| Attendance | `/api/v1/attendance/` | Daily attendance |
| Nutrition | `/api/v1/nutrition/` | Programme management |
| Referrals | `/api/v1/referrals/` | Referral tracking |
| Reports | `/api/v1/reports/` | Report generation |
| Sync | `/api/v1/sync/` | Offline data synchronization |
| Notifications | `/api/v1/notifications/` | Push notification management |

---

## 6. External Interface Requirements

### 6.1 User Interfaces

- **Mobile:** Material Design, Kinyarwanda/English, offline indicators, swipe gestures
- **Web:** Responsive dashboard, data tables with search/filter, interactive charts, dark mode

### 6.2 Hardware Interfaces

- **Smart Scale:** BLE communication, weight ±100g precision, ±200g accuracy
- **Height Board:** BLE, ±0.5 cm precision
- **Operating conditions:** 10–45°C, 20–90% humidity, 220V AC Rwanda standard
- **BLE range:** 10m open, 5m with obstacles

### 6.3 Software Interfaces

- **WHO Growth Standards:** LMS tables (2006 for 0–5 years, 2007 for 5–19 years)
- **Africa's Talking API:** SMS gateway for parent notifications
- **Firebase Cloud Messaging:** Push notifications
- **DHIS2:** Future export compatibility

---

## 7. AI/ML Requirements

| ID | Requirement |
|----|------------|
| AI-FR-011 | Model shall use RandomForest or GradientBoosting classifier |
| AI-FR-012 | Risk score 0–100% mapped to Low (0–30), Medium (31–60), High (61–100) |
| AI-FR-013 | Training features: age, sex, WAZ/HAZ/WHZ, MUAC, deltas, attendance, season |
| AI-FR-014 | Minimum 85% sensitivity for SAM detection |
| AI-FR-015 | Model versioning maintained with performance metrics |

---

## 8. Embedded System Requirements

| ID | Requirement |
|----|------------|
| ES-FR-001 | System shall receive weight data from BLE-enabled smart scale |
| ES-NFR-001 | Weight: ±100g precision, ±200g accuracy; Height: ±0.5 cm |
| ES-NFR-002 | 4-hour battery backup, 220V AC power |
| ES-NFR-003 | Operating: 10–45°C, 20–90% humidity |
| ES-NFR-004 | BLE range: 10m open, 5m with obstacles |
| ES-NFR-005 | Full device setup in ≤ 15 minutes |

---

## 9. Legal & Compliance

- **Rwanda Law No. 058/2021** — Protection of Personal Data and Privacy
- **Convention on the Rights of the Child (CRC)** — child data protection
- **UNICEF/WHO data governance guidelines**
- **Parental consent** displayed in Kinyarwanda at child registration
- **Data rights:** right to access, right to correction, no sharing without explicit written consent
- **Remote wipe** capability for lost/stolen devices
- **Non-diagnostic disclaimer** — system supports caregivers, does not replace medical diagnosis

---

## 10. Constraints & Assumptions

### 10.1 Constraints
- WHO LMS algorithms must not be modified
- CMAM recommendations follow Rwanda national protocol only
- Embedded hardware ≤ $150 USD per unit
- Server costs ≤ $500 USD/month at national scale

### 10.2 Assumptions
- Minimum 2-day training per centre
- At least one Android device per pilot centre
- Internet connectivity minimum once per week (2G/3G/4G)
- Kinyarwanda single translation appropriate for all regions
- WHO LMS data licensed and freely available for health programmes

---

## 11. Appendices

### Appendix A: Use Cases

| ID | Use Case | Actor | Goal |
|----|---------|-------|------|
| UC-01 | Daily Attendance | Caregiver | Record which children are present |
| UC-02 | Monthly Growth Monitoring | Caregiver | Record weight and height measurements |
| UC-03 | Respond to SAM Alert | Caregiver | Initiate referral for SAM alert |
| UC-04 | Generate Monthly Report | Centre Manager | Submit monthly ECD report |
| UC-05 | District Health Review | District Officer | Identify highest malnutrition centres |
| UC-06 | Register New Child | Caregiver | Register newly enrolled child |
| UC-07 | Embedded Measurement | Caregiver + device | Record via smart scale |
| UC-08 | Follow Up on Referral | Caregiver | Record health centre referral outcome |

### Appendix B: Policy Traceability

| Requirement | Policy Source |
|------------|--------------|
| FR-021 Z-score calculation | Rwanda ECD Standards 2019; WHO Growth Standards 2006 |
| FR-032/033 Trend detection | Rwanda ECD Policy 2011; WHO Action Plan on Wasting |
| FR-054/055 Digital referral | Rwanda ECD Policy 2011; CMAM protocol |
| FR-069 Monthly reports | Rwanda ECD Standards 2019 (MIS requirement) |
| FR-082 Offline functionality | Rural operating environment constraint |
| NFR-013 Kinyarwanda | Rwanda national language policy |
| NFR-021/§9 Data privacy | Rwanda Law No. 058/2021; CRC; UNICEF guidelines |

### Appendix C: SDG Alignment

- **SDG 2** — Zero Hunger: malnutrition detection and intervention
- **SDG 3** — Good Health and Well-being: child health monitoring
- **SDG 4** — Quality Education: ECD centre management
- **SDG 17** — Partnerships: multi-stakeholder data sharing

---

*Document prepared in accordance with IEEE Std 830-1998. Irerero v1.0.0 — May 2026.*
