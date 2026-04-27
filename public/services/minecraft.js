/**
 * Minecraft Server Service
 * Handles Minecraft server control and monitoring
 */

//*****************************MINECRAFT SERVER *****************************/

//minecraft APIs
const MINECRAFT_API_STATUS = `${API_BASE_URL}/minecraft/status`;
const MINECRAFT_API_START = `${API_BASE_URL}/minecraft/start`;
const MINECRAFT_API_STOP = `${API_BASE_URL}/minecraft/stop`;
const MINECRAFT_API_RESTART = `${API_BASE_URL}/minecraft/restart`;
const MINECRAFT_API_LIST_PLAYERS = `${API_BASE_URL}/minecraft/listplayers`;

/**
 * Main function to fetch and render minecraft server information.
 */
async function updateMinecraftMetrics(id) {
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (!windowContainer) return; // Window closed

    // --- Get window object to store history ---
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) {
        return;
    } 

    const loadingDiv = windowContainer.querySelector('.js-loading');
    const errorDiv = windowContainer.querySelector('.js-error-message');
    const statusLine = windowContainer.querySelector('.js-status-line');
    const statusIcon = windowContainer.querySelector('.js-status-icon');
    const playersOnlineValue = windowContainer.querySelector('.js-minecraft-players-online-value');
    const playersListValue = windowContainer.querySelector('.js-minecraft-players-list-value');

    // Only show loading on first run
    if (loadingDiv && !loadingDiv.classList.contains('hidden')) {
        statusLine.textContent = 'Status: Fetching data...';
    }
    
    try {
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const data = await fetch(MINECRAFT_API_STATUS, requestOptions);
        const jsonData = await data.json();

        // Hide loading/error messages on success
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }

        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }

        // --- Update status value ---
        //get the response status text from the server
        if (statusLine) statusLine.textContent = `${jsonData.status}`;

        if (jsonData.status === "Minecraft server is running.") {
            if (statusIcon) statusIcon.src = "./images/check-0.png";

            //in the case that the server is running, also get the players online and player list. fill the below values in the window.
            const player_data = await fetch(MINECRAFT_API_LIST_PLAYERS, requestOptions);
            const jsonPlayerData = await player_data.json();

            if (playersOnlineValue) playersOnlineValue.textContent = `${jsonPlayerData.player_count}`;
            if (playersListValue) playersListValue.textContent = `${jsonPlayerData.players.join(', ')}`;

        } else {
            if (statusIcon) statusIcon.src = "./images/msg_warning-0.png";
            if (playersOnlineValue) playersOnlineValue.textContent = `0`;
            if (playersListValue) playersListValue.textContent = ``;
        }

    } catch (err) {
        console.error("Minecraft Monitoring Error:", err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        statusLine.textContent = 'Status: Connection failed.';
        statusIcon.src = "./images/msg_warning-0.png";
    }
}

//initialize minecraft monitor
function initializeMinecraftMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    // Initial run
    updateMinecraftMetrics(id); 

    // Set interval to refresh metrics every 5 seconds (5000ms)
    const intervalId = setInterval(() => updateMinecraftMetrics(id), 5000);

    if (windowObj) {
        windowObj.intervalId = intervalId;
    }
    
    // Set API endpoint display 
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        windowContainer.querySelector('.js-api-url').textContent = API_BASE_URL;
    }
}

async function minecraftRestartServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(MINECRAFT_API_RESTART, requestOptions);
    } catch(err){ 
        alert('Failed to restart Minecraft Server: ' + err.message);
    }
}

async function minecraftStartServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(MINECRAFT_API_START, requestOptions);
    } catch(err){ 
        alert('Failed to start Minecraft Server: ' + err.message);
    }
}

async function minecraftStopServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(MINECRAFT_API_STOP, requestOptions);
    } catch(err){ 
        alert('Failed to stop Minecraft Server: ' + err.message);
    }
}
