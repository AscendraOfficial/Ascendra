# Ascendra Code Map — HTML, JavaScript & CSS

> **Branch:** `dc` · **Line numbers checked against this branch on 2026-10-29.**
>
> This is a **table of contents for the source code**, not a feature-development roadmap. Lines will move when code is added or removed. Search for the page name or section heading if the numbers become outdated.

## Quick links

- [HTML page templates](#html--indexhtml)
- [JavaScript page logic](#javascript--srcjsscriptjs)
- [CSS style sections](#css--srccssstylecss)
- [Shared code and caveats](#shared-code-and-caveats)

## HTML — `index.html`

Each range begins at a `<template id="page-...">` and ends just before the next page template. It may include comments or spacing between templates.

| Page | Lines |
| --- | --- |
| welcome | 36–59 |
| loading-screen | 60–64 |
| login | 65–87 |
| signup | 88–133 |
| home | 134–185 |
| alerts | 186–203 |
| todos | 204–278 |
| habits | 279–353 |
| breathing | 354–386 |
| calendar | 387–444 |
| journal | 445–496 |
| menu | 497–549 |
| settings | 550–599 |
| stats | 600–915 |
| achievements | 916–986 |
| profile | 987–1075 |
| extras | 1076–1105 |
| privacy | 1106–1189 |
| terms | 1190–1267 |
| about | 1268–1405 |
| credits | 1406–1447 |
| comingsoon | 1448–1455 |
| projects | 1456–1463 |
| roadmap | 1464–1605 |
| minitools | 1606–1666 |
| unwind | 1667–1724 |
| studyspace | 1725–1866 |
| capsule | 1867–2020 |

**Example:** To edit the Habits page structure, open `index.html` and go to **lines 279–353**.

## JavaScript — `src/js/script.js`

These ranges cover entries in `ROUTE_INITIALIZERS`, which contains the main JavaScript logic for each page. Helpers used by these pages also appear elsewhere in the file.

| Page / route | Lines |
| --- | --- |
| welcome | 2773–2887 |
| login | 2888–3030 |
| signup | 3031–3135 |
| home | 3136–3406 |
| alerts | 3407–3580 |
| todos | 3581–3887 |
| habits | 3888–4217 |
| breathing | 4218–4330 |
| calendar | 4331–4539 |
| journal | 4540–4961 |
| menu | 4962–5075 |
| settings | 5076–5137 |
| stats | 5138–5816 |
| achievements | 5817–5823 |
| unwind | 5824–5961 |
| profile | 5962–6282 |
| extras | 6283–6283 |
| studyspace | 6284–6545 |
| capsule | 6546–6742 |
| minitools | 6743–6820 |
| privacy | 6821–6821 |
| terms | 6822–6822 |
| about | 6823–6823 |
| credits | 6824–6824 |
| roadmap | 6825–6825 |
| comingsoon | 6826–6826 |
| projects | 6827–7511 |

**Example:** Habits page initializer starts at **line 3888**. Its main section runs to **line 4217**.

## CSS — `src/css/style.css`

These ranges follow the file's large `/* ===== SECTION ===== */` headings. Some pages have **additional styles later in the file**, especially mobile, dark-mode, and shared rules.

| Section | Lines |
| --- | --- |
| WELCOME | 81–229 |
| LOADING-SCREEN | 230–244 |
| LOGIN | 245–288 |
| SIGNUP | 289–332 |
| HOME | 333–684 |
| ALERTS | 685–1004 |
| TODOS | 1005–1386 |
| HABITS | 1387–1835 |
| BREATHING | 1836–2162 |
| CALENDAR | 2163–2570 |
| JOURNAL | 2571–2978 |
| MENU | 2979–3500 |
| SETTINGS | 3501–3687 |
| STATS | 3688–4314 |
| ACHIEVEMENTS AND XP | 4315–4717 |
| TIME CAPSULE | 4718–5108 |
| PROFILE | 5109–5520 |
| EXTRAS | 5521–5635 |
| MINI TOOLS | 5636–5899 |
| UNWIND | 5900–6195 |
| PRIVACY | 6196–6220 |
| TERMS | 6221–6251 |
| ABOUT | 6252–6414 |
| CREDITS | 6415–6652 |
| COMINGSOON | 6653–6683 |
| PROJECTS | 6684–8408 |
| STUDY SPACE | 8409–9438 |
| STABILITY, ACCESSIBILITY, AND SAFE-AREA FIXES | 9439–9563 |
| HABIT QR IMPORT | 9564–10219 |

**Example:** Main Habits styling begins at **line 1387** and runs to **line 1835**.

## Shared code and caveats

- **HTML:** The beginning of `index.html` (lines 1–35) contains the document shell, metadata, and app container. The end after the last page template contains shared scripts and dialogs.
- **JavaScript:** Lines **1–2772** include imports/configuration, storage helpers, accounts, rewards, route functions, and other shared utilities. The `ROUTE_INITIALIZERS` section continues into global search and AI code after the page initializers.
- **CSS:** Lines **1–80** contain base/global styles. Styles below the main named sections may override earlier rules.
- **Kids Mode setup:** Its standalone files are under `seperate pages/kids mode setup/` on `dc`, not in the main three file sections above.
- **Branch warning:** `real`, `development`, and `dc` have different line numbers. **Do not use this map as exact line references on other branches.**

### Tip: jump straight to a line in VS Code

Press **Ctrl+G** (Windows) or **Control+G** (Mac), type the line number, and press Enter.
