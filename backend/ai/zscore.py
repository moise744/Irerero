# ai/zscore.py
#
# WHO LMS Z-score calculation engine.
# Implements the exact LMS method as specified in WHO (2006)
# "WHO Child Growth Standards: Methods and Development."
# AI-FR-001, AI-FR-002, AI-FR-003, AI-FR-004
#
# LMS tables are loaded from JSON config files — never hard-coded (NFR-026).
# The same logic runs in Dart on the mobile app for offline use (AI-FR-004).

import json
import math
from pathlib import Path
from django.conf import settings


# ── Load LMS tables from config files on module import ────────────────────────
_LMS_CACHE = {}


def _load_lms(indicator: str, sex: str) -> list:
    """
    Load the LMS table for a given indicator and sex from a JSON config file.
    Files live in lms_data/ — updatable without a code release (NFR-026).

    indicator: "waz", "haz", "whz", "baz", "hcz"
    sex:       "boys" or "girls"
    """
    key = f"{indicator}_{sex}"
    if key not in _LMS_CACHE:
        path = Path(settings.LMS_DATA_DIR) / f"{key}.json"
        if not path.exists():
            raise FileNotFoundError(
                f"LMS table not found: {path}. "
                f"Please add the WHO LMS data files to the lms_data/ directory."
            )
        with open(path, "r", encoding="utf-8") as f:
            _LMS_CACHE[key] = json.load(f)
    return _LMS_CACHE[key]


def _find_lms_row(table: list, index_value: float) -> dict | None:
    """
    Find the LMS row closest to the given age-in-months or height value.
    The table is a list of dicts with keys: index, L, M, S.
    """
    if not table:
        return None
    # Find the row with the smallest absolute difference from the target
    return min(table, key=lambda row: abs(row["index"] - index_value))


def calculate_zscore(x: float, l: float, m: float, s: float) -> float:
    """
    The WHO LMS formula — AI-FR-001.

    Z = [(X/M)^L - 1] / (L × S)   when L ≠ 0
    Z = ln(X/M) / S                 when L approaches 0

    Arguments:
        x: measured value (weight in kg or height in cm)
        l: Box-Cox power transformation (L from LMS table)
        m: median for this age/sex (M from LMS table)
        s: coefficient of variation (S from LMS table)

    Returns the Z-score as a float.
    """
    if m <= 0 or x <= 0:
        return 0.0

    if abs(l) < 0.0001:
        # When L approaches zero, use the logarithmic form
        return math.log(x / m) / s

    return ((x / m) ** l - 1) / (l * s)


# ── BIV thresholds — AI-FR-003 ────────────────────────────────────────────────
# Values outside these ranges are biologically implausible.
# BIV-flagged measurements are stored but excluded from trend analysis.
BIV_THRESHOLDS = {
    "waz": (-6.0, 6.0),
    "haz": (-6.0, 6.0),
    "whz": (-5.0, 5.0),
}


def is_biv(zscore: float, indicator: str) -> bool:
    """Check if a Z-score falls outside WHO biologically implausible value thresholds."""
    if indicator not in BIV_THRESHOLDS:
        return False
    low, high = BIV_THRESHOLDS[indicator]
    return zscore < low or zscore > high


def compute_all_zscores(
    weight_kg: float | None,
    height_cm: float | None,
    muac_cm: float | None,
    age_months: int,
    sex: str,        # "male" or "female"
) -> dict:
    """
    Compute WAZ, HAZ, and WHZ for a single measurement session.
    Returns a dict with scores and a BIV flag.

    AI-FR-001, AI-FR-002, AI-FR-003.
    """
    sex_label = "boys" if sex == "male" else "girls"
    result = {
        "waz": None, "haz": None, "whz": None,
        "biv_flagged": False, "biv_details": [],
    }

    # Weight-for-Age (WAZ) — only for 0-60 months
    if weight_kg is not None and 0 <= age_months <= 60:
        try:
            table = _load_lms("waz", sex_label)
            row   = _find_lms_row(table, float(age_months))
            if row:
                z = calculate_zscore(float(weight_kg), row["L"], row["M"], row["S"])
                z = round(z, 3)
                if is_biv(z, "waz"):
                    result["biv_flagged"] = True
                    result["biv_details"].append("waz")
                else:
                    result["waz"] = z
        except FileNotFoundError:
            pass  # LMS file not yet available — skip this indicator

    # Height-for-Age (HAZ) — 0-60 months
    if height_cm is not None and 0 <= age_months <= 60:
        try:
            table = _load_lms("haz", sex_label)
            row   = _find_lms_row(table, float(age_months))
            if row:
                z = calculate_zscore(float(height_cm), row["L"], row["M"], row["S"])
                z = round(z, 3)
                if is_biv(z, "haz"):
                    result["biv_flagged"] = True
                    result["biv_details"].append("haz")
                else:
                    result["haz"] = z
        except FileNotFoundError:
            pass

    # Weight-for-Height (WHZ) — for children 45-110 cm (height-indexed, sex-specific)
    if weight_kg is not None and height_cm is not None and 45 <= float(height_cm) <= 110:
        try:
            table = _load_lms("whz", sex_label)
            row   = _find_lms_row(table, float(height_cm))  # indexed by height, not age
            if row:
                z = calculate_zscore(float(weight_kg), row["L"], row["M"], row["S"])
                z = round(z, 3)
                if is_biv(z, "whz"):
                    result["biv_flagged"] = True
                    result["biv_details"].append("whz")
                else:
                    result["whz"] = z
        except FileNotFoundError:
            pass

    return result


def classify_nutritional_status(
    waz: float | None,
    haz: float | None,
    whz: float | None,
    muac_cm: float | None,
) -> str:
    """
    Classify nutritional status using WHO thresholds — FR-022, SRS Appendix C.

    Priority order (most severe first):
      1. SAM:             WHZ < -3  OR  MUAC < 11.5 cm
      2. MAM:             WHZ -3 to -2  OR  MUAC 11.5–12.4 cm
      3. Severely Stunted: HAZ < -3
      4. Stunted:         HAZ < -2
      5. Underweight:     WAZ < -2
      6. At Risk:         any Z-score -2 to -1.5  OR  MUAC 12.5–13.0 cm
      7. Normal:          all Z-scores > -2  AND  MUAC > 12.5 cm
    """
    # SAM check
    sam_by_whz  = whz is not None and whz < -3
    sam_by_muac = muac_cm is not None and muac_cm < 11.5
    if sam_by_whz or sam_by_muac:
        return "sam"

    # MAM check
    mam_by_whz  = whz is not None and -3 <= whz < -2
    mam_by_muac = muac_cm is not None and 11.5 <= muac_cm < 12.5
    if mam_by_whz or mam_by_muac:
        return "mam"

    # Stunting
    if haz is not None and haz < -3:
        return "severely_stunted"
    if haz is not None and haz < -2:
        return "stunted"

    # Underweight
    if waz is not None and waz < -2:
        return "underweight"

    # At risk
    z_scores = [z for z in [waz, haz, whz] if z is not None]
    at_risk_by_z    = any(-2 <= z < -1.5 for z in z_scores)
    at_risk_by_muac = muac_cm is not None and 12.5 <= muac_cm <= 13.0
    if at_risk_by_z or at_risk_by_muac:
        return "at_risk"

    return "normal"
