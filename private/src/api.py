from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_403_FORBIDDEN
import uvicorn
import subprocess
import os
import psutil
from dotenv import load_dotenv
import time

#items specifically for the resource monitor
from flask import Flask, jsonify, request
from flask_cors import CORS

def run_command(command: str):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return str(e)
    
# Load variables from .env
load_dotenv()

# Pull configuration from environment variables
API_KEY = os.getenv("API_KEY")
API_KEY_NAME = os.getenv("API_KEY_NAME", "access_token")
SERVER_IP = os.getenv("SERVER_IP", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))
MC_SERVER_DIR = os.getenv("MC_SERVER_DIR", "/opt/minecraft/server")
DISCORD_NOBOT_REPO_DIR = os.getenv("DISCORD_NOBOT_REPO_DIR", "/home/giraffe/repos/discord_no_bot")
SITE_REPO_DIR = os.getenv("SITE_REPO_DIR", "/home/giraffe/repos//win98_personal_site/private/src")

jetson_device = False
# Check if running on NVIDIA Jetson device
if (run_command("which tegrastats").strip() != ""):
    jetson_device = True
    print("Jetson device detected. Enabling GPU and temperature metrics.")
else:
    jetson_device = False
    print("No Jetson device detected. GPU and temperature metrics will be simulated.")

app = FastAPI(title="Giraffe-Net Server API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For high security, replace "*" with your site's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(header_key: str = Depends(api_key_header)):
    if header_key == API_KEY:
        return header_key
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN, 
        detail="Invalid API Key"
    )
    
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

    gpu_percent = 0.0
    cpu_temp = 0.0

    if (jetson_device == True):
        # 3. GPU Usage and Temperature (specific to NVIDIA Jetson devices)
        #this info is pulled through tegrastats. we parse the output to get gpu usage and cpu temp but there is more info available if needed.
        #we set interval 100 to get a fast response. head is used to only get the first line and then kill the process.
        gpu_temp_cmd = r"""tegrastats --interval 100 | head -n 1 | awk '{for(i=1;i<=NF;i++){if($i=="GR3D_FREQ") g=$(i+1); if($i~"cpu@") {split($i,a,"@"); c=a[2]}} print g","c}'"""
        gpu_temp_string = run_command(gpu_temp_cmd)
        gpu_temp_string = gpu_temp_string.strip().split(",")
        gpu_percent = float(gpu_temp_string[0].strip().split("%")[0])
        cpu_temp = float(gpu_temp_string[1].strip("C"))
    else:
         #the below items are placeholders incase the API is not running on a jetson device.
        # For simulation purposes, we will generate a fake temperature based on CPU usage
        base_temp = 30 
        cpu_temp = round(base_temp + (cpu_percent * 0.15))

        # Simulated GPU usage based on CPU usage
        gpu_percent = round((cpu_percent * 0.5) % 100) # Simple formula for simulation

   

    return {
        'cpu_percent': cpu_percent,
        'mem_used_gb': mem_used_gb,
        'mem_total_gb': mem_total_gb,
        'mem_percent': mem_percent,
        'temp_c': cpu_temp,
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

#this function currently does not work. I am not sure why but the minecraft server is not running the list command... Might have to find a way for systemd to trigger it.
@app.post("/minecraft/listplayers", dependencies=[Depends(get_api_key)])
async def minecraft_list_players():
    num_players = 0
    player_list = []
    lst_cmd = f"""sudo -u giraffe /usr/bin/screen -p 0 -X eval 'stuff "list"\015' > /home/giraffe/mc_list_output.txt"""
    tail_cmd = f"tail -n 1 /home/giraffe/Minecraft/logs/latest.log"
    ret_string = run_command(lst_cmd)
    time.sleep(0.5)  # wait a moment for the command to be processed
    ret_string = run_command(tail_cmd)
    print(ret_string)
    #example return: [12:38:19] [Server thread/INFO]: There are 1 of a max of 20 players online: boldcoffee
    #parse return string to get number of players and list of names

    try:
        split1 = ret_string.split("There are ")[1]
        num_players = split1.split(" of a max of ")[0]
        split2 = split1.split("players online: ")[1]
        if (num_players == "0"):
            player_list = []
        else:
            player_list = [name.strip() for name in split2.split(",")]
    except Exception as e:
        num_players = 0
        player_list = []
    
    return {"player_count": num_players, "players": player_list}

#discord bot endpoints
@app.post("/discord/no/start", dependencies=[Depends(get_api_key)])
async def discord_nobot_start():
    cmd = f"sudo systemctl start no-bot"
    run_command(cmd)
    return {"status": "Discord No-Bot starting..."}

@app.post("/discord/no/restart", dependencies=[Depends(get_api_key)])
async def discord_nobot_restart():
    cmd = f"sudo systemctl restart no-bot"
    run_command(cmd)
    return {"status": "Discord No-Bot restarting..."}

@app.post("/discord/no/stop", dependencies=[Depends(get_api_key)])
async def discord_nobot_stop():
    cmd = f"sudo systemctl stop no-bot"
    run_command(cmd)
    return {"status": "Discord No-Bot stopping..."}

@app.post("/discord/no/update", dependencies=[Depends(get_api_key)])
async def discord_nobot_update():
    # Go to the repo location, stash .env, pull latest master, unstash .env, return to original directory
    cmd = f"pushd {DISCORD_NOBOT_REPO_DIR} > /dev/null && git stash push -m 'env' .env && git pull origin master && git stash pop && popd > /dev/null"
    run_command(cmd)
    return {"status": "Discord No-Bot updating..."}

@app.post("/discord/no/status", dependencies=[Depends(get_api_key)])
async def discord_nobot_status():
    cmd = f"sudo systemctl status no-bot | grep Active: "
    ret = run_command(cmd)
    if ("active (running)" in ret):
        ret = "Discord No-Bot is running."
    else:
        ret = "Discord No-Bot is not running or has encountered an error."
    return {"status": ret.strip()}

#system monitor endpoints
@app.get("/monitor/metrics", dependencies=[Depends(get_api_key)])
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
    
#system endpoints
@app.post("/system/reboot", dependencies=[Depends(get_api_key)])
async def system_reboot():
    os.system("sudo reboot")
    return {"status": "Rebooting..."}   
#add api endpoint for updating the whole site by doing a git pull in the repo. Then the deploy script can be run.
@app.post("/system/update", dependencies=[Depends(get_api_key)])
async def site_update():
    cmd = f"pushd {SITE_REPO_DIR} > /dev/null && git pull origin master && ./deploy.sh && popd > /dev/null"
    run_command(cmd)
    return {"status": "Site updating..."}

if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_IP, port=SERVER_PORT)