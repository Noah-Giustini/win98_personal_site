/**
 * Discord No-Bot Service
 * Handles Discord No-Bot control and monitoring
 */

//*****************************DISCORD NO-BOT *****************************/

//discord no-bot APIs
const DISCORD_NOBOT_API_STATUS = `${API_BASE_URL}/discord/no/status`;
const DISCORD_NOBOT_API_START = `${API_BASE_URL}/discord/no/start`;
const DISCORD_NOBOT_API_STOP = `${API_BASE_URL}/discord/no/stop`;
const DISCORD_NOBOT_API_RESTART = `${API_BASE_URL}/discord/no/restart`;
const DISCORD_NOBOT_API_UPDATE = `${API_BASE_URL}/discord/no/update`;

/**
 * Main function to fetch and render Discord No-Bot server information.
 */
async function updateDiscordNobotMetrics(id) {
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

        const data = await fetch(DISCORD_NOBOT_API_STATUS, requestOptions);
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

        if (jsonData.status === "Discord No-Bot is running.") {
            if (statusIcon) statusIcon.src = "./images/check-0.png";
        } else {
            if (statusIcon) statusIcon.src = "./images/msg_warning-0.png";
        }

    } catch (err) {
        console.error("Discord No-Bot Monitoring Error:", err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        statusLine.textContent = 'Status: Connection failed.';
        statusIcon.src = "./images/msg_warning-0.png";
    }
}

//initialize Discord No-Bot monitor
function initializeDiscordNobotMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    // Initial run
    updateDiscordNobotMetrics(id); 

    // Set interval to refresh metrics every 5 seconds (5000ms)
    const intervalId = setInterval(() => updateDiscordNobotMetrics(id), 5000);

    if (windowObj) {
        windowObj.intervalId = intervalId;
    }
    
    // Set API endpoint display 
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        windowContainer.querySelector('.js-api-url').textContent = API_BASE_URL;
    }
}

async function discordNobotRestart() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(DISCORD_NOBOT_API_RESTART, requestOptions);
    } catch(err){ 
        alert('Failed to restart Discord No-Bot: ' + err.message);
    }
}

async function discordNobotStart() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(DISCORD_NOBOT_API_START, requestOptions);
    } catch(err){ 
        alert('Failed to start Discord No-Bot: ' + err.message);
    }
}

async function discordNobotStop() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(DISCORD_NOBOT_API_STOP, requestOptions);
    } catch(err){ 
        alert('Failed to stop Discord No-Bot: ' + err.message);
    }
}

async function discordNobotUpdate() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(DISCORD_NOBOT_API_UPDATE, requestOptions);
    } catch(err){ 
        alert('Failed to update Discord No-Bot: ' + err.message);
    }
}
