"""
Sol Voyager — Evaluation & Dataset Validation
==============================================
Computes dataset statistics and provides a precision/recall framework for
future ground-truth validation.

CURRENT LIMITATION
------------------
The dataset contains only label=1 entries (heuristic positives from pipeline
output). Without label=0 (verified stable areas), we cannot compute meaningful
precision or recall. This script flags that gap and provides the exact
infrastructure needed once ground-truth data is collected.

WHAT "GROUND TRUTH" MEANS HERE
--------------------------------
A ground-truth dataset would pair each NPY patch with a verified outcome:
  label=1 : confirmed subsidence / sinkhole event (survey, InSAR, news report)
  label=0 : confirmed stable area over the same period

Recommended sources:
  - USGS National Sinkhole Database    (USA)
  - BGS GeoSure                        (UK)
  - CNR-IREA InSAR Italia / PST-A      (Italy)
  - Karapınar municipal survey records (Turkey)
  - Copernicus EGMS (European Ground Motion Service)

Usage
-----
  python scripts/evaluate.py
  python scripts/evaluate.py --threshold 50   # set confidence threshold
"""

import argparse
import csv
import sys
from pathlib import Path

LABELS_CSV = Path(__file__).parent.parent / "dataset" / "labels" / "labels.csv"
IMAGES_DIR = Path(__file__).parent.parent / "dataset" / "images"


# ── I/O ──────────────────────────────────────────────────────────────────────

def load_labels(csv_path=LABELS_CSV):
    entries = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw = row.get("label", "").strip()
            label = int(raw) if raw.lstrip("-").isdigit() else None
            entries.append({"filename": row["filename"], "label": label})
    return entries


# ── Metrics ──────────────────────────────────────────────────────────────────

def precision_recall_f1(tp, fp, fn):
    """Return (precision, recall, f1) — all zero if denominators are zero."""
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    return round(precision, 4), round(recall, 4), round(f1, 4)


def threshold_sweep(confidence_scores, ground_truth, thresholds=None):
    """
    Compute precision / recall / F1 at multiple confidence thresholds.

    Args:
        confidence_scores : list[float]  — model output (0–100)
        ground_truth      : list[int]    — 0 or 1 per sample
        thresholds        : list[float]  — confidence values to test

    Returns:
        list[dict] one entry per threshold
    """
    if thresholds is None:
        thresholds = [20, 35, 50, 65, 80]

    results = []
    for t in thresholds:
        preds = [1 if s >= t else 0 for s in confidence_scores]
        tp = sum(p == 1 and g == 1 for p, g in zip(preds, ground_truth))
        fp = sum(p == 1 and g == 0 for p, g in zip(preds, ground_truth))
        fn = sum(p == 0 and g == 1 for p, g in zip(preds, ground_truth))
        prec, rec, f1 = precision_recall_f1(tp, fp, fn)
        results.append(
            {"threshold": t, "precision": prec, "recall": rec, "f1": f1,
             "tp": tp, "fp": fp, "fn": fn}
        )
    return results


# ── Dataset audit ─────────────────────────────────────────────────────────────

def dataset_stats(entries):
    valid = [e for e in entries if e["label"] is not None]
    positives = sum(1 for e in valid if e["label"] == 1)
    negatives = sum(1 for e in valid if e["label"] == 0)
    missing = sum(1 for e in valid if not (IMAGES_DIR / e["filename"]).exists())
    return {
        "total_entries": len(entries),
        "valid_labels": len(valid),
        "positives_(label=1)": positives,
        "negatives_(label=0)": negatives,
        "missing_npy_files": missing,
        "class_balanced": positives > 0 and negatives > 0,
    }


def print_stats(stats):
    print("\n=== Dataset Audit ===")
    for k, v in stats.items():
        print(f"  {k:<30} {v}")


def print_gap_warning(stats):
    neg = stats["negatives_(label=0)"]
    pos = stats["positives_(label=1)"]
    if neg == 0:
        print("\n[WARNING] No negative samples (label=0) found.")
        print("  Precision/recall cannot be computed without both classes.")
        print("  To fix:")
        print("    1. Identify stable areas with no historical sinkhole activity.")
        print("    2. Run the pipeline on those areas and save patches as label=0.")
        print("    3. Re-run this script to compute full evaluation metrics.")
    else:
        ratio = pos / neg
        print(f"\n  Class ratio (pos/neg): {pos}/{neg} = {ratio:.2f}")
        if ratio > 5:
            print("  [WARNING] Dataset is heavily imbalanced (>5:1). "
                  "Consider oversampling negatives or using weighted loss.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sol Voyager dataset evaluation")
    parser.add_argument(
        "--threshold", type=float, default=65.0,
        help="Confidence threshold for positive classification (default: 65)"
    )
    parser.add_argument(
        "--csv", type=Path, default=LABELS_CSV,
        help="Path to labels CSV (default: dataset/labels/labels.csv)"
    )
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"[ERROR] Labels file not found: {args.csv}", file=sys.stderr)
        sys.exit(1)

    entries = load_labels(args.csv)
    stats = dataset_stats(entries)
    print_stats(stats)
    print_gap_warning(stats)

    # If we ever have both classes, compute threshold sweep automatically
    valid = [e for e in entries if e["label"] is not None]
    if stats["negatives_(label=0)"] > 0 and stats["positives_(label=1)"] > 0:
        print("\n=== Threshold Sweep (requires confidence scores in CSV) ===")
        print("  Add a 'confidence' column to labels.csv to enable this table.")
        if "confidence" in (valid[0] if valid else {}):
            scores = [float(e.get("confidence", 0)) for e in valid]
            truths = [e["label"] for e in valid]
            rows = threshold_sweep(scores, truths)
            header = f"  {'Threshold':>10}  {'Precision':>10}  {'Recall':>10}  {'F1':>10}  {'TP':>5}  {'FP':>5}  {'FN':>5}"
            print(header)
            for r in rows:
                print(
                    f"  {r['threshold']:>10.0f}  {r['precision']:>10.4f}  "
                    f"{r['recall']:>10.4f}  {r['f1']:>10.4f}  "
                    f"{r['tp']:>5}  {r['fp']:>5}  {r['fn']:>5}"
                )
    print()


if __name__ == "__main__":
    main()
