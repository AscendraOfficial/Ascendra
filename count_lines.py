from pathlib import Path

extensions = {
    ".js": "JavaScript",
    ".css": "CSS",
    ".html": "HTML",
    ".py": "Python",
    ".cs": "C#"
}

for file in Path(".").rglob("*"):
    if file.suffix in extensions:
        print(file)
