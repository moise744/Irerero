# ai/ml_predictor.py
#
# Machine Learning risk prediction model — AI-FR-010 to AI-FR-015.
# Algorithm: RandomForest or GradientBoosting (selected by cross-validation).
# Phase 4 implementation — model training requires Rwanda ECD data.
# Currently uses rule-based scoring as a placeholder.
#
# AI-FR-011: RandomForestClassifier or GradientBoostingClassifier
# AI-FR-012: Risk score 0-100%, Low (0-30%) / Medium (31-60%) / High (61-100%)
# AI-FR-013: 14 training features listed in settings.ML_TRAINING_FEATURES
# AI-FR-014: Minimum 85% sensitivity for SAM detection on test dataset
# AI-FR-015: Model versioning maintained, re-trainable with new data

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Risk level thresholds — AI-FR-012
RISK_LOW    = (0,  30)
RISK_MEDIUM = (31, 60)
RISK_HIGH   = (61, 100)


def classify_risk_level(score: float) -> str:
    """Map 0-100 risk score to Low/Medium/High label — AI-FR-012."""
    if score <= 30:  return "low"
    if score <= 60:  return "medium"
    return "high"


def predict_malnutrition_risk(child_features: dict) -> dict:
    """
    Predict malnutrition risk for a child using the trained ML model.
    Falls back to rule-based scoring if model file is not available.

    Input features (AI-FR-013):
        age_months, sex, waz, haz, whz, muac_cm,
        waz_delta_3m, haz_delta_3m, whz_delta_3m, muac_delta_3m,
        attendance_rate_30d, enrolled_in_nutrition_programme,
        season_of_year, missed_programme_days_14d

    Returns:
        risk_score: 0-100
        risk_level: 'low' | 'medium' | 'high'
        shap_explanation: plain-language feature importance
        algorithm_used: 'RandomForest' | 'rule_based_fallback'
    """
    model_path = Path(__file__).parent / "model" / "malnutrition_predictor.pkl"

    if model_path.exists():
        return _predict_with_model(child_features, str(model_path))
    else:
        return _predict_rule_based(child_features)


def _predict_with_model(features: dict, model_path: str) -> dict:
    """Use the trained RandomForest/GradientBoosting model — AI-FR-011."""
    try:
        import joblib
        import numpy as np
        model = joblib.load(model_path)

        X = np.array([[
            features.get("age_months", 12),
            1 if features.get("sex") == "male" else 0,
            features.get("waz", 0) or 0,
            features.get("haz", 0) or 0,
            features.get("whz", 0) or 0,
            features.get("muac_cm", 13) or 13,
            features.get("waz_delta_3m", 0) or 0,
            features.get("haz_delta_3m", 0) or 0,
            features.get("whz_delta_3m", 0) or 0,
            features.get("muac_delta_3m", 0) or 0,
            features.get("attendance_rate_30d", 1.0) or 1.0,
            1 if features.get("enrolled_in_nutrition_programme") else 0,
            features.get("season_of_year", 1) or 1,
            features.get("missed_programme_days_14d", 0) or 0,
        ]])

        # Probability of malnutrition (class 1)
        prob     = model.predict_proba(X)[0][1]
        score    = round(prob * 100, 1)
        level    = classify_risk_level(score)
        shap_exp = _build_shap_explanation(features, score)

        return {
            "risk_score":       score,
            "risk_level":       level,
            "shap_explanation": shap_exp,
            "algorithm_used":   "RandomForestClassifier",
        }
    except Exception as e:
        logger.warning(f"ML model prediction failed: {e}. Falling back to rule-based.")
        return _predict_rule_based(features)


def _predict_rule_based(features: dict) -> dict:
    """
    Rule-based fallback when ML model is not trained yet.
    Used during Phase 3 before real Rwanda ECD training data is available.
    Achieves basic risk stratification using WHO thresholds.
    """
    score = 0.0

    waz      = features.get("waz")
    haz      = features.get("haz")
    whz      = features.get("whz")
    muac     = features.get("muac_cm")
    att_rate = features.get("attendance_rate_30d", 1.0) or 1.0
    deltas   = [features.get(k, 0) or 0 for k in ["waz_delta_3m", "haz_delta_3m", "whz_delta_3m"]]

    # Current Z-score contribution (0-40 pts)
    if whz is not None:
        if whz < -3:   score += 40
        elif whz < -2: score += 25
        elif whz < -1: score += 10
    if muac is not None:
        if muac < 11.5:  score += 40
        elif muac < 12.5: score += 20
        elif muac < 13.0: score += 8

    # Trend contribution — declining z-scores are concerning (0-30 pts)
    avg_delta = sum(deltas) / max(len([d for d in deltas if d != 0]), 1)
    if avg_delta < -0.5:  score += 30
    elif avg_delta < -0.2: score += 15

    # Attendance contribution (0-20 pts)
    if att_rate < 0.5:   score += 20
    elif att_rate < 0.7: score += 10

    # Missed programme days (0-10 pts)
    missed = features.get("missed_programme_days_14d", 0) or 0
    if missed >= 5:   score += 10
    elif missed >= 3: score += 5

    score = min(score, 100)
    level = classify_risk_level(score)

    return {
        "risk_score":       round(score, 1),
        "risk_level":       level,
        "shap_explanation": _build_shap_explanation(features, score),
        "algorithm_used":   "rule_based_fallback",
    }


def _build_shap_explanation(features: dict, score: float) -> dict:
    """
    Build plain-language SHAP-style explanation — AI-FR-018.
    No statistical jargon. Caregiver-readable text only — AI-FR-017.
    """
    reasons_en = []
    reasons_rw = []

    waz   = features.get("waz")
    whz   = features.get("whz")
    muac  = features.get("muac_cm")
    att   = features.get("attendance_rate_30d", 1.0) or 1.0
    delta = features.get("waz_delta_3m", 0) or 0

    if waz is not None and waz < -2:
        reasons_en.append("the child's weight is below the healthy range for their age")
        reasons_rw.append("ibiro by'umwana biri hasi y'umurego mwiza ku myaka ye")

    if whz is not None and whz < -2:
        reasons_en.append("the child's weight is low relative to their height (acute malnutrition)")
        reasons_rw.append("ibiro bye biri bike ku burebure bwe (inshyano ikaze)")

    if muac is not None and muac < 12.5:
        reasons_en.append(f"the arm measurement is {muac:.1f} cm which is below the healthy range")
        reasons_rw.append(f"uburebure bw'akaboko ni {muac:.1f} cm, buri munsi y'umurego mwiza")

    if delta < -0.3:
        reasons_en.append("the child has been losing weight over the past 3 months")
        reasons_rw.append("umwana yapoteje ibiro mu mezi 3 ashize")

    if att < 0.7:
        reasons_en.append(f"the child has only attended {int(att*100)}% of centre days this month")
        reasons_rw.append(f"umwana yaje gusa {int(att*100)}% by'iminsi y'ikigo iki cyezi")

    return {
        "risk_score":          score,
        "main_reasons_en":     reasons_en or ["No single factor stands out — monitoring recommended"],
        "main_reasons_rw":     reasons_rw or ["Nta mpamvu imwe ikabije — komeza gukurikirana"],
        "full_text_en":        "The main reasons for this risk score: " + "; ".join(reasons_en) if reasons_en else "Continue standard monitoring.",
        "full_text_rw":        "Impamvu z'intego: " + "; ".join(reasons_rw) if reasons_rw else "Komeza isuzuma risanzwe.",
    }


def train_model(training_data_path: str, model_version: str = "v1") -> dict:
    """
    Train or retrain the ML model with new data — AI-FR-015.
    Maintains model versioning so previous versions can be restored.

    Args:
        training_data_path: path to CSV with labelled training data
        model_version: version string for model file naming

    Returns:
        dict with training results including sensitivity achieved
    """
    try:
        import pandas as pd
        import joblib
        from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
        from sklearn.model_selection import cross_val_score, train_test_split
        from sklearn.metrics import recall_score

        from django.conf import settings
        FEATURES = settings.ML_TRAINING_FEATURES
        TARGET   = "nutritional_status_binary"  # 1 = SAM/MAM, 0 = normal/at_risk

        df = pd.read_csv(training_data_path)
        X  = df[FEATURES].fillna(0)
        y  = df[TARGET]

        # Try both algorithms, pick best by SAM sensitivity — AI-FR-011, AI-FR-014
        results = {}
        for name, clf in [
            ("RandomForestClassifier",     RandomForestClassifier(n_estimators=200, random_state=42, class_weight='balanced')),
            ("GradientBoostingClassifier", GradientBoostingClassifier(n_estimators=200, random_state=42)),
        ]:
            scores = cross_val_score(clf, X, y, cv=5, scoring='recall')
            results[name] = scores.mean()

        # Select best algorithm — highest SAM recall — AI-FR-014
        best_name = max(results, key=results.get)
        best_sensitivity = results[best_name]

        if best_sensitivity < settings.ML_MIN_SAM_SENSITIVITY:  # 85% minimum — AI-FR-014
            logger.warning(f"Best model sensitivity {best_sensitivity:.2%} < 85% target. More training data needed.")

        # Train final model
        clf_map = {
            "RandomForestClassifier":     RandomForestClassifier(n_estimators=200, random_state=42, class_weight='balanced'),
            "GradientBoostingClassifier": GradientBoostingClassifier(n_estimators=200, random_state=42),
        }
        final_clf = clf_map[best_name]
        final_clf.fit(X, y)

        # Save with versioning — AI-FR-015
        model_dir = Path(__file__).parent / "model"
        model_dir.mkdir(exist_ok=True)
        model_path = model_dir / f"malnutrition_predictor_{model_version}.pkl"
        joblib.dump(final_clf, str(model_path))
        # Update the active model symlink
        active_path = model_dir / "malnutrition_predictor.pkl"
        if active_path.exists():
            active_path.unlink()
        joblib.dump(final_clf, str(active_path))

        logger.info(f"Model trained: {best_name}, sensitivity={best_sensitivity:.2%}, version={model_version}")

        return {
            "algorithm":           best_name,
            "sensitivity_achieved": round(best_sensitivity * 100, 1),
            "meets_85pct_target":  best_sensitivity >= settings.ML_MIN_SAM_SENSITIVITY,
            "model_version":       model_version,
            "training_samples":    len(df),
        }
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        return {"error": str(e)}
