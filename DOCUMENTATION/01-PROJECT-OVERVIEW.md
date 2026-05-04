# 🏥 IRERERO ECD PLATFORM — PROJECT OVERVIEW

**Project Name:** Irerero (meaning "to measure" in Kinyarwanda)  
**Organization:** Ministry of Health + Development Partners (UNICEF, WFP, WHO)  
**Country:** Rwanda  
**Status:** 32% Complete (Not ready for deployment)  
**Last Updated:** May 4, 2026

---

## 📋 Executive Summary

**Irerero** is a comprehensive **early childhood development (ECD) monitoring and intervention platform** designed for Rwanda's health and nutrition sector. The system tracks growth, development, and health outcomes for children ages 0-8 years across all ECD centers, enabling **real-time malnutrition detection, early intervention, and government oversight**.

### Key Value Proposition
- **Real-time monitoring** of 50,000+ children across ECD centers
- **AI-powered alerts** for malnutrition, growth faltering, and delayed development
- **Offline-first mobile app** for areas with poor connectivity
- **Integrated reporting** from caregiver → center manager → district → national government
- **Evidence-based decision-making** with analytics and dashboards

---

## 🎯 Project Objectives

### Primary Goals
1. **Early Detection:** Identify malnourished children within days (not months)
2. **Rapid Intervention:** Enable immediate referral to nutrition programs
3. **Data Integration:** Consolidate health data from 2,000+ ECD centers
4. **Government Oversight:** Provide district/national officers with real-time insights
5. **Accountability:** Maintain complete audit trails for compliance

### Secondary Goals
- Build Rwanda's health information system capacity
- Reduce child malnutrition rates through evidence-based programs
- Support government policy decisions with data
- Enable international donor monitoring (UNICEF, WFP, WHO)

---

## 👥 Target Users (8 Roles)

### Level 1: Clinical Delivery (Front-Line Staff)

#### 👶 **USER 1: ECD CAREGIVER** (Primary user)
- **Who:** Nursery/playgroup staff, mothers who work part-time
- **Location:** ECD center (classroom)
- **Daily Tasks:**
  - Record child attendance (tap: present/absent)
  - Measure children: weight, height, MUAC, temperature, head circumference
  - Receive AI alerts on measurements
  - Record nutrition symptoms (feeding, appetite, diarrhea)
  - Document immunizations given
  - Refer sick children
- **Data Access:** Only their own ECD center's children
- **App:** Mobile-first (offline-capable)
- **Completeness:** ✅ 72% (mostly working)

#### 🏥 **USER 2: COMMUNITY HEALTH WORKER (CHW)**
- **Who:** Nurse/health technician assigned to 3-5 ECD centers
- **Daily Tasks:**
  - Supervise caregivers' measurement techniques
  - Review flagged measurements (biologically implausible values)
  - Conduct health talks at centers
  - Follow-up on referrals
  - Record immunizations completed
  - Conduct developmental screening
- **Data Access:** Their assigned sector's centers
- **Dashboard:** Simple health worker dashboard
- **Completeness:** ✅ 90% (mostly working)

### Level 2: Center Management

#### 👨‍💼 **USER 3: CENTRE MANAGER** (School principal/director)
- **Who:** ECD center principal/director
- **Location:** Center office
- **Monthly Tasks:**
  - Approve monthly reports before submission
  - Monitor center performance (attendance, measurements, referrals)
  - Manage staff (assign caregivers)
  - Budget tracking
  - Quality assurance (verify data entry)
- **Data Access:** Only their center
- **Reports Needed:**
  - Monthly report: attendance rates, SAM/MAM cases, referrals sent
  - Staff performance
  - Budget utilization
- **Critical Gap:** ❌ Report approval workflow not implemented (50% complete)
- **Completeness:** ⚠️ 50% (partial)

### Level 3: District Supervision

#### 👔 **USER 4: SECTOR ECD COORDINATOR**
- **Who:** District health officer overseeing 10-15 ECD centers in sector
- **Location:** District office
- **Weekly Tasks:**
  - Monitor 4-5 centers' performance
  - Compare centers (who's doing well, who's struggling)
  - Receive alerts on SAM cases (refer to hospitals)
  - Support problem centers
  - Submit sector report
- **Data Access:** Centers in their sector
- **Dashboard Needed:** Sector comparison dashboard
- **Critical Gap:** ❌ Sector dashboard not implemented (0% complete)
- **Completeness:** ❌ 0% (missing)

#### 📊 **USER 5: DISTRICT OFFICER**
- **Who:** District nutrition/health manager
- **Location:** District office
- **Monthly Tasks:**
  - Monitor all 30-50 centers in district
  - Identify hotspots (areas with worst outcomes)
  - Allocate resources to struggling centers
  - Generate district report for MOH
  - Present data to district council
- **Data Access:** All centers in district
- **Dashboard Needed:** Multi-level analytics, hotspot mapping, trends
- **Critical Gap:** ❌ District dashboard not implemented (0% complete)
- **Completeness:** ❌ 0% (missing)

### Level 4: National Government

#### 📈 **USER 6: NATIONAL OFFICER**
- **Who:** Ministry of Health headquarters
- **Location:** Kigali office
- **Quarterly Tasks:**
  - National health policy decisions
  - Budget allocation to districts
  - Report to Parliament/Cabinet
  - Performance monitoring
  - International donor reporting
- **Data Access:** All centers across Rwanda
- **Dashboard Needed:** Nationwide aggregate data, district comparisons, trends
- **Critical Gap:** ❌ National dashboard not implemented (0% complete)
- **Completeness:** ❌ 0% (missing)

### Level 5: System Administration & Security

#### 🔐 **USER 7: SYSTEM ADMINISTRATOR** (IT staff)
- **Who:** Ministry IT team / Deployment team
- **Responsibilities:**
  - User account management
  - Password resets
  - System updates
  - Security monitoring
  - Remote device wipe (if phone lost/stolen)
  - Backup/restore
- **Tools Needed:** Admin dashboard
- **Critical Gap:** ❌ Remote device wipe not implemented
- **Completeness:** ⚠️ 43% (partial)

#### 🤝 **USER 8: DEVELOPMENT PARTNER** (Data access for donors)
- **Who:** UNICEF, WFP, WHO country offices
- **Access:** Read-only, anonymised data
- **Use Cases:**
  - Monitor government performance
  - Fund allocation decisions
  - Annual reporting
- **Critical Gap:** ❌ Partner data anonymisation layer not implemented
- **Completeness:** ❌ 0% (missing)

---

## 🌐 System Architecture Overview

### Frontend Clients

#### Mobile App (Flutter)
- **Platform:** Android + iOS
- **Users:** Caregivers, CHWs
- **Offline Mode:** SQLite database with auto-sync
- **Features:** Measurement entry, attendance, alerts, offline access
- **Status:** ✅ Developed and tested

#### Web Dashboard (React + Vite)
- **Platform:** Desktop/Laptop browsers
- **Users:** Centre managers, sector coordinators, district officers, national officers, admins
- **Features:** Analytics, reporting, user management, device monitoring
- **Status:** ⚠️ Partially developed (caregiver dashboard only)

### Backend (Django)

#### REST API
- **Framework:** Django REST Framework
- **Authentication:** JWT tokens (2-hour access, 30-day refresh)
- **Endpoints:** 50+ endpoints across 8 modules
- **Status:** ✅ Core endpoints implemented

#### Modules
- **Auth:** User login, role management, permissions
- **Children:** Child registration, profiles, soft delete
- **Measurements:** Height, weight, MUAC, temperature, head circumference
- **Alerts:** AI-generated malnutrition alerts
- **Attendance:** Daily attendance tracking
- **Referrals:** Health referral management & PDF generation
- **Reports:** Monthly reporting
- **Nutrition:** Nutrition program enrollment & tracking

#### AI/ML Pipeline
- **Technology:** scikit-learn RandomForest
- **Purpose:** Z-score calculation, malnutrition classification, alert generation
- **Data:** WHO 2006 Growth Standards (LMS curves)
- **Status:** ✅ Implemented

#### Real-Time Communication
- **Technology:** Django Channels + WebSocket
- **Purpose:** Real-time alerts, notifications, sync notifications
- **Status:** ✅ Implemented

#### Background Tasks
- **Technology:** Celery + Redis
- **Tasks:** Report generation, bulk data sync, notification sending
- **Status:** ✅ Implemented

### Data Storage

#### Primary Database
- **Technology:** PostgreSQL 18
- **Deployment:** Render.com free tier (1GB)
- **Status:** ✅ Created & configured

#### Cache & Message Queue
- **Technology:** Redis
- **Purpose:** Session caching, Celery message queue, WebSocket pub/sub
- **Status:** ✅ Configured on Render

#### File Storage
- **Child photos:** Object storage (S3-compatible)
- **Referral PDFs:** Generated on-demand, cached
- **Status:** ⚠️ Partially configured

---

## 📊 Key Features

### Measurement & Classification

#### What Gets Measured
- **Weight (kg)** — Age 0-8
- **Height (cm)** — Age 0-8  
- **Mid-Upper Arm Circumference (MUAC, cm)** — Age 6-60 months
- **Temperature (°C)** — Fever detection
- **Head Circumference (cm)** — Age 0-24 months

#### Z-Score Classification
```
Z-Score Range          Classification        Alert Level
─────────────────────────────────────────────────────
> 3                    Overweight            Information
-1 to 3                Normal                Green
-2 to -1               At Risk               Yellow
-3 to -2               Moderate Acute        Yellow (MAM)
< -3                   Severe Acute          Red (SAM)

< -2 (Height-for-age)  Stunting             Depends on severity
< -2 (Weight-for-age)  Underweight          Yellow
```

#### AI Alerts Generated
1. **Severe Acute Malnutrition (SAM)** — Urgent referral needed
2. **Moderate Acute Malnutrition (MAM)** — Monitoring required
3. **Stunting** — Long-term growth failure
4. **Growth Faltering** — Measurement below previous trend
5. **Fever Alert** — Temperature ≥38°C
6. **Biologically Implausible Value** — Flag for data review
7. **Measurement Overdue** — >30 days since last measurement
8. **Immunization Pending** — Vaccination due
9. **Orphan Status** — Vulnerable child flag
10. **Disability** — Special needs flag
11. **Extended Absence** — >5 days without center visit
12. **Referral Pending** — Follow-up needed
13. **Developmental Delay** — Milestone not achieved

### Offline Capabilities

#### Mobile App (Flutter)
- ✅ Data entry works without internet
- ✅ Measurements stored locally (SQLite)
- ✅ Sync when connectivity restored
- ✅ Conflict resolution (last-write-wins + manual review)
- ✅ Offline indicator shows sync status
- ✅ Push notifications via Firebase Cloud Messaging

### Audit & Compliance

#### Audit Trail
- ✅ Every action logged (create, update, delete)
- ✅ Logs include: user, timestamp, action, old values, new values
- ✅ 5-year retention (complies with Rwanda Law)
- ✅ Tamper-proof (encrypted, immutable)

#### Data Privacy
- ✅ Role-based access control (cannot see data outside role)
- ✅ Sensitive fields hidden (orphan status, HIV exposure)
- ✅ Encryption at rest (field-level for sensitive data)
- ✅ Encryption in transit (HTTPS/TLS)

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Web Framework | Django | 5.1 |
| REST API | Django REST Framework | 3.15 |
| Database | PostgreSQL | 18 |
| Authentication | SimpleJWT (JWT tokens) | 2-hour + 30-day refresh |
| Password Hashing | Argon2 + BCrypt | - |
| Cache | Redis | 6+ |
| Message Queue | Redis + Celery | 5.4 |
| WebSocket | Django Channels | 4 |
| Real-time DB Broadcast | DaphneAsyncServer | - |
| ML/AI | scikit-learn | 1.3+ |
| Data Processing | pandas, numpy | Latest |
| PDF Generation | WeasyPrint | - |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Dashboard Framework | React | 18 |
| Module Bundler | Vite | - |
| Styling | Tailwind CSS | 3 |
| Charts | Recharts | Latest |
| Mapping | Leaflet.js | - |
| HTTP Client | Axios | - |

### Mobile
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Flutter | 3.x |
| Language | Dart | Latest |
| Local DB | SQLite (sqflite) | - |
| Encryption | AES-256 | - |
| BLE | Bluetooth Low Energy | - |
| Sync | Custom conflict resolution | - |

### Infrastructure
| Component | Technology | Details |
|-----------|-----------|---------|
| Web Server | Gunicorn + Nginx | Production-ready |
| Container | Docker | Django app container |
| Orchestration | Docker Compose | For development |
| Database Hosting | Render PostgreSQL | Free tier (1GB, 256MB RAM) |
| Web Hosting | Render Web Service | Or Railway/Fly |
| CDN | Vercel (optional) | For React dashboard |

---

## 📈 Project Progress

### Completion Status by Layer

```
Caregiver Layer (Mobile + Attendance + Measurements)
████████░░░░░░░░░░ 72% ✅ USABLE

Centre Manager Layer (Reporting + Admin)
██████░░░░░░░░░░░░ 50% ⚠️ PARTIAL

Supervisor Layer (Analytics + Monitoring)
░░░░░░░░░░░░░░░░░░  0% ❌ MISSING

National Layer (Government Reporting)
░░░░░░░░░░░░░░░░░░  0% ❌ MISSING

System Admin Layer (User Management)
████░░░░░░░░░░░░░░  43% ⚠️ PARTIAL

Partner Access (Data Sharing)
░░░░░░░░░░░░░░░░░░  0% ❌ MISSING
─────────────────────────────────────
OVERALL             32% ⚠️ PARTIAL
```

### What's Completed ✅

**Core Infrastructure**
- ✅ Database schema (all 9 tables)
- ✅ User authentication (JWT, roles)
- ✅ API endpoints (child, measurement, alert, attendance, referral)
- ✅ AI alert generation (Z-score calculation, thresholds)
- ✅ Audit logging (tamper-proof, 5-year retention)
- ✅ Mobile app (offline-first, sync)
- ✅ PDF referral slip generation
- ✅ Docker containerization

**User Capabilities**
- ✅ Caregiver: Measurement entry, attendance, referrals
- ✅ CHW: Center supervision, follow-up
- ✅ Centre Manager: Basic dashboard, staff management

### What's Missing ❌

**Critical Gaps (Must fix for ANY deployment)**
1. ❌ Report approval workflow (Centre Manager cannot approve/submit reports)
2. ❌ Partner anonymisation layer (UNICEF/WHO data privacy)
3. ❌ Remote device wipe (Security: no way to wipe lost phones)
4. ❌ Sync conflict resolution UI (Data integrity: edge cases unresolved)

**Major Gaps (Must fix for government deployment)**
5. ❌ Sector dashboards (Sector coordinators have no interface)
6. ❌ District dashboards (District officers have no interface)
7. ❌ National dashboards (Ministry has no interface)
8. ❌ Nutrition program completion (Module exists but incomplete)
9. ❌ Immunisation tracking (Module exists but incomplete)

**Nice-to-have Gaps**
10. ⚠️ Server health monitoring (No performance dashboards)
11. ⚠️ Advanced analytics (Limited to basic counts, no trends)

---

## 🚀 Deployment Status

### Current Environment
- **Render PostgreSQL:** ✅ Created (dpg-d7rq3l7lk1mc73dbf0jg-a)
- **Render Web Service:** ⚠️ Started (not completed)
- **Environment Variables:** ✅ Configured
- **Docker Image:** ✅ Ready to push

### Deployment Readiness
| Layer | Ready? | When? |
|-------|--------|-------|
| Caregiver (Mobile + Measurements) | ⚠️ Partial | 2-3 weeks (after Tier 1) |
| Centre Manager (Reports) | ❌ No | 4-5 weeks |
| Sector/District | ❌ No | 6-8 weeks |
| National/Partners | ❌ No | 8-10 weeks |

---

## 💰 Investment & Timeline

### Effort Estimate (Developer Weeks)

```
Tier 1 Critical Fixes (Must do)
├─ Report approval workflow .... 2 weeks
├─ Partner anonymisation ....... 2 weeks
├─ Device security (wipe) ....... 1 week
└─ Conflict resolution UI ....... 1 week
   Subtotal: 6 weeks (2 developers = 3 weeks)

Tier 2 Major Features (Should do)
├─ Sector dashboard ............ 2 weeks
├─ District dashboard .......... 2 weeks
├─ National dashboard .......... 2 weeks
├─ Nutrition completion ........ 1 week
└─ Immunisation tracking ....... 1 week
   Subtotal: 8 weeks (3 developers = 3 weeks)

Tier 3 Polish (Nice to have)
├─ Analytics improvements ...... 1 week
├─ Performance optimization .... 1 week
├─ Documentation updates ....... 1 week
└─ Security audit .............. 1 week
   Subtotal: 4 weeks (2 developers = 2 weeks)
─────────────────────────────
TOTAL: 18 weeks (1 developer) or 6 weeks (3 developers)
```

### Cost Estimate
- **Development:** 6-8 weeks × 3 developers × $100/day = $12,000-16,000
- **Testing/QA:** 2 weeks × 2 QA = $2,000-3,000
- **Infrastructure:** Render PostgreSQL $30/mo + Web Service $100/mo = $1,560/year
- **External Services:** Firebase (free), S3 storage ($50-100/mo) = $600-1,200/year

---

## 📋 Next Steps (Immediate Actions)

### This Week
- [ ] Review this documentation
- [ ] Review AUDIT-REPORT-USER-ROLES.md for detailed gaps
- [ ] Schedule kickoff meeting for Tier 1 fixes

### Next Week
1. Assign Tier 1 gap fixes to developers
2. Set up Render deployment pipeline
3. Create development schedule
4. Assign QA test plans

### Within 2 Weeks
- [ ] Complete Tier 1 critical fixes
- [ ] Deploy pilot version for caregiver testing
- [ ] Begin Tier 2 major features

---

## 📞 Contact & Support

### Documentation
- 📖 Full documentation: See DOCUMENTATION/ folder
- 🔍 Detailed audit: AUDIT-REPORT-USER-ROLES.md
- 🏗️ Architecture: 02-SYSTEM-ARCHITECTURE.md
- 💾 Database: 03-DATABASE-SCHEMA.md

### Project Leads
- **Product:** [Name] — Project Vision & User Requirements
- **Tech Lead:** [Name] — Architecture & Development  
- **QA Lead:** [Name] — Testing & Deployment Readiness

---

## 📊 Success Metrics

### Launch Targets (Year 1)
- 50-100 ECD centers on platform
- 10,000 children registered
- 20,000 measurements recorded
- 500 SAM cases identified early
- 95% data completeness
- <1% data entry errors

### Long-term Targets (Year 2-3)
- 2,000 ECD centers
- 100,000 children
- 500,000 measurements
- Real-time government oversight
- 25% reduction in malnutrition rates

---

**Document Version:** 1.0  
**Last Updated:** May 4, 2026  
**Next Review:** Monthly or when major milestones complete  
**Status:** ✅ Ready for stakeholder review
