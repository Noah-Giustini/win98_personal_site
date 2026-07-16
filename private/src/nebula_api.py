from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
import os
import re
import subprocess
from pathlib import Path
from typing import List, Tuple, Union
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
NEBULA_DEPLOY_SCRIPT = os.getenv("NEBULA_DEPLOY_SCRIPT", "/opt/nebula-api/deploy_nebula.sh")
SYSTEMCTL_USE_SUDO = os.getenv("SYSTEMCTL_USE_SUDO", "true").lower() == "true"
SYSTEMCTL_BIN = os.getenv("SYSTEMCTL_BIN", "/bin/systemctl")
ZOMBOID_LOG_CANDIDATES = [
    path.strip()
    for path in os.getenv(
        "ZOMBOID_LOG_CANDIDATES",
        "/home/zomboid/Zomboid/Logs/coop-console.txt,/home/zomboid/Zomboid/Logs/server-console.txt,/home/zomboid/Zomboid/server-console.txt"
    ).split(",")
    if path.strip()
]


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


def run_command(command: Union[List[str], str], use_shell: bool = False) -> Tuple[int, str, str]:
    try:
        result = subprocess.run(
            command,
            shell=use_shell,
            capture_output=True,
            text=True,
            executable="/bin/bash" if use_shell else None,
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as exc:
        return 1, "", str(exc)


def service_command(*args: str) -> List[str]:
    command = []
    if SYSTEMCTL_USE_SUDO:
        command.append("sudo")
    command.extend([SYSTEMCTL_BIN, *args, ZOMBOID_SERVICE_NAME])
    return command


def resolve_zomboid_log_file() -> str:
    if Path(ZOMBOID_LOG_FILE).exists():
        return ZOMBOID_LOG_FILE

    for candidate in ZOMBOID_LOG_CANDIDATES:
        if Path(candidate).exists():
            return candidate

    return ZOMBOID_LOG_FILE


def parse_players_from_log(log_path: str) -> List[str]:
    if not os.path.exists(log_path):
        return []

    connected_players = set()
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


def get_service_status() -> Tuple[bool, str]:
    code, stdout, stderr = run_command(service_command("is-active"))

    status_text = stdout or stderr or "unknown"
    running = code == 0 and status_text.strip() == "active"

    if running:
        return True, "Project Zomboid server is running."

    return False, f"Project Zomboid server is not running (systemd: {status_text.strip()})."


@app.post("/zomboid/start", dependencies=[Depends(get_api_key)])
async def zomboid_start():
    run_command(service_command("start"))
    return {"status": "Project Zomboid start command sent."}


@app.post("/zomboid/stop", dependencies=[Depends(get_api_key)])
async def zomboid_stop():
    run_command(service_command("stop"))
    return {"status": "Project Zomboid stop command sent."}


@app.post("/zomboid/restart", dependencies=[Depends(get_api_key)])
async def zomboid_restart():
    run_command(service_command("restart"))
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

    players = parse_players_from_log(resolve_zomboid_log_file())
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

    code, stdout, stderr = run_command(ZOMBOID_MOD_UPDATE_COMMAND, use_shell=True)
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
    code, stdout, stderr = run_command(["/bin/bash", NEBULA_DEPLOY_SCRIPT])

    if code != 0:
        return {
            "status": "Nebula system update failed.",
            "error": stderr or stdout
        }

    return {"status": "Nebula system updating..."}


if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_IP, port=SERVER_PORT)
