# My Website

Personal portfolio and workout log, served as a static site on GitHub Pages at
[colestevens.ca](https://colestevens.ca).

## Local development

No frontend build or package installation is required. From the repository root:

```sh
python3 -m http.server 8000
```

- Portfolio: <http://localhost:8000/>
- Workout log: <http://localhost:8000/workouts/>
- Workout analysis: <http://localhost:8000/workouts/analysis.html>

Use HTTP(S), not `file://`, so modules and history loading work correctly.
The workout demo is public; private workout accounts require Firebase setup.
See [workouts/FIREBASE.md](workouts/FIREBASE.md) for configuration, storage,
conflict handling, and the manual verification checklist.

## Verification

Run the workout tests with Node.js (no dependencies to install):

```sh
node --test workouts/*.test.js workouts/*.test.mjs
```

Firebase controller tests use mocks, not live Firebase services. Verify Google
sign-in, access rules, offline recovery, and multi-device sync manually before
deploying account-related changes.

## Source files

- `index.html`, `styles.css`, `scripts.js`: portfolio source.
- `styles.min.css`, `scripts.min.js`: deployed portfolio assets; keep them in sync
  with their source files when making changes.
- `workouts/`: workout UI, analysis, cloud sync, CSV export, and tests.
- `workouts/history.json` and `Training - Conditioning.csv`: public demo history
  and its source data. Do not put private data in publicly deployed static files.
