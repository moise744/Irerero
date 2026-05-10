# irerero_backend/settings.py
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "irerero-dev-secret-change-in-production-2025")
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"
_raw_allowed = os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "localhost 127.0.0.1 0.0.0.0 10.0.2.2 [::1]",
)
# Accept comma- or whitespace-separated hosts (PowerShell/examples often use commas).
ALLOWED_HOSTS = [
    h.strip() for h in _raw_allowed.replace(",", " ").split() if h.strip()
]
ALLOWED_HOSTS += ["10.15.160.169", "10.140.255.169", "127.0.0.1", "localhost"]
# Django test client uses host "testserver" by default.
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "channels",
    "auth_module",
    "children",
    "measurements",
    "alerts",
    "attendance",
    "nutrition",
    "referrals",
    "reports",
    "sync",
    "notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "irerero_backend.urls"
ASGI_APPLICATION = "irerero_backend.asgi.application"
WSGI_APPLICATION = "irerero_backend.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "pdf_templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

DATABASES = {
    "default": {
        "ENGINE": os.environ.get("DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.environ.get("DB_NAME", BASE_DIR / "db.sqlite3"),
        "USER": os.environ.get("DB_USER", "irerero"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "irerero2025"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}
# Production: set DB_ENGINE=django.db.backends.postgresql

AUTH_USER_MODEL = "auth_module.IreroUser"

# Argon2 primary, bcrypt fallback — NFR-020
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "irerero_backend.exceptions.problem_detail_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000 http://127.0.0.1:3000 "
    "http://localhost:5173 http://127.0.0.1:5173 "
    "http://localhost:4173 http://127.0.0.1:4173",
).split()
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS must be True for mobile app clients (Flutter/Android).
# Mobile apps do NOT send an Origin header — they are not browsers — so CORS
# is a browser-only concern and allowing all origins does NOT create a security
# vulnerability for the mobile API. The web dashboard is protected by JWT tokens.
CORS_ALLOW_ALL_ORIGINS = True
# When DEBUG=False but you browse from LAN, still honour common private origins (explicit whitelist).
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:\d+$",
    r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$",
    r"^http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$",
]
# Chromium may send this when bridging networks; Django 4.x+ / corsheaders honours it when True.
CORS_ALLOW_PRIVATE_NETWORK = DEBUG

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Kigali"
# Windows-compatible pool: use threads instead of prefork (avoids permission errors)
CELERY_WORKER_POOL = "threads"
CELERY_WORKER_CONCURRENCY = 4  # Adjust based on system capacity
# Celery 6.0 compatibility: enable broker connection retry on startup
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Celery Beat periodic task schedule — architecture §3.2.5
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    "check-attendance-alerts-daily": {
        "task": "ai.celery_tasks.check_attendance_alerts",
        "schedule": crontab(hour=6, minute=0),           # Daily 06:00 CAT
    },
    "check-referral-pending-reminders-daily": {
        "task": "ai.celery_tasks.check_referral_pending_reminders",
        "schedule": crontab(hour=7, minute=0),           # Daily 07:00 CAT
    },
    "check-nutrition-programme-missed-daily": {
        "task": "ai.celery_tasks.check_nutrition_programme_missed",
        "schedule": crontab(hour=7, minute=30),          # Daily 07:30 CAT
    },
    "check-immunisation-overdue-daily": {
        "task": "ai.celery_tasks.check_immunisation_overdue",
        "schedule": crontab(hour=8, minute=0),           # Daily 08:00 CAT
    },
    "generate-monthly-reports": {
        "task": "ai.celery_tasks.generate_monthly_reports",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),  # 1st of month 02:00
    },
    "send-weekly-progress-sms": {
        "task": "ai.celery_tasks.send_weekly_progress_sms",
        "schedule": crontab(day_of_week=1, hour=9, minute=0),  # Monday 09:00 — FR-078
    },
}

# Channels: Redis is correct for prod / multi-worker. In DEBUG without Redis running,
# in-memory avoids WebSocket handshake failures → Vite "ws proxy" ECONNRESET spam.
_use_redis_channels = (
    not DEBUG or os.environ.get("CHANNEL_LAYER_BACKEND", "").strip().lower() == "redis"
)
if _use_redis_channels:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }

# SMS plug-and-replace — change this ONE value to go live (architecture §3.2.3)
SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "mock")
AFRICAS_TALKING_USERNAME = os.environ.get("AT_USERNAME", "sandbox")
AFRICAS_TALKING_API_KEY = os.environ.get("AT_API_KEY", "")

FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY", "")
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")

# WHO LMS tables live here as JSON config files — never hard-coded (NFR-026)
LMS_DATA_DIR = BASE_DIR / "lms_data"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Kigali"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SOFT_DELETE_RETENTION_DAYS = 90
AUDIT_LOG_RETENTION_DAYS = 365 * 5

# ═══════════════════════════════════════════════════════════════════════════════
# IRERERO — ARCHITECTURE REFERENCE CONSTANTS
# All SRS requirements, constraints, policy references, and assumptions
# are documented here for traceability. SRS §1.5, §2.4, §2.5, §9, §10.
# ═══════════════════════════════════════════════════════════════════════════════

# System name — SRS §1.2
# 'Irerero' is Kinyarwanda for 'ECD centre' — a place where children are nurtured.
SYSTEM_NAME    = "Irerero"
SYSTEM_VERSION = "1.0.0"

# System identity — PUD §8.4
# "Irerero is not just a software project. It is a child health intervention."
SYSTEM_IDENTITY = "Integrated Digital Platform for Early Childhood Development in Rwanda"

# Scope exclusions — SRS §1.3
# The system does NOT include:
#   - Electronic Medical Records (EMR) at health facilities
#   - Financial management for ECD centres
#   - Curriculum or lesson planning tools
#   - Any functions for children above age 8
SCOPE_EXCLUSIONS = ["EMR at health facilities", "financial management", "lesson planning", "children above age 8"]

# ── §2.2 User class scope sizes ──────────────────────────────────────────────
# Sector ECD Coordinator: typically 5–15 centres — SRS §2.2
# District ECD Officer: 30+ centres — SRS §2.2
# System Administrator: monitors server health (plus user accounts, ML model) — SRS §2.2
USER_SCOPE_SECTOR_CENTRES   = "5-15 centres"
USER_SCOPE_DISTRICT_CENTRES = "30+ centres"
SYSADMIN_RESPONSIBILITIES   = ["user accounts", "ML model configuration", "monitoring server health", "embedded device management"]

# ── §2.3 Operating Environment ────────────────────────────────────────────────
# Web browser support: Chrome, Firefox, Edge — SRS §2.3, §5.1
SUPPORTED_BROWSERS = ["Chrome", "Firefox", "Edge"]
# Mobile: Android 8.0 (API 26)+, 2GB RAM, 16GB storage — SRS §2.3, §5.2
MOBILE_MIN_ANDROID_API = 26
MOBILE_MIN_RAM_GB      = 2
MOBILE_MIN_STORAGE_GB  = 16
# Power supply: intermittent electricity — mobile autosaves continuously — NFR-008
# "The mobile app must autosave all data continuously so no data is lost if the device loses power"
MOBILE_AUTOSAVE_REQUIRED = True

# ── §2.4 Design & Implementation Constraints ──────────────────────────────────
# WHO algorithms: no modification to core formulas — §10.1
WHO_ALGORITHM_CONSTRAINT = "WHO igrowup LMS method must be used WITHOUT modification to core algorithms"
# CMAM: recommendations must follow Rwanda CMAM protocol only — §10.1
CMAM_CONSTRAINT = "All recommendations must be based on Rwanda nationally approved CMAM protocol ONLY"
# Non-diagnostic: system supports caregivers, does NOT replace medical diagnosis — §10.1
NON_DIAGNOSTIC_CONSTRAINT = (
    "The system must NOT make diagnostic claims. "
    "Irerero generates alerts and recommendations to SUPPORT caregivers "
    "but does NOT replace professional medical diagnosis. "
    "All referrals triggered by the system must ultimately be confirmed by a qualified health professional."
)
# Hardware cost ceiling — §10.2
EMBEDDED_HARDWARE_MAX_COST_USD = 150  # USD per unit — §10.2
# Server cost ceiling — §10.2
SERVER_MAX_COST_USD_MONTHLY = 500  # for national-scale deployment — §10.2
# LMS data must be separable — NFR-026
# "The mobile app must NOT require a software update to use updated WHO growth reference data"
LMS_MUST_BE_SEPARABLE = True

# ── §2.5 Assumptions ─────────────────────────────────────────────────────────
# Training: minimum 2-day training session per centre — §10.4, NFR-012
# Benchmark tasks: record attendance for 30 children, record measurements for 5 children
TRAINING_DURATION_DAYS       = 2
TRAINING_BENCHMARK_ATTENDANCE = 30   # children
TRAINING_BENCHMARK_MEASUREMENTS = 5  # children
# Android device: at least one per pilot centre — §10.4
ANDROID_DEVICE_PER_CENTRE = True
# Connectivity: at minimum once per week (2G/3G/4G) — §10.4
MIN_CONNECTIVITY_FREQUENCY = "once per week"
# Kinyarwanda: single translation appropriate for all regions — §10.4
KINYARWANDA_SINGLE_TRANSLATION = True
# WHO LMS: licensed from WHO and embedded — §2.5
WHO_LMS_LICENSED = True  # WHO freely allows use in health programmes

# ── §9 Legal compliance ───────────────────────────────────────────────────────
# Rwanda Law No. 058/2021 on Protection of Personal Data and Privacy
RWANDA_DATA_PROTECTION_LAW = "Law No. 058/2021 of 13/10/2021"
# Convention on the Rights of the Child (CRC)
CRC_COMPLIANCE_REQUIRED = True
# UNICEF and WHO data governance guidelines
UNICEF_WHO_GUIDELINES_REQUIRED = True
# Parental consent: displayed in Kinyarwanda at child registration
PARENTAL_CONSENT_REQUIRED = True
# Data rights: right to access, right to correction, no sharing without written consent
PARENTAL_DATA_RIGHTS = ["right to access", "right to correction", "no sharing without explicit written consent"]

# ── §9.4 Physical security ────────────────────────────────────────────────────
# Remote data wipe available — sys admin can erase lost/stolen device
REMOTE_WIPE_SUPPORTED = True
# No sensitive data in notification preview (lock screen safe) — §9.4
NOTIFICATION_NO_SENSITIVE_PREVIEW = True

# ── Glossary (SRS §1.4) ───────────────────────────────────────────────────────
GLOSSARY = {
    "ECD":      "Early Childhood Development — integrated health, nutrition, education, and protection services for children birth to 6 years.",
    "WHO":      "World Health Organization — sets international standards for child growth monitoring.",
    "Z-score":  "A statistical measure showing how many standard deviations a child's measurement is from the WHO median for children of the same age and sex. Below -2 = malnutrition; below -3 = severe malnutrition.",
    "WAZ":      "Weight-for-Age Z-score — indicates underweight status.",
    "HAZ":      "Height-for-Age Z-score — indicates stunting (chronic malnutrition).",
    "WHZ":      "Weight-for-Height Z-score — indicates wasting (acute malnutrition).",
    "MUAC":     "Mid-Upper Arm Circumference — a measurement used to rapidly assess acute malnutrition. Measured in centimetres using a colour-coded tape. Applied to children aged 6-59 months.",
    "MAM":      "Moderate Acute Malnutrition — MUAC 11.5-12.4 cm or WHZ between -3 and -2.",
    "SAM":      "Severe Acute Malnutrition — MUAC < 11.5 cm or WHZ below -3. Requires immediate medical treatment.",
    "Stunting":  "Height-for-Age Z-score (HAZ) below -2. Indicates chronic (long-term) malnutrition, largely irreversible after age 3.",
    "Wasting":   "Weight-for-Height Z-score (WHZ) below -2. Indicates acute (recent) malnutrition. Can be rapidly fatal in severe cases.",
    "RUTF":      "Ready-to-Use Therapeutic Food — a peanut-based food used to treat SAM in community settings.",
    "Embedded System": "A physical hardware device (e.g., Raspberry Pi or Arduino with sensors) connected to the Irerero app to automate measurement data capture.",
    "DHIS2":     "District Health Information System 2 — Rwanda's national health data platform used by health facilities. Irerero is designed to be DHIS2-compatible for future export.",
    "API":       "Application Programming Interface — a way for two software systems to communicate.",
    "ML / AI":   "Machine Learning / Artificial Intelligence — algorithms that learn from data to detect patterns and make predictions.",
    "Offline-first": "A software design approach where the app works fully without internet and syncs data when connectivity is available.",
    "CHW":       "Community Health Worker — trained volunteers providing basic health services at village level in Rwanda. Approximately 29,000 CHWs across the country.",
    "MINEDUC":   "Ministry of Education — lead ministry for Rwanda's ECD policy.",
    "MINISANTE": "Ministry of Health — responsible for health components of ECD.",
    "MIGEPROF":  "Ministry of Gender and Family Promotion — responsible for child protection and family welfare.",
    "FR":        "Functional Requirement — describes what the system must DO.",
    "NFR":       "Non-Functional Requirement — describes how well the system must perform.",
}

# ── References (SRS §1.5) ─────────────────────────────────────────────────────
REFERENCES = [
    "Republic of Rwanda, Ministry of Education. Early Childhood Development Policy. Kigali, 2011.",
    "Republic of Rwanda. National Standards for Early Childhood Development. Kigali, 2019.",
    "World Health Organization. WHO Child Growth Standards (2006) — Methods and Development. Geneva: WHO Press.",
    "World Health Organization. WHO Growth Reference Data for 5-19 years (2007).",
    "UNICEF. Programming Guide: Community Management of Acute Malnutrition (CMAM).",
    "IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.",
    "WHO. Global Action Plan on Child Wasting 2020-2025.",
]

# ── Policy Traceability (Appendix D) ─────────────────────────────────────────
POLICY_TRACEABILITY = {
    "FR-021 Z-score calculation":    "Rwanda ECD National Standards 2019; WHO Child Growth Standards 2006",
    "FR-032/033 Trend detection":    "Rwanda ECD Policy 2011; WHO Global Action Plan on Wasting 2020-2025",
    "FR-054/055 Digital referral":   "Rwanda ECD Policy 2011; CMAM protocol",
    "FR-069 Monthly reports":        "Rwanda ECD National Standards 2019; Rwanda ECD Policy 2011 (MIS requirement)",
    "FR-082 Offline functionality":  "Operating environment constraint — rural centres with limited internet",
    "ES-FR-001-010 Embedded system": "Rwanda ECD Policy 2011 — calls for use of ICT in ECD",
    "AI-FR-010-014 ML model":        "Computing Intelligence and Applications course objective; proactive vs reactive management",
    "NFR-013 Kinyarwanda":           "Rwanda national language policy; caregiver usability requirement",
    "Module 7 Referral tracking":    "Rwanda ECD Policy; CMAM protocol — outcome monitoring mandatory",
    "Module 6 Nutrition programme":  "WFP Rwanda; Rwanda ECD National Standards",
    "NFR-021/§9 Data privacy":       "Rwanda Law No. 058/2021; CRC; UNICEF child data governance; WHO health info standards",
    "§10.1 Non-diagnostic":          "WHO and Rwanda Ministry of Health policy; professional liability",
    "Vision 2050 / NST1":            "Irerero contributes to healthy, educated population; NST1 stunting reduction goal",
    "SDGs":                          "SDG 2 Zero Hunger, SDG 3 Good Health, SDG 4 Quality Education, SDG 17 Partnerships",
}

# ── Use Cases (Appendix B) ───────────────────────────────────────────────────
USE_CASES = {
    "UC-01": "Daily Attendance Recording — Actor: ECD Caregiver — Goal: Record which children are present today",
    "UC-02": "Monthly Growth Monitoring — Actor: ECD Caregiver — Goal: Record monthly weight and height measurements",
    "UC-03": "Respond to SAM Alert — Actor: ECD Caregiver — Goal: Respond to a Red SAM alert and initiate referral",
    "UC-04": "Generate Monthly Report — Actor: Centre Manager — Goal: Submit the monthly ECD report to sector office",
    "UC-05": "District Health Review — Actor: District ECD Officer — Goal: Identify centres with highest malnutrition rates",
    "UC-06": "Register New Child — Actor: ECD Caregiver — Goal: Register a new child who has just enrolled",
    "UC-07": "Embedded Measurement — Actor: ECD Caregiver with embedded system — Goal: Record measurements via smart scale",
    "UC-08": "Follow Up on Referral — Actor: ECD Caregiver — Goal: Record outcome of a health centre referral",
}

# ── Appendix A: Role Permissions ─────────────────────────────────────────────
ROLE_PERMISSIONS = {
    "generate_alerts": {
        "caregiver": "Auto", "chw": "Auto", "centre_mgr": "Auto",
        "sector": "Auto", "district": "Auto", "national": "Auto",
        "sys_admin": "—",  # SysAdmin does NOT auto-generate clinical alerts
        "partner": "—",
    },
    "configure_ml_model": {"sys_admin": "✓", "others": "—"},
    "manage_embedded_device": {"centre_mgr": "✓", "sys_admin": "✓", "others": "—"},
    "view_sector_dashboard": {"centre_mgr": "view only", "sector": "✓", "district": "✓", "national": "✓", "sys_admin": "✓"},
    "view_individual_data": {
        "caregiver": "Own centre", "chw": "Own centre", "centre_mgr": "Own centre",
        "sector": "Own sector", "district": "Own district", "national": "All",
        "sys_admin": "All", "partner": "Anonymised aggregate only",
    },
}

# ── NFR Performance Targets ───────────────────────────────────────────────────
# NFR-001: UI response < 2 seconds. Growth chart < 3 seconds. — NFR-001
UI_RESPONSE_TIME_SEC      = 2
GROWTH_CHART_RENDER_SEC   = 3
# NFR-002: Z-score calculation < 1 second offline — NFR-002
ZSCORE_CALC_MAX_SEC       = 1
# NFR-004: 500 concurrent users, < 3 second response — NFR-004
MAX_CONCURRENT_USERS      = 500
SERVER_RESPONSE_MAX_SEC   = 3
# NFR-005: Report generation < 10 seconds — NFR-005
REPORT_GENERATION_MAX_SEC = 10
# NFR-006: Full sync < 2 minutes on 3G (100 children, 1 month data) — NFR-006
SYNC_MAX_TIME_SEC         = 120
# NFR-007: 99.5% uptime, < 44 hours downtime per year, 48h maintenance notice — NFR-007
SERVER_UPTIME_PCT         = 99.5
MAX_ANNUAL_DOWNTIME_HRS   = 44
MAINTENANCE_NOTICE_HRS    = 48
# NFR-009: 30 consecutive days offline minimum — NFR-009
MIN_OFFLINE_DAYS          = 30
# NFR-011: 24-hour backups, 2-year retention, 4-hour recovery — NFR-011
BACKUP_INTERVAL_HRS       = 24
BACKUP_RETENTION_YEARS    = 2
BACKUP_RECOVERY_HRS       = 4
# NFR-017: Max 35 taps for 30-child attendance, max 10 taps per measurement — NFR-017
MAX_ATTENDANCE_TAPS       = 35
MAX_MEASUREMENT_TAPS      = 10
# NFR-024: Scales to 416 sectors, 3000+ centres, 500,000+ children — NFR-024
SCALE_TARGET_SECTORS      = 416
SCALE_TARGET_CENTRES      = 3000
SCALE_TARGET_CHILDREN     = 500000

# ── ES (Embedded System) Specs ───────────────────────────────────────────────
# ES-NFR-001: Weight ±100g precision, ±200g accuracy; Height ±0.5cm — ES-NFR-001
ES_WEIGHT_PRECISION_G     = 100
ES_WEIGHT_ACCURACY_G      = 200
ES_HEIGHT_PRECISION_CM    = 0.5
# ES-NFR-002: 4-hour battery backup, 220V AC — ES-NFR-002
ES_BATTERY_BACKUP_HRS     = 4
ES_POWER_SUPPLY           = "220V AC Rwanda standard"
# ES-NFR-003: 10-45°C, 20-90% humidity — ES-NFR-003
ES_TEMP_RANGE             = "10-45°C"
ES_HUMIDITY_RANGE         = "20-90% non-condensing"
# ES-NFR-004: 10m open, 5m with obstacles — ES-NFR-004
ES_BLE_RANGE_OPEN_M       = 10
ES_BLE_RANGE_OBSTACLES_M  = 5
# ES-NFR-005: Full setup in 15 minutes — ES-NFR-005
ES_SETUP_TIME_MINUTES     = 15

# ── AI/ML Specifications ─────────────────────────────────────────────────────
# AI-FR-011: RandomForest or GradientBoosting — AI-FR-011
ML_ALGORITHM_OPTIONS      = ["RandomForestClassifier", "GradientBoostingClassifier"]
# AI-FR-012: Risk score 0-100%, Low/Medium/High — AI-FR-012
ML_RISK_LEVELS            = {"low": (0, 30), "medium": (31, 60), "high": (61, 100)}
# AI-FR-013: Training features — AI-FR-013
ML_TRAINING_FEATURES      = [
    "age_months", "sex", "waz", "haz", "whz", "muac_cm",
    "waz_delta_3m", "haz_delta_3m", "whz_delta_3m", "muac_delta_3m",
    "attendance_rate_30d", "enrolled_in_nutrition_programme",
    "season_of_year", "missed_programme_days_14d",
]
# AI-FR-014: Minimum 85% sensitivity for SAM detection — AI-FR-014
ML_MIN_SAM_SENSITIVITY    = 0.85
# AI-FR-015: Model versioning maintained — AI-FR-015
ML_VERSIONING_REQUIRED    = True

# ── PUD References ────────────────────────────────────────────────────────────
# PUD §3.4 MUAC age range: 6-59 months — PUD §3.4
MUAC_AGE_RANGE_MONTHS = "6-59 months"
# PUD §3.4 BMI-for-Age: for older children 5-8 years — PUD §3.4
BMI_FOR_AGE_APPLICABLE_YEARS = "5-8 years"
# PUD §7.3 Economic case: MAM $50-100 per child, SAM 5-10x more — PUD §7.3
MAM_TREATMENT_COST_USD = "50-100"
SAM_COST_MULTIPLIER    = "5-10x more than MAM"
# PUD §7.3 Proven technologies: DHIS2, RapidPro, MSF tools — PUD §7.3
PROVEN_TECH_PRECEDENTS = [
    "WHO DHIS2 — mobile data collection at facility level",
    "UNICEF RapidPro — SMS health messaging in Rwanda",
    "MSF nutrition assessment tools — WHO SMART survey methodology",
]
# PUD §7.1 Parents: SMS recipients only, NOT system users — PUD §7.1
PARENTS_ARE_SMS_RECIPIENTS_NOT_USERS = True
# PUD §6.3 TensorFlow noted as alternative ML library — PUD §6.3
ML_TENSORFLOW_ALTERNATIVE = "TensorFlow is viable for future CNN-based models (e.g., image-based measurement). For current tabular health data, scikit-learn is preferred."
