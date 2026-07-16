#!/bin/bash
set -euo pipefail

SAVE_DIR="/home/zomboid/Zomboid/Saves/Multiplayer"
BACKUP_DIR="/home/zomboid/Zomboid/backups/auto"
LOG_CANDIDATES=(
    "/home/zomboid/Zomboid/server-console.txt"
    "/home/zomboid/Zomboid/Logs/server-console.txt"
    "/home/zomboid/Zomboid/Logs/coop-console.txt"
)
KEEP_COUNT=5
HOURS_WINDOW=24

mkdir -p "$BACKUP_DIR"

LOG_FILE=""
for candidate in "${LOG_CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
        LOG_FILE="$candidate"
        break
    fi
done

if [[ -z "$LOG_FILE" ]]; then
    echo "No log file found; skipping backup."
    exit 0
fi

if [[ ! -d "$SAVE_DIR" ]]; then
    echo "Save directory not found at $SAVE_DIR; skipping backup."
    exit 0
fi

if ! python3 - "$LOG_FILE" "$HOURS_WINDOW" <<'PY'
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

log_file = Path(sys.argv[1])
window_hours = int(sys.argv[2])
cutoff = datetime.now() - timedelta(hours=window_hours)

date_pattern = re.compile(r'\[(\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]')
activity_pattern = re.compile(r'player\s+"[^"]+"\s+(connected|disconnected)', re.IGNORECASE)

latest = None
for line in log_file.read_text(encoding='utf-8', errors='ignore').splitlines():
    if not activity_pattern.search(line):
        continue
    match = date_pattern.search(line)
    if not match:
        continue
    try:
        ts = datetime.strptime(match.group(1), '%d-%m-%y %H:%M:%S')
    except ValueError:
        continue
    if latest is None or ts > latest:
        latest = ts

if latest is None or latest < cutoff:
    print('no-recent-player-activity')
    raise SystemExit(1)

print('recent-player-activity')
PY
then
    echo "No player activity in the last ${HOURS_WINDOW}h; skipping backup."
    exit 0
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
archive="$BACKUP_DIR/zomboid-save-$timestamp.tar.gz"

tar -C "$(dirname "$SAVE_DIR")" -czf "$archive" "$(basename "$SAVE_DIR")"
echo "Created backup: $archive"

mapfile -t backups < <(ls -1t "$BACKUP_DIR"/zomboid-save-*.tar.gz 2>/dev/null || true)
if (( ${#backups[@]} > KEEP_COUNT )); then
    for old_backup in "${backups[@]:KEEP_COUNT}"; do
        rm -f "$old_backup"
        echo "Pruned old backup: $old_backup"
    done
fi
