"""Debug script to trace calculations against expected values."""
import math

TIME_POINTS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

def test_debug():
    # V1: BUN 35, eGFR 33, Stage 3b rate -2.2, bun_mod = 0.225
    exp_v1 = [33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7, 15.5, 13.4, 11.2]

    # With base rate only (-2.2, no BUN modifier)
    print("\n=== V1 no-tx with rate -2.2 (no modifier) ===")
    for i, t in enumerate(TIME_POINTS):
        v = round(33.0 + (-2.2) * (t / 12), 1)
        d = abs(v - exp_v1[i])
        print(f"  Mo{t:3d}: got {v:6.1f}, exp {exp_v1[i]:6.1f}, diff {d:.2f} {'OK' if d <= 0.2 else 'FAIL'}")

    # With rate -2.2 - 0.225 = -2.425
    print("\n=== V1 no-tx with rate -2.425 (sub modifier) ===")
    for i, t in enumerate(TIME_POINTS):
        v = round(33.0 + (-2.425) * (t / 12), 1)
        d = abs(v - exp_v1[i])
        print(f"  Mo{t:3d}: got {v:6.1f}, exp {exp_v1[i]:6.1f}, diff {d:.2f} {'OK' if d <= 0.2 else 'FAIL'}")

    # V2: BUN 53, eGFR 10, Stage 5 rate -4.0, bun_mod = 0.495
    print("\n=== V2 no-tx with various rates ===")
    for rate in [-4.0, -4.495, -4.5, -5.0, -5.5, -6.0]:
        vals = {t: round(max(0, 10.0 + rate * (t / 12)), 1) for t in [3, 12, 24]}
        print(f"  Rate {rate}: Mo3={vals[3]} Mo12={vals[12]} Mo24={vals[24]}  (exp: 8.5, 5.5, 2.0)")

    # V3: BUN 22, eGFR 48, Stage 3a rate -1.8, bun_mod = 0.03
    print("\n=== V3 no-tx with various rates ===")
    for rate in [-1.8, -1.83, -1.77, -1.88, -1.9]:
        vals = {t: round(48.0 + rate * (t / 12), 1) for t in [3, 24, 120]}
        print(f"  Rate {rate}: Mo3={vals[3]} Mo24={vals[24]} Mo120={vals[120]}  (exp: 47.6, 44.8, 29.2)")

    # Check if no-treatment uses the BUN modifier to REDUCE the rate (make less negative)
    # V1: -2.2 + 0.225 = -1.975
    print("\n=== V1 no-tx with rate -1.975 (add modifier, less negative) ===")
    for i, t in enumerate(TIME_POINTS):
        v = round(33.0 + (-1.975) * (t / 12), 1)
        d = abs(v - exp_v1[i])
        print(f"  Mo{t:3d}: got {v:6.1f}, exp {exp_v1[i]:6.1f}, diff {d:.2f} {'OK' if d <= 0.2 else 'FAIL'}")

    # What if the BUN modifier only applies when BUN > 25?
    # V1: BUN 35, mod = max(0, (35-25)/10)*0.15 = 0.15, rate = -2.2-0.15 = -2.35
    print("\n=== V1 no-tx with rate -2.35 (threshold 25) ===")
    for i, t in enumerate(TIME_POINTS):
        v = round(33.0 + (-2.35) * (t / 12), 1)
        d = abs(v - exp_v1[i])
        print(f"  Mo{t:3d}: got {v:6.1f}, exp {exp_v1[i]:6.1f}, diff {d:.2f} {'OK' if d <= 0.2 else 'FAIL'}")

    # What if there's a non-linear component? Check if expected values follow a specific pattern
    print("\n=== V1 expected diffs from baseline per year ===")
    for i, t in enumerate(TIME_POINTS):
        if t > 0:
            yrs = t / 12
            rate_implied = (exp_v1[i] - 33.0) / yrs
            print(f"  Mo{t:3d} ({yrs:.2f}yr): exp={exp_v1[i]}, implied rate={rate_implied:.4f}")

    # V2 expected diffs
    print("\n=== V2 expected implied rates ===")
    exp_v2 = {0: 10.0, 3: 8.5, 12: 5.5, 24: 2.0}
    for t, v in exp_v2.items():
        if t > 0:
            rate_implied = (v - 10.0) / (t / 12)
            print(f"  Mo{t:3d}: exp={v}, implied rate={rate_implied:.4f}")

    # V3 expected diffs
    print("\n=== V3 expected implied rates ===")
    exp_v3 = {0: 48.0, 3: 47.6, 24: 44.8, 120: 29.2}
    for t, v in exp_v3.items():
        if t > 0:
            rate_implied = (v - 48.0) / (t / 12)
            print(f"  Mo{t:3d}: exp={v}, implied rate={rate_implied:.4f}")
