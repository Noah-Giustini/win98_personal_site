#!/bin/bash
set -euo pipefail

STEAMCMD_BIN="/home/zomboid/.steam/steamcmd/steamcmd.sh"
INSTALL_DIR="/opt/pzserver"
APP_ID="380870"
SERVICE_NAME="zomboid.service"
SERVER_INI="/home/zomboid/Zomboid/Server/servertest.ini"
SYNC_SCRIPT="/opt/pzserver/scripts/zomboid_sync_collection.py"
COLLECTION_ID="3178279542"
WORKSHOP_ROOT="/opt/pzserver/steamapps/workshop/content/108600"

echo "[1/6] Updating Project Zomboid dedicated server binaries..."
sudo -u zomboid "$STEAMCMD_BIN" \
  +@ShutdownOnFailedCommand 1 \
  +@NoPromptForPassword 1 \
  +force_install_dir "$INSTALL_DIR" \
  +login anonymous \
  +app_update "$APP_ID" validate \
  +quit

echo "[2/6] Syncing workshop collection into servertest.ini..."
sudo -u zomboid python3 "$SYNC_SCRIPT" \
  --collection-id "$COLLECTION_ID" \
  --server-ini "$SERVER_INI" \
  --workshop-root "$WORKSHOP_ROOT"

echo "[3/6] Restarting $SERVICE_NAME..."
sudo systemctl restart "$SERVICE_NAME"

echo "[4/6] Waiting briefly for startup logs..."
sleep 2

echo "[5/6] Service status:"
systemctl is-active "$SERVICE_NAME"


echo "[6/6] Recent startup version + listener lines:"
sudo journalctl -u "$SERVICE_NAME" -n 220 --no-pager \
  | grep -E 'Startup version|SERVER STARTED|Server is listening on port' \
  | tail -n 20 || true

echo "Update flow complete."
