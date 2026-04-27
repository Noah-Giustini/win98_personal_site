/**
 * System Monitor Service
 * Handles system metrics monitoring and display
 */

//*****************************System Monitor *****************************/

/**
 * Updates the progress bar width. Color is set in HTML.
 * @param {HTMLElement} element The progress bar fill element.
 * @param {number} percent The usage percentage (0-100).
 */
function updateProgress(element, percent) {
    if (element) {
        element.style.width = `${percent}%`;
    }
    // Set color based on usage level
    if (percent > 85) {
        element.style.backgroundColor = 'red';
    } else if (percent > 65) {
        element.style.backgroundColor = 'yellow';
    } else {
        element.style.backgroundColor = 'green';
    }
}

/**
 * Draws a series of vertical bars in a container to show history.
 * @param {HTMLElement} graphElement The container element for the graph.
 * @param {number[]} data The array of percentage values (0-100).
 */
function drawHistoryGraph(graphElement, data) {
    if (!graphElement) {
        return;
    }

    graphElement.innerHTML = ''; // Clear old bars
    
    // We get the width of the container to calculate how many bars we can fit
    const containerWidth = graphElement.clientWidth;
    const barWidth = 4; // Width of each bar + margin
    const maxBars = Math.floor(containerWidth / barWidth);
    
    // Get only the last 'maxBars' number of items from the data
    const visibleData = data.slice(-maxBars);
    
    visibleData.forEach(percent => {
        const bar = document.createElement('div');
        bar.style.height = `${percent}%`;
        bar.style.width = '3px';
        bar.style.marginRight = '1px';
        bar.style.backgroundColor = '#00ff00'; // Bright green
        bar.style.flexShrink = '0'; // Prevent bars from shrinking
        
        graphElement.appendChild(bar);
    });
}

const METRICS_API = `${API_BASE_URL}/system/metrics`;

/**
 * Main function to fetch and render metrics for a specific window instance.
 */
async function updateMetrics(id) {
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

    // Only show loading on first run
    if (loadingDiv && !loadingDiv.classList.contains('hidden')) {
        statusLine.textContent = 'Status: Fetching data...';
    }
    
    try {

        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                [API_KEY_NAME]: API_KEY
            }
        };

        const data = await fetch(METRICS_API, requestOptions);
        const dataJson = await data.json();

        // Hide loading/error messages on success
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }

        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }

        // --- Update CPU ---
        const cpuValue = windowContainer.querySelector('.js-cpu-value');
        const cpuProgress = windowContainer.querySelector('.js-cpu-progress');
        const cpuGraph = windowContainer.querySelector('.js-cpu-graph');

        if (cpuValue) cpuValue.textContent = `${dataJson.cpu_percent.toFixed(1)}%`;
        

        if (cpuProgress) {
            updateProgress(cpuProgress, dataJson.cpu_percent);
        }
        
        if (windowObj.cpuHistory) {
            windowObj.cpuHistory.push(dataJson.cpu_percent);
            // Keep only the last 100 values
            if (windowObj.cpuHistory.length > 100) {
                windowObj.cpuHistory.shift();
            }
            drawHistoryGraph(cpuGraph, windowObj.cpuHistory);
        }

        // --- Update Memory ---
        const memValue = windowContainer.querySelector('.js-mem-value');
        const memProgress = windowContainer.querySelector('.js-mem-progress');
        const memGraph = windowContainer.querySelector('.js-mem-graph');

        if (memValue) {
            memValue.textContent = `${dataJson.mem_used_gb.toFixed(1)} GB / ${dataJson.mem_total_gb.toFixed(1)} GB`;
        }

        if (memProgress) {
            updateProgress(memProgress, dataJson.mem_percent);
        }

        if (windowObj.memHistory) {
            windowObj.memHistory.push(dataJson.mem_percent);
            if (windowObj.memHistory.length > 100) {
                windowObj.memHistory.shift();
            }
            drawHistoryGraph(memGraph, windowObj.memHistory);
        }


        // --- Update GPU ---
        const gpuValue = windowContainer.querySelector('.js-gpu-value');
        const gpuProgress = windowContainer.querySelector('.js-gpu-progress');
        const gpuGraph = windowContainer.querySelector('.js-gpu-graph');

        if (gpuValue) {
            gpuValue.textContent = `${dataJson.gpu_percent.toFixed(1)}%`;
        }

        if (gpuProgress) {
            updateProgress(gpuProgress, dataJson.gpu_percent);
        }

        if (windowObj.gpuHistory) {
            windowObj.gpuHistory.push(dataJson.gpu_percent);
            if (windowObj.gpuHistory.length > 100) {
                windowObj.gpuHistory.shift();
            }
            drawHistoryGraph(gpuGraph, windowObj.gpuHistory);
        }

        // --- Update Temperature ---
        const tempValue = windowContainer.querySelector('.js-temp-value');
        if (tempValue) {
            tempValue.textContent = `${dataJson.temp_c}°C`;
        }
        
        statusLine.textContent = 'Status: Monitoring active.';

    } catch (err) {
        console.error("Monitoring Error:", err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        statusLine.textContent = 'Status: Connection failed.';
    }
}


/**
 * Initializes the monitoring interval for a new window instance.
 */
function initializeSystemMonitor(id) {
    const windowObj = windowManager.openWindows.get(id);
    if (!windowObj) return;

    // Initialize history arrays
    windowObj.cpuHistory = [];
    windowObj.memHistory = [];
    windowObj.gpuHistory = [];

    // Initial run
    updateMetrics(id); 

    // Set interval to refresh metrics every 1 second (1000ms)
    const intervalId = setInterval(() => updateMetrics(id), 1000);

    if (windowObj) {
        windowObj.intervalId = intervalId;
    }
    
    // Set API endpoint display 
    const windowContainer = document.getElementById(`${id}-window-container`);
    if (windowContainer) {
        windowContainer.querySelector('.js-api-endpoint-display').textContent = METRICS_API;
        windowContainer.querySelector('.js-api-url').textContent = API_BASE_URL;
    }
}
