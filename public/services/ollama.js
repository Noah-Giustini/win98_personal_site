/**
 * Minecraft Server Service
 * Handles Minecraft server control and monitoring
 */

//*****************************MINECRAFT SERVER *****************************/

//ollama APIs
const OLLAMA_API_STATUS = `${API_BASE_URL}/ollama/status`;
const OLLAMA_API_START = `${API_BASE_URL}/ollama/start`;
const OLLAMA_API_STOP = `${API_BASE_URL}/ollama/stop`;
const OLLAMA_API_RESTART = `${API_BASE_URL}/ollama/restart`;

/**
 * Main function to fetch and render ollama server information.
 */
async function updateOllamaMetrics(id) {
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

        const data = await fetch(OLLAMA_API_STATUS, requestOptions);
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

        if (jsonData.status === "Ollama server is running.") {
            if (statusIcon) statusIcon.src = "./images/check-0.png";
        } else {
            if (statusIcon) statusIcon.src = "./images/msg_warning-0.png";
        }

    } catch (err) {
        console.error("Ollama Monitoring Error:", err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        statusLine.textContent = 'Status: Connection failed.';
        statusIcon.src = "./images/msg_warning-0.png";
    }
}

//initialize ollama monitor
function initializeOllamaMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    // Initial run
    updateOllamaMetrics(id); 

    // Set interval to refresh metrics every 5 seconds (5000ms)
    const intervalId = setInterval(() => updateOllamaMetrics(id), 5000);

    if (windowObj) {
        windowObj.intervalId = intervalId;
    }
    
    // Set API endpoint display 
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        windowContainer.querySelector('.js-api-url').textContent = API_BASE_URL;
    }
}

async function ollamaRestartServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(OLLAMA_API_RESTART, requestOptions);
    } catch(err){ 
        alert('Failed to restart Ollama Server: ' + err.message);
    }
}

async function ollamaStartServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(OLLAMA_API_START, requestOptions);
    } catch(err){ 
        alert('Failed to start Ollama Server: ' + err.message);
    }
}

async function ollamaStopServer() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const res = await fetch(OLLAMA_API_STOP, requestOptions);
    } catch(err){ 
        alert('Failed to stop Ollama Server: ' + err.message);
    }
}