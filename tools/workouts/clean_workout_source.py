"""Apply confirmed archive corrections to the CSV, then rebuild history.json.
Run from the repository root: python3 tools/workouts/clean_workout_source.py
Rows and columns containing results are never moved; source session IDs stay stable.
The shared JS migration is also used to persist corrections to browser-local archives.
"""
import csv
import io
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from import_workouts import SOURCE, OUTPUT, convert


def clean_source():
    original = SOURCE.read_bytes()
    with SOURCE.open(newline='', encoding='utf-8-sig') as source:
        rows = list(csv.reader(source))
    before = convert()
    cleaned = json.loads(subprocess.run(
        ['node', '-e', "const fs=require('fs'),C=require('./archive-cleanup.js');"
         "const data=JSON.parse(fs.readFileSync(0,'utf8'));"
         "data.workouts.forEach(C.cleanSession);process.stdout.write(JSON.stringify(data));"],
        input=json.dumps(before), text=True, capture_output=True, check=True, cwd=Path(__file__).resolve().parent,
    ).stdout)
    for old, new in zip(before['workouts'], cleaned['workouts']):
        assert old['id'] == new['id'] and len(old['rows']) == len(new['rows'])
        for i, (old_row, new_row) in enumerate(zip(old['rows'], new['rows'])):
            for ci in range(max(len(old_row), len(new_row))):
                if ci not in (0, 4):
                    assert (old_row[ci] if ci < len(old_row) else '') == (new_row[ci] if ci < len(new_row) else '')
            rows[old['sourceLine'] + i] = new_row
    output = io.StringIO(newline='')
    csv.writer(output).writerows(rows)
    updated = output.getvalue().encode('utf-8')
    if updated != original:
        backup = Path(tempfile.mkdtemp(prefix='workout-source-backup-')) / SOURCE.name
        shutil.copy2(SOURCE, backup)
        SOURCE.write_bytes(updated)
        print(f'Original CSV backed up to: {backup}')
    after = convert()
    assert [(w['id'], len(w['rows'])) for w in after['workouts']] == [(w['id'], len(w['rows'])) for w in before['workouts']]
    assert after == cleaned
    OUTPUT.write_text(json.dumps(after, indent=2) + '\n')
    changes = sum(old != new for a, b in zip(before['workouts'], after['workouts']) for old, new in zip(a['rows'], b['rows']))
    print(f'Corrected {changes} rows; preserved all {len(after["workouts"])} sessions and their IDs.')


if __name__ == '__main__':
    clean_source()
