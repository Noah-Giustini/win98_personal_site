#!/bin/bash
set -e

# Pull latest repo changes for nebula host
cd /home/giraffe/repos/win98_personal_site

# Keep local env/config safe across pulls
if [ -f "private/src/.env" ]; then
    git stash push -m "nebula-api-env" private/src/.env || true
fi

git pull origin master

# Restore stashed env if one was created
if git stash list | grep -q "nebula-api-env"; then
    git stash pop || true
fi

# Restart nebula API service to apply updates
sudo systemctl restart nebula-api.service
