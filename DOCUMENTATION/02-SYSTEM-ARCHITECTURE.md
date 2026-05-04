# 🏗️ IRERERO SYSTEM ARCHITECTURE & DESIGN

**Document Version:** 1.0  
**Date:** May 4, 2026  
**Prepared For:** Architects, DevOps Engineers, Technical Leads

---

## System Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Mobile App     │    │ Web Dashboard    │                   │
│  │  (Flutter)       │    │ (React + Vite)   │                   │
│  │ ✅ 90% Complete  │    │ ⚠️ 50% Complete  │                   │
│  │ • iOS & Android  │    │ • Dashboards     │                   │
│  │ • Offline Mode   │    │ • Reports        │                   │
│  │ • Local Sync     │    │ • Analytics      │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                             │
└───────────┼───────────────────────┼─────────────────────────────┘
            │                       │
            └───────────┬───────────┘
                        │
            HTTPS/TLS (JWT Auth)
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                      API GATEWAY LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Django REST Framework API Layer                  │   │
│  │                                                           │   │
│  │  • JWT Authentication & Authorization                   │   │
│  │  • Rate Limiting & DDoS Protection                      │   │
│  │  • CORS Policy Enforcement                              │   │
│  │  • Request/Response Logging                             │   │
│  │  • Exception Handling & Problem Detail Responses        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Endpoints:                                                      │
│  • /api/v1/auth/ (login, logout, refresh token)                 │
│  • /api/v1/children/ (CRUD child profiles)                      │
│  • /api/v1/measurements/ (record & retrieve measurements)       │
│  • /api/v1/alerts/ (list & action alerts)                       │
│  • /api/v1/attendance/ (bulk record attendance)                 │
│  • /api/v1/referrals/ (create & track referrals)               │
│  • /api/v1/reports/ (monthly reports)                           │
│  • /api/v1/dashboards/ (analytics endpoints)                    │
│  • /api/v1/users/ (user management, admin only)                 │
│                                                                   │
└───────────┬──────────────────────────────────────────────────────┘
            │
    ┌───────┼───────┬──────────────┬──────────────┐
    │       │       │              │              │
REST│ WebSocket │ Background │ Celery Tasks │
    │       │       │              │              │
┌───▼───┬───▼───┬───▼──┐  ┌────────▼────────┐   │
│       │       │      │  │                 │   │
▼       ▼       ▼      ▼  ▼                 ▼   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Django Modules:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ auth_module         → User roles, permissions, scope     │   │
│  │ children            → Child registration & profiles      │   │
│  │ measurements        → Health metrics & Z-score calc      │   │
│  │ alerts              → Malnutrition detection & messaging │   │
│  │ attendance          → Daily attendance tracking          │   │
│  │ referrals           → Health referral management         │   │
│  │ reports             → Monthly reporting & approval       │   │
│  │ notifications       → Real-time alerts via WebSocket     │   │
│  │ ai                  → ML pipeline & predictions          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Cross-Cutting Services:                                        │
│  • Authentication (JWT tokens, role-based access)              │
│  • Data Validation (Serializers with custom logic)             │
│  • Permissions (Scope-based filtering at queryset level)       │
│  • Audit Logging (Every create/update/delete action)          │
│  • Error Handling (Consistent problem detail responses)        │
│  • Caching (Redis for sessions, frequently accessed data)     │
│  • Encryption (Field-level for sensitive data at rest)        │
│                                                                   │
└───────────┬───────────────────────────────────────────────────────┘
            │
    ┌───────┼────────┬────────────┬──────────────┐
    │       │        │            │              │
    ▼       ▼        ▼            ▼              ▼
    ┌──────────────────────────────────────────────────────────────┐
    │                       DATA LAYER                              │
    ├──────────────────────────────────────────────────────────────┤
    │                                                                │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │  PostgreSQL 18 (Primary Database)                   │    │
    │  │  • Users, Children, Measurements, Alerts            │    │
    │  │  • Referrals, Attendance, Reports, Audit Logs       │    │
    │  │  • 9 core tables with relationships & constraints   │    │
    │  │  • Indexes optimized for frequent queries           │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                                │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │  Redis Cache & Message Broker                       │    │
    │  │  • Session storage (JWT token blacklist)            │    │
    │  │  • Celery message queue (background tasks)          │    │
    │  │  • WebSocket pub/sub (real-time notifications)      │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                                │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │  Object Storage (File Storage)                      │    │
    │  │  • Child photos (encrypted)                         │    │
    │  │  • Generated PDFs (referral slips)                  │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                                │
    │  ┌─────────────────────────────────────────────────────┐    │
    │  │  Mobile Local Database (SQLite)                     │    │
    │  │  • Offline measurement data                         │    │
    │  │  • Cached child profiles                            │    │
    │  │  • Pending sync queue                               │    │
    │  └─────────────────────────────────────────────────────┘    │
    │                                                                │
    └──────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Architecture

### 1. Frontend Applications

#### Mobile App (Flutter)
```
┌────────────────────────────────────┐
│     Flutter Application (Dart)     │
├────────────────────────────────────┤
│                                    │
│  Screens (User Interfaces):        │
│  • Login / PIN entry               │
│  • Child list view                 │
│  • Measurement entry form          │
│  • Alert notifications             │
│  • Attendance quick-tap            │
│  • Sync status indicator           │
│  • Settings & offline mode         │
│                                    │
│  State Management:                 │
│  • Provider pattern for state      │
│  • Separate models for UI/data     │
│  • Reactive builders               │
│                                    │
│  Local Storage:                    │
│  • SQLite (sqflite plugin)         │
│  • Encrypted field-level (AES-256)│
│  • Sync queues & versioning        │
│                                    │
│  Networking:                       │
│  • HTTP client (Dio/http)          │
│  • JWT token refresh logic         │
│  • Retry with exponential backoff  │
│  • Offline queue for pending ops   │
│                                    │
│  Push Notifications:               │
│  • Firebase Cloud Messaging        │
│  • Alert delivery                  │
│  • Sync notifications              │
│                                    │
└────────────────────────────────────┘
         │
         │ HTTPS + JWT
         │
         ▼
    Django Backend
```

**Offline Workflow:**
1. User enters measurement offline
2. Data stored in SQLite
3. App shows "Pending Sync" indicator
4. When online: Auto-sync to server
5. Conflict resolution: Last-write-wins + manual review

#### Web Dashboard (React)
```
┌────────────────────────────────────┐
│    React Application (Vite)        │
├────────────────────────────────────┤
│                                    │
│  Main Views:                       │
│  • Dashboard (overview metrics)    │
│  • Child list (searchable)         │
│  • Child detail (7-tab layout)     │
│  • Measurements (history + charts) │
│  • Alerts (filterable, sortable)   │
│  • Reports (monthly submission)    │
│  • User management (admin)         │
│                                    │
│  Component Structure:              │
│  • Smart components (connect data) │
│  • Dumb components (presentation)  │
│  • Custom hooks for logic          │
│  • Shared utilities & helpers      │
│                                    │
│  Styling:                          │
│  • Tailwind CSS (utility-first)    │
│  • Custom theme config             │
│  • Responsive design               │
│                                    │
│  Charts & Visualization:           │
│  • Recharts (growth trajectories)  │
│  • Leaflet (center mapping)        │
│  • Custom color themes             │
│                                    │
│  State Management:                 │
│  • Context API + Hooks             │
│  • Redux (if needed in future)     │
│  • Local storage for preferences   │
│                                    │
│  API Integration:                  │
│  • Axios HTTP client               │
│  • JWT token in headers            │
│  • Automatic error handling        │
│  • Loading/error UI states         │
│                                    │
└────────────────────────────────────┘
         │
         │ HTTPS + JWT
         │
         ▼
    Django Backend
```

---

### 2. Authentication & Authorization Flow

```
USER LOGIN
    │
    ▼
┌─────────────────────────────────────┐
│ 1. User submits credentials         │
│    • Mobile: Phone + PIN or Email   │
│    • Web: Email + Password          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Backend validates credentials    │
│    • Hash comparison (Argon2/BCrypt)│
│    • Check failed_login_count       │
│    • Lock account after 5 failures  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Generate JWT tokens              │
│    • Access token (2 hours)         │
│    • Refresh token (30 days)        │
│    • Encode user_id, role, scope    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Return tokens to client          │
│    • Store in secure storage        │
│    • Mobile: Keychain/Keystore      │
│    • Web: HttpOnly cookie + RAM     │
└────────┬────────────────────────────┘
         │
         ▼ (Access Token expires in 2 hours)
┌─────────────────────────────────────┐
│ 5. Refresh token mechanism          │
│    • Submit refresh token           │
│    • Backend validates & generates  │
│    • New access token issued        │
└─────────────────────────────────────┘

SUBSEQUENT API CALLS
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Client includes JWT in header    │
│    Authorization: Bearer <token>    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Backend validates JWT            │
│    • Signature verification         │
│    • Token expiration check         │
│    • User existence check           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Extract user context             │
│    • user_id, role, scope fields    │
│    • Populate request.user object   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Apply permission checks          │
│    • Endpoint-level: View requires  │
│    • Queryset-level: ScopedMixin    │
│    • Field-level: Serializer        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Return data (with filtering)     │
│    • Only accessible to user role   │
│    • Only from their scope          │
│    • Sensitive fields excluded      │
└─────────────────────────────────────┘
```

---

### 3. Data Isolation by Role (Scope-Based Access)

#### Scope Fields in IreroUser Model
```
User Role                 centre_id    sector_id    district_id
─────────────────────────────────────────────────────────────────
1. Caregiver             ✅ Required  ✗ Empty      ✗ Empty
2. CHW                   ✗ Empty      ✅ Required  ✗ Empty
3. Centre Manager        ✅ Required  ✗ Empty      ✗ Empty
4. Sector Coordinator    ✗ Empty      ✅ Required  ✗ Empty
5. District Officer      ✗ Empty      ✗ Empty      ✅ Required
6. National Officer      ✗ Empty      ✗ Empty      ✗ Empty
7. System Admin          ✗ Empty      ✗ Empty      ✗ Empty
8. Partner               ✗ Empty      ✗ Empty      ✗ Empty
```

#### Data Access Matrix
```
Entity Type      Caregiver  CHW  Ctr.Mgr  Sector  District  National  SysAdmin  Partner
───────────────────────────────────────────────────────────────────────────────────────
Children         Centre     Sector Sector  Sector  District  All       All       Anon
Measurements     Centre     Sector Sector  Sector  District  All       All       Anon
Alerts           Centre     Sector Sector  Sector  District  All       All       Anon
Attendance       Centre     Sector Sector  Sector  District  All       All       Anon
Referrals        Centre     Sector Sector  Sector  District  All       All       Anon
Centres          Own        Sector All     All     All       All       All       Anon
Reports          Centre     Sector All     All     All       All       All       Anon
Users            Self       Limited Limited Limited Limited  Limited   All       None
AuditLog         Limited    Yes    Yes     Yes     Yes       Yes       All       None
```

#### ScopedQuerysetMixin Implementation
```python
class ScopedQuerysetMixin:
    """Enforces data isolation at ORM level"""
    
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        if user.role in [Role.NATIONAL, Role.SYS_ADMIN]:
            return qs  # Unrestricted access
        
        if user.role == Role.PARTNER:
            return qs.none()  # Partner gets anonymised data through separate endpoint
        
        if user.role == Role.DISTRICT:
            return qs.filter(**{f"{self.scope_field}__district_id": user.district_id})
        
        if user.role == Role.SECTOR:
            return qs.filter(**{f"{self.scope_field}__sector_id": user.sector_id})
        
        # Caregiver, CHW, Centre Manager
        if user.role in [Role.CAREGIVER, Role.CHW, Role.CENTRE_MANAGER]:
            return qs.filter(**{f"{self.scope_field}": user.centre_id})
        
        return qs.none()  # Default: deny access

# Usage in ViewSet
class ChildViewSet(ScopedQuerysetMixin, ModelViewSet):
    scope_field = "centre"  # Which field to filter on
    queryset = Child.objects.all()
    serializer_class = ChildSerializer
```

---

### 4. AI/ML Alert Generation Pipeline

```
New Measurement Recorded
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Step 1: Validate measurement (range checks)             │
│ • Weight: 0-50 kg                                       │
│ • Height: 0-150 cm                                      │
│ • MUAC: 0-30 cm                                         │
│ • Detect biologically implausible values (Z < -5 > 5)  │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 2: Calculate WHO Z-scores                          │
│ • Load child's age, sex, measurement position           │
│ • Lookup LMS curves from WHO 2006 Growth Standards      │
│ • Calculate: Z = (M^L - 1) / (L × S)                    │
│   Where: L=power, M=median, S=coefficient variation    │
│ • Generate Z-scores: WAZ, HAZ, WHZ, BAZ, HCZ            │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3: Classify nutritional status                     │
│ • SAM: WHZ < -3.0                                       │
│ • MAM: WHZ < -2.0                                       │
│ • Stunting: HAZ < -2.0 or < -3.0                       │
│ • Underweight: WAZ < -2.0                               │
│ • Normal: All Z-scores > -1.0                           │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 4: Compare to baseline & trends                    │
│ • Get previous 3 measurements                           │
│ • Calculate velocity (change per week)                  │
│ • Detect growth faltering (decline > 0.1 Z/week)       │
│ • Detect recovery (improvement)                         │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 5: Generate alerts                                 │
│ • SAM → Urgent referral alert                          │
│ • MAM → Monitoring alert                                │
│ • Growth faltering → Warning alert                     │
│ • Fever → Emergency alert (temp ≥ 38°C)               │
│ • Overdue measurement → Info alert (> 30 days)        │
│ • Store Alert with explanation_en + explanation_rw     │
│ • Severity: urgent | warning | information             │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Step 6: Notify users via WebSocket                      │
│ • Send real-time notification to caregivers            │
│ • Send to CHWs in sector                               │
│ • Send to Centre Manager                               │
│ • Push notification via Firebase                       │
└─────────────────────────────────────────────────────────┘
```

---

### 5. Real-Time Communication (WebSocket)

```
┌──────────────────┐
│  Mobile/Web App  │
│  (Client)        │
└────────┬─────────┘
         │
    Upgrade to WebSocket
    (Connection: Upgrade)
         │
         ▼
┌────────────────────────────────────────────┐
│  Django Channels (Consumer)                │
│  daphne://0.0.0.0:8000                     │
├────────────────────────────────────────────┤
│                                            │
│ async def connect():                       │
│    await self.accept()                     │
│    await self.channel_layer.group_add(    │
│        f"centre_{centre_id}",              │
│        self.channel_name                   │
│    )                                       │
│                                            │
│ async def receive():                       │
│    data = json.loads(text_data)            │
│    # Process subscription/actions          │
│                                            │
│ async def notify_alert():                  │
│    await self.send(json.dumps({            │
│        "type": "alert",                    │
│        "alert": alert_data                 │
│    }))                                     │
│                                            │
└────────┬───────────────────────────────────┘
         │
    Redis Channel Layer
    (Pub/Sub)
         │
         ▼
┌────────────────────────────────────────────┐
│  Redis                                     │
│  • Store subscriptions                     │
│  • Publish alert to group                  │
│  • Route to connected clients              │
└─────────────────────────────────────────────┘
```

---

### 6. Background Task Processing (Celery)

```
Trigger Event
    │
    ▼
┌─────────────────────────────────┐
│ Django Application              │
│ Identifies async work needed    │
│ task.delay() → Queue            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Redis (Message Broker)          │
│ Queue: {task_name, args, eta}   │
└────────┬────────────────────────┘
         │
    Celery Workers
    (separate processes)
         │
         ├─ Worker 1: Measurement tasks
         ├─ Worker 2: Report generation
         ├─ Worker 3: Notifications
         └─ Worker 4: Data cleanup
         │
         ▼
┌─────────────────────────────────┐
│ Celery Task Execution           │
│                                 │
│ Tasks:                          │
│ • generate_monthly_report()     │
│ • send_alert_notification()     │
│ • sync_data_to_partners()       │
│ • cleanup_old_audit_logs()      │
│ • generate_referral_pdf()       │
│                                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Task Completion                 │
│ • Update database               │
│ • Send notification             │
│ • Log result                    │
└─────────────────────────────────┘
```

---

### 7. Production Deployment Architecture (Render)

```
┌─────────────────────────────────────────────────────────────┐
│               RENDER.COM PLATFORM                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Managed PostgreSQL Database                          │  │
│  │ • Tier: Free (1GB, 256MB RAM)                        │  │
│  │ • Replicated backup (hourly)                         │  │
│  │ • Connection pooling                                 │  │
│  │ • External access via SSL                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Web Service (Backend)                                │  │
│  │ • Docker image: python:3.11                          │  │
│  │ • Container: Gunicorn + Daphne                       │  │
│  │ • Auto-restart on crash                              │  │
│  │ • Environment variables secured                      │  │
│  │ • Custom domain: irerero-backend.render.com          │  │
│  │ • SSL/TLS certificate (auto-renewed)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Redis Instance (Cache + Celery Broker)               │  │
│  │ • Tier: Free (0.5GB)                                 │  │
│  │ • High availability options                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Static Site (React Dashboard)                        │  │
│  │ • Build: npm run build                               │  │
│  │ • Deploy: Vercel or Render Static                    │  │
│  │ • CDN: Global edge servers                           │  │
│  │ • Custom domain: dashboard.irerero.rw                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ File Storage (Object Storage)                         │  │
│  │ • S3-compatible: AWS S3 or Wasabi                    │  │
│  │ • Child photos (encrypted)                           │  │
│  │ • Generated referral PDFs                            │  │
│  │ • Backup: Glacier archival                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Deployment Process
```
1. Developer commits code to GitHub
   └─ Push to main branch

2. GitHub webhook triggers Render deployment
   └─ Render receives payload

3. Build & Deploy
   ├─ Pull code from GitHub
   ├─ Build Docker image
   ├─ Run database migrations
   ├─ Collect static files
   └─ Start service

4. Health Check
   ├─ Ping API endpoints
   ├─ Check database connectivity
   └─ Verify all services running

5. DNS & Routing
   ├─ Update DNS records
   ├─ Route traffic to new service
   └─ Old service remains for rollback

6. Monitoring
   ├─ Application logs (Render Dashboard)
   ├─ Error tracking (Sentry)
   ├─ Performance monitoring (New Relic)
   └─ Uptime monitoring (StatusPage)
```

---

### 8. Data Flow Diagram (Measurement Example)

```
USER ACTIONS
    │
    ├─ Mobile: Tap "Record Measurement"
    └─ Web: Click "New Measurement"
         │
         ▼
    ┌─────────────────────┐
    │ User enters:        │
    │ • Weight            │
    │ • Height            │
    │ • MUAC              │
    │ • Temperature       │
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ POST /measurements/ │
    │ • Include JWT token │
    │ • JSON body         │
    └────────┬────────────┘
             │
BACKEND PROCESSING
             │
             ▼
    ┌──────────────────────────┐
    │ Django View Handler      │
    │ • Deserialize JSON       │
    │ • Validate schema        │
    │ • Check permissions      │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Permission Check         │
    │ • JWT valid?             │
    │ • User role allowed?      │
    │ • Can access this child?  │
    │ (ScopedQuerysetMixin)     │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Data Validation          │
    │ • Type checks            │
    │ • Range validation       │
    │ • Custom business logic  │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Save to Database         │
    │ INSERT into measurements │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Log Audit Event          │
    │ INSERT into audit_log    │
    │ • action: "measurement.create"
    │ • new_value: {...}       │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Calculate Z-Scores       │
    │ • Load LMS curves        │
    │ • Calculate WHO indices  │
    │ • Determine status       │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Generate Alerts          │
    │ • Check thresholds       │
    │ • Create Alert records   │
    │ • Set severity level     │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Queue Notifications      │
    │ • Celery task added      │
    │ • Redis message queue    │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Send WebSocket Alert     │
    │ • Django Channels        │
    │ • Group broadcast        │
    │ • Real-time update       │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Return 201 Created       │
    │ • Measurement object     │
    │ • Z-scores included      │
    │ • Status classification  │
    │ • Alert list             │
    └─────────────────────────┘
             │
CLIENT RECEIVES
             │
             ▼
    ┌──────────────────────────┐
    │ Mobile App               │
    │ • Display success        │
    │ • Show alert badge       │
    │ • Play sound alert       │
    │ • Update UI              │
    └──────────────────────────┘

BACKGROUND TASKS (Async)
             │
             ▼
    ┌──────────────────────────┐
    │ Celery Worker            │
    │ • Generate referral slip │
    │ • Send push notification │
    │ • Update dashboard stats │
    └──────────────────────────┘
```

---

### 9. Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│               SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Layer 1: Transport Security                            │
│ ├─ HTTPS/TLS 1.3 for all connections                   │
│ ├─ SSL certificates (auto-renewed)                     │
│ ├─ HSTS headers enforced                               │
│ └─ Secure WebSocket (WSS)                              │
│                                                         │
│ Layer 2: Authentication                                │
│ ├─ JWT tokens (2-hour access, 30-day refresh)          │
│ ├─ Token blacklist on logout                           │
│ ├─ Failed login lockout (5 attempts)                   │
│ ├─ Secure password hashing (Argon2 + BCrypt)           │
│ └─ Mobile PIN (6-digit) + biometric option             │
│                                                         │
│ Layer 3: Authorization                                 │
│ ├─ Role-based access control (8 roles)                 │
│ ├─ Scope-based filtering (centre, sector, district)    │
│ ├─ Endpoint-level permission checks                    │
│ ├─ Queryset-level data filtering                       │
│ └─ Field-level serializer restrictions                 │
│                                                         │
│ Layer 4: Data Protection                               │
│ ├─ Encryption at rest (AES-256 for sensitive fields)   │
│ ├─ Encryption in transit (HTTPS/TLS)                   │
│ ├─ PII minimization (only essential data)              │
│ ├─ Soft deletes (data retention policy)                │
│ └─ Audit logging (5-year retention)                    │
│                                                         │
│ Layer 5: Application Security                          │
│ ├─ SQL injection prevention (ORM parameterized queries)│
│ ├─ XSS prevention (HTML escaping, CSP headers)         │
│ ├─ CSRF protection (SameSite cookies)                  │
│ ├─ Rate limiting (throttle per IP/user)               │
│ ├─ Input validation (serializer constraints)           │
│ └─ Error handling (no sensitive info in errors)        │
│                                                         │
│ Layer 6: Infrastructure Security                       │
│ ├─ Firewall rules (restrict inbound ports)             │
│ ├─ Database access (encrypted connections only)        │
│ ├─ Secrets management (environment variables)          │
│ ├─ Backup encryption (at rest & in transit)            │
│ ├─ Audit logging (all admin actions)                   │
│ └─ Regular security updates                            │
│                                                         │
│ Layer 7: Monitoring & Alerting                         │
│ ├─ Failed login attempts                               │
│ ├─ Unauthorized access attempts                        │
│ ├─ Data modification audits                            │
│ ├─ System performance anomalies                        │
│ ├─ Resource exhaustion detection                       │
│ └─ Uptime monitoring with alerts                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

### Performance Requirements
- **API Response Time:** < 200ms for 95th percentile
- **Database Query:** < 100ms for 95th percentile
- **Mobile App Load:** < 2 seconds for initial view
- **WebSocket Latency:** < 500ms for real-time updates

### Scalability
- **Concurrent Users:** 10,000 simultaneous
- **Monthly Data Growth:** +50GB (measurements, audit logs)
- **Database Size:** Expected 10GB by Year 2
- **Data Partitioning:** Measurements partitioned by year

### Availability
- **Uptime SLA:** 99.5% (monitored via StatusPage)
- **Recovery Time Objective (RTO):** 30 minutes
- **Recovery Point Objective (RPO):** 1 hour
- **Backup Frequency:** Hourly (7-day retention), Daily (30-day)

### Load Handling
- **Peak Concurrent:** 1,000 simultaneous users
- **Daily Peak Hours:** 8 AM - 12 PM (measurement recording)
- **Expected Requests/Second:** 50-100 during peak
- **Database Connections:** Connection pooling (10-20 connections)

---

## Monitoring & Observability

### Logging Strategy
```
Application Logs (Django)
├─ DEBUG: Development stack traces
├─ INFO: Application events (login, data changes)
├─ WARNING: Permission denials, validation failures
├─ ERROR: Unhandled exceptions, failed tasks
└─ CRITICAL: System failures, data corruption

Centralized Log Aggregation
├─ Tool: Sentry or CloudWatch
├─ Retention: 30 days
├─ Alerting: Critical errors → Slack webhook
└─ Searching: By user, endpoint, timestamp
```

### Metrics to Monitor
- **API Latency:** Response time per endpoint
- **Error Rate:** 5xx responses, exceptions
- **Database Performance:** Query times, connection pool usage
- **Cache Hit Ratio:** Redis hits vs. misses
- **Task Queue:** Celery pending tasks, failure rates
- **Business Metrics:** Measurements recorded, alerts generated

---

**Architecture Document Version:** 1.0  
**Last Updated:** May 4, 2026  
**Next Review:** Quarterly or when major architectural changes made
