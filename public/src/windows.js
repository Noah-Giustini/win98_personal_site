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

        // --- MODIFIED: The map now stores an object with state ---
        // This will hold: { element: windowContainer, state: 'normal' | 'minimized' }
        this.openWindows = new Map();
        // --- END MODIFIED ---

        this.baseZ = 10;
        this.topZ = 10;
        
        this.minWidth = 200;
        this.minHeight = 150;
        this.maxWidth = 800;
        this.maxHeight = 600;
    }

    openWindow(id, title, contentHTML, iconSrc = null) { 
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
    windowContainer.style.width = '300px'; 
    windowContainer.style.height = '200px';

    this.topZ++;
    windowContainer.style.zIndex = this.topZ;

    windowContainer.innerHTML = this.getWindowTemplate(id, title, contentHTML, iconSrc);
    this.desktopBase.appendChild(windowContainer);

    this.openWindows.set(id, { element: windowContainer, state: 'normal' });

    const draggableElement = document.getElementById(`${id}-draggable-window`);
    this.makeDraggable(windowContainer, `${id}-draggable-header`);
    
    this.makeResizable(windowContainer);

    windowContainer.addEventListener('mousedown', (e) => {
        this.bringToFront(windowContainer);
    }, true);

    // --- MODIFIED: Pass the iconSrc to the tab creator ---
    this.createTaskbarTab(id, title, iconSrc);
    // --- END MODIFIED ---
    
    this.setActiveTab(id);
}

    // --- MODIFIED: closeWindow Method ---
    closeWindow(id) {
        // --- MODIFIED: Get the object from the map ---
        const windowObj = this.openWindows.get(id); 
        // --- END MODIFIED ---

        if (windowObj) {
            // --- MODIFIED: Remove the element from the object ---
            windowObj.element.remove();
            // --- END MODIFIED ---
            this.openWindows.delete(id);
            console.log(`Window "${id}" closed.`);
            
            this.removeTaskbarTab(id);
            
            // --- NEW: Find new top window to activate ---
            // (This logic is the same as in minimizeWindow)
            this.findAndActivateNextTopWindow(id);
            // --- END NEW ---
        }
    }

    // --- MODIFIED: bringToFront Method ---
    /**
     * Brings a window to the top, makes it visible, 
     * and sets its state to 'normal'. This is also our "restore" function.
     */
    bringToFront(windowContainer) {
        // --- NEW: Make sure window is visible and update state ---
        windowContainer.style.display = 'block'; 
        
        const id = windowContainer.id.replace('-window-container', '');
        const windowObj = this.openWindows.get(id);
        if (windowObj) {
            windowObj.state = 'normal';
        }
        // --- END NEW ---

        // Check if it's already the top window
        if (parseInt(windowContainer.style.zIndex) === this.topZ) {
             // Still need to set the tab active (in case it was minimized)
             this.setActiveTab(id);
             return;
        }

        // Increment the top z-index and apply it
        this.topZ++;
        windowContainer.style.zIndex = this.topZ;
        
        // Set the corresponding tab as active
        this.setActiveTab(id);
    }

    // --- NEW: minimizeWindow Method ---
    /**
     * Hides a window, sets its state to 'minimized',
     * and activates the next-highest window.
     */
    minimizeWindow(id) {
        const windowObj = this.openWindows.get(id);
        if (!windowObj || windowObj.state === 'minimized') {
            return; // Already minimized
        }
        
        // Hide window and set state
        windowObj.element.style.display = 'none';
        windowObj.state = 'minimized';

        // Deactivate this tab (the new top window will be set next)
        this.setActiveTab(null); // Deselects all

        // Find the next top-most window and activate it
        this.findAndActivateNextTopWindow(id);
    }
    // --- END NEW ---

    // --- NEW: findAndActivateNextTopWindow Helper Method ---
    /**
     * Finds the highest z-index window that isn't the one being minimized/closed
     * and activates its tab.
     */
    findAndActivateNextTopWindow(excludedId) {
        let nextTopZ = -1;
        let nextTopId = null;

        // Loop through all open windows
        for (const [key, value] of this.openWindows.entries()) {
            // Skip the window we're minimizing/closing or any other minimized window
            if (key === excludedId || value.state === 'minimized') {
                continue;
            }
            
            const currentZ = parseInt(value.element.style.zIndex);
            
            if (currentZ > nextTopZ) {
                nextTopZ = currentZ;
                nextTopId = key;
            }
        }

        // If we found a new top window, activate its tab
        if (nextTopId) {
            this.setActiveTab(nextTopId);
        }
    }
    // --- END NEW ---


    /**
     * Sets a tab as "active" and deactivates all others.
     */
    setActiveTab(id) {
        if (!this.taskbarTabs) return;

        // Deactivate all tabs
        const allTabs = this.taskbarTabs.querySelectorAll('.taskbar-tab');
        allTabs.forEach(tab => {
            tab.classList.remove('taskbar-tab-active');
        });

        // Activate the specified tab (if one is provided)
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
    createTaskbarTab(id, title, iconSrc = null) { // Added iconSrc
    if (!this.taskbarTabs) return;

    const tab = document.createElement('div');
    tab.id = `${id}-taskbar-tab`;
    tab.classList.add('taskbar-tab');
    
    // --- NEW: Create icon HTML if src is provided ---
    let iconHTML = '';
    if (iconSrc) {
        // Use a specific class so we can style it
        iconHTML = `<img src="${iconSrc}" class="taskbar-tab-icon">`;
    }
    // --- END NEW ---

    // --- MODIFIED: Add iconHTML to the tab ---
    tab.innerHTML = `${iconHTML}<span>${title}</span>`; 
    // --- END MODIFIED ---

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

    // --- MODIFIED: handleTabClick Method ---
    /**
     * Handles a click on a taskbar tab.
     * - If window is minimized, restore it.
     * - If window is active, minimize it.
     * - If window is not active, bring it to front.
     */
    handleTabClick(id) {
        const windowObj = this.openWindows.get(id);
        if (!windowObj) return;

        if (windowObj.state === 'minimized') {
            // Case 1: Window is minimized. Restore it.
            this.bringToFront(windowObj.element);
        } else {
            // Case 2: Window is 'normal' (visible)
            const isActive = (parseInt(windowObj.element.style.zIndex) === this.topZ);
            if (isActive) {
                // It's the top window. Minimize it.
                this.minimizeWindow(id);
            } else {
                // It's visible but behind another window. Bring it to front.
                this.bringToFront(windowObj.element);
            }
        }
    }
    // --- END MODIFIED ---

    // --- MODIFIED: getWindowTemplate Method ---
    /**
     * Generates the reusable HTML structure.
     */
    getWindowTemplate(id, title, contentHTML, iconSrc = null) {
        // --- NEW: Create icon HTML for the header ---
        let iconHTML = '';
        if (iconSrc) {
            // Using a new class for styling the header icon
            iconHTML = `<img src="${iconSrc}" class="window-header-icon">`;
        }
        // --- END NEW ---

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
    // --- END MODIFIED ---

    /**
     * Reusable logic to make an element draggable. 
     */
    makeDraggable(elmnt, headerId) {
        // ... (This method remains unchanged) ...
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
        // ... (This method remains unchanged) ...
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



// --- Implementation Example ---

// --- MODIFIED: Pass the new ID to the constructor ---
// The constructor now finds both "desktop-base" and "taskbar-tabs"
const windowManager = new WindowManager("desktop-base", "taskbar-tabs"); 
// --- NEW: Start Menu Toggle Logic ---
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('start-button'); // Use the ID we added to the <a> tag

if (startButton) {
    startButton.addEventListener('click', function(e) {
        e.preventDefault(); // Stop the default link action
        e.stopPropagation(); // Stop the event from bubbling up to the document click handler

        // Toggle the display property
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
        // Check if the click target is outside the start menu and outside the start button
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            startMenu.style.display = 'none';
        }
    }
});
// --- END NEW ---


// --- OPTIONAL: Hook up a new application link inside the menu ---
const newAppLinks = document.querySelectorAll('.js-app-link');

newAppLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const id = this.getAttribute('data-app-id');
        const title = this.getAttribute('data-app-title');
        const iconSrc = this.querySelector('.menu-icon').src;
        
        let content;
        
        // --- NEW: Use a switch to select content based on ID ---
        switch(id) {
            case 'notepad':
                content = notepadContent;
                break;
            case 'minesweeper':
                content = minesweeperContent;
                break;
            case 'internet':
                content = internetContent;
                break;
            // Handle existing or desktop apps if necessary, or just rely on the new apps
            default:
                content = `<h1>${title}</h1><p>Content for ${title}.</p>`;
        }
        // --- END NEW ---

        // Open the window using your existing WindowManager
        windowManager.openWindow(id, title, content, iconSrc);
        
        // Close the menu after launching the application
        startMenu.style.display = 'none'; 
    });
});


//define specific window content
const aboutMeContent = `
    <div class="icon-wrap">
      <div class="icon-outer-container">
        <div class="icon-inner-container" style="padding:20px; text-align:center;">
          <!-- icons here -->
          <p>Welcome to my profile!</p>
          <ul>
            <li>Info 1</li>
            <li>Info 2</li>
          </ul>
        </div>
      </div>
    </div>`;

const portfolioContent = `
    <div style="padding: 20px;">
        <h2>My Projects</h2>
        <p>Details about projects go here.</p>
    </div>`;

// --- NEW Content Definitions ---
const notepadContent = `<h1>Notepad</h1><p>A simple text editor.</p>`;
const minesweeperContent = `<h1>Minesweeper</h1><p>Welcome to the classic minefield!</p>`;
const internetContent = `<h1>Internet Explorer</h1><p>The best browser... in 1995.</p>`;
// --- END NEW ---

document.getElementById("about-me-icon-div").onclick = function() {
    // Find the img element inside this clicked div
    const iconImg = this.querySelector('img');
    // Get its src attribute, or null if not found
    const iconSrc = iconImg ? iconImg.src : null; 
    
    // Pass iconSrc as the 4th argument
    windowManager.openWindow('about-me', 'About Me', aboutMeContent, iconSrc);
};

// Based on your HTML, your "Work Experience" ID is on the inner div
document.getElementById("work-experience-icon-div").onclick = function() {
    const iconImg = this.querySelector('img');
    const iconSrc = iconImg ? iconImg.src : null;

    // Use the 'portfolio' ID you had before
    windowManager.openWindow('portfolio', 'My Portfolio', portfolioContent, iconSrc);
};