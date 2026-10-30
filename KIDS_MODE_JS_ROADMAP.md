# Kids Mode — JavaScript Development Roadmap

> Branch: `dc` · Working area: `seperate pages/kids mode setup/`
>
> This is a coding checklist, **not** a claim that each feature already works. Work through it in order, test each step, and check it off when done. Keep experimental changes on `dc` until reviewed.

## Table of Contents

1. [Current code](#1-current-code)
2. [Fix setup form bugs](#2-fix-setup-form-bugs)
3. [Improve character selection](#3-improve-character-selection)
4. [Save and load the character](#4-save-and-load-the-character)
5. [Build the Kids Mode home screen](#5-build-the-kids-mode-home-screen)
6. [Connect tasks and rewards](#6-connect-tasks-and-rewards)
7. [Make navigation work](#7-make-navigation-work)
8. [Test and prepare to merge](#8-test-and-prepare-to-merge)
9. [JavaScript file guide](#9-javascript-file-guide)

## 1. Current code

- `seperate pages/kids mode setup/index.html` — two-step setup UI
- `seperate pages/kids mode setup/script.js` — step switching, shirt selection, character saving
- `seperate pages/kids mode setup/style.css` — layout and character preview
- `index.html` — links to Kids Mode setup from the main app on `dc`

**Already coded:** next-step button, four shirt options, preview images, and a Finish button that saves a character in `localStorage`.

## 2. Fix setup form bugs

- [ ] Give the user's name input a unique ID, such as `playerName`.
- [ ] Keep `characterName` only for the character's name.
- [ ] Read and validate **both** values in `script.js`.
- [ ] Fix the label typo: “What's your character's name?”
- [ ] Make Finish save both names, without losing the selected shirt.
- [ ] Show helpful inline messages for empty names instead of relying only on alerts.

**Done when:** both names are entered separately and saved correctly.

## 3. Improve character selection

- [ ] Check that orange, green, purple, and blue shirt image paths all load.
- [ ] Add accessible labels or pressed states to selected shirt buttons.
- [ ] Preserve the selected shirt when moving between setup steps.
- [ ] Provide a fallback if an image is missing.

**Done when:** every shirt selection updates the preview on desktop and mobile.

## 4. Save and load the character

- [ ] Create small functions such as `saveKidsCharacter(character)` and `loadKidsCharacter()`.
- [ ] Validate saved JSON and handle missing or corrupted values.
- [ ] Load a saved character when the user revisits setup.
- [ ] Decide how Kids Mode data should be associated with the currently signed-in Ascendra account.
- [ ] Do **not** overwrite existing main-app or cloud profile data without an explicit plan.

**Done when:** refreshing the page preserves the character for the correct account.

## 5. Build the Kids Mode home screen

- [ ] Create a simple dashboard with the character's name and shirt.
- [ ] Add clear buttons for Tasks, Rewards, and Character.
- [ ] Show an empty state for users with no tasks.
- [ ] Make the layout work on a narrow phone screen.

**Done when:** completing setup leads to a usable Kids Mode home page.

## 6. Connect tasks and rewards

- [ ] Decide whether Kids Mode uses existing Ascendra To-Dos or a separate kid-friendly task list.
- [ ] Add a function to display tasks safely using `textContent`.
- [ ] Allow completing a task and updating the visible list.
- [ ] Plan a simple, consistent reward system (for example, points per completed task).
- [ ] Prevent double rewards for the same completion.
- [ ] Test what happens if a task is undone or deleted.

**Done when:** task completion updates the UI and rewards consistently.

## 7. Make navigation work

- [ ] Add a reliable way to enter Kids Mode from Ascendra.
- [ ] Add Back and Home navigation within Kids Mode.
- [ ] Ensure the signed-in account stays the same while switching views.
- [ ] Decide whether Kids Mode is a standalone page or part of Ascendra's SPA router before integrating.
- [ ] Make keyboard and touch navigation usable.

**Done when:** users can enter and leave Kids Mode without getting stuck.

## 8. Test and prepare to merge

- [ ] Test new setup with blank and valid names.
- [ ] Test all shirt colours.
- [ ] Test refreshing and reopening the page.
- [ ] Test on iPhone and desktop.
- [ ] Check browser console for JavaScript errors.
- [ ] Review changes with Jayden and resolve conflicts before merging.
- [ ] Merge into `real` **only after** the feature is ready.

## 9. JavaScript file guide

| File | Purpose |
| --- | --- |
| `seperate pages/kids mode setup/script.js` | Current setup logic; start here |
| `seperate pages/kids mode setup/index.html` | Inputs, buttons, and preview markup |
| `seperate pages/kids mode setup/style.css` | Appearance and responsive layout |
| `src/js/script.js` | Main Ascendra SPA logic; integrate only when ready |
| `src/js/syncing.js` | Existing cloud sync; review before adding Kids Mode sync |

### Recommended first coding session

1. Fix the duplicate `characterName` IDs.
2. Update JavaScript to read **both** names.
3. Test saving the two names and shirt colour.
4. Commit the small working change to `dc`.

---

**Rule of thumb:** one working feature, one test, one commit at a time. 🦊
