/**
 * Project Zomboid Service
 * Handles Project Zomboid server control and monitoring.
 */

const ZOMBOID_API_STATUS = `${NEBULA_API_BASE_URL}/zomboid/status`;
const ZOMBOID_API_START = `${NEBULA_API_BASE_URL}/zomboid/start`;
const ZOMBOID_API_STOP = `${NEBULA_API_BASE_URL}/zomboid/stop`;
const ZOMBOID_API_RESTART = `${NEBULA_API_BASE_URL}/zomboid/restart`;
const ZOMBOID_API_LIST_PLAYERS = `${NEBULA_API_BASE_URL}/zomboid/listplayers`;
const ZOMBOID_API_UPDATE_MODS = `${NEBULA_API_BASE_URL}/zomboid/mods/update`;

function getZomboidRequestOptions(method = 'POST') {
    return {
        method,
        headers: {
            'Content-Type': 'application/json',
            [API_KEY_NAME]: API_KEY
        }
    };
}

async function updateZomboidMetrics(id) {
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (!windowContainer) return;

    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    const loadingDiv = windowContainer.querySelector('.js-loading');
    const errorDiv = windowContainer.querySelector('.js-error-message');
    const statusLine = windowContainer.querySelector('.js-status-line');
    const statusIcon = windowContainer.querySelector('.js-status-icon');
    const playersOnlineValue = windowContainer.querySelector('.js-zomboid-players-online-value');
    const playersListValue = windowContainer.querySelector('.js-zomboid-players-list-value');

    if (loadingDiv && !loadingDiv.classList.contains('hidden')) {
        statusLine.textContent = 'Status: Fetching data...';
    }

    try {
        const statusRes = await fetch(ZOMBOID_API_STATUS, getZomboidRequestOptions('GET'));
        const statusData = await statusRes.json();

        if (loadingDiv) loadingDiv.classList.add('hidden');
        if (errorDiv) errorDiv.classList.add('hidden');

        const isRunning = statusData.running === true;
        if (statusLine) {
            statusLine.textContent = statusData.status || (isRunning ? 'Project Zomboid server is running.' : 'Project Zomboid server is stopped.');
        }

        if (statusIcon) {
            statusIcon.src = isRunning ? './images/check-0.png' : './images/msg_warning-0.png';
        }

        if (isRunning) {
            const playersRes = await fetch(ZOMBOID_API_LIST_PLAYERS, getZomboidRequestOptions('GET'));
            const playersData = await playersRes.json();
            const players = Array.isArray(playersData.players) ? playersData.players : [];

            if (playersOnlineValue) playersOnlineValue.textContent = `${players.length}`;
            if (playersListValue) playersListValue.textContent = players.length ? players.join(', ') : 'No players online.';
        } else {
            if (playersOnlineValue) playersOnlineValue.textContent = '0';
            if (playersListValue) playersListValue.textContent = 'Server offline.';
        }
    } catch (err) {
        console.error('Project Zomboid Monitoring Error:', err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        if (statusLine) statusLine.textContent = 'Status: Connection failed.';
        if (statusIcon) statusIcon.src = './images/msg_warning-0.png';
    }
}

function initializeZomboidMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    updateZomboidMetrics(id);
    const intervalId = setInterval(() => updateZomboidMetrics(id), 5000);
    windowObj.intervalId = intervalId;

    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        const apiUrl = windowContainer.querySelector('.js-api-url');
        if (apiUrl) {
            apiUrl.textContent = ZOMBOID_API_BASE_URL;
        }
    }
}

function setZomboidModsStatus(message) {
    const windowContainer = document.getElementById('zomboid-window-container');
    if (!windowContainer) return;

    const statusElement = windowContainer.querySelector('.js-zomboid-mods-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

async function zomboidStartServer() {
    try {
        const res = await fetch(ZOMBOID_API_START, getZomboidRequestOptions('POST'));
        const data = await res.json();
        setZomboidModsStatus(data.status || 'Start command sent.');
        updateZomboidMetrics('zomboid');
    } catch (err) {
        alert('Failed to start Project Zomboid server: ' + err.message);
    }
}

async function zomboidStopServer() {
    try {
        const res = await fetch(ZOMBOID_API_STOP, getZomboidRequestOptions('POST'));
        const data = await res.json();
        setZomboidModsStatus(data.status || 'Stop command sent.');
        updateZomboidMetrics('zomboid');
    } catch (err) {
        alert('Failed to stop Project Zomboid server: ' + err.message);
    }
}

async function zomboidRestartServer() {
    try {
        const res = await fetch(ZOMBOID_API_RESTART, getZomboidRequestOptions('POST'));
        const data = await res.json();
        setZomboidModsStatus(data.status || 'Restart command sent.');
        updateZomboidMetrics('zomboid');
    } catch (err) {
        alert('Failed to restart Project Zomboid server: ' + err.message);
    }
}

async function zomboidUpdateMods() {
    setZomboidModsStatus('Updating mods...');
    try {
        const res = await fetch(ZOMBOID_API_UPDATE_MODS, getZomboidRequestOptions('POST'));
        const data = await res.json();
        setZomboidModsStatus(data.status || 'Mods update command completed.');
        updateZomboidMetrics('zomboid');
    } catch (err) {
        setZomboidModsStatus('Mods update failed.');
        alert('Failed to update Project Zomboid mods: ' + err.message);
    }
}
