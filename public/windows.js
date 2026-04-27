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
                                <img src="./images/minimize-icon.png" style="width:100%; height:100%;">
                            </button>
                            <button class="windows-button" style="padding:0; height:16px; width:16px;" onclick="windowManager.closeWindow('${id}')">
                                <img src="./images/close-icon.png" style="width:100%; height:100%;">
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

// --- API Configuration ---
const API_BASE_URL = 'http://10.0.1.3:8000'; 
const API_KEY_NAME = "access_token";
const API_KEY = "key";

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
            case 'discord-nobot':
                content = discordNobotContent;
                startMenu.style.display = 'none';
                onOpenCallback = initializeDiscordNobotMonitor;
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
const minecraftContent = 
`
    <div class="p-4 space-y-4">
        
        <!-- Status and API Info -->
        <div class="text-xs text-gray-700 border-t border-gray-400 pt-2" style="margin-bottom: 10px; background-color: darkgray; padding: 5px; display:flex; flex-direction: row; align-items: center; justify-content: space-evenly;">
            <img class="js-status-icon" src="./images/application_hourglass-0.png" style="width:16px; height:16px; vertical-align: middle; margin-right: 5px;">
            <p class="js-status-line">Status: Initializing...</p>
        </div>

        <!-- Ensure the buttons and player list are side by side -->
        <div style="display:flex; align-items: center; justify-content: space-evenly; margin-bottom: 10px;">

        <!-- Control Buttons -->
        <div style="width: 100%">
            <a title="Restart" class="button minecraft-restart-button-wrapper js-minecraft-restart-button" id="minecraft-restart-button" onclick="minecraftRestartServer()">
                <div class="minecraft-restart-button">
                    <img src="./images/netmeeting-2.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Restart Server</div>
                </div>
            </a>
            <a title="Start" class="button minecraft-start-button-wrapper js-minecraft-start-button" target="_blank" id="minecraft-start-button" onclick="minecraftStartServer()">
                <div class="minecraft-start-button"">
                    <img src="./images/internet_options-0.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Start Server</div>
                </div>
            </a>
            <a title="Stop" class="button minecraft-stop-button-wrapper js-minecraft-stop-button" target="_blank" id="minecraft-stop-button" onclick="minecraftStopServer()">
                <div class="minecraft-stop-button">
                    <img src="./images/msg_error-0.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Stop Server</div>
                </div>
            </a>
        </div>

        <!--- Player list section -->
        <div class="bg-gray-100 p-3 border border-gray-400">
            <div class="flex items-start space-x-3" style="display:flex; align-items: center; justify-content: space-evenly; margin-top: 2px; margin-right: 6px;">
                <div class="players-online-basic w-1/3" style="width:140px; align-items: center;">
                    <div class="flex justify-between text-xs font-semibold mb-1">
                        <span>Players online: </span>
                        <span class="js-minecraft-players-online-value"></span>
                    </div>
                    <!-- Simple Player List -->
                    <!-- player list will be filled dynamically and each player will be a new row in the box-->
                    <div class="player-list">
                        <div class="js-minecraft-player-list">
                            <span class="js-minecraft-players-list-value"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>

        <!-- Loading/Error Messages -->
        <div class="js-loading text-center text-sm font-bold text-gray-700">Connecting to server...</div>
        <div class="js-error-message hidden text-center text-sm font-bold text-red-600">
            Connection Failed. Ensure \`api.py\` is running on <span class="js-api-url"></span>.
        </div>
    </div>
`;

//monitor window for Discord No-bot
const discordNobotContent = 
`
    <div class="p-4 space-y-4">
        
        <!-- Status and API Info -->
        <div class="text-xs text-gray-700 border-t border-gray-400 pt-2" style="margin-bottom: 10px; background-color: darkgray; padding: 5px; display:flex; flex-direction: row; align-items: center; justify-content: space-evenly;">
            <img class="js-status-icon" src="./images/application_hourglass-0.png" style="width:16px; height:16px; vertical-align: middle; margin-right: 5px;">
            <p class="js-status-line">Status: Initializing...</p>
        </div>

        <!-- Control Buttons Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px;">
            <a title="Start" class="button discord-nobot-start-button-wrapper js-discord-nobot-start-button" id="discord-nobot-start-button" onclick="discordNobotStart()">
                <div class="discord-nobot-start-button">
                    <img src="./images/internet_options-0.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Start Bot</div>
                </div>
            </a>
            <a title="Stop" class="button discord-nobot-stop-button-wrapper js-discord-nobot-stop-button" id="discord-nobot-stop-button" onclick="discordNobotStop()">
                <div class="discord-nobot-stop-button">
                    <img src="./images/msg_error-0.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Stop Bot</div>
                </div>
            </a>
            <a title="Restart" class="button discord-nobot-restart-button-wrapper js-discord-nobot-restart-button" id="discord-nobot-restart-button" onclick="discordNobotRestart()">
                <div class="discord-nobot-restart-button">
                    <img src="./images/netmeeting-2.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Restart Bot</div>
                </div>
            </a>
            <a title="Update" class="button discord-nobot-update-button-wrapper js-discord-nobot-update-button" id="discord-nobot-update-button" onclick="discordNobotUpdate()">
                <div class="discord-nobot-update-button">
                    <img src="./images/gps-1.png" style="width:25%; height:25%;">
                    <div style="width: min-content;">Update Bot</div>
                </div>
            </a>
        </div>

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
const desktopAppIcons = document.querySelectorAll('.js-desktop-app');
desktopAppIcons.forEach(icon => {
    icon.addEventListener('click', function(e) {
        e.preventDefault();
        const appId = this.getAttribute('data-app-id');
        const titleMap = {
            'notepad': 'Notepad',
            'minecraft': 'Minecraft',
            'discord-nobot': 'Discord No-bot',
            'sysmon': 'System Monitor',
            'portfolio': 'My Portfolio',
            "about-me": "About Me"
        };
        const contentMap = {
            'notepad': notepadContent,
            'minecraft': minecraftContent,
            'discord-nobot': discordNobotContent,
            'sysmon': systemMonitorContentHTML,
            'portfolio': portfolioContent,
            "about-me": aboutMeContent
        };
        const callbackMap = {
            'notepad': null,
            'minecraft': initializeMinecraftMonitor,
            'discord-nobot': initializeDiscordNobotMonitor,
            'sysmon': initializeSystemMonitor,
            'portfolio': null,
            "about-me": null
        };

        const iconImg = this.querySelector('img');
        const iconSrc = iconImg ? iconImg.src : null;

        const title = titleMap[appId] || appId;
        const content = contentMap[appId] || `<h1>${title}</h1>`;
        const cb = callbackMap[appId] || null;

        windowManager.openWindow(appId, title, content, iconSrc, cb);
    });
});