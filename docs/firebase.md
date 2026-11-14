# Workout accounts and cloud sync

The GitHub Pages frontend uses Firebase Auth (Google) and Firestore directly.
No Analytics, Firebase Hosting, service account, or paid-plan features are used.
The configuration in `workouts/js/firebase-client.mjs` is public browser configuration.

## Console configuration

- Enable Google under Authentication → Sign-in method.
- Authorize `colestevens.ca` and `localhost` under Authentication → Settings.
- Create the default Firestore database in production mode.
- Publish owner-only rules (the current minimum configuration):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                        && request.auth.uid == userId;
    }
  }
}
```

Do not restrict this public multi-user app to the owner's UID. Other accounts
need access to their own user paths. Authorized domains are not a signup allowlist.
App Check, tighter field/size validation rules, and monitoring quotas are further
production-hardening steps; they are not automatically configured by this code.

## User experience

- Signed out: an editable demo loaded from public `workouts/data/history.json`. Demo changes
  reset on reload and are never imported automatically into an account.
- Signed in: automatically load the user's data and listen for cloud revisions.
- New user: only after the server confirms no existing log, create four unnamed
  exercises with three empty reps sets each, no previous results, and no archive.
- Saves are debounced 1.2 seconds; the status distinguishes saved/pending/errors.
- CSV download includes the archive AND current draft, including pending edits.
- Signing out switches back to the demo immediately. Per-account caches remain
  on the device for offline recovery, so this is not a shared-computer data wipe.
- Exercise names and plain-text notes are editable via the pencil. Empty exercise
  names are directly editable. Instructions carry forward; archives retain a copy.
- Stable exercise IDs preserve renamed-template analysis for ID-bearing records.
  Imported legacy tables without template metadata still use name matching.

## Storage and concurrency

- `users/{uid}/drafts/current`: draft, archive edit overrides, revision, timestamp.
- `users/{uid}/workouts/{id}`: individual archive records.
- Nested arrays are encoded as JSON strings because Firestore rejects nested arrays.
- Transactions write changed/deleted archive documents plus the next draft revision.
- A metadata listener loads remote changes automatically when there are no pending
  local changes. Reads check the revision on both sides of the collection read.
- An account-scoped cache and tab-scoped pending outbox survive refresh. Pending
  edits sync automatically if the server revision still matches their baseline.
- If both devices changed the same baseline, stop and preserve local edits instead
  of silently overwriting. Download CSV, then explicitly use the latest cloud
  version. This discards pending edits from the active view; it is not a merge.
- A pre-resolution cache snapshot is retained locally for recovery.
- Transactions require network access. Offline work uses the local outbox, not a
  background service worker. Reconnection retries while the page is open, or on
  next sign-in/page load. Closing the browser does not upload in the background.
- If browser storage is full/disabled/cleared, durable recovery cannot be promised.
  The UI warns on persistence failure and when leaving with pending changes.
- Initial imports above 400 changed archive documents are rejected. The app is
  designed for personal-sized logs, not bulk migration tools.

Analysis has its own authenticated read-only listener. It never reads the old
shared working-copy keys to choose a private account. Pending account cache data
is shown with a warning; the workout page handles uploading and conflict resolution.

## Existing data / public demo

Existing remote accounts load normally. Before the first v2 demo initialization,
pre-account browser data is preserved, when available, in
`training-legacy-backup-v2`. It is deliberately NOT imported into new accounts.
Any migration of the owner's old browser-only sessions should be deliberate.

The old shared working-copy keys are still written for compatibility/debugging,
but are never read to initialize an account. Per-account v3 caches are authoritative
for pending cloud saves. Old v1 pre-load snapshots are not deleted.

`workouts/data/history.json` and `data/workouts/Training - Conditioning.csv`
remain public intentionally. Review notes and
links before using them as the public demo. Neither authentication nor a private
repository makes publicly deployed static files private.

## CSV

One row per draft set or archived source row, including IDs, date, archive/draft
status, load/setup, left/both and right results, exercise/session notes, field
labels, and raw source columns for ambiguous legacy records. Duration/repeater
units remain explicit. CSV quoting preserves commas/newlines; leading spreadsheet
formula markers are neutralized with an apostrophe. UTF-8 BOM supports spreadsheet
imports. CSV is a portable export, not a full-fidelity restore format; no CSV
importer is provided.

## Verification

From the repository root, run `node --test tests/workouts/*.test.js tests/workouts/*.test.mjs`.
Controller tests mock Firebase/network/browser APIs; they are not live end-to-end
Firebase verification. Manually test on HTTP(S), not a `file://` URL, e.g.:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000/workouts/` and verify:

1. Demo archive and editable sample workout; reset and refresh discard demo edits.
2. First Google sign-in creates a blank four-exercise log, without demo history.
3. Name edits, exercise notes, set counts, and measurement switches.
   Archive a session and undo it; edit an archived date/result, copy its format
   to the current workout, delete an archive, and download CSV.
4. Reload and second-device sign-in automatically restore the private log.
5. Offline edits survive refresh and retry after reconnection.
6. Concurrent changes stop with a conflict rather than overwriting newer data.
7. Sign-out/account switch clears the private view, including analysis.
8. Firestore rules deny logged-out access and cross-account reads/writes.
