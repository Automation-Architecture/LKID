"""Debug tests to trace intermediate values."""
from prediction_engine import predict, _compute_annual_decline, _phase1_fraction, _phase2_fraction, TIER_CONFIG, PHASE1_COEFF, TIME_POINTS_MONTHS

def test_v1_debug():
    """Trace V1 calculations."""
    result = predict(bun=35, creatinine=2.1, age=58, egfr_entered=33)

    # No-treatment
    rate = _compute_annual_decline(33, 35)
    print(f"\nV1 no-tx rate: {rate}")
    no_tx = result["trajectories"]["no_treatment"]
    print(f"V1 no-tx: {no_tx}")

    # BUN 18-24
    cfg = TIER_CONFIG["bun_18_24"]
    p1 = min(cfg["phase1_cap"], (35 - cfg["target_bun"]) * PHASE1_COEFF)
    p2 = cfg["phase2_total"]
    print(f"\nV1 bun1824: P1={p1}, P2={p2}, peak={33+p1+p2}")
    print(f"  phase1_frac(1)={_phase1_fraction(1):.4f}")
    print(f"  phase1_frac(3)={_phase1_fraction(3):.4f}")
    print(f"  phase2_frac(6)={_phase2_fraction(6):.4f}")
    print(f"  phase2_frac(12)={_phase2_fraction(12):.4f}")
    print(f"  phase2_frac(24)={_phase2_fraction(24):.4f}")
    traj = result["trajectories"]["bun_18_24"]
    print(f"V1 bun1824: {traj}")
    print(f"  Expected: [33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4, 28.9, 27.4, 25.9]")

    # BUN <=12
    cfg12 = TIER_CONFIG["bun_12"]
    p1_12 = min(cfg12["phase1_cap"], (35 - cfg12["target_bun"]) * PHASE1_COEFF)
    p2_12 = cfg12["phase2_total"]
    print(f"\nV1 bun12: P1={p1_12}, P2={p2_12}, peak={33+p1_12+p2_12}")
    traj12 = result["trajectories"]["bun_12"]
    print(f"V1 bun12: {traj12}")
    print(f"  Expected: [33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2, 42.7, 42.2, 41.7]")

    # V1 dial_age
    print(f"\nV1 dial_ages: {result['dial_ages']}")

def test_v1_reverse_engineer():
    """Figure out what P1 values produce the expected peaks."""
    print("\n=== Reverse-engineering expected P1 values ===")

    # From expected peaks (Mo 24 values):
    # BUN 18-24: 37.9 = 33 + P1 + 4.0 -> P1 = 0.9
    # BUN 13-17: 41.4 = 33 + P1 + 6.0 -> P1 = 2.4
    # BUN <=12:  45.7 = 33 + P1 + 8.0 -> P1 = 4.7

    tiers = [
        ("bun_18_24", 21, 6, 4.0, 0.9),
        ("bun_13_17", 15, 9, 6.0, 2.4),
        ("bun_12", 10, 12, 8.0, 4.7),
    ]

    for name, target, cap, p2, needed_p1 in tiers:
        raw_p1 = (35 - target) * 0.31
        capped_p1 = min(cap, raw_p1)
        print(f"  {name}: target={target}, raw_P1={raw_p1:.2f}, capped={capped_p1:.2f}, needed={needed_p1}")

        # What if the gains are applied on top of no-treatment trajectory?
        # no_tx at Mo24 = 28.4 (expected)
        # treatment Mo24 = no_tx_Mo24 + P1 + P2
        # 37.9 = 28.4 + P1 + 4.0 -> P1 = 5.5
        no_tx_24 = 28.4
        p1_from_notx = needed_p1  # already computed
        print(f"    If additive on no-tx: need P1+P2={37.9-28.4:.1f}={capped_p1+p2:.2f}")

def test_v2_notx_debug():
    """Trace V2 no-treatment."""
    result = predict(bun=53, creatinine=5.0, age=65, egfr_entered=10)
    rate = _compute_annual_decline(10, 53)
    print(f"\nV2 no-tx rate: {rate}")
    no_tx = result["trajectories"]["no_treatment"]
    print(f"V2 no-tx: {no_tx}")
    print(f"  Expected Mo0=10, Mo3=8.5, Mo12=5.5, Mo24=2.0")
    print(f"V2 dial_ages: {result['dial_ages']}")

def test_v3_debug():
    """Trace V3."""
    result = predict(bun=22, creatinine=1.5, age=52, egfr_entered=48)
    rate = _compute_annual_decline(48, 22)
    print(f"\nV3 no-tx rate: {rate}")
    no_tx = result["trajectories"]["no_treatment"]
    print(f"V3 no-tx: {no_tx}")
    print(f"  Expected Mo3=47.6, Mo24=44.8, Mo120=29.2")

    # Treatment trajectories
    for tier in ["bun_18_24", "bun_13_17", "bun_12"]:
        traj = result["trajectories"][tier]
        print(f"V3 {tier}: {traj}")
