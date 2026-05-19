#!/usr/bin/env python3
"""Fix common UTF-8 mojibake in public/demo/student.html."""
from pathlib import Path

REPLACEMENTS = [
    ("\u00e2\u0082\u00b9", "\u20b9"),  # rupee
    ("\u00e2\u0080\u0094", "\u2014"),  # em dash
    ("\u00e2\u0080\u00a6", "\u2026"),  # ellipsis
    ("\u00e2\u0086\u0090", "\u2190"),  # left arrow
    ("\u00e2\u009c\u0093", "\u2713"),  # check
    ("\u00e2\u0097\u0089", "\u25c9"),  # fisheye
    ("\u00e2\u0097\u008b", "\u25cb"),  # circle
    ("\u00e2\u0088\u0092", "\u2212"),  # minus
    ("\u00e2\u0098\u0095", "\u2615"),  # coffee
    ("\u00e2\u0098\u00be", "\U0001f6d2"),  # cart
    ("\u00c2\u00b7", "\u00b7"),  # middle dot
]

path = Path(__file__).resolve().parents[1] / "public" / "demo" / "student.html"
text = path.read_text(encoding="utf-8")
original = text
for old, new in REPLACEMENTS:
    text = text.replace(old, new)
# Section comment box-drawing mojibake -> ASCII
text = text.replace("\u00e2\u0094\u0080\u00e2\u0094\u0080\u00e2\u0094\u0080", "---")
if text != original:
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"Updated {path}")
else:
    print("No changes needed")
