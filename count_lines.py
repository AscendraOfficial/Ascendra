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
        with open(file, encoding="utf-8") as f:
            lines = f.readlines()

        count = 0

        for line in lines:
            if line.strip():
                count += 1

        print(file, count)