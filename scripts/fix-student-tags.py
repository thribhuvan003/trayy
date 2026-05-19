from pathlib import Path

path = Path(__file__).resolve().parents[1] / "public" / "demo" / "student.html"
text = path.read_text(encoding="utf-8")
wrong_close = "</" + "motion" + "." + "div>"
right_close = "</" + "div>"
count = text.count(wrong_close)
text = text.replace(wrong_close, right_close)
path.write_text(text, encoding="utf-8", newline="\n")
print(f"fixed {count} occurrences of {wrong_close!r} -> {right_close!r}")
