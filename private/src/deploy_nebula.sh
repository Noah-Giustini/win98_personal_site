#!/bin/bash
set -euo pipefail

REPO_ROOT="/home/giraffe/repos/win98_personal_site"
SRC_DIR="$REPO_ROOT/private/src"
DEPLOY_DIR="/opt/nebula-api"
SERVICE_DST="/etc/systemd/system/nebula-api.service"

cd "$REPO_ROOT"

# Always trust this repo for this command invocation, regardless of
# service user HOME/global git config behavior.
set +e
GIT_PULL_OUTPUT="$(git -c safe.directory="$REPO_ROOT" pull --no-rebase origin master 2>&1)"
GIT_PULL_CODE=$?
set -e

if [ "$GIT_PULL_CODE" -ne 0 ]; then
    echo "Git pull failed in $REPO_ROOT"
    echo "$GIT_PULL_OUTPUT"
    git -c safe.directory="$REPO_ROOT" status --short --branch || true
    exit "$GIT_PULL_CODE"
fi

sudo mkdir -p "$DEPLOY_DIR"
sudo cp "$SRC_DIR/nebula_api.py" "$DEPLOY_DIR/nebula_api.py"
sudo cp "$SRC_DIR/deploy_nebula.sh" "$DEPLOY_DIR/deploy_nebula.sh"
sudo cp "$SRC_DIR/requirements.txt" "$DEPLOY_DIR/requirements.txt"
sudo chmod +x "$DEPLOY_DIR/deploy_nebula.sh"

if [ ! -f "$DEPLOY_DIR/.env" ] && [ -f "$SRC_DIR/.env" ]; then
    sudo cp "$SRC_DIR/.env" "$DEPLOY_DIR/.env"
fi

if [ ! -x "$DEPLOY_DIR/.venv/bin/python" ]; then
    sudo rm -rf "$DEPLOY_DIR/.venv"
    sudo python3 -m venv "$DEPLOY_DIR/.venv"
fi

if ! sudo "$DEPLOY_DIR/.venv/bin/python" -m pip --version >/dev/null 2>&1; then
    sudo rm -rf "$DEPLOY_DIR/.venv"
    sudo python3 -m venv "$DEPLOY_DIR/.venv"
fi

sudo "$DEPLOY_DIR/.venv/bin/python" -m pip install --upgrade pip
sudo "$DEPLOY_DIR/.venv/bin/python" -m pip install -r "$DEPLOY_DIR/requirements.txt"

sudo cp "$SRC_DIR/nebula-api.service" "$SERVICE_DST"
sudo systemctl daemon-reload
sudo systemctl enable nebula-api.service
sudo systemctl restart nebula-api.service

echo "Nebula API deployed to $DEPLOY_DIR"
