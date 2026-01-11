class WindowManager {
    constructor(desktopBaseId = "desktop-base", taskbarTabsId = "taskbar-tabs") {
        this.desktopBase = document.getElementById(desktopBaseId);
        this.taskbarTabs = document.getElementById(taskbarTabsId);
        
        if (!this.desktopBase) {
            console.error(`Base element with ID "${desktopBaseId}" not found.`);
        }
        if (!this.taskbarTabs) {
            console.error(`Taskbar element with ID "${taskbarTabsId}" not found.`);
        }

        // This will hold: { element: windowContainer, state: 'normal' | 'minimized' }
        this.openWindows = new Map();

        this.baseZ = 10;
        this.topZ = 10;
        
        this.minWidth = 200;
        this.minHeight = 150;
        this.maxWidth = 800;
        this.maxHeight = 600;
    }

    openWindow(id, title, contentHTML, iconSrc = null, onOpenCallback = null) { 
        if (this.openWindows.has(id)) {
            const windowObj = this.openWindows.get(id);
            if (windowObj) {
                this.bringToFront(windowObj.element);
            }
            return;
        }

    const windowContainer = document.createElement('div');
    windowContainer.id = `${id}-window-container`;
    windowContainer.classList.add('windows-container-wrapper');
    windowContainer.style.position = 'absolute';
    windowContainer.style.top = '40%';
    windowContainer.style.left = '40%';
    
    // --- Set initial size for the monitor app to look correct ---
    if (id === 'sysmon') {
        windowContainer.style.width = '450px'; 
        windowContainer.style.height = '350px';
    } else {
        windowContainer.style.width = '300px'; 
        windowContainer.style.height = '200px';
    }

    this.topZ++;
    windowContainer.style.zIndex = this.topZ;

    windowContainer.innerHTML = this.getWindowTemplate(id, title, contentHTML, iconSrc);
    this.desktopBase.appendChild(windowContainer);

    this.openWindows.set(id, { element: windowContainer, state: 'normal', intervalId: null });

    const draggableElement = document.getElementById(`${id}-draggable-window`);
    this.makeDraggable(windowContainer, `${id}-draggable-header`);
    
    this.makeResizable(windowContainer);

    windowContainer.addEventListener('mousedown', (e) => {
        this.bringToFront(windowContainer);
    }, true);

    this.createTaskbarTab(id, title, iconSrc);
    
    this.setActiveTab(id);

    // Run callback after window is added to DOM
    if (onOpenCallback && typeof onOpenCallback === 'function') {
        onOpenCallback(id);
    }
}

    // closeWindow Method (Handles interval cleanup)
    closeWindow(id) {
        const windowObj = this.openWindows.get(id); 

        if (windowObj) {
            // Clear monitoring interval if it exists
            if (windowObj.intervalId) {
                clearInterval(windowObj.intervalId);
                console.log(`Cleared interval for ${id}`);
            }

            windowObj.element.remove();
            this.openWindows.delete(id);
            console.log(`Window "${id}" closed.`);
            
            this.removeTaskbarTab(id);
            
            this.findAndActivateNextTopWindow(id);
        }
    }

    /**
     * Brings a window to the top, makes it visible, 
     * and sets its state to 'normal'. This is also our "restore" function.
     */
    bringToFront(windowContainer) {
        windowContainer.style.display = 'block'; 
        
        const id = windowContainer.id.replace('-window-container', '');
        const windowObj = this.openWindows.get(id);
        if (windowObj) {
            windowObj.state = 'normal';
        }

        // Check if it's already the top window
        if (parseInt(windowContainer.style.zIndex) === this.topZ) {
             this.setActiveTab(id);
             return;
        }

        this.topZ++;
        windowContainer.style.zIndex = this.topZ;
        
        this.setActiveTab(id);
    }

    /**
     * Hides a window, sets its state to 'minimized',
     * and activates the next-highest window.
     */
    minimizeWindow(id) {
        const windowObj = this.openWindows.get(id);
        if (!windowObj || windowObj.state === 'minimized') {
            return; // Already minimized
        }
        
        windowObj.element.style.display = 'none';
        windowObj.state = 'minimized';

        this.setActiveTab(null); // Deselects all

        this.findAndActivateNextTopWindow(id);
    }

    /**
     * Finds the highest z-index window that isn't the one being minimized/closed
     * and activates its tab.
     */
    findAndActivateNextTopWindow(excludedId) {
        let nextTopZ = -1;
        let nextTopId = null;

        for (const [key, value] of this.openWindows.entries()) {
            if (key === excludedId || value.state === 'minimized') {
                continue;
            }
            
            const currentZ = parseInt(value.element.style.zIndex);
            
            if (currentZ > nextTopZ) {
                nextTopZ = currentZ;
                nextTopId = key;
            }
        }

        if (nextTopId) {
            this.setActiveTab(nextTopId);
        }
    }


    /**
     * Sets a tab as "active" and deactivates all others.
     */
    setActiveTab(id) {
        if (!this.taskbarTabs) return;

        const allTabs = this.taskbarTabs.querySelectorAll('.taskbar-tab');
        allTabs.forEach(tab => {
            tab.classList.remove('taskbar-tab-active');
        });

        if (id) {
            const tabToActivate = document.getElementById(`${id}-taskbar-tab`);
            if (tabToActivate) {
                tabToActivate.classList.add('taskbar-tab-active');
            }
        }
    }
    
    /**
     * Creates and appends a new tab to the taskbar.
     */
    createTaskbarTab(id, title, iconSrc = null) {
        if (!this.taskbarTabs) return;

        const tab = document.createElement('div');
        tab.id = `${id}-taskbar-tab`;
        tab.classList.add('taskbar-tab');
        
        let iconHTML = '';
        if (iconSrc) {
            iconHTML = `<img src="${iconSrc}" class="taskbar-tab-icon">`;
        }

        tab.innerHTML = `${iconHTML}<span>${title}</span>`; 

        tab.onclick = () => {
            this.handleTabClick(id);
        };

        this.taskbarTabs.appendChild(tab);
    }

    /**
     * Finds and removes a tab from the taskbar.
     */
    removeTaskbarTab(id) {
        const tab = document.getElementById(`${id}-taskbar-tab`);
        if (tab) {
            tab.remove();
        }
    }

    /**
     * Handles a click on a taskbar tab.
     */
    handleTabClick(id) {
        const windowObj = this.openWindows.get(id);
        if (!windowObj) return;

        if (windowObj.state === 'minimized') {
            this.bringToFront(windowObj.element);
        } else {
            const isActive = (parseInt(windowObj.element.style.zIndex) === this.topZ);
            if (isActive) {
                this.minimizeWindow(id);
            } else {
                this.bringToFront(windowObj.element);
            }
        }
    }

    /**
     * Generates the reusable HTML structure.
     */
    getWindowTemplate(id, title, contentHTML, iconSrc = null) {
        let iconHTML = '';
        if (iconSrc) {
            iconHTML = `<img src="${iconSrc}" class="window-header-icon">`;
        }

        return `
            <div class="windows-container js-windows-container" id="${id}-draggable-window" style="height:100%; width:100%;">
                <div class="form windows js-windows windows-form" id="form">
                    <header class="js-winheader windows-header" id="${id}-draggable-header">
                        ${iconHTML}<span>${title}</span>
                        <div class="header-buttons">
                            <button class="windows-button" style="padding:0; height:16px; width:16px;" onclick="windowManager.minimizeWindow('${id}')">
                                <img src="../images/minimize-icon.png" style="width:100%; height:100%;">
                            </button>
                            <button class="windows-button" style="padding:0; height:16px; width:16px;" onclick="windowManager.closeWindow('${id}')">
                                <img src="../images/close-icon.png" style="width:100%; height:100%;">
                            </button>
                        </div>
                    </header>
                    <div class="form-content" style="height:calc(100% - 25px); overflow: auto;"> 
                        ${contentHTML}
                    </div>
                </div>
                <div class="resize-handle handle-bottom"></div>
                <div class="resize-handle handle-right"></div>
                <div class="resize-handle handle-bottom-right"></div>
            </div>`;
    }

    /**
     * Reusable logic to make an element draggable. 
     */
    makeDraggable(elmnt, headerId) {
        const header = document.getElementById(headerId);
        if (header) {
            header.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            let pos3 = e.clientX;
            let pos4 = e.clientY;
            e = e || window.event;
            e.preventDefault();
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                let pos1 = pos3 - e.clientX;
                let pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            }
        
            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }
    }

    /**
     * Logic to make an element resizable.
     */
    makeResizable(elmnt) {
        const handles = elmnt.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                let initialX = e.clientX;
                let initialY = e.clientY;
                let initialWidth = elmnt.offsetWidth;
                let initialHeight = elmnt.offsetHeight;
                const handleType = handle.classList;

                const doResize = (e) => {
                    const dx = e.clientX - initialX;
                    const dy = e.clientY - initialY;
                    let newWidth = initialWidth;
                    let newHeight = initialHeight;

                    if (handleType.contains('handle-right') || handleType.contains('handle-bottom-right')) {
                        newWidth = Math.min(this.maxWidth, Math.max(this.minWidth, initialWidth + dx));
                    }
                    if (handleType.contains('handle-bottom') || handleType.contains('handle-bottom-right')) {
                        newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, initialHeight + dy));
                    }
                    
                    elmnt.style.width = `${newWidth}px`;
                    elmnt.style.height = `${newHeight}px`;
                };

                const stopResize = () => {
                    document.removeEventListener('mousemove', doResize);
                    document.removeEventListener('mouseup', stopResize);
                };

                document.addEventListener('mousemove', doResize);
                document.addEventListener('mouseup', stopResize);
            });
        });
    }
}


// ----------------------------------------------------------------------
// --- SYSTEM MONITOR UTILITIES (EXTRACTED FROM system_monitor.html) ---
// ----------------------------------------------------------------------

// --- API Configuration ---
const API_BASE_URL = 'http://10.0.1.3:8000'; 
const METRICS_API = `${API_BASE_URL}/system/metrics`;

/**
 * Safely attempts a fetch operation with exponential backoff.
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, retries - 1, delay * 2);
        } else {
            throw new Error("API connection failed after multiple retries.");
        }
    }
}

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
    console.log("graphElement:", graphElement, "data length:", data.length);
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


//minecraft APIs
const MINECRAFT_API_STATUS = `${API_BASE_URL}/minecraft/status`;
const MINECRAFT_API_START = `${API_BASE_URL}/minecraft/start`;
const MINECRAFT_API_STOP = `${API_BASE_URL}/minecraft/stop`;
const MINECRAFT_API_RESTART = `${API_BASE_URL}/minecraft/restart`;
const API_KEY_NAME = "access_token";
const API_KEY = "key";
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
            if (statusIcon) statusIcon.src = "../images/check-0.png";
        } else {
            if (statusIcon) statusIcon.src = "../images/msg_warning-0.png";
        }

    } catch (err) {
        console.error("Minecraft Monitoring Error:", err);
        if (errorDiv) errorDiv.classList.remove('hidden');
        if (loadingDiv) loadingDiv.classList.add('hidden');
        statusLine.textContent = 'Status: Connection failed.';
        statusIcon.src = "../images/msg_warning-0.png";
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
        alert('Failed to start Minecraft Server: ' + err.message);
    }
}

// ----------------------------------------------------------------------
// --- APPLICATION CONTENT AND IMPLEMENTATION ---
// ----------------------------------------------------------------------


// --- Implementation Example ---
const windowManager = new WindowManager("desktop-base", "taskbar-tabs"); 

// --- Start Menu Toggle Logic ---
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('start-button'); 

if (startButton) {
    startButton.addEventListener('click', function(e) {
        e.preventDefault(); 
        e.stopPropagation(); 

        if (startMenu.style.display === 'none' || startMenu.style.display === '') {
            startMenu.style.display = 'flex';
        } else {
            startMenu.style.display = 'none';
        }
    });
}

// Close the menu if the user clicks anywhere else
document.addEventListener('click', function(e) {
    if (startMenu && startMenu.style.display === 'flex') {
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            startMenu.style.display = 'none';
        }
    }
});

// --- Hook up application links ---
const newAppLinks = document.querySelectorAll('.js-app-link');

newAppLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const id = this.getAttribute('data-app-id');
        const title = this.getAttribute('data-app-title');
        const iconSrc = this.querySelector('.menu-icon').src;
        
        let content;
        let onOpenCallback = null;
        
        switch(id) {
            case 'sysmon':
                content = systemMonitorContentHTML;
                startMenu.style.display = 'none';
                onOpenCallback = initializeSystemMonitor;
                break;
            case 'notepad':
                content = notepadContent;
                break;
            case 'minecraft':
                content = minecraftContent;
                startMenu.style.display = 'none';
                onOpenCallback = initializeMinecraftMonitor;
                break;
            case 'internet':
                content = internetContent;
                break;
            default:
                content = `<h1>${title}</h1><p>Content for ${title}.</p>`;
        }

        windowManager.openWindow(id, title, content, iconSrc, onOpenCallback);
        
        startMenu.style.display = 'none'; 
    });
});


// --- Content Definitions ---
const aboutMeContent = `
    <div class="icon-wrap">
      <div class="icon-outer-container">
        <div class="icon-inner-container" style="padding:20px; text-align:center;">
          <p>Welcome to my profile!</p>
          <ul><li>Info 1</li><li>Info 2</li></ul>
        </div>
      </div>
    </div>`;

const portfolioContent = `
    <div style="padding: 20px;">
        <h2>My Projects</h2>
        <p>Details about projects go here.</p>
    </div>`;

const notepadContent = `<h1>Notepad</h1><p>A simple text editor.</p>`;

//monitor window for minecraft server
const minecraftContent = `
            <div class="p-4 space-y-4">
                
                <!-- Status and API Info -->
                <div class="text-xs text-gray-700 border-t border-gray-400 pt-2" style="margin-bottom: 10px; background-color: darkgray; padding: 5px; display:flex; flex-direction: row; align-items: center; justify-content: space-evenly;">
                    <img class="js-status-icon" src="../images/application_hourglass-0.png" style="width:16px; height:16px; vertical-align: middle; margin-right: 5px;">
                    <p class="js-status-line">Status: Initializing...</p>
                </div>
                <a title="Restart" class="button minecraft-restart-button-wrapper js-minecraft-restart-button" id="minecraft-restart-button" onclick="minecraftRestartServer()">
                    <div class="minecraft-restart-button">
                        <img src="../images/netmeeting-2.png" style="width:25%; height:25%;">
                        <div style="width: min-content;">Restart Server</div>
                    </div>
                </a>
                <a title="Start" class="button minecraft-start-button-wrapper js-minecraft-start-button" target="_blank" id="minecraft-start-button" onclick="minecraftStartServer()">
                    <div class="minecraft-start-button"">
                        <img src="../images/internet_options-0.png" style="width:25%; height:25%;">
                        <div style="width: min-content;">Start Server</div>
                    </div>
                </a>
                <a title="Stop" class="button minecraft-stop-button-wrapper js-minecraft-stop-button" target="_blank" id="minecraft-stop-button" onclick="minecraftStopServer()">
                    <div class="minecraft-stop-button">
                        <img src="../images/msg_error-0.png" style="width:25%; height:25%;">
                        <div style="width: min-content;">Stop Server</div>
                    </div>
                </a>

                <!-- Loading/Error Messages -->
                <div class="js-loading text-center text-sm font-bold text-gray-700">Connecting to server...</div>
                <div class="js-error-message hidden text-center text-sm font-bold text-red-600">
                    Connection Failed. Ensure \`api.py\` is running on <span class="js-api-url"></span>.
                </div>
            </div>
        `;

const internetContent = `<h1>Internet Explorer</h1><p>The best browser... in 1995.</p>`;

/**
 * Generates the HTML block for CPU Usage, including the progress bar and graph container.
 */
const cpuBlock = `
    <!-- CPU USAGE BLOCK -->
    <div class="bg-gray-100 p-3 border border-gray-400">
        <div class="flex items-start space-x-3" style="display:flex; align-items: center; justify-content: space-evenly; margin-top: 2px;">
            <div class="resource-usage-basic w-1/3" style="width:140px; align-items: center;">
                <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>CPU Usage</span>
                    <span class="js-cpu-value">--%</span>
                </div>
                <!-- Simple Progress Bar -->
                <div class="progress-bar" style="height: 12px; border: 1px solid #000; background: #fff; padding: 1px;">
                    <div class="js-cpu-progress progress-bar-fill" style="width: 0%; height: 100%; transition: width 0.3s ease;"></div>
                </div>
            </div>

            <!-- History Graph Container -->
            <div class="resource-usage-basic w-1/3" style="min-width:140px; max-width: 50%; align-items: center;">
                <div class="js-cpu-graph flex-1 mt-2" style="height: 50px; background: #000; border: 1px solid #404040; display: flex; align-items: flex-end; overflow: hidden; min-width: 140px; max-width: 50%;">
                    <!-- History bars will be drawn here -->
                </div>
            </div>
        </div>
    </div>`;

/**
 * Generates the HTML block for Memory Usage, including the progress bar and graph container.
 */
const memBlock = `
    <!-- MEMORY USAGE BLOCK -->
    <div class="bg-gray-100 p-3 border border-gray-400">
        <div class="flex items-start space-x-3" style="display:flex; align-items: center; justify-content: space-evenly; margin-top: 2px;">
            <div class="resource-usage-basic w-1/3" style="width:140px; align-items: center;">
                <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Memory Usage</span>
                    <span class="js-mem-value">--%</span>
                </div>
                <!-- Simple Progress Bar -->
                <div class="progress-bar" style="height: 12px; border: 1px solid #000; background: #fff; padding: 1px;">
                    <div class="js-mem-progress progress-bar-fill" style="width: 0%; height: 100%; transition: width 0.3s ease;"></div>
                </div>
            </div>

            <!-- History Graph Container -->
            <div class="resource-usage-basic w-1/3" style="min-width:140px; max-width: 50%; align-items: center;">
                <div class="js-mem-graph flex-1 mt-2" style="height: 50px; background: #000; border: 1px solid #404040; display: flex; align-items: flex-end; overflow: hidden; min-width: 140px; max-width: 50%;">
                    <!-- History bars will be drawn here -->
                </div>
            </div>
        </div>
    </div>`;
        
/**
 * Generates the HTML block for GPU Usage and Temperature in a grid.
 */
const gpuBlock = `
    <!-- GPU & TEMP BLOCK -->
    <div class="grid grid-cols-2 gap-4">
        <!-- GPU USAGE -->
        <div class="bg-gray-100 p-3 border border-gray-400">
            <div class="flex items-start space-x-3" style="display:flex; align-items: center; justify-content: space-evenly; margin-top: 2px;">
                <div class="resource-usage-basic w-1/3" style="width:140px; align-items: center;">
                    <div class="flex justify-between text-xs font-semibold mb-1">
                        <span>GPU Usage</span>
                        <span class="js-gpu-value">--%</span>
                    </div>
                    <!-- Simple Progress Bar -->
                    <div class="progress-bar" style="height: 12px; border: 1px solid #000; background: #fff; padding: 1px;">
                        <div class="js-gpu-progress progress-bar-fill" style="width: 0%; height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <!-- History Graph Container -->
                <div class="resource-usage-basic w-1/3" style="min-width:140px; max-width: 50%; align-items: center;">
                    <div class="js-gpu-graph flex-1 mt-2" style="height: 50px; background: #000; border: 1px solid #404040; display: flex; align-items: flex-end; overflow: hidden; min-width: 140px; max-width: 50%;">
                        <!-- History bars will be drawn here -->
                    </div>
                </div>
            </div>
        </div>
        
        <!-- TEMPERATURE -->
        <div class="bg-gray-100 p-3 border border-gray-400 flex flex-col justify-between">
            <div class="flex justify-between text-xs font-semibold">
                <span>Temperature</span>
                <span class="js-temp-value text-lg font-bold">--°C</span>
            </div>
            <div class="text-xs text-gray-500 mt-1"></div>
        </div>
    </div>`;

const systemMonitorContentHTML = `
            <div class="p-4 space-y-4">
                
                <!-- Status and API Info -->
                <div class="text-xs text-gray-700 border-t border-gray-400 pt-2" style="margin-bottom: 10px; background-color: darkgray; padding: 5px;">
                    <p class="js-status-line">Status: Initializing...</p>
                </div>

                <!-- Loading/Error Messages -->
                <div class="js-loading text-center text-sm font-bold text-gray-700">Connecting to server...</div>
                <div class="js-error-message hidden text-center text-sm font-bold text-red-600">
                    Connection Failed. Ensure \`api.py\` is running on <span class="js-api-url"></span>.
                </div>

                ${cpuBlock}
                ${memBlock}
                ${gpuBlock}
            </div>
        `;


// --- Desktop Icon Click Handlers ---
document.getElementById("about-me-icon-div").onclick = function() {
    const iconImg = this.querySelector('img');
    const iconSrc = iconImg ? iconImg.src : null; 
    windowManager.openWindow('about-me', 'About Me', aboutMeContent, iconSrc);
};

document.getElementById("work-experience-icon-div").onclick = function() {
    const iconImg = this.querySelector('img');
    const iconSrc = iconImg ? iconImg.src : null;
    windowManager.openWindow('portfolio', 'My Portfolio', portfolioContent, iconSrc);
};