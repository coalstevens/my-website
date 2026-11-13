"""Rebuild the workout archive from the corrected source CSV.
Run from any directory: python3 workouts/import_workouts.py
Copies source rows exactly; naming corrections and notes live in the CSV.
Use clean_workout_source.py to apply the confirmed, repeatable source migration.
"""
import csv
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'Training - Conditioning.csv'
MONTHS = {name: i for i, name in enumerate([
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], 1)}
DATE = re.compile(r'^([A-Za-z]+)\s+(\d{1,2})[a-z]*(?:,?\s+(\d{4}))?$', re.I)


def convert():
    workouts = []
    current = None
    year = None
    with SOURCE.open(newline='', encoding='utf-8-sig') as source:
        for line, row in enumerate(csv.reader(source), 1):
            match = DATE.fullmatch(row[0].strip()) if row else None
            if match and match[1][:3].lower() in MONTHS:
                if match[3]:
                    year = int(match[3])
                if year is None:
                    raise ValueError(f'Cannot infer year on source line {line}')
                current = {
                    'id': f'csv-{line}',
                    'date': date(year, MONTHS[match[1][:3].lower()], int(match[2])).isoformat(),
                    'label': row[0],
                    'inferredYear': not bool(match[3]),
                    'sourceLine': line,
                    'heading': row,
                    'rows': [],
                }
                workouts.append(current)
            elif current is not None:
                current['rows'].append(row)
            elif any(cell.strip() for cell in row):
                raise ValueError(f'Unassigned data on source line {line}')
    # Stable sorting retains the source order of separate same-date entries.
    workouts.sort(key=lambda workout: workout['date'], reverse=True)
    return {'source': SOURCE.name, 'workouts': workouts}


if __name__ == '__main__':
    archive = convert()
    (ROOT / 'history.json').write_text(json.dumps(archive, indent=2) + '\n')
    workouts = archive['workouts']
    print(f"Imported {len(workouts)} workouts: {workouts[-1]['date']} to {workouts[0]['date']}")
    for workout in workouts:
        if workout['inferredYear']:
            print(f"Inferred year: {workout['label']} → {workout['date']}")
