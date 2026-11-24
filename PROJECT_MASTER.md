# SGM Factory Inspection — Project Master & Change Control

**Baseline:** v1.6 (working version confirmed by project owner)  
**Checkpoint date:** 24 November 2026  
**Status:** Operational — preserve existing behaviour unless a change is explicitly requested  
**Organisation:** SGM Window Manufacturing Ltd  
**GitHub repository:** https://github.com/darrenstewartuk-rgb/sgm-inspection  
**Branch:** `main`  
**Live URL:** https://darrenstewartuk-rgb.github.io/sgm-inspection/index.html  
**Android shortcut:** SGM Inspect / SGM Inspection — no GPT or ChatGPT wording

> **Purpose:** This is the project handover and change-control document. Before future amendments, inspect the latest GitHub files. This document records the v1.6 baseline; it is not a substitute for inspecting the current source code after subsequent updates.

## 1. Project objective

A mobile-friendly, installable factory and office health-and-safety inspection application for SGM. An inspector chooses one or more inspection areas, works through structured checklists, records outcomes and evidence, assigns actions, and produces reports. The app is hosted on GitHub Pages and can run in a standalone Android shortcut.

The user has confirmed the current application works correctly. **Avoid unnecessary redesign or functionality changes.**

## 2. Deployment & project structure

GitHub Pages serves the `main` branch of `darrenstewartuk-rgb/sgm-inspection`. It is a static HTML/CSS/JavaScript Progressive Web App (PWA); there is no central application server or shared inspection database.

| File | Responsibility |
|---|---|
| `index.html` | App shell, script/style loading, PWA service-worker registration/update |
| `js/config.js` | App version, audit locations, checklist sections and questions, default assignees |
| `js/app.js` | Screens, navigation, inspection creation, scores, photo capture, actions and reports |
| `js/db.js` | Browser IndexedDB storage (`sgm_inspection_v1` / `inspections`) |
| `js/pdf-gen.js` | jsPDF report layout and photographic evidence |
| `js/jspdf.min.js` | Bundled jsPDF dependency |
| `css/styles.css` | Responsive styling including selected inspection area banner |
| `sw.js` | Versioned PWA offline cache and fetch handling |
| `manifest.json` | Standalone display mode, installation name and icons |
| `assets/icon-192.svg`, `assets/icon-512.svg` | App icons |

**Baseline versions found in source:** `AUDIT_CONFIG.appVersion = '1.6'`; service worker cache `sgm-inspect-v16`; `index.html` loads several CSS/JS resources with `?v=16`. The manifest description still says v1.4 — metadata discrepancy only, not the application version.

## 3. Inspection locations — all 14

Configured in `AUDIT_CONFIG.units` in `js/config.js`:

1. Unit 1
2. Unit 2
3. Unit 3
4. Unit 4
5. Unit 5
6. Unit 6
7. Spray Room
8. Unit 1 Offices
9. Unit 2 Offices
10. Customer Care Offices
11. Accounts Offices
12. Dispatch Office
13. Aluminium Office
14. Reception Area

Multiple locations may be selected for one inspection. The **INSPECTION AREA** banner must visibly display all selected areas at the top of the audit overview, section/question views and report preview. It must remain legible on a phone. When none is selected, it displays an explicit no-area-selected message.

## 4. Inspection categories — 10 sections, 50 questions

The authoritative wording of every question is in `js/config.js`. Do not paraphrase or reorder checklists without approval.

| # | Section name | Questions |
|---|---|---:|
| 1 | General Workplace | 7 |
| 2 | Fire & Emergency Provisions | 9 |
| 3 | Electrical | 4 |
| 4 | PPE | 3 |
| 5 | Manual & Mechanical Handling | 3 |
| 6 | Equipment & Machinery | 7 |
| 7 | Hazardous Substances | 1 |
| 8 | Facilities & Welfare | 2 |
| 9 | Racking & General Storage | 2 |
| 10 | Visual Display Units (DSE) | 12 |
| | **Total** | **50** |

There is also a **General Comment** screen for the overall rating and comments.

The DSE category covers screen placement and visibility, glare/lighting, keyboard/mouse, chairs, desk/leg space, footrests and document holders, cables, working breaks, assessment/training and eye-test arrangements. This checklist is not a substitute for a personal DSE workstation assessment.

## 5. Inspection workflow / acceptance requirements

1. Open the live URL or installed Android shortcut; the home screen should report version 1.6 for this baseline.
2. Select **New Inspection** or reopen an existing inspection.
3. Enter title, date/time, inspector and location; select area(s).
4. Start/continue inspection; the **INSPECTION AREA** banner appears clearly at the top.
5. Choose a category and question; the selected inspection area remains visible.
6. Record **Pass**, **Action Required**, **Fail** or **N/A** and optional notes.
7. Use **Take Photo** to request the Android camera; use **Choose Photo** to select an existing image. Multiple photos may be stored on a question.
8. For Action Required or Fail, record corrective actions, responsible persons, priority and due date.
9. Complete General Comment; view category/overall scores, report preview and PDF.
10. Return to a saved inspection on the **same device/browser profile** and confirm previous answers and photos remain.

Scoring in `js/app.js`: pass percentage = passed / answered and applicable questions, excluding unanswered and N/A. Flagged statuses are Action Required and Fail.

## 6. Data storage and privacy — important

- Completed and in-progress inspections, action details and photographs are stored **locally in browser IndexedDB**.
- Current database: `sgm_inspection_v1`, version `1`, object store `inspections`, keyed by inspection ID.
- Records do **not** sync automatically between phones, PCs, or users.
- GitHub hosts the source files and site, **not the users' inspection records**.
- The repository is public and the site has no sign-in access control. Anyone with the link can open the app and create separate local records.
- Clearing site data, replacing the browser profile, or uninstalling without a data backup may lose records. **Never instruct users to clear browser storage to fix caching without first warning about data loss.**
- Browser permissions and handset support determine whether camera capture opens as expected.
- Before introducing cloud syncing, personal information, logins or central storage, obtain an explicit design decision covering permissions, security, retention and UK GDPR responsibilities.

## 7. Current mobile caching solution

Android previously showed an old version while the desktop showed new changes. Version 1.6 includes:

- Versioned assets (`?v=16`) in `index.html`.
- Service-worker registration using `./sw.js?v=16` with `updateViaCache: 'none'`.
- `sgm-inspect-v16` cache and network-first fetch behaviour, with cached fallback.
- A controlled reload when the new service worker takes control.

**For each future functional release**, advance the displayed version, cache name and asset query suffix **consistently**. Confirm the home-screen version on both desktop and Android. A versioned direct URL can be used for troubleshooting; avoid clearing local site data.

## 8. Safe change procedure for future work

1. **First inspect the live GitHub repository** and this document; do not assume the files are unchanged.
2. Capture current branch/head and read affected files. Record the working version and requested change.
3. Back up the source by Git history (prefer a feature branch/pull request for complex changes). Advise the user to retain/export critical local records before any storage/data migration.
4. Make the smallest possible change. Preserve `js/db.js` storage identity and existing question IDs unless migration is deliberately planned.
5. When changing categories/questions, ensure previously saved inspections still render and keep existing answers, notes, actions and photos. Existing inspections use an in-app normalization routine on load.
6. Validate JavaScript syntax, audit category counts, selection logic, camera controls, PDF output and responsive layout.
7. Increment displayed app version and PWA cache/asset version tokens together.
8. Publish to **this repository and `main` only when authorised**. Do not create a second live app or change the site URL without instruction.
9. Verify the deployed version on the GitHub Pages URL and test Android navigation and camera behaviour as far as tools allow; explicitly distinguish code inspection from physical phone testing.
10. Append a dated entry to the change log below and update the checkpoint summary.

**Do not delete existing records, change the live domain, introduce a central database or authentication, or replace PDF generation merely as part of routine edits.**

## 9. Regression checklist

- [ ] Home screen identifies expected version.
- [ ] All 14 locations visible; single and multiple selections work.
- [ ] Inspection area banner shown on overview, section, question and report.
- [ ] All 10 sections / 50 questions are accessible.
- [ ] Pass / Action Required / Fail / N/A work and scoring is correct.
- [ ] Notes and corrective action assignment/priority/deadline persist.
- [ ] Camera capture and photo picker work on Android (physical-device check).
- [ ] Multiple photos persist, display and appear in PDF as intended.
- [ ] Existing locally saved inspection opens without loss of responses.
- [ ] PDF/report output and home-screen shortcut remain usable.
- [ ] Desktop and mobile show the same deployed version.
- [ ] Browser refresh / PWA update does not delete IndexedDB content.

## 10. Change log / checkpoints

| Date | Version | Change / result |
|---|---|---|
| Before 24 Nov 2026 | 1.1 | Original GitHub Pages inspection app with 9 categories and 38 questions |
| 24 Nov 2026 | 1.4 | Added seven office/reception areas, 12-question DSE section and camera/gallery buttons |
| 24 Nov 2026 | 1.5 | Added prominent selected inspection area banner |
| 24 Nov 2026 | **1.6** | Android stale-cache update improvements, versioned assets and worker refresh; user subsequently confirmed the app is working perfectly |
| 24 Nov 2026 | Documentation only | Created this master Markdown checkpoint; no functional app change |

## 11. Future-change request template

When making a change, record:

- **Request date:**
- **Requested behaviour:**
- **Screens / files affected:**
- **Must remain unchanged:**
- **Data migration / retention implications:**
- **Version and cache revision:**
- **Validation performed:**
- **GitHub commit / deployment link:**
- **Android verification result:**
- **Checkpoint updated:**

## 12. Key links

- **Live application:** https://darrenstewartuk-rgb.github.io/sgm-inspection/index.html
- **Source repository:** https://github.com/darrenstewartuk-rgb/sgm-inspection
- **Master project document:** https://github.com/darrenstewartuk-rgb/sgm-inspection/blob/main/PROJECT_MASTER.md

---

**Project instruction:** Treat version 1.6 as the known-working baseline at this checkpoint. For future requests, preserve the current mobile user experience, existing categories, photo functionality, selected-area visibility, locally saved inspections and report generation unless the user specifically requests otherwise.
