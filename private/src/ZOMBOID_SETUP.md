# Project Zomboid Server Runbook

This host already has a Project Zomboid server install at `/opt/pzserver`.

## What this setup does
- Runs dedicated server using `zomboid.service` at boot.
- Uses your mod collection `3178279542` via Steam collection sync script.
- Deploys Nebula API outside the repo at `/opt/nebula-api`.
- Adds daily backups at 05:00, but only if player activity occurred in the prior 24 hours.
- Keeps only the newest 5 backup archives.
- Archives legacy systemd unit files under `/home/zomboid/zomboid-archive`.

## Files in this repo
- `private/src/zomboid.service`
- `private/src/zomboid-backup.service`
- `private/src/zomboid-backup.timer`
- `private/src/zomboid_backup.sh`
- `private/src/zomboid_sync_collection.py`
- `private/src/deploy_zomboid.sh`
- `private/src/nebula_api.py`
- `private/src/nebula-api.service`
- `private/src/deploy_nebula.sh`
- `private/src/nebula.env.example`

## First-time setup
1. Deploy Nebula API runtime and service:
   - `cd /home/giraffe/repos/win98_personal_site/private/src`
   - `sudo ./deploy_nebula.sh`
2. Create Nebula environment file if needed:
   - `sudo cp /home/giraffe/repos/win98_personal_site/private/src/nebula.env.example /opt/nebula-api/.env`
   - `sudo nano /opt/nebula-api/.env` and set `API_KEY`.
3. Deploy Zomboid service, backup timer, and mod sync script:
   - `cd /home/giraffe/repos/win98_personal_site/private/src`
   - `sudo ./deploy_zomboid.sh`

## Modpack sync details
`zomboid_sync_collection.py` does this:
- Fetches Workshop item IDs from collection `3178279542`.
- Updates `WorkshopItems` in `/home/zomboid/Zomboid/Server/servertest.ini`.
- Reads local workshop folders under `/opt/pzserver/steamapps/workshop/content/108600`.
- If local mods are present, updates `Mods=` and appends map folders to `Map=`.

Run manually:
- `sudo -u zomboid python3 /opt/pzserver/scripts/zomboid_sync_collection.py --collection-id 3178279542`

## Backups
Backup timer: `zomboid-backup.timer` (`OnCalendar=*-*-* 05:00:00`).

Backup job behavior:
- Checks server log for player connect/disconnect entries in the last 24 hours.
- Skips backup if no recent player activity.
- If active recently, archives `Saves/Multiplayer` to `backups/auto`.
- Keeps newest 5 archives.

Manual run:
- `sudo systemctl start zomboid-backup.service`

## Verify services
- `systemctl status zomboid.service --no-pager`
- `systemctl status zomboid-backup.timer --no-pager`
- `systemctl status nebula-api.service --no-pager`
- `systemctl list-timers --all | grep zomboid-backup`

## Nebula API checks
Use your API key header (default header name: `access_token`).

- `curl -H "access_token: <KEY>" http://<nebula-ip>:8000/zomboid/status`
- `curl -H "access_token: <KEY>" http://<nebula-ip>:8000/zomboid/listplayers`
- `curl -X POST -H "access_token: <KEY>" http://<nebula-ip>:8000/zomboid/start`
- `curl -X POST -H "access_token: <KEY>" http://<nebula-ip>:8000/zomboid/stop`
- `curl -X POST -H "access_token: <KEY>" http://<nebula-ip>:8000/zomboid/restart`

## Tear down
Disable services/timer:
- `sudo systemctl disable --now zomboid.service`
- `sudo systemctl disable --now zomboid-backup.timer`
- `sudo systemctl disable --now nebula-api.service`

Remove deployed directories:
- `sudo rm -rf /opt/nebula-api`
- `sudo rm -rf /opt/pzserver/scripts`

Optionally restore archived unit files from `/home/zomboid/zomboid-archive`.
