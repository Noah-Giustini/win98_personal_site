from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_403_FORBIDDEN
import uvicorn
import subprocess
import os
import psutil
from dotenv import load_dotenv

#items specifically for the resource monitor
from flask import Flask, jsonify, request
from flask_cors import CORS

# Load variables from .env
load_dotenv()

app = FastAPI(title="Giraffe-Net Server API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For high security, replace "*" with your site's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pull configuration from environment variables
API_KEY = os.getenv("API_KEY")
API_KEY_NAME = os.getenv("API_KEY_NAME", "access_token")
SERVER_IP = os.getenv("SERVER_IP", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))
MC_SERVER_DIR = os.getenv("MC_SERVER_DIR", "/opt/minecraft/server")

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(header_key: str = Depends(api_key_header)):
    if header_key == API_KEY:
        return header_key
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN, 
        detail="Invalid API Key"
    )

def run_command(command: str):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return str(e)
    
def get_system_metrics():
    """Collects real-time system usage metrics."""
    
    # 1. CPU Usage
    # interval=None means non-blocking (returns immediate result)
    cpu_percent = psutil.cpu_percent(interval=0.4, percpu=False)
    
    # 2. Memory Usage
    memory = psutil.virtual_memory()
    mem_used_gb = round(memory.used / (1024 ** 3), 1)
    mem_total_gb = round(memory.total / (1024 ** 3), 1)
    mem_percent = memory.percent

    # 3. Temperature (Platform-dependent, so we use a safe simulation)
    # If running on Linux/macOS, psutil.sensors_temps() might be used, but we simulate for portability.
    # Simulation: Generate a realistic CPU temperature (30C + up to 15C based on CPU usage)
    base_temp = 30 
    temp_c = round(base_temp + (cpu_percent * 0.15))

    # 4. GPU Usage (Highly platform-dependent, so we use a simulation)
    # If using NVIDIA, you'd use 'pynvml'. If AMD, another tool.
    # Simulation: GPU usage is often correlated with system activity, so link it to a function of CPU%
    gpu_percent = round((cpu_percent * 0.5) % 100) # Simple formula for simulation

    return {
        'cpu_percent': cpu_percent,
        'mem_used_gb': mem_used_gb,
        'mem_total_gb': mem_total_gb,
        'mem_percent': mem_percent,
        'temp_c': temp_c,
        'gpu_percent': gpu_percent
    }

#minecraft endpoints
@app.post("/minecraft/start", dependencies=[Depends(get_api_key)])
async def minecraft_start():
    cmd = f"sudo systemctl start minecraft"
    run_command(cmd)
    return {"status": "Minecraft server starting..."}

@app.post("/minecraft/restart", dependencies=[Depends(get_api_key)])
async def minecraft_restart():
    cmd = f"sudo systemctl restart minecraft"
    run_command(cmd)
    return {"status": "Minecraft server restarting..."}

@app.post("/minecraft/stop", dependencies=[Depends(get_api_key)])
async def minecraft_stop():
    cmd = f"sudo systemctl stop minecraft"
    run_command(cmd)
    return {"status": "Minecraft server stopping..."}

@app.post("/minecraft/status", dependencies=[Depends(get_api_key)])
async def minecraft_status():
    cmd = f"sudo systemctl status minecraft | grep Active: "
    ret = run_command(cmd)
    if ("active (running)" in ret):
        ret = "Minecraft server is running."
    else:
        ret = "Minecraft server is not running or has encountered an error."
    return {"status": ret.strip()}

# @app.post("/minecraft/backup", dependencies=[Depends(get_api_key)])
# async def minecraft_backup():
#     # Example using the MC_SERVER_DIR from .env
#     cmd = f"cd {MC_SERVER_DIR} && screen -dmS mc_session java -jar server.jar nogui"
#     run_command(cmd)
#     return {"status": "Minecraft server starting..."}

# @app.post("/minecraft/listplayers", dependencies=[Depends(get_api_key)])
# async def minecraft_list_players():
#     cmd = f"cd {MC_SERVER_DIR} && screen -dmS mc_session java -jar server.jar nogui"
#     run_command(cmd)
#     return {"status": "Minecraft server starting..."}

#system endpoints
@app.post("/system/reboot", dependencies=[Depends(get_api_key)])
async def system_reboot():
    os.system("sudo reboot")
    return {"status": "Rebooting..."}

@app.get("/system/metrics", dependencies=[Depends(get_api_key)])
async def system_metrics():
    try:
        metrics = get_system_metrics()
        # print(metrics)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail="Failed to get system metrics."
        )

if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_IP, port=SERVER_PORT)