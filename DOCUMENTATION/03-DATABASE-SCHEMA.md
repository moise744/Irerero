# 💾 DATABASE SCHEMA & DATA Model

**Document Version:** 1.0  
**Date:** May 3, 2026

---

## Core Entity-Relationship Diagram

```
┌──────────────────┐
│    IreroUser     │
│  (auth_module)   │
├──────────────────┤
│ id (UUID)        │
│ username         │
│ role             │ ◄────── 8 roles
│ centre_id        │
│ sector_id        │
│ district_id      │
│ is_active        │
└────────┬─────────┘
         │
    ┌────┴─────────────────────────────────────────────┐
    │ 1:Many                                           │
    ▼                                                   ▼
┌─────────────────────────┐              ┌──────────────────────────┐
│   Centre (children)     │              │   AuditLog (auth_module) │
├─────────────────────────┤              ├──────────────────────────┤
│ id (UUID)               │              │ id (UUID)                │
│ code (e.g. "GIT")       │              │ user_id                  │
│ centre_name             │              │ action                   │
│ sector_id (UUID)        │              │ table_name               │
│ district_id (UUID)      │              │ record_id                │
│ province                │              │ old_value (JSON)         │
│ gps_latitude/longitude  │              │ new_value (JSON)         │
│ manager_id              │              │ changed_at               │
│ is_active               │              └──────────────────────────┘
└────┬─────────────────────┘
     │ 1:Many
     ▼
┌─────────────────────────┐
│  Child (children)       │
├─────────────────────────┤
│ id (UUID)               │
│ irerero_id (auto-gen)   │
│ centre_id (FK)          │
│ full_name               │
│ date_of_birth           │
│ sex (male/female)       │
│ guardian_name           │
│ guardian_phone          │
│ home_village            │
│ photo (ImageField)      │
│ status (active/inactive)│
│ sensitive fields:       │
│ - is_orphan             │
│ - has_disability        │
│ - hiv_exposure_status   │
│ deleted_at (soft-delete)│
│ created_by (user_id)    │
└────┬────┬────┬──────────┘
     │    │    │
     │    │    └──────────────────────────┐
     │    │                               │
     │    ▼                               ▼
     │  ┌────────────────────────┐   ┌──────────────────┐
     │  │   Measurement          │   │   Alert          │
     │  │ (measurements)         │   │  (alerts)        │
     │  ├────────────────────────┤   ├──────────────────┤
     │  │ id (UUID)              │   │ id (UUID)        │
     │  │ child_id (FK)          │   │ child_id (FK)    │
     │  │                        │   │ centre_id        │
     │  │ Five measurements:     │   │ alert_type       │
     │  │ - weight_kg            │   │ severity         │
     │  │ - height_cm            │   │ explanation_en   │
     │  │ - muac_cm              │   │ explanation_rw   │
     │  │ - temperature_c        │   │ status (active/) │
     │  │ - head_circ_cm         │   │ (actioned/resol) │
     │  │                        │   │ actioned_by      │
     │  │ Calculated Z-scores:   │   │ actioned_at      │
     │  │ - waz_score            │   │ action_taken     │
     │  │ - haz_score            │   │ generated_at     │
     │  │ - whz_score            │   │ created_by       │
     │  │                        │   └──────────────────┘
     │  │ nutritional_status     │
     │  │ biv_flagged            │
     │  │ biv_confirmed          │
     │  │ source (manual/device) │
     │  │ device_id              │
     │  │ recorded_by (user_id)  │
     │  │ recorded_at            │
     │  └────────────────────────┘
     │
     ├──────────────────────────────────┐
     │                                  │
     ▼                                  ▼
┌──────────────────────┐     ┌─────────────────────────┐
│   Attendance         │     │   Referral              │
│  (attendance)        │     │ (referrals)             │
├──────────────────────┤     ├─────────────────────────┤
│ id (UUID)            │     │ id (UUID)               │
│ child_id (FK)        │     │ child_id (FK)           │
│ date                 │     │ status                  │
│ status               │     │ reason                  │
│ absence_reason       │     │ health_centre           │
│ recorded_by (user_id)│     │ health_centre_phone     │
│ recorded_at          │     │ referred_by (user_id)   │
│ centre_id            │     │ referred_at             │
└──────────────────────┘     │ referral_notes          │
                             │ health_centre_diagnosis │
                             │ health_centre_treatment │
                             │ follow_up_date          │
                             │ created_by              │
                             └─────────────────────────┘

Additional connected models:
    ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   Nutrition      │  │   Immunisation   │  │   Notification   │
    │  Programme       │  │   (milestones)   │  │   (notifications)│
    │  (nutrition)     │  │                  │  │                  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Complete Schema Definition

### 1. **Users & Authentication** (auth_module)

#### IreroUser Model
```sql
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username             VARCHAR(100) NOT NULL UNIQUE,
    full_name            VARCHAR(200) NOT NULL,
    role                 VARCHAR(20) NOT NULL,  -- caregiver|chw|centre_mgr|sector|district|national|sys_admin|partner
    phone_number         VARCHAR(20),
    email                VARCHAR(254),
    is_active            BOOLEAN DEFAULT true,
    is_staff             BOOLEAN DEFAULT false,
    is_superuser         BOOLEAN DEFAULT false,
    failed_login_count   INT DEFAULT 0,
    locked_until         TIMESTAMP NULL,
    pin_hash             VARCHAR(200),          -- For mobile 4-6 digit PIN
    fcm_token            TEXT,                  -- Firebase Cloud Messaging token
    
    -- Organisational scope (only relevant field populated per role)
    centre_id            UUID,
    sector_id            UUID,
    district_id          UUID,
    
    last_login           TIMESTAMP NULL,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);
```

#### AuditLog Model
```sql
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,      -- e.g. "child.create", "measurement.update"
    table_name  VARCHAR(100) NOT NULL,
    record_id   VARCHAR(100),
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    changed_at  TIMESTAMP DEFAULT NOW(),
    
    INDEX (user_id),
    INDEX (changed_at),
    INDEX (action)
);
```

---

### 2. **Centres & Children** (children)

#### Centre Model
```sql
CREATE TABLE centres (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(10) NOT NULL UNIQUE,     -- e.g. "GIT"
    centre_name         VARCHAR(200) NOT NULL,
    sector_id           UUID NOT NULL,
    district_id         UUID NOT NULL,
    province            VARCHAR(100),
    gps_latitude        NUMERIC(9, 6),
    gps_longitude       NUMERIC(9, 6),
    centre_manager_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    establishment_date  DATE,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_gps CHECK (
        (gps_latitude IS NULL AND gps_longitude IS NULL) OR
        (gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL)
    )
);
```

#### Child Model
```sql
CREATE TABLE children (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irerero_id      VARCHAR(20) NOT NULL UNIQUE,        -- e.g. "GIT-2025-0042"
    centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE PROTECT,
    
    -- Mandatory fields (FR-009)
    full_name       VARCHAR(200) NOT NULL,
    date_of_birth   DATE NOT NULL,
    sex             VARCHAR(10) CHECK (sex IN ('male', 'female')),
    guardian_name   VARCHAR(200) NOT NULL,
    guardian_phone  VARCHAR(20) NOT NULL,
    home_village    VARCHAR(200),                        -- Umudugudu
    
    enrolment_date  DATE DEFAULT CURRENT_DATE,
    status          VARCHAR(10) CHECK (status IN ('active', 'inactive')),
    
    -- Optional fields
    photo           VARCHAR(255),                        -- File path
    notes           TEXT,
    
    -- Sensitive fields (hidden from basic caregivers)
    is_orphan           BOOLEAN,
    has_disability      BOOLEAN,
    hiv_exposure_status BOOLEAN,                         -- PMTCT follow-up
    chronic_conditions  TEXT,
    
    -- Audit
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP NULL,                      -- Soft-delete
    
    CONSTRAINT age_validation CHECK (
        CURRENT_DATE >= date_of_birth AND
        date_of_birth >= CURRENT_DATE - INTERVAL '8 years'
    ),
    INDEX (centre_id),
    INDEX (irerero_id),
    INDEX (status)
);
```

---

### 3. **Measurements** (measurements)

#### Measurement Model
```sql
CREATE TABLE measurements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    
    -- Five measurement types (FR-019)
    weight_kg           NUMERIC(5, 1),
    height_cm           NUMERIC(5, 1),
    muac_cm             NUMERIC(4, 1),
    temperature_c       NUMERIC(4, 1),
    head_circ_cm        NUMERIC(4, 1),
    
    measurement_position VARCHAR(10) CHECK (measurement_position IN ('standing', 'lying')),
    
    -- WHO Z-scores (calculated server-side, FR-021)
    waz_score       NUMERIC(6, 3),                       -- Weight-for-age
    haz_score       NUMERIC(6, 3),                       -- Height-for-age
    whz_score       NUMERIC(6, 3),                       -- Weight-for-height
    baz_score       NUMERIC(6, 3),                       -- BMI-for-age
    hcz_score       NUMERIC(6, 3),                       -- Head circumference-for-age
    
    -- Classification
    nutritional_status  VARCHAR(20),
    biv_flagged         BOOLEAN DEFAULT false,           -- Biologically implausible value
    biv_confirmed       BOOLEAN DEFAULT false,           -- User confirmed after flagging
    
    -- Source tracking (FR-026)
    source          VARCHAR(15) CHECK (source IN ('manual', 'embedded', 'simulation')),
    device_id       VARCHAR(100),                        -- BLE device
    
    -- Audit
    recorded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at     TIMESTAMP NOT NULL,
    deleted_at      TIMESTAMP NULL,
    
    INDEX (child_id, recorded_at),
    INDEX (nutritional_status)
);
```

---

### 4. **Alerts** (alerts)

#### Alert Model
```sql
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    centre_id       UUID NOT NULL,                       -- Denormalised for filtering
    
    -- Alert classification
    alert_type      VARCHAR(30) NOT NULL,
    severity        VARCHAR(15) CHECK (severity IN ('urgent', 'warning', 'information')),
    
    -- Explanations in two languages
    explanation_en  TEXT NOT NULL,                       -- English
    explanation_rw  TEXT NOT NULL,                       -- Kinyarwanda
    recommendation_en TEXT,
    recommendation_rw TEXT,
    
    -- Trigger data for audit/debugging (AI-FR-019)
    trigger_data    JSONB,                               -- {z_scores, thresholds, prev_measurement}
    
    -- Status lifecycle
    status          VARCHAR(15) CHECK (status IN ('active', 'actioned', 'resolved')),
    actioned_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    actioned_at     TIMESTAMP NULL,
    action_taken    TEXT,                                -- Free-text description
    
    -- Escalation tracking
    is_escalated    BOOLEAN DEFAULT false,
    escalated_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    escalation_reason TEXT,
    
    generated_at    TIMESTAMP DEFAULT NOW(),
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX (centre_id, severity),
    INDEX (status),
    INDEX (child_id)
);
```

---

### 5. **Attendance** (attendance)

#### Attendance Model
```sql
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
    
    date            DATE NOT NULL,
    status          VARCHAR(10) CHECK (status IN ('present', 'absent')),
    absence_reason  VARCHAR(50) CHECK (absence_reason IN (
        'sick', 'family_emergency', 'seasonal_farming', 'parent_travel', 'unknown'
    )),
    
    recorded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at     TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (child_id, date),
    INDEX (centre_id, date),
    INDEX (status)
);
```

---

### 6. **Referrals** (referrals)

#### Referral Model
```sql
CREATE TABLE referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    
    status          VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
    reason          TEXT NOT NULL,                       -- e.g. "Severe acute malnutrition"
    
    -- Destination health centre
    health_centre_name  VARCHAR(200),
    health_centre_phone VARCHAR(20),
    health_centre_district VARCHAR(100),
    
    -- Referral details
    referred_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    referred_at     TIMESTAMP DEFAULT NOW(),
    referral_notes  TEXT,
    
    -- Follow-up
    follow_up_date  DATE,
    health_centre_diagnosis TEXT,                       -- What they found
    health_centre_treatment TEXT,                       -- What they did
    health_centre_contact_date DATE,
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX (child_id),
    INDEX (status)
);
```

---

### 7. **Nutrition Programme** (nutrition)

#### NutritionEnrolment Model
```sql
CREATE TABLE nutrition_enrolments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
    
    programme_type  VARCHAR(20) CHECK (programme_type IN ('sfp', 'tfp', 'rutf')),
    -- SFP = Supplementary Feeding Programme (MAM)
    -- TFP = Therapeutic Feeding Programme (SAM)
    -- RUTF = Ready-to-Use Therapeutic Food
    
    enrolment_date  DATE NOT NULL,
    expected_end_date DATE,
    actual_end_date DATE,
    outcome         VARCHAR(20) CHECK (outcome IN ('cured', 'defaulted', 'transferred', 'died', 'non_responder')),
    
    average_weight_gain_per_week NUMERIC(4, 2),         -- kg/week
    
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX (child_id),
    INDEX (centre_id)
);
```

---

### 8. **Immunisation & Milestones** (measurements/milestone_models.py)

#### Immunisation Model
```sql
CREATE TABLE immunisations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    
    vaccine_name    VARCHAR(100) NOT NULL,               -- e.g. "BCG", "DPT1", "OPV3"
    scheduled_date  DATE NOT NULL,                       -- Rwanda EPI schedule
    administered_date DATE,
    status          VARCHAR(20) CHECK (status IN ('pending', 'administered', 'missed')),
    
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX (child_id),
    INDEX (status, scheduled_date)
);

#### Developmental Milestones Model
CREATE TABLE developmental_milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE PROTECT,
    
    age_band        VARCHAR(20),   -- "0-6mo", "6-12mo", "12-24mo", "24-36mo"
    assessment_date DATE,
    
    -- Rwanda-adapted checklist domains
    gross_motor     VARCHAR(20) CHECK (gross_motor IN ('pass', 'concern', 'delay')),
    fine_motor      VARCHAR(20) CHECK (fine_motor IN ('pass', 'concern', 'delay')),
    language        VARCHAR(20) CHECK (language IN ('pass', 'concern', 'delay')),
    cognitive       VARCHAR(20) CHECK (cognitive IN ('pass', 'concern', 'delay')),
    social_emotional VARCHAR(20) CHECK (social_emotional IN ('pass', 'concern', 'delay')),
    
    overall_status  VARCHAR(20) CHECK (overall_status IN ('on_track', 'at_risk', 'delayed')),
    notes           TEXT,
    
    assessed_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX (child_id)
);
```

---

### 9. **Reports** (reports)

#### MonthlyReport Model
```sql
CREATE TABLE monthly_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
    
    year            INT NOT NULL,
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- Summary statistics
    total_enrolment         INT,
    total_attended          INT,
    avg_attendance_rate     NUMERIC(5, 2),
    total_sam_cases         INT,
    total_mam_cases         INT,
    total_stunted_children  INT,
    
    -- Data completeness
    measurements_recorded   INT,
    referrals_generated     INT,
    nutrition_referrals     INT,
    
    -- Manager notes
    manager_notes           TEXT,
    
    -- Status workflow
    status          VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_by    UUID REFERENCES users(id),
    submitted_at    TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    rejection_reason TEXT,
    
    UNIQUE (centre_id, year, month),
    INDEX (status, submitted_at)
);
```

---

## Data Validation Rules

### Z-Score Ranges
- **Normal:** -2 ≤ Z-score ≤ 3
- **Biologically Implausible:** Z-score < -5 or > 5 (flagged for review)

### Nutritional Status Classification
```
IF WHZ < -3.0:    SAM (Severe Acute Malnutrition) — RED
IF WHZ < -2.0:    MAM (Moderate Acute Malnutrition) — YELLOW
IF HAZ < -3.0:    Severe Stunting — RED
IF HAZ < -2.0:    Stunting — YELLOW
IF WAZ < -2.0:    Underweight — YELLOW
ELSE:             Normal — GREEN
```

### Alert Severity Mapping
```
URGENT (Red):       SAM, Severe Stunting, Fever > 40°C, Decline pattern
WARNING (Yellow):   MAM, Mild Stunting, Growth faltering
INFORMATION (Green):At risk, Measurement overdue
```

---

## Performance & Scalability

### Indexes for Query Optimization
```sql
-- Frequent queries
CREATE INDEX idx_children_by_centre ON children(centre_id);
CREATE INDEX idx_measurements_by_child_date ON measurements(child_id, recorded_at DESC);
CREATE INDEX idx_alerts_by_status_severity ON alerts(centre_id, status, severity);
CREATE INDEX idx_attendance_by_centre_date ON attendance(centre_id, date);
```

### Partitioning Strategy (for future scaling)
- **Measurements table:** Partition by year (measurements_2024, measurements_2025, etc.)
- **Alerts table:** Partition by status (active, resolved)

### Database Statistics
- Expected child records: 50,000-100,000 (by year 2)
- Expected measurement records: 500,000-1,000,000 (by year 2)
- Expected alert records: 100,000-200,000 (by year 2)
- Expected storage: ~5-10 GB

---

## Data Privacy & Compliance

### PII Handling
- Child photos: Encrypted at rest, accessible only within organization
- Guardian phone: Visible only to clinical staff (caregivers, CHW, centre manager)
- HIV exposure status: Visible only to Centre Manager and above
- Orphan/disability status: Visible only to Centre Manager and above

### Retention Policies
- Active child records: Indefinite (unless parent requests deletion)
- Soft-deleted records: 90 days (then permanent deletion)
- Audit logs: 5 years (complies with Rwanda Data Protection Law No. 058/2021)
- Backup retention: 2 years

---

**Schema Version:** 1.0  
**Last Updated:** May 3, 2026  
**Next Review:** Quarterly
