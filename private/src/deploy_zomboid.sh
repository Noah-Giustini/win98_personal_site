#!/bin/bash
set -euo pipefail

REPO_ROOT="/home/giraffe/repos/win98_personal_site"
SRC_DIR="$REPO_ROOT/private/src"
PZ_ROOT="/opt/pzserver"
PZ_SCRIPT_DIR="$PZ_ROOT/scripts"
SYSTEMD_DIR="/etc/systemd/system"
ARCHIVE_DIR="/home/zomboid/zomboid-archive"

mkdir -p "$ARCHIVE_DIR"
sudo mkdir -p "$PZ_SCRIPT_DIR"

# Keep a copy of legacy service/socket definitions before replacing them.
if [[ -f "$SYSTEMD_DIR/zomboid.service" ]]; then
    sudo cp "$SYSTEMD_DIR/zomboid.service" "$ARCHIVE_DIR/zomboid.service.$(date +%Y%m%d-%H%M%S).bak"
fi
if [[ -f "$SYSTEMD_DIR/zomboid.socket" ]]; then
    sudo cp "$SYSTEMD_DIR/zomboid.socket" "$ARCHIVE_DIR/zomboid.socket.$(date +%Y%m%d-%H%M%S).bak"
fi

sudo cp "$SRC_DIR/zomboid.service" "$SYSTEMD_DIR/zomboid.service"
sudo cp "$SRC_DIR/zomboid-backup.service" "$SYSTEMD_DIR/zomboid-backup.service"
sudo cp "$SRC_DIR/zomboid-backup.timer" "$SYSTEMD_DIR/zomboid-backup.timer"
sudo cp "$SRC_DIR/zomboid_backup.sh" "$PZ_SCRIPT_DIR/zomboid_backup.sh"
sudo cp "$SRC_DIR/zomboid_sync_collection.py" "$PZ_SCRIPT_DIR/zomboid_sync_collection.py"

sudo chmod +x "$PZ_SCRIPT_DIR/zomboid_backup.sh"
sudo chmod +x "$PZ_SCRIPT_DIR/zomboid_sync_collection.py"
sudo chown -R zomboid:zomboid "$PZ_SCRIPT_DIR"

# Disable deprecated socket-driven unit to avoid startup conflicts.
sudo systemctl disable --now zomboid.socket 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable zomboid.service
sudo systemctl enable zomboid-backup.timer

# Sync collection metadata into servertest.ini before server start.
sudo -u zomboid python3 "$PZ_SCRIPT_DIR/zomboid_sync_collection.py" --collection-id 3178279542 || true

sudo systemctl restart zomboid.service
sudo systemctl restart zomboid-backup.timer

echo "Zomboid service and backup timer deployed."
echo "Archive directory for old units: $ARCHIVE_DIR"
