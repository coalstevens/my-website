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
See [docs/firebase.md](docs/firebase.md) for configuration, storage,
conflict handling, and the manual verification checklist.

## Verification

Run the workout tests with Node.js (no dependencies to install):

```sh
node --test tests/workouts/*.test.js tests/workouts/*.test.mjs
```

Firebase controller tests use mocks, not live Firebase services. Verify Google
sign-in, access rules, offline recovery, and multi-device sync manually before
deploying account-related changes.

## Repository layout

- `index.html`: portfolio entry point.
- `assets/css/portfolio.css`, `assets/js/portfolio.js`: portfolio source. The page
  loads their `.min.css` / `.min.js` counterparts; keep both versions in sync.
- `assets/js/theme.js`, `assets/js/page-navigation.js`: shared browser behavior.
- `assets/images/`, `assets/videos/`, `assets/icons/`, `assets/documents/`: site media
  and the public résumé at `/assets/documents/Resume.pdf`.
- `workouts/`: workout and analysis HTML entry points, with browser code in `js/`,
  styles in `css/`, and generated public demo history in `data/history.json`.
- `tests/workouts/`: Node.js tests.
- `tools/workouts/`: history import and correction scripts, plus their JS helper.
- `data/workouts/Training - Conditioning.csv`: public demo history source.
- `design/`: editable Aseprite artwork.
- `docs/firebase.md`: Firebase setup, storage, and verification notes.

These folders organize files; they do not make files private or exclude them
from GitHub Pages deployment. Do not add private data to this static site.

## Demo history maintenance

From the repository root, rebuild the demo archive from the source CSV:

```sh
python3 tools/workouts/import_workouts.py
```

To apply the confirmed legacy corrections to the source CSV and rebuild history:

```sh
python3 tools/workouts/clean_workout_source.py
```

The correction script backs up the original CSV outside the repository when it
changes. Both scripts resolve data paths relative to their own location, not the
working directory. Keep CSV row ordering intact: imported session IDs use source
line numbers.
