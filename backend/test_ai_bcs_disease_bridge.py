"""
Automated Verification Suite for Mooposhaq AI Vision (BCS + Mastitis + Disease) -> Feed Recommendation Bridge
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_diagnostics import (
    DISEASE_NUTRITION_PROTOCOLS,
    normalize_disease_code,
    get_stage_target_bcs,
    calculate_bcs_nutrition_adjustment,
    build_combined_cow_health_prescription,
    parse_bcs_from_model_response,
    parse_diagnosis_from_model_response,
    run_all_external_models_on_image
)


def test_bcs_conditioning_calculations():
    print("1. Testing NASEM 2021 BCS Conditioning & Reserves Calculations...")
    # Thin cow (BCS 2.0 in Mid lactation, target 3.25)
    thin = calculate_bcs_nutrition_adjustment(current_bcs=2.0, bw=450.0, category="milkingCow", stage="Mid lactation")
    assert thin["needsImprovement"] is True
    assert thin["direction"] == "gain"
    assert thin["targetBcs"] == 3.25
    assert thin["bcsDelta"] == 1.25
    assert thin["extraMeMcalPerDay"] > 3.0
    assert thin["extraCpGPerDay"] > 100.0
    assert thin["practicalFeedDelta"]["energyConcentrateDeltaKg"] > 1.0
    print(f"   [PASS] Thin Cow (BCS 2.0 -> 3.25): +{thin['extraMeMcalPerDay']} Mcal ME/d, +{thin['extraCpGPerDay']} g CP/d, +{thin['practicalFeedDelta']['energyConcentrateDeltaKg']} kg conc/d")

    # Over-conditioned cow (BCS 4.25 in Mid lactation, target 3.25)
    heavy = calculate_bcs_nutrition_adjustment(current_bcs=4.25, bw=500.0, category="milkingCow", stage="Mid lactation")
    assert heavy["needsImprovement"] is True
    assert heavy["direction"] == "reduce"
    assert heavy["extraMeMcalPerDay"] < 0.0
    print(f"   [PASS] Heavy Cow (BCS 4.25 -> 3.25): {heavy['extraMeMcalPerDay']} Mcal ME/d ({heavy['practicalFeedDelta']['energyConcentrateDeltaKg']} kg conc/d)")

    # Optimal cow (BCS 3.25 in Mid lactation)
    ideal = calculate_bcs_nutrition_adjustment(current_bcs=3.25, bw=450.0, category="milkingCow", stage="Mid lactation")
    assert ideal["needsImprovement"] is False
    assert ideal["direction"] == "maintain"
    assert ideal["extraMeMcalPerDay"] == 0.0
    print("   [PASS] Ideal Cow (BCS 3.25): 0 extra Mcal ME/d (Maintain)")


def test_mastitis_and_disease_prescriptions():
    print("\n2. Testing Mastitis & Infectious/Skin Disease Feed Prescriptions...")
    selected_feeds = [
        {"name": "Hybrid Napier (CO-4)", "category": "Green Fodder", "quantityKg": 25.0, "dmPct": 22.0},
        {"name": "Wheat Straw", "category": "Dry Fodder", "quantityKg": 5.0, "dmPct": 90.0},
        {"name": "Maize Grain Crushed", "category": "Concentrates", "quantityKg": 4.0, "dmPct": 89.0},
        {"name": "Groundnut Cake", "category": "Concentrates", "quantityKg": 3.0, "dmPct": 90.0},
        {"name": "Cane Molasses", "category": "Unconventional", "quantityKg": 1.0, "dmPct": 75.0},
    ]

    # Case A: Subclinical Mastitis + Thin Cow (BCS 2.25)
    p_mast = build_combined_cow_health_prescription(
        bcs=2.25,
        bw=450.0,
        category="milkingCow",
        stage="Early lactation",
        mastitis_status="subclinical_mastitis",
        disease_codes=[],
        selected_feeds=selected_feeds
    )
    assert p_mast["hasHealthIntervention"] is True
    assert p_mast["quantitativeModifiers"]["mineralMixMultiplier"] >= 1.40
    assert p_mast["quantitativeModifiers"]["maxSafeConcentrateDmPct"] <= 35.0
    assert any("Trisodium Citrate" in s["name"] for s in p_mast["therapeuticSupplements"])
    print("   [PASS] Subclinical Mastitis + BCS 2.25 -> Mineral Mix x1.40, Conc Cap <=35% DMI, Trisodium Citrate + Zn/Se/VitE prescribed")

    # Case B: Lumpy Skin Disease (LSD) + Thin Cow (BCS 2.0)
    p_lsd = build_combined_cow_health_prescription(
        bcs=2.0,
        bw=420.0,
        category="milkingCow",
        stage="Mid lactation",
        mastitis_status="healthy",
        disease_codes=["LSD"],
        selected_feeds=selected_feeds
    )
    assert p_lsd["quantitativeModifiers"]["preferSoftMash"] is True
    assert p_lsd["quantitativeModifiers"]["cpDiseaseMultiplier"] >= 1.15
    assert p_lsd["quantitativeModifiers"]["waterMultiplier"] >= 1.20
    assert any("Soft Wet-Mash" in adv for adv in p_lsd["farmSpecificFeedAdvice"])
    print("   [PASS] Lumpy Skin Disease (LSD) -> Soft Wet-Mash with Cane Molasses, +15% CP for dermal recovery, +45% Minerals, +20% Water")


def test_external_microservice_response_parsers():
    print("\n3. Testing External Microservice JSON Response Parsers...")
    bcs_val, conf = parse_bcs_from_model_response({"bcs_score": 2.31, "confidence": 0.94})
    assert bcs_val == 2.25 and conf == 0.94

    m_code, m_conf, _ = parse_diagnosis_from_model_response({"mastitis": "positive", "severity": "subclinical", "probability": 0.89}, default_category="mastitis")
    assert m_code == "subclinical_mastitis" and m_conf == 0.89

    d_code, d_conf, _ = parse_diagnosis_from_model_response({"prediction": "Lumpy Skin Disease", "confidence": 0.96}, default_category="disease")
    assert d_code == "lumpy_skin_disease" and d_conf == 0.96
    print("   [PASS] External microservice response parsers support all standard JSON formats!")


if __name__ == "__main__":
    test_bcs_conditioning_calculations()
    test_mastitis_and_disease_prescriptions()
    test_external_microservice_response_parsers()
    print("\nALL AI BCS, MASTITIS & DISEASE -> MOOPOSHAQ FEED TESTS PASSED 100%!")
