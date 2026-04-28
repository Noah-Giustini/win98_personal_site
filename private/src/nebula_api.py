from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
import os
import re
import subprocess
from dotenv import load_dotenv
import uvicorn


load_dotenv()

API_KEY = os.getenv("API_KEY")
API_KEY_NAME = os.getenv("API_KEY_NAME", "access_token")
SERVER_IP = os.getenv("SERVER_IP", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))

ZOMBOID_SERVICE_NAME = os.getenv("ZOMBOID_SERVICE_NAME", "zomboid")
ZOMBOID_LOG_FILE = os.getenv("ZOMBOID_LOG_FILE", "/home/zomboid/Zomboid/Logs/coop-console.txt")
# Use this to run a command that updates Workshop mods, for example via steamcmd.
ZOMBOID_MOD_UPDATE_COMMAND = os.getenv("ZOMBOID_MOD_UPDATE_COMMAND", "")
NEBULA_REPO_DIR = os.getenv("NEBULA_REPO_DIR", "/home/giraffe/repos/win98_personal_site/private/src")


app = FastAPI(title="Project Zomboid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(header_key: str = Depends(api_key_header)):
    if header_key == API_KEY:
        return header_key
    raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Invalid API Key")


def run_command(command: str) -> tuple[int, str, str]:
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as exc:
        return 1, "", str(exc)


def parse_players_from_log(log_path: str) -> list[str]:
    if not os.path.exists(log_path):
        return []

    connected_players: set[str] = set()
    connect_pattern = re.compile(r'player\s+"([^"]+)"\s+connected', re.IGNORECASE)
    disconnect_pattern = re.compile(r'player\s+"([^"]+)"\s+disconnected', re.IGNORECASE)

    with open(log_path, "r", encoding="utf-8", errors="ignore") as log_file:
        for line in log_file:
            connect_match = connect_pattern.search(line)
            if connect_match:
                connected_players.add(connect_match.group(1).strip())
                continue

            disconnect_match = disconnect_pattern.search(line)
            if disconnect_match:
                connected_players.discard(disconnect_match.group(1).strip())

    return sorted(connected_players)


def get_service_status() -> tuple[bool, str]:
    code, stdout, stderr = run_command(f"sudo systemctl is-active {ZOMBOID_SERVICE_NAME}")

    status_text = stdout or stderr or "unknown"
    running = code == 0 and status_text.strip() == "active"

    if running:
        return True, "Project Zomboid server is running."

    return False, f"Project Zomboid server is not running (systemd: {status_text.strip()})."


@app.post("/zomboid/start", dependencies=[Depends(get_api_key)])
async def zomboid_start():
    run_command(f"sudo systemctl start {ZOMBOID_SERVICE_NAME}")
    return {"status": "Project Zomboid start command sent."}


@app.post("/zomboid/stop", dependencies=[Depends(get_api_key)])
async def zomboid_stop():
    run_command(f"sudo systemctl stop {ZOMBOID_SERVICE_NAME}")
    return {"status": "Project Zomboid stop command sent."}


@app.post("/zomboid/restart", dependencies=[Depends(get_api_key)])
async def zomboid_restart():
    run_command(f"sudo systemctl restart {ZOMBOID_SERVICE_NAME}")
    return {"status": "Project Zomboid restart command sent."}


@app.get("/zomboid/status", dependencies=[Depends(get_api_key)])
async def zomboid_status():
    running, status = get_service_status()
    return {"running": running, "status": status}


@app.get("/zomboid/listplayers", dependencies=[Depends(get_api_key)])
async def zomboid_players():
    running, _ = get_service_status()
    if not running:
        return {"players": [], "player_count": 0, "status": "Server offline."}

    players = parse_players_from_log(ZOMBOID_LOG_FILE)
    return {
        "players": players,
        "player_count": len(players),
        "status": "Players fetched successfully."
    }


@app.post("/zomboid/mods/update", dependencies=[Depends(get_api_key)])
async def zomboid_update_mods():
    if not ZOMBOID_MOD_UPDATE_COMMAND:
        return {
            "status": "No mod update command configured. Set ZOMBOID_MOD_UPDATE_COMMAND in .env."
        }

    code, stdout, stderr = run_command(ZOMBOID_MOD_UPDATE_COMMAND)
    if code != 0:
        return {
            "status": "Mod update failed.",
            "error": stderr or stdout
        }

    return {
        "status": "Mod update completed successfully.",
        "output": stdout
    }


@app.post("/system/update", dependencies=[Depends(get_api_key)])
async def nebula_system_update():
    code, stdout, stderr = run_command(
        f"pushd {NEBULA_REPO_DIR} > /dev/null && ./deploy_nebula.sh && popd > /dev/null"
    )

    if code != 0:
        return {
            "status": "Nebula system update failed.",
            "error": stderr or stdout
        }

    return {"status": "Nebula system updating..."}


if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_IP, port=SERVER_PORT)
