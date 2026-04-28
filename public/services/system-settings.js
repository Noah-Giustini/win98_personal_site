/**
 * System Settings Service
 * Handles system control and monitoring
 */

//*****************************SYSTEM *****************************/

//system APIs
const SYSTEM_API_UPDATE = `${API_BASE_URL}/system/update`;
const NEBULA_SYSTEM_API_UPDATE = `${NEBULA_API_BASE_URL}/system/update`;
const SYSTEM_API_REBOOT = `${API_BASE_URL}/system/reboot`;

/**
 * Main function to fetch and render System Settings information.
 */
// async function updateSystemSettingsMetrics(id) {
//     const windowContainer = document.getElementById(`${id}-window-container`);
//     if (!windowContainer) return; // Window closed

//     // --- Get window object to store history ---
//     const windowObj = windowManager.openWindows.get(id);
//     if (!windowObj) {
//         return;
//     } 

//     const loadingDiv = windowContainer.querySelector('.js-loading');
//     const errorDiv = windowContainer.querySelector('.js-error-message');
//     const statusLine = windowContainer.querySelector('.js-status-line');
//     const statusIcon = windowContainer.querySelector('.js-status-icon');

//     // Only show loading on first run
//     if (loadingDiv && !loadingDiv.classList.contains('hidden')) {
//         statusLine.textContent = 'Status: Fetching data...';
//     }
    
//     try {
        
//         const requestOptions = {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 [API_KEY_NAME]: API_KEY
//             }
//         };

//         const data = await fetch(DISCORD_NOBOT_API_STATUS, requestOptions);
//         const jsonData = await data.json();

//         // Hide loading/error messages on success
//         if (loadingDiv) {
//             loadingDiv.classList.add('hidden');
//         }

//         if (errorDiv) {
//             errorDiv.classList.add('hidden');
//         }

//         // --- Update status value ---
//         //get the response status text from the server
//         if (statusLine) statusLine.textContent = `${jsonData.status}`;

//         if (jsonData.status === "Discord No-Bot is running.") {
//             if (statusIcon) statusIcon.src = "./images/check-0.png";
//         } else {
//             if (statusIcon) statusIcon.src = "./images/msg_warning-0.png";
//         }

//     } catch (err) {
//         console.error("Discord No-Bot Monitoring Error:", err);
//         if (errorDiv) errorDiv.classList.remove('hidden');
//         if (loadingDiv) loadingDiv.classList.add('hidden');
//         statusLine.textContent = 'Status: Connection failed.';
//         statusIcon.src = "./images/msg_warning-0.png";
//     }
// }

//initialize System Settings monitor
function initializeSystemSettingsMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    // Initial run
    updateSystemSettingsMetrics(id); 

    // Set interval to refresh metrics every 5 seconds (5000ms)
    const intervalId = setInterval(() => updateSystemSettingsMetrics(id), 5000);

    if (windowObj) {
        windowObj.intervalId = intervalId;
    }
    
    // Set API endpoint display 
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        windowContainer.querySelector('.js-api-url').textContent = API_BASE_URL;
    }
}

//leaving this function here incase I want to add a button to restart the API
// async function systemSettingsRestart() {
//     try{ 
//         const requestOptions = {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 [API_KEY_NAME]: API_KEY
//             }
//         };

//         const res = await fetch(DISCORD_NOBOT_API_RESTART, requestOptions);
//     } catch(err){ 
//         alert('Failed to restart Discord No-Bot: ' + err.message);
//     }
// }

async function systemSettingsUpdate() {
    try{ 
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const [mainRes, nebulaRes] = await Promise.allSettled([
            fetch(SYSTEM_API_UPDATE, requestOptions),
            fetch(NEBULA_SYSTEM_API_UPDATE, requestOptions)
        ]);

        const failures = [];

        if (mainRes.status === 'rejected') {
            failures.push('main API');
        }

        if (nebulaRes.status === 'rejected') {
            failures.push('nebula API');
        }

        if (failures.length) {
            alert(`Update request failed for: ${failures.join(', ')}`);
            return;
        }

        const mainJson = await mainRes.value.json();
        const nebulaJson = await nebulaRes.value.json();

        const mainFailed = !mainRes.value.ok || /failed/i.test(mainJson.status || '');
        const nebulaFailed = !nebulaRes.value.ok || /failed/i.test(nebulaJson.status || '');

        if (mainFailed || nebulaFailed) {
            const failedTargets = [];
            if (mainFailed) failedTargets.push('main API');
            if (nebulaFailed) failedTargets.push('nebula API');
            alert(`Update request completed with errors on: ${failedTargets.join(', ')}`);
            return;
        }

        alert('Update request sent to both systems.');
    } catch(err){ 
        alert('Failed to update System Settings: ' + err.message);
    }
}
