from pathlib import Path
extensions = {
    ".js": "JavaScript",
    ".css": "CSS",
    ".html": "HTML",
    ".py": "Python",
    ".cs": "C#"
}

counts = {language: 0 for language in extensions.values()}

excluded = {".git", "node_modules", ".venv", "venv", "__pycache__"}

for file in Path(".").rglob("*"):
    if not file.is_file():
        continue

    if any(folder in excluded for folder in file.parts):
        continue

    if file.suffix not in extensions:
        continue

    try:
        with open(file, encoding="utf-8") as f:
            lines = f.readlines()
    except (UnicodeError, OSError):
        continue

    language = extensions[file.suffix]

    for line in lines:
        if line.strip():
            counts[language] += 1

total = sum(counts.values())

stats = "# Ascendra Stats\n\n"
stats += f"- **Lines: {total:,}**\n\n"
stats += "## Ascendra %\n"

for language, count in counts.items():
    percentage = (count / total * 100) if total else 0
    stats += f"- **{language}:** {percentage:.1f}%\n"

Path("docs").mkdir(exist_ok=True)
Path("docs/stats.md").write_text(stats, encoding="utf-8")

print("Updated docs/stats.md!")