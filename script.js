// Global variables
        const desktop = document.getElementById('desktop');
        const windows = new Map();
        let activeWindow = null;
        let zIndex = 10;
        let minimizedWindows = [];
        const isMobile = () => window.innerWidth <= 768;


        // Boot sequence
        document.addEventListener('DOMContentLoaded', () => {
            const bootLogo = document.getElementById('boot-logo');
            const bootProgressBar = document.getElementById('boot-progress-bar');
            const bootText = document.getElementById('boot-text');
            const bootScreen = document.getElementById('boot-screen');

            setTimeout(() => { bootLogo.classList.add('active'); bootText.style.opacity = '1'; }, 500);
            setTimeout(() => { bootProgressBar.style.width = '100%'; bootText.textContent = 'Loading system components...'; }, 1000);
            setTimeout(() => { bootText.textContent = 'Initializing desktop environment...'; }, 2000);
            setTimeout(() => {
                bootText.textContent = 'Ready!';
                try {
                    const startupSound = new Howl({ src: ['audio/startup-futuristic.mp3'], volume: 0.3 }); // User needs to provide this
                    startupSound.play();
                } catch (e) { console.warn("Could not play startup sound", e); }
            }, 3000);
            setTimeout(() => {
                bootScreen.style.opacity = '0';
                setTimeout(() => { bootScreen.style.display = 'none'; initializeOS(); }, 1000);
            }, 3500);
        });

        // Initialize OS
        function initializeOS() {
            initBackground();
            initClock();
            initBattery();
            initEventListeners();
            loadPersistedSettings();
        }

        function initBackground() {
            const canvas = document.getElementById('background-canvas');
            try {
                const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.z = 5;

                const particles = new THREE.BufferGeometry();
                const particleCount = isMobile() ? 800 : 2000; // Fewer particles on mobile
                const posArray = new Float32Array(particleCount * 3);
                const colorArray = new Float32Array(particleCount * 3);

                for (let i = 0; i < particleCount * 3; i += 3) {
                    posArray[i] = (Math.random() - 0.5) * 50;
                    posArray[i + 1] = (Math.random() - 0.5) * 50;
                    posArray[i + 2] = (Math.random() - 0.5) * 50;
                    colorArray[i] = Math.random() * 0.3 + 0.2; colorArray[i + 1] = Math.random() * 0.3 + 0.5; colorArray[i + 2] = Math.random() * 0.3 + 0.7;
                }
                particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
                particles.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
                const particleMaterial = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.8 });
                const particleSystem = new THREE.Points(particles, particleMaterial);
                scene.add(particleSystem);

                let animationFrameId_bg;
                function animateBG() {
                    animationFrameId_bg = requestAnimationFrame(animateBG);
                    particleSystem.rotation.x += 0.0001; particleSystem.rotation.y += 0.0002;
                    renderer.render(scene, camera);
                }
                animateBG();

                window.addEventListener('resize', () => {
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                });
                canvas.dataset.renderer = renderer; // Store renderer for potential cleanup
                canvas.dataset.animationFrameId = animationFrameId_bg;
            } catch (e) {
                console.error("Three.js background initialization failed:", e);
                canvas.style.display = 'none'; // Hide canvas if WebGL fails
                document.body.style.backgroundImage = 'linear-gradient(to bottom right, #192a56, #273c75)'; // Fallback
            }
        }


        function initClock() {
            const clockElement = document.getElementById('clock');
            const timezoneSelector = document.getElementById('timezone-selector');
            const timezoneListContainer = timezoneSelector.querySelector('h3').parentNode;
            while (timezoneListContainer.children.length > 1) { timezoneListContainer.lastChild.remove(); }

            const timezones = [ /* ... same timezone array as before ... */
                { id: 'local', name: 'Local Time', offset: new Date().getTimezoneOffset() * -1 },
                { id: 'UTC', name: 'UTC', offset: 0 },
                { id: 'America/New_York', name: 'New York', offset: -240 },
                { id: 'America/Los_Angeles', name: 'Los Angeles', offset: -420 },
                { id: 'Europe/London', name: 'London', offset: 60 },
                { id: 'Europe/Paris', name: 'Paris', offset: 120 },
                { id: 'Asia/Tokyo', name: 'Tokyo', offset: 540 },
                { id: 'Australia/Sydney', name: 'Sydney', offset: 600 }
            ];
            let currentTimezone = timezones[0];

            timezones.forEach(timezone => {
                const option = document.createElement('div');
                option.className = 'timezone-option';
                if (timezone.id === currentTimezone.id) option.classList.add('active');
                option.textContent = timezone.name; option.dataset.id = timezone.id; option.dataset.offset = timezone.offset;
                option.addEventListener('click', () => {
                    document.querySelectorAll('.timezone-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active'); currentTimezone = timezone; updateClock(); timezoneSelector.style.display = 'none';
                });
                timezoneListContainer.appendChild(option);
            });

            function updateClock() {
                const now = new Date(); let displayTime;
                if (currentTimezone.id === 'local') { displayTime = now; }
                else { const utc = now.getTime() + (now.getTimezoneOffset() * 60000); displayTime = new Date(utc + (60000 * parseInt(currentTimezone.offset))); }
                const hours = displayTime.getHours(); const minutes = displayTime.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM'; const displayHours = (hours % 12 || 12).toString();
                clockElement.firstChild.textContent = `${displayHours}:${minutes} ${ampm}`;
            }
            clockElement.addEventListener('click', (e) => { if (e.target === clockElement || clockElement.contains(e.target) && !timezoneSelector.contains(e.target)) { timezoneSelector.style.display = timezoneSelector.style.display === 'block' ? 'none' : 'block'; } });
            document.addEventListener('click', (e) => { if (!clockElement.contains(e.target) && !timezoneSelector.contains(e.target)) { timezoneSelector.style.display = 'none'; } });
            updateClock(); setInterval(updateClock, 1000);
        }

        function initBattery() {
            const batteryIndicator = document.getElementById('battery-indicator');
            if (!batteryIndicator) return; // Element might not exist if taskbar is hidden
            const batteryIcon = batteryIndicator.querySelector('i');
            const batteryText = batteryIndicator.querySelector('span');

            if ('getBattery' in navigator) {
                navigator.getBattery().then(function(battery) {
                    function updateBatteryStatus() {
                        const level = Math.floor(battery.level * 100);
                        batteryText.textContent = `${level}%`; batteryIcon.className = 'fas';
                        if (battery.charging) { batteryIcon.classList.add('fa-bolt'); batteryText.textContent = `${level}%`; } // No (Charging) text on mobile
                        else {
                            if (level >= 90) batteryIcon.classList.add('fa-battery-full');
                            else if (level >= 60) batteryIcon.classList.add('fa-battery-three-quarters');
                            else if (level >= 40) batteryIcon.classList.add('fa-battery-half');
                            else if (level >= 20) batteryIcon.classList.add('fa-battery-quarter');
                            else batteryIcon.classList.add('fa-battery-empty');
                        }
                    }
                    updateBatteryStatus();
                    battery.addEventListener('levelchange', updateBatteryStatus);
                    battery.addEventListener('chargingchange', updateBatteryStatus);
                });
            } else { batteryText.textContent = "N/A"; batteryIcon.className = 'fas fa-battery-slash'; }
        }

        function initEventListeners() {
            document.querySelectorAll('.dock-item').forEach(item => item.addEventListener('click', () => openApp(item.getAttribute('data-app'))));
            const powerIcon = document.querySelector('.power-icon');
            const powerMenu = document.getElementById('power-menu');
            if(powerIcon && powerMenu) {
                powerIcon.addEventListener('click', (e) => { e.stopPropagation(); powerMenu.style.display = powerMenu.style.display === 'block' ? 'none' : 'block'; });
                document.querySelectorAll('.power-option').forEach(option => option.addEventListener('click', () => { powerAction(option.getAttribute('data-action')); powerMenu.style.display = 'none'; }));
            }

            const startMenuBtn = document.getElementById('start-menu-btn');
            const startMenu = document.getElementById('start-menu');
            if(startMenuBtn && startMenu){
                startMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); startMenu.style.display = startMenu.style.display === 'block' ? 'none' : 'block'; });
                document.querySelectorAll('.start-menu-app').forEach(app => app.addEventListener('click', () => { openApp(app.getAttribute('data-app')); startMenu.style.display = 'none'; }));
                const startMenuSearchInput = document.querySelector('#start-menu .start-menu-search');
                startMenuSearchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const apps = document.querySelectorAll('#start-menu .start-menu-app');
                    apps.forEach(app => {
                        const appName = app.querySelector('span').textContent.toLowerCase();
                        app.style.display = appName.includes(searchTerm) ? 'flex' : 'none';
                    });
                });
            }
            document.addEventListener('click', (e) => {
                if (powerMenu && powerIcon && !powerIcon.contains(e.target) && !powerMenu.contains(e.target)) powerMenu.style.display = 'none';
                if (startMenu && startMenuBtn && !startMenuBtn.contains(e.target) && !startMenu.contains(e.target)) startMenu.style.display = 'none';
            });
        }

        function powerAction(action) {
            const shutdownScreen = document.getElementById('shutdown-screen');
            const shutdownText = document.getElementById('shutdown-text');
            switch(action) {
                case 'shutdown':
                    shutdownText.textContent = 'Disconnecting from FutureNet...';
                    shutdownScreen.style.opacity = '1'; shutdownScreen.style.pointerEvents = 'all';
                    document.body.classList.add('exiting-future');
                    try {
                        const shutdownSound = new Howl({ src: ['audio/shutdown-glitch.mp3'], volume: 0.4 }); // User needs to provide
                        shutdownSound.play();
                    } catch(e) { console.warn("Could not play shutdown sound", e); }
                    setTimeout(() => { shutdownText.textContent = 'Goodbye, Time Traveler!'; }, 1500);
                    setTimeout(() => {
                        document.body.innerHTML = `<div style="height: 100vh; width:100vw; background: black; display:flex; flex-direction:column; justify-content:center; align-items:center; color:lime; font-family: 'Courier New', monospace; font-size: 16px; line-height:1.6; padding: 20px; text-align:center;"><p>SYSTEM OFFLINE</p><p>CONNECTION TERMINATED</p><p>RETURN TO PRESENT DATUM COMPLETE</p><p style="margin-top: 20px; font-size:12px; color: #555;">(You may now close this window)</p></div>`;
                        document.body.classList.remove('exiting-future');
                    }, 3000);
                    break;
                case 'restart': /* ... same ... */
                    shutdownText.textContent = 'Restarting...';
                    shutdownScreen.style.opacity = '1'; shutdownScreen.style.pointerEvents = 'all';
                    setTimeout(() => { location.reload(); }, 2000);
                    break;
                case 'sleep': /* ... same ... */
                    shutdownText.textContent = 'Going to sleep...';
                    shutdownScreen.style.opacity = '1'; shutdownScreen.style.pointerEvents = 'all';
                    setTimeout(() => { shutdownScreen.style.opacity = '0'; shutdownScreen.style.pointerEvents = 'none'; }, 2500);
                    break;
            }
        }

        function createWindow(app, title, icon, x, y, width, height) {
            if (windows.has(app)) {
                const existingWindow = windows.get(app);
                minimizedWindows.includes(app) ? restoreWindow(app) : bringToFront(existingWindow);
                return;
            }

            const mobile = isMobile();
            const taskbarHeight = 40;
            const desktopPadding = 10;

            let defaultWidth = mobile ? window.innerWidth - (2 * desktopPadding) : 600;
            let defaultHeight = mobile ? window.innerHeight - taskbarHeight - (2 * desktopPadding) : 400;

            width = width || defaultWidth;
            height = height || defaultHeight;

            // Ensure window is not larger than viewport
            width = Math.min(width, window.innerWidth - (2 * desktopPadding));
            height = Math.min(height, window.innerHeight - taskbarHeight - (2 * desktopPadding));
            
            if (app === 'calculator') { width = Math.min(width, mobile? 280 : 320); height = Math.min(height, mobile? 400 : 480); }
            if (app === 'calendar') { width = Math.min(width, mobile? 300 : 450); height = Math.min(height, mobile? 380 : 400); }


            x = x || Math.max(desktopPadding, (window.innerWidth - width) / 2 + (Math.random() * 40 - 20));
            y = y || Math.max(desktopPadding, (window.innerHeight - taskbarHeight - height) / 2 + (Math.random() * 40 - 20));
            
            // Boundary checks for initial position
            x = Math.max(desktopPadding, Math.min(x, window.innerWidth - width - desktopPadding));
            y = Math.max(desktopPadding, Math.min(y, window.innerHeight - height - taskbarHeight - desktopPadding));


            const windowElement = document.createElement('div');
            windowElement.className = 'window'; windowElement.id = `window-${app}`;
            windowElement.style.width = `${width}px`; windowElement.style.height = `${height}px`;
            windowElement.style.left = `${x}px`; windowElement.style.top = `${y}px`;
            windowElement.style.zIndex = ++zIndex;

            const header = document.createElement('div'); header.className = 'window-header';
            const windowTitle = document.createElement('div'); windowTitle.className = 'window-title';
            const iconElement = document.createElement('i'); iconElement.className = `window-icon ${icon}`;
            windowTitle.appendChild(iconElement);
            const titleText = document.createElement('span'); titleText.textContent = title;
            windowTitle.appendChild(titleText); header.appendChild(windowTitle);

            const actions = document.createElement('div'); actions.className = 'window-actions';
            const minimizeButton = document.createElement('div'); minimizeButton.className = 'window-action window-minimize'; minimizeButton.innerHTML = '<i class="fas fa-minus"></i>';
            minimizeButton.addEventListener('click', () => minimizeWindow(app));
            const maximizeButton = document.createElement('div'); maximizeButton.className = 'window-action window-maximize'; maximizeButton.innerHTML = '<i class="fas fa-expand"></i>';
            maximizeButton.addEventListener('click', () => maximizeWindow(windowElement));
            const closeButton = document.createElement('div'); closeButton.className = 'window-action window-close'; closeButton.innerHTML = '<i class="fas fa-times"></i>';
            closeButton.addEventListener('click', () => closeWindow(app));
            actions.appendChild(minimizeButton); actions.appendChild(maximizeButton); actions.appendChild(closeButton);
            header.appendChild(actions); windowElement.appendChild(header);

            const content = document.createElement('div'); content.className = 'window-content';
            switch(app) {
                case 'file-explorer': content.appendChild(createFileExplorer()); break;
                case 'media-player': content.appendChild(createMediaPlayer()); break;
                case 'browser': content.appendChild(createBrowser()); break;
                case 'terminal': content.appendChild(createTerminal()); break;
                case 'neural-network': content.appendChild(createNeuralNetwork()); break;
                case 'settings': content.appendChild(createSettings()); break;
                case 'calculator': content.appendChild(createCalculator()); break;
                case 'calendar': content.appendChild(createCalendar()); break;
                default: content.textContent = 'Content for ' + title;
            }
            windowElement.appendChild(content);
            ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].forEach(dir => { const rh = document.createElement('div'); rh.className = `window-resize resize-${dir}`; windowElement.appendChild(rh); });

            desktop.appendChild(windowElement); windows.set(app, windowElement);
            makeWindowDraggable(windowElement, header); makeWindowResizable(windowElement);
            focusWindow(windowElement);
            const dockItem = document.querySelector(`.dock-item[data-app="${app}"]`);
            if (dockItem) dockItem.querySelector('.dot-indicator').style.opacity = '1';
            setTimeout(() => windowElement.classList.add('active'), 10);

            // If on mobile and window is not "maximized" by default due to size constraints, maximize it.
            if (mobile && (windowElement.offsetWidth < window.innerWidth - 2 * desktopPadding || windowElement.offsetHeight < window.innerHeight - taskbarHeight - 2 * desktopPadding)) {
                 // setTimeout(() => maximizeWindow(windowElement), 50); // Maximize after render
            }
            return windowElement;
        }

        function makeWindowDraggable(windowElement, handle) { /* ... same ... */
            let isDragging = false; let offsetX, offsetY;
            handle.addEventListener('mousedown', (e) => {
                if (e.target.closest('.window-actions')) return; isDragging = true;
                offsetX = e.clientX - windowElement.offsetLeft; offsetY = e.clientY - windowElement.offsetTop;
                focusWindow(windowElement); e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const x = e.clientX - offsetX; const y = e.clientY - offsetY;
                const taskbarHeight = 40; const desktopPadding = 0; // No negative space
                const maxX = window.innerWidth - windowElement.offsetWidth - desktopPadding;
                const maxY = window.innerHeight - windowElement.offsetHeight - taskbarHeight - desktopPadding;
                windowElement.style.left = `${Math.max(desktopPadding, Math.min(x, maxX))}px`;
                windowElement.style.top = `${Math.max(desktopPadding, Math.min(y, maxY))}px`;
            });
            document.addEventListener('mouseup', () => isDragging = false);
        }
        function makeWindowResizable(windowElement) { /* ... same ... */
            const minWidth = isMobile() ? 200 : 300; const minHeight = isMobile() ? 150 : 200;
            let isResizing = false; let resizeDirection = '';
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            windowElement.querySelectorAll('.window-resize').forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    isResizing = true; resizeDirection = handle.className.split(' ')[1].substring(7);
                    startX = e.clientX; startY = e.clientY;
                    startWidth = windowElement.offsetWidth; startHeight = windowElement.offsetHeight;
                    startLeft = windowElement.offsetLeft; startTop = windowElement.offsetTop;
                    focusWindow(windowElement); e.preventDefault();
                });
            });
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const dx = e.clientX - startX; const dy = e.clientY - startY;
                let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;
                if (resizeDirection.includes('e')) newWidth = Math.max(minWidth, startWidth + dx);
                if (resizeDirection.includes('s')) newHeight = Math.max(minHeight, startHeight + dy);
                if (resizeDirection.includes('w')) { newWidth = Math.max(minWidth, startWidth - dx); newLeft = startLeft + (startWidth - newWidth); }
                if (resizeDirection.includes('n')) { newHeight = Math.max(minHeight, startHeight - dy); newTop = startTop + (startHeight - newHeight); }
                const taskbarHeight = 40; const desktopPadding = 0;
                if (newLeft < desktopPadding) { newWidth += (newLeft - desktopPadding); newLeft = desktopPadding; }
                if (newTop < desktopPadding) { newHeight += (newTop - desktopPadding); newTop = desktopPadding; }
                if (newLeft + newWidth > window.innerWidth - desktopPadding) newWidth = window.innerWidth - newLeft - desktopPadding;
                if (newTop + newHeight > window.innerHeight - taskbarHeight - desktopPadding) newHeight = window.innerHeight - taskbarHeight - newTop - desktopPadding;
                windowElement.style.width = `${Math.max(minWidth, newWidth)}px`; windowElement.style.height = `${Math.max(minHeight, newHeight)}px`;
                windowElement.style.left = `${newLeft}px`; windowElement.style.top = `${newTop}px`;
            });
            document.addEventListener('mouseup', () => { isResizing = false; resizeDirection = ''; });
        }
        function focusWindow(windowElement) { /* ... same ... */
            if (activeWindow === windowElement) return;
            if (activeWindow) activeWindow.style.boxShadow = 'var(--window-shadow)';
            activeWindow = windowElement; windowElement.style.zIndex = ++zIndex;
            windowElement.style.boxShadow = '0 12px 48px rgba(0, 168, 255, 0.3)'; // Brighter shadow for active
        }
        function minimizeWindow(app) { /* ... same ... */
            const windowElement = windows.get(app); if (!windowElement || minimizedWindows.includes(app)) return;
            windowElement.classList.add('window-minimized'); windowElement.style.pointerEvents = 'none';
            if (!minimizedWindows.includes(app)) minimizedWindows.push(app);
            addToTaskbar(app); if (activeWindow === windowElement) activeWindow = null;
        }
        function addToTaskbar(app) { /* ... same ... */
            const taskbarApps = document.getElementById('taskbar-apps'); if (document.getElementById(`taskbar-${app}`)) return;
            const windowElement = windows.get(app); const titleElement = windowElement.querySelector('.window-title');
            const iconClass = titleElement.querySelector('i').className; const titleText = titleElement.querySelector('span').textContent;
            const taskbarItem = document.createElement('div'); taskbarItem.className = 'taskbar-item'; taskbarItem.id = `taskbar-${app}`;
            const taskbarIcon = document.createElement('i'); taskbarIcon.className = iconClass; taskbarItem.appendChild(taskbarIcon);
            const taskbarTitle = document.createElement('span'); taskbarTitle.textContent = titleText; taskbarItem.appendChild(taskbarTitle);
            taskbarItem.addEventListener('click', () => restoreWindow(app)); taskbarApps.appendChild(taskbarItem);
        }
        function restoreWindow(app) { /* ... same ... */
            const windowElement = windows.get(app); if (!windowElement) return;
            windowElement.classList.remove('window-minimized'); windowElement.style.pointerEvents = 'all';
            focusWindow(windowElement);
            const index = minimizedWindows.indexOf(app); if (index > -1) minimizedWindows.splice(index, 1);
            const taskbarItem = document.getElementById(`taskbar-${app}`); if (taskbarItem) taskbarItem.remove();
        }
        function maximizeWindow(windowElement) { /* ... same ... */
            const isMaximized = windowElement.dataset.maximized === 'true';
            const taskbarHeight = 40; const padding = isMobile() ? 2 : 10; // Less padding on mobile

            if (isMaximized) {
                const { prevWidth, prevHeight, prevLeft, prevTop } = windowElement.dataset;
                windowElement.style.width = prevWidth; windowElement.style.height = prevHeight;
                windowElement.style.left = prevLeft; windowElement.style.top = prevTop;
                windowElement.dataset.maximized = 'false';
                windowElement.querySelector('.window-maximize i').className = 'fas fa-expand';
            } else {
                windowElement.dataset.prevWidth = windowElement.style.width; windowElement.dataset.prevHeight = windowElement.style.height;
                windowElement.dataset.prevLeft = windowElement.style.left; windowElement.dataset.prevTop = windowElement.style.top;
                windowElement.style.width = `calc(100vw - ${2 * padding}px)`;
                windowElement.style.height = `calc(100vh - ${taskbarHeight + 2 * padding}px)`;
                windowElement.style.left = `${padding}px`; windowElement.style.top = `${padding}px`;
                windowElement.dataset.maximized = 'true';
                windowElement.querySelector('.window-maximize i').className = 'fas fa-compress-alt'; // Changed icon
            }
        }
        function closeWindow(app) { /* ... same ... */
            const windowElement = windows.get(app); if (!windowElement) return;
            windowElement.classList.remove('active'); windowElement.classList.add('window-minimized');
            setTimeout(() => {
                windowElement.remove(); windows.delete(app);
                const minimizedIndex = minimizedWindows.indexOf(app); if (minimizedIndex > -1) minimizedWindows.splice(minimizedIndex, 1);
                const taskbarItem = document.getElementById(`taskbar-${app}`); if (taskbarItem) taskbarItem.remove();
                const dockItem = document.querySelector(`.dock-item[data-app="${app}"]`); if (dockItem) dockItem.querySelector('.dot-indicator').style.opacity = '0';
                if (activeWindow === windowElement) activeWindow = null;
            }, 300);
        }
        function bringToFront(windowElement) { /* ... same ... */
            if (windowElement.classList.contains('window-minimized')) { restoreWindow(windowElement.id.replace('window-','')); }
            else { focusWindow(windowElement); }
        }
        function openApp(app) { /* ... same, ensure cases for new apps like settings, calculator, calendar are there ... */
            if (minimizedWindows.includes(app) && windows.has(app)) { restoreWindow(app); return; }
            if (windows.has(app) && !minimizedWindows.includes(app)) { bringToFront(windows.get(app)); return; }
            switch(app) {
                case 'file-explorer': createWindow(app, 'File Explorer', 'fas fa-folder-open'); break;
                case 'media-player': createWindow(app, 'Media Player', 'fas fa-play-circle'); break;
                case 'browser': createWindow(app, 'Web Browser', 'fab fa-firefox-browser'); break;
                case 'terminal': createWindow(app, 'Terminal', 'fas fa-laptop-code'); break;
                case 'neural-network': createWindow(app, 'Neural Network', 'fas fa-project-diagram'); break;
                case 'settings': createWindow(app, 'Settings', 'fas fa-cog', null, null, isMobile() ? null : 500, isMobile() ? null : 450); break;
                case 'calculator': createWindow(app, 'Calculator', 'fas fa-calculator', null, null, isMobile() ? null : 320, isMobile() ? null : 480); break;
                case 'calendar': createWindow(app, 'Calendar', 'fas fa-calendar-alt', null, null, isMobile() ? null : 450, isMobile() ? null : 400); break;
                default:
                    const appElement = document.querySelector(`.start-menu-app[data-app="${app}"]`);
                    if (appElement) {
                         const appTitle = appElement.querySelector('span').textContent;
                         const appIcon = appElement.querySelector('i').className;
                         createWindow(app, appTitle, appIcon);
                    } else { console.warn('App not implemented: ' + app); }
            }
        }

        // Create File Explorer (UPDATED)
        function createFileExplorer() {
            const container = document.createElement('div'); container.className = 'file-explorer';
            const sidebar = document.createElement('div'); sidebar.className = 'file-sidebar';
            const content = document.createElement('div'); content.className = 'file-content';
            const pathBarContainer = document.createElement('div'); pathBarContainer.className = 'path-bar-container';
            const pathBarInput = document.createElement('input'); pathBarInput.type = 'text'; pathBarInput.className = 'path-bar-input';
            const filesGrid = document.createElement('div'); filesGrid.className = 'files-grid';

            const fsData = {
                'Favorites': {
                    'Desktop': { files: [{ name: 'My Shortcut', icon: 'fas fa-link', type: 'file' }] },
                    'Documents': { files: [
                        { name: 'Project Proposal.docx', icon: 'fas fa-file-word', type: 'file', size: 12000 },
                        { name: 'Budget.xlsx', icon: 'fas fa-file-excel', type: 'file', size: 250000 },
                        { name: 'Research Papers', icon: 'fas fa-folder', type: 'folder', files: [ /* ... */ ]},
                        { name: 'Music Mixes', icon: 'fas fa-folder', type: 'folder', files: [
                            { name: 'Forest Lullaby.mp3', icon: 'fas fa-file-audio', type: 'file', src: 'audio/forest-lullaby-110624.mp3', artist: 'Lesfm', size: 3200000 },
                            { name: 'Ambient Guitar.mp3', icon: 'fas fa-file-audio', type: 'file', src: 'audio/ambient-classical-guitar-144998.mp3', artist: 'William King', size: 4100000 }
                        ]}
                    ]}, /* ... other favorites ... */
                },
                'Devices': {
                    'Local Disk (C:)': { totalSpace: 256 * 1024**3, usedSpace: 120 * 1024**3, files: [ { name: 'Windows', icon: 'fab fa-windows', type: 'folder', files:[] }, { name: 'Program Files', icon: 'fas fa-cogs', type: 'folder', files:[] } ] },
                    'Local Disk (D:)': { totalSpace: 512 * 1024**3, usedSpace: 50 * 1024**3, files: [ { name: 'Backups', icon: 'fas fa-save', type: 'folder', files:[] }, { name: 'Media', icon: 'fas fa-photo-video', type: 'folder', files:[] } ] },
                    'Local Disk (E:)': { totalSpace: 128 * 1024**3, usedSpace: 10 * 1024**3, files: [ { name: 'Games', icon: 'fas fa-gamepad', type: 'folder', files:[] } ] }
                }
            };
            let currentPath = ['Favorites', 'Documents'];

            function formatBytes(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024; const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }

            function renderSidebar() {
                sidebar.innerHTML = '';
                Object.keys(fsData).forEach(sectionName => {
                    const sectionDiv = document.createElement('div'); sectionDiv.className = 'sidebar-section';
                    const header = document.createElement('div'); header.className = 'sidebar-header'; header.textContent = sectionName;
                    sectionDiv.appendChild(header);
                    Object.keys(fsData[sectionName]).forEach(itemName => {
                        const itemData = fsData[sectionName][itemName];
                        const sidebarItem = document.createElement('div'); sidebarItem.className = 'sidebar-item';
                        const mainInfo = document.createElement('div'); mainInfo.className = 'sidebar-item-main';
                        let iconClass = 'fas fa-question-circle';
                        if (sectionName === 'Favorites') { /* ... icon logic ... */ }
                        else if (sectionName === 'Devices') { iconClass = 'fas fa-hdd'; }
                        mainInfo.innerHTML = `<i class="${iconClass}"></i><span>${itemName}</span>`;
                        sidebarItem.appendChild(mainInfo);

                        if (itemData.totalSpace && itemData.usedSpace) {
                            const spaceInfo = document.createElement('div'); spaceInfo.className = 'disk-space-info';
                            const freeSpace = itemData.totalSpace - itemData.usedSpace;
                            spaceInfo.textContent = `${formatBytes(freeSpace,1)} free of ${formatBytes(itemData.totalSpace,1)}`;
                            const progressBar = document.createElement('div'); progressBar.style.height = '3px'; progressBar.style.width = '80%'; progressBar.style.background = 'rgba(255,255,255,0.2)'; progressBar.style.borderRadius = '2px'; progressBar.style.marginTop = '2px'; progressBar.style.marginLeft = '26px';
                            const progressFill = document.createElement('div'); progressFill.style.height = '100%'; progressFill.style.width = `${(itemData.usedSpace / itemData.totalSpace) * 100}%`; progressFill.style.background = 'var(--primary-color)'; progressFill.style.borderRadius = '2px';
                            progressBar.appendChild(progressFill);
                            sidebarItem.appendChild(spaceInfo);
                            sidebarItem.appendChild(progressBar);
                        }

                        if (currentPath[0] === sectionName && currentPath[1] === itemName && currentPath.length === 2) sidebarItem.classList.add('active');
                        sidebarItem.addEventListener('click', () => { currentPath = [sectionName, itemName]; navigatePath(currentPath.join('/')); });
                        sectionDiv.appendChild(sidebarItem);
                    });
                    sidebar.appendChild(sectionDiv);
                });
            }
            function renderFiles(pathArray) { /* ... (Mostly same logic, ensure pathArray is used correctly) ... */
                filesGrid.innerHTML = '';
                let currentLevel = fsData;
                for (let i = 0; i < pathArray.length; i++) {
                    const segment = pathArray[i];
                    if (currentLevel[segment]) {
                        currentLevel = (i === pathArray.length - 1) ? currentLevel[segment].files : currentLevel[segment];
                         if (i === pathArray.length - 1 && currentLevel && !Array.isArray(currentLevel)) { // If landed on a "disk" itself
                            currentLevel = fsData[pathArray[0]][pathArray[1]].files; // show its files
                        }
                    } else {
                        const folderInFiles = Array.isArray(currentLevel) ? currentLevel.find(f => f.name === segment && f.type === 'folder') : null;
                        if (folderInFiles) { currentLevel = folderInFiles.files; }
                        else { console.error("Path error in renderFiles", pathArray); currentLevel = []; break; }
                    }
                }
                (currentLevel || []).forEach(file => {
                    const fileItem = document.createElement('div'); fileItem.className = 'file-item';
                    const fileIcon = document.createElement('i'); fileIcon.className = `file-icon ${file.icon}`;
                    if (file.type === 'folder') fileIcon.classList.add('folder');
                    fileItem.appendChild(fileIcon);
                    const fileName = document.createElement('div'); fileName.className = 'file-name'; fileName.textContent = file.name;
                    fileItem.appendChild(fileName);

                    if (file.type === 'folder') {
                        fileItem.addEventListener('dblclick', () => { currentPath.push(file.name); navigatePath(currentPath.join('/')); });
                    } else if (file.icon === 'fas fa-file-audio' && file.src) {
                        fileItem.addEventListener('dblclick', () => osPlayAudioTrack(file.src, file.name.replace(/\.[^/.]+$/, ""), file.artist || 'Unknown Artist'));
                        fileItem.title = `Double-click to play ${file.name}`;
                    } else if (file.type === 'file') {
                        fileItem.title = `Size: ${formatBytes(file.size || 0, 1)}`;
                    }
                    filesGrid.appendChild(fileItem);
                });
            }

            function updatePathBarInput(pathArray) { pathBarInput.value = pathArray.join('/'); }

            function navigatePath(pathString) {
                // Normalize path: Remove leading/trailing slashes, handle '..' and '.'
                // For simplicity, this example assumes fairly clean paths from clicks or direct input.
                // A robust solution would need more comprehensive path parsing.
                if (pathString.startsWith('Devices/')) pathString = pathString.substring(8); // Quick fix for device paths
                else if (pathString.startsWith('Favorites/')) pathString = pathString.substring(10);

                currentPath = pathString.split('/').filter(p => p); // Basic split
                // Determine if it's a device or favorite path based on common roots
                if (fsData.Devices[currentPath[0]]) {
                    currentPath.unshift('Devices');
                } else if (fsData.Favorites[currentPath[0]]) {
                     currentPath.unshift('Favorites');
                } else { // Default or malformed, try to find it or reset
                    const found = Object.keys(fsData.Favorites).find(fav => pathString.startsWith(fav));
                    if (found) currentPath = ['Favorites', ...pathString.split('/')];
                    else currentPath = ['Favorites', 'Documents']; // Fallback
                }
                // Deduplicate, e.g., if path was "Devices/Local Disk (C:)" currentPath might be ["Devices", "Devices", "Local Disk (C:)"]
                currentPath = [...new Set(currentPath)];


                renderSidebar(); updatePathBarInput(currentPath); renderFiles(currentPath);
            }

            pathBarInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const newPathStr = pathBarInput.value.trim();
                    // Basic validation: try to find a root like Devices or Favorites
                    let resolvedPathArray = newPathStr.split('/').filter(p => p);
                    let validRoot = false;
                    if(resolvedPathArray.length > 0) {
                        if(fsData.Devices[resolvedPathArray[0]]) {
                            resolvedPathArray.unshift("Devices"); validRoot = true;
                        } else if (fsData.Favorites[resolvedPathArray[0]]) {
                            resolvedPathArray.unshift("Favorites"); validRoot = true;
                        } else { // Check if first segment is a device name under Devices etc.
                             for (const deviceRoot in fsData.Devices) { if (resolvedPathArray[0] === deviceRoot) { resolvedPathArray.unshift("Devices"); validRoot = true; break; }}
                             if(!validRoot) { for (const favRoot in fsData.Favorites) { if (resolvedPathArray[0] === favRoot) { resolvedPathArray.unshift("Favorites"); validRoot = true; break; }}}
                        }
                    }
                    if (validRoot) {
                        currentPath = [...new Set(resolvedPathArray)]; // Remove duplicates from unshift
                        navigatePath(currentPath.join('/'));
                    } else {
                        alert('Invalid path or root not recognized. Try paths like "Local Disk (C:)/Windows" or "Documents/Music Mixes".');
                        updatePathBarInput(currentPath); // Reset to current valid path
                    }
                }
            });

            pathBarContainer.appendChild(pathBarInput);
            content.appendChild(pathBarContainer); content.appendChild(filesGrid);
            container.appendChild(sidebar); container.appendChild(content);
            navigatePath(currentPath.join('/'));
            return container;
        }

        // Global function for Media Player (mostly same)
        function osPlayAudioTrack(filePath, trackTitle, artistName) { /* ... same ... */
            console.log("Attempting to play:", filePath, trackTitle);
            let mediaPlayerWindow = windows.get('media-player');
            if (!mediaPlayerWindow) {
                openApp('media-player');
                setTimeout(() => triggerMediaPlayerLoad(filePath, trackTitle, artistName), 500);
            } else {
                if (mediaPlayerWindow.classList.contains('window-minimized')) restoreWindow('media-player');
                bringToFront(mediaPlayerWindow); triggerMediaPlayerLoad(filePath, trackTitle, artistName);
            }
        }
        function triggerMediaPlayerLoad(filePath, trackTitle, artistName) { /* ... same ... */
            const mediaPlayerContent = document.querySelector('#window-media-player .media-player');
            if (mediaPlayerContent && mediaPlayerContent.loadExternalTrack) {
                mediaPlayerContent.loadExternalTrack(filePath, trackTitle, artistName);
            } else { console.warn("Media Player not ready or loadExternalTrack not found."); }
        }


        // Create Media Player (UPDATED for Howler integration and external load)
        function createMediaPlayer() {
            const container = document.createElement('div'); container.className = 'media-player';
            const visualizer = document.createElement('div'); visualizer.className = 'media-visualizer';
            for (let i = 0; i < 5; i++) { const c = document.createElement('div'); c.className = 'visualizer-circle'; c.style.width = `${20 + i * 30}px`; c.style.height = `${20 + i * 30}px`; c.style.left = '50%'; c.style.top = '50%'; visualizer.appendChild(c); }
            const albumCover = document.createElement('div'); albumCover.className = 'album-cover'; albumCover.innerHTML = '<i class="fas fa-headphones-alt"></i>'; visualizer.appendChild(albumCover);
            container.appendChild(visualizer);
            const controlsEl = document.createElement('div'); controlsEl.className = 'media-controls';
            const songInfo = document.createElement('div'); songInfo.className = 'song-info';
            const songName = document.createElement('div'); songName.className = 'song-name'; songName.textContent = 'Nebula Dreams';
            const artistName = document.createElement('div'); artistName.className = 'artist-name'; artistName.textContent = 'Cosmic Voyager';
            songInfo.appendChild(songName); songInfo.appendChild(artistName); controlsEl.appendChild(songInfo);
            const progressContainer = document.createElement('div'); progressContainer.className = 'progress-container';
            const currentTimeEl = document.createElement('div'); currentTimeEl.className = 'progress-time'; currentTimeEl.textContent = '0:00';
            const progressBar = document.createElement('div'); progressBar.className = 'progress-bar';
            const progressFill = document.createElement('div'); progressFill.className = 'progress-fill'; progressBar.appendChild(progressFill);
            const totalTimeEl = document.createElement('div'); totalTimeEl.className = 'progress-time'; totalTimeEl.textContent = '0:00';
            progressContainer.appendChild(currentTimeEl); progressContainer.appendChild(progressBar); progressContainer.appendChild(totalTimeEl);
            controlsEl.appendChild(progressContainer);
            const controlButtons = document.createElement('div'); controlButtons.className = 'control-buttons';
            const shuffleButton = document.createElement('button'); shuffleButton.className = 'control-button'; shuffleButton.innerHTML = '<i class="fas fa-random"></i>';
            const prevButton = document.createElement('button'); prevButton.className = 'control-button'; prevButton.innerHTML = '<i class="fas fa-step-backward"></i>';
            const playPauseButton = document.createElement('button'); playPauseButton.className = 'control-button play-pause'; playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            const nextButton = document.createElement('button'); nextButton.className = 'control-button'; nextButton.innerHTML = '<i class="fas fa-step-forward"></i>';
            const repeatButton = document.createElement('button'); repeatButton.className = 'control-button'; repeatButton.innerHTML = '<i class="fas fa-redo"></i>';
            controlButtons.appendChild(shuffleButton); controlButtons.appendChild(prevButton); controlButtons.appendChild(playPauseButton); controlButtons.appendChild(nextButton); controlButtons.appendChild(repeatButton);
            controlsEl.appendChild(controlButtons);
            const volumeContainer = document.createElement('div'); volumeContainer.className = 'volume-container';
            const volumeIcon = document.createElement('div'); volumeIcon.className = 'volume-icon'; volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
            const volumeSlider = document.createElement('div'); volumeSlider.className = 'volume-slider';
            const volumeFill = document.createElement('div'); volumeFill.className = 'volume-fill'; volumeFill.style.width = '70%'; volumeSlider.appendChild(volumeFill);
            volumeContainer.appendChild(volumeIcon); volumeContainer.appendChild(volumeSlider); controlsEl.appendChild(volumeContainer);
            container.appendChild(controlsEl);

            const tracks = [ /* User needs to provide audio files and update paths */
                { title: 'Forest Lullaby', artist: 'Lesfm (Pixabay)', src: 'audio/forest-lullaby-110624.mp3', duration: 144, cover: 'audio/forest-cover.jpg' },
                { title: 'Ambient Classical Guitar', artist: 'William King (Pixabay)', src: 'audio/ambient-classical-guitar-144998.mp3', duration: 150, cover: 'audio/guitar-cover.jpg' },
            ];
            let currentTrackIndex = 0; let sound = null; let isPlaying = false; let visualizerAnimationId;

            function formatTime(secs) { const m = Math.floor(secs / 60) || 0; const s = Math.floor(secs % 60) || 0; return `${m}:${s < 10 ? '0' : ''}${s}`; }

            function updateProgressHowler() {
                if (!sound || !sound.playing()) { if (isPlaying) isPlaying = false; return; }
                const seek = sound.seek() || 0; currentTimeEl.textContent = formatTime(seek);
                progressFill.style.width = `${(seek / sound.duration()) * 100}%`;
                if (sound.playing()) visualizerAnimationId = requestAnimationFrame(updateProgressHowler);
            }
             function animateVisualizer() { /* ... same visualizer animation ... */
                if (!isPlaying && !sound?.playing()) { cancelAnimationFrame(visualizerAnimationId); return; }
                const circles = visualizer.querySelectorAll('.visualizer-circle');
                circles.forEach((circle, index) => {
                    const scale = 0.8 + Math.sin(Date.now() * 0.002 + index * 0.5) * 0.2;
                    circle.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    const hue = (Date.now() * 0.05 + index * 30) % 360;
                    circle.style.background = `hsla(${hue}, 70%, 60%, 0.05)`;
                });
                if(isPlaying || sound?.playing()) visualizerAnimationId = requestAnimationFrame(animateVisualizer);
            }

            function loadTrack(index, externalTrack = null) {
                if (sound) { sound.unload(); isPlaying = false; } // Unload previous and reset state
                
                const track = externalTrack || tracks[index];
                if (!track || !track.src) { console.error("Track data or src missing", track); songName.textContent = "Track Error"; totalTimeEl.textContent = "0:00"; return; }
                currentTrackIndex = externalTrack ? -1 : index; // -1 for external to not mess with playlist logic easily

                songName.textContent = track.title; artistName.textContent = track.artist;
                totalTimeEl.textContent = formatTime(track.duration || 0); // Use actual duration after load
                currentTimeEl.textContent = formatTime(0); progressFill.style.width = '0%';
                if (track.cover) { albumCover.innerHTML = `<img src="${track.cover}" alt="${track.title}" style="width:100%; height:100%; object-fit:cover;">`; }
                else { albumCover.innerHTML = '<i class="fas fa-headphones-alt"></i>'; }

                sound = new Howl({
                    src: [track.src], html5: true, volume: parseFloat(volumeFill.style.width || "70%") / 100,
                    onload: () => { totalTimeEl.textContent = formatTime(sound.duration()); if(externalTrack || isPlaying) playTrackInternal(); }, // Auto-play if it was an external load or was already playing
                    onplay: () => { isPlaying = true; playPauseButton.innerHTML = '<i class="fas fa-pause"></i>'; animateVisualizer(); updateProgressHowler(); },
                    onpause: () => { isPlaying = false; playPauseButton.innerHTML = '<i class="fas fa-play"></i>'; cancelAnimationFrame(visualizerAnimationId); },
                    onend: () => {
                        isPlaying = false; playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
                        if (repeatButton.classList.contains('active-repeat')) playTrackInternal();
                        else if (currentTrackIndex !== -1) nextTrackLogic(); // Only advance playlist if not external
                    },
                    onloaderror: (id,err) => { console.error("Howl load error:", err, track.src); songName.textContent = "Load Error";},
                    onplayerror: (id,err) => { console.error("Howl play error:", err, track.src); songName.textContent = "Play Error";}
                });
            }
            function playTrackInternal() { if (sound) sound.play(); }
            function pauseTrackInternal() { if (sound) sound.pause(); }

            playPauseButton.addEventListener('click', () => { if (isPlaying) pauseTrackInternal(); else playTrackInternal(); });
            
            function nextTrackLogic() {
                let newIndex = currentTrackIndex;
                if (shuffleButton.classList.contains('active-shuffle') && tracks.length > 1) {
                    let randomIndex; do { randomIndex = Math.floor(Math.random() * tracks.length); } while (randomIndex === currentTrackIndex);
                    newIndex = randomIndex;
                } else { newIndex = (currentTrackIndex + 1) % tracks.length; }
                loadTrack(newIndex);
                // playTrackInternal(); // onload will handle play if isPlaying was true or it's an external load
            }
            nextButton.addEventListener('click', nextTrackLogic);
            prevButton.addEventListener('click', () => {
                let newIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
                loadTrack(newIndex);
                // playTrackInternal();
            });

            progressBar.addEventListener('click', (e) => { /* ... same seek logic ... */
                 if (!sound) return; const rect = progressBar.getBoundingClientRect(); const clickX = e.clientX - rect.left;
                 const newTime = (clickX / progressBar.offsetWidth) * sound.duration();
                 sound.seek(newTime); if (!isPlaying) currentTimeEl.textContent = formatTime(newTime);
            });
            volumeSlider.addEventListener('click', (e) => { /* ... same volume logic ... */
                 const rect = volumeSlider.getBoundingClientRect(); const clickX = e.clientX - rect.left;
                 let newVol = Math.max(0, Math.min(100, (clickX / volumeSlider.offsetWidth) * 100));
                 volumeFill.style.width = `${newVol}%`; if(sound) sound.volume(newVol/100);
                 if (newVol/100 > 0.7) volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
                 else if (newVol/100 > 0) volumeIcon.innerHTML = '<i class="fas fa-volume-down"></i>';
                 else volumeIcon.innerHTML = '<i class="fas fa-volume-mute"></i>';
            });
            shuffleButton.addEventListener('click', () => shuffleButton.classList.toggle('active-shuffle'));
            repeatButton.addEventListener('click', () => repeatButton.classList.toggle('active-repeat'));

            container.loadExternalTrack = (filePath, title, artist) => {
                const externalTrackData = { title: title, artist: artist, src: filePath, duration: 0 /* Will be updated on load */ };
                isPlaying = true; // Set intention to play
                loadTrack(0, externalTrackData); // Pass as external
            };
            if (tracks.length > 0) loadTrack(0); else songName.textContent = "No tracks in playlist.";
            return container;
        }


        // Create Browser (UPDATED with fallback)
        function createBrowser() { /* ... (mostly same, ensure renderFallbackPage is defined and used in setTimeout and onerror) ... */
            const container = document.createElement('div'); container.className = 'browser-container';
            const tabsContainer = document.createElement('div'); tabsContainer.className = 'browser-tabs';
            const toolbar = document.createElement('div'); toolbar.className = 'browser-toolbar';
            const addressBar = document.createElement('div'); addressBar.className = 'browser-address-bar';
            const contentArea = document.createElement('div'); contentArea.className = 'browser-content';
            let activeTabElement = null; let tabIdCounter = 0;

            function renderFallbackPage(failedUrl, message, tabCtx) {
                const currentContentArea = tabCtx ? tabCtx.contentArea : contentArea;
                currentContentArea.innerHTML = ''; // Clear iframe
                const fallbackDiv = document.createElement('div'); fallbackDiv.className = 'browser-placeholder';
                fallbackDiv.innerHTML = `<h3><i class="fas fa-exclamation-triangle"></i> Unable to Load</h3><p><strong>URL:</strong> ${failedUrl}</p><p>${message}</p><button class="browser-fallback-search">Go to Search</button>`;
                fallbackDiv.querySelector('.browser-fallback-search').addEventListener('click', () => {
                    if(tabCtx && tabCtx.activeTabElement) {
                        tabCtx.navigateToUrl('https://search.web', 'New Tab', false, tabCtx.activeTabElement);
                    } else if(activeTabElement) {
                        navigateToUrl('https://search.web', 'New Tab', false);
                    } else { createNewTab('https://search.web', 'New Tab'); }
                });
                currentContentArea.appendChild(fallbackDiv);
            }


            function createNewTab(url = 'https://search.web', title = 'New Tab', makeActive = true) {
                tabIdCounter++; const tabId = `browser-tab-${tabIdCounter}`;
                const tab = document.createElement('div'); tab.className = 'browser-tab';
                tab.dataset.tabId = tabId; tab.dataset.url = url; tab.dataset.title = title;
                const icon = document.createElement('i'); icon.className = 'fas fa-globe tab-icon';
                const tabTitle = document.createElement('div'); tabTitle.className = 'tab-title'; tabTitle.textContent = title;
                const closeBtn = document.createElement('i'); closeBtn.className = 'fas fa-times tab-close';
                tab.appendChild(icon); tab.appendChild(tabTitle); tab.appendChild(closeBtn);
                tabsContainer.insertBefore(tab, newTabBtn);

                const tabContentArea = document.createElement('div'); tabContentArea.className = 'browser-content'; tabContentArea.style.display = 'none';
                container.appendChild(tabContentArea); // Add content area per tab
                tab.contentArea = tabContentArea; // Associate content area with tab

                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (tabsContainer.querySelectorAll('.browser-tab:not(.new-tab-btn)').length <= 1) return;
                    tab.remove(); tab.contentArea.remove();
                    if (activeTabElement === tab) {
                        const firstTab = tabsContainer.querySelector('.browser-tab:not(.new-tab-btn)');
                        if (firstTab) setActiveTab(firstTab);
                    }
                });
                tab.addEventListener('click', () => setActiveTab(tab));
                if (makeActive) setActiveTab(tab);
                return tab;
            }

            const newTabBtn = document.createElement('div'); newTabBtn.className = 'browser-tab new-tab-btn'; newTabBtn.style.minWidth = '30px'; newTabBtn.innerHTML = '<i class="fas fa-plus"></i>';
            newTabBtn.addEventListener('click', () => createNewTab()); tabsContainer.appendChild(newTabBtn);
            container.appendChild(tabsContainer);

            const backBtn = document.createElement('button'); backBtn.className = 'browser-action'; backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
            const forwardBtn = document.createElement('button'); forwardBtn.className = 'browser-action'; forwardBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
            const refreshBtn = document.createElement('button'); refreshBtn.className = 'browser-action'; refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            const homeBtn = document.createElement('button'); homeBtn.className = 'browser-action'; homeBtn.innerHTML = '<i class="fas fa-home"></i>';
            toolbar.appendChild(backBtn); toolbar.appendChild(forwardBtn); toolbar.appendChild(refreshBtn); toolbar.appendChild(homeBtn);
            container.appendChild(toolbar);

            const addressIcon = document.createElement('div'); addressIcon.className = 'address-icon'; addressIcon.innerHTML = '<i class="fas fa-shield-alt"></i>';
            const addressInput = document.createElement('input'); addressInput.className = 'address-input'; addressInput.type = 'text'; addressInput.placeholder = 'Search or enter website name';
            addressBar.appendChild(addressIcon); addressBar.appendChild(addressInput);
            container.appendChild(addressBar);
            // contentArea is now per-tab, remove main one from direct container append
            // container.appendChild(contentArea);

            function setActiveTab(tabElement) {
                if (activeTabElement) {
                    activeTabElement.classList.remove('active');
                    activeTabElement.contentArea.style.display = 'none';
                }
                activeTabElement = tabElement;
                activeTabElement.classList.add('active');
                activeTabElement.contentArea.style.display = 'block'; // Show current tab's content
                addressInput.value = activeTabElement.dataset.url || 'https://search.web';
                // If content area is empty (e.g. new tab just switched to), navigate
                if(!activeTabElement.contentArea.hasChildNodes() || activeTabElement.contentArea.innerHTML.trim() === '') {
                    navigateToUrl(activeTabElement.dataset.url, activeTabElement.dataset.title, false, activeTabElement);
                }
            }

            function navigateToUrl(url, title, createNewIfNotFound = true, targetTab = activeTabElement) {
                if (!targetTab && createNewIfNotFound) { createNewTab(url, title); return; }
                if (!targetTab) return; // Should not happen if logic is correct

                let targetUrl = url.trim();
                if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                    targetUrl = targetUrl.includes('.') && !targetUrl.includes(' ') ? 'https://' + targetUrl : `https://search.web?q=${encodeURIComponent(targetUrl)}`;
                }
                addressInput.value = targetUrl;
                targetTab.dataset.url = targetUrl;
                const displayTitle = title || (targetUrl.includes('search.web?q=') ? `Search: ${decodeURIComponent(targetUrl.split('?q=')[1] || '')}` : new URL(targetUrl).hostname.replace('www.',''));
                targetTab.querySelector('.tab-title').textContent = displayTitle.substring(0,20) + (displayTitle.length > 20 ? '...' : '');
                targetTab.dataset.title = displayTitle;

                const currentContentArea = targetTab.contentArea;
                currentContentArea.innerHTML = ''; // Clear previous content for this tab

                if (targetUrl.startsWith('https://search.web')) { renderSearchPage(targetUrl, targetTab); }
                else { renderWebPage(targetUrl, targetTab); }
                addressIcon.innerHTML = targetUrl.startsWith('https://') ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-unlock-alt"></i>';
            }

            function renderSearchPage(url, tabCtx) { /* ... same search page, ensure it appends to tabCtx.contentArea ... */
                const currentContentArea = tabCtx.contentArea;
                currentContentArea.innerHTML = '';
                const placeholder = document.createElement('div'); placeholder.className = 'browser-placeholder';
                const queryParams = new URLSearchParams(url.split('?')[1]); const query = queryParams.get('q') || '';
                placeholder.innerHTML = `<div class="browser-placeholder-icon"><i class="fas fa-search"></i></div><h3>${query ? `Results for "${query}"` : 'FutureWeb Search'}</h3>`;
                const searchInputEl = document.createElement('input'); searchInputEl.className = 'browser-search'; searchInputEl.type = 'text'; searchInputEl.placeholder = 'Search the web...'; searchInputEl.value = query;
                searchInputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && searchInputEl.value.trim()) navigateToUrl(searchInputEl.value.trim(), null, false, tabCtx); });
                placeholder.appendChild(searchInputEl);
                if (query) { /* ... dummy results ... */ }
                currentContentArea.appendChild(placeholder);
            }
            function renderWebPage(url, tabCtx) { /* ... same iframe logic, ensure it appends to tabCtx.contentArea and uses tabCtx in fallback ... */
                const currentContentArea = tabCtx.contentArea;
                currentContentArea.innerHTML = '';
                const iframe = document.createElement('iframe'); iframe.className = 'browser-iframe';
                iframe.sandbox = "allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"; // More permissive for demo
                iframe.src = url; currentContentArea.appendChild(iframe);
                let loadSuccess = false;
                iframe.onload = () => { loadSuccess = true; /* ... */ };
                iframe.onerror = () => renderFallbackPage(url, "Error loading page.", tabCtx);
                setTimeout(() => { if (!loadSuccess) { try { if (!iframe.contentDocument || iframe.contentDocument.body.innerHTML === "") renderFallbackPage(url, "Content blocked or empty.", tabCtx); } catch (e) { renderFallbackPage(url, "Cross-origin error.", tabCtx); }} }, 3000);
            }

            addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && addressInput.value.trim()) navigateToUrl(addressInput.value.trim(), null, false, activeTabElement); });
            homeBtn.addEventListener('click', () => navigateToUrl('https://search.web', 'New Tab', false, activeTabElement));
            refreshBtn.addEventListener('click', () => { if (activeTabElement && activeTabElement.dataset.url) { navigateToUrl(activeTabElement.dataset.url, activeTabElement.dataset.title, false, activeTabElement); }});
            // History would be per-tab
            backBtn.onclick = () => alert("Tab history (Back) not implemented.");
            forwardBtn.onclick = () => alert("Tab history (Forward) not implemented.");

            createNewTab();
            return container;
        }


        // Create Terminal (UPDATED with new commands)
        function createTerminal() {
            const container = document.createElement('div'); container.className = 'terminal-container';
            const output = document.createElement('div'); output.className = 'terminal-output';
            const inputLine = document.createElement('div'); inputLine.className = 'terminal-input-line';
            const promptEl = document.createElement('span'); promptEl.className = 'terminal-prompt';
            const inputEl = document.createElement('input'); inputEl.className = 'terminal-input'; inputEl.type = 'text';

            let commandHistory = []; let historyIndex = -1;
            let currentDirectoryPath = ['~']; // Path as an array of segments

            // Simplified File System with more details
            const fileSystem = { /* ... (same structure, add more files/dirs if desired for new commands) ... */
                '~': { type: 'directory', contents: {
                        'Documents': { type: 'directory', contents: {
                            'notes.txt': { type: 'file', content: 'My important notes for the FutureOS project.\nLine 2\nLine 3 of notes.' },
                            'ideas.md': { type: 'file', content: '# Future OS Ideas\n- AI integration\n- Quantum file system\nLook into security models.' }
                        }},
                        'Downloads': { type: 'directory', contents: { 'installer.exe': { type: 'file', content: '[binary data]' } }},
                        'profile.txt': { type: 'file', content: 'User: Admin\nOS: FutureOS 1.0\nTheme: default-dark' },
                        'run.sh': { type: 'file', content: 'echo "Executing script..."\nls\necho "Hello from run.sh!"\npwd', executable: true },
                        'data.log': { type: 'file', content: 'Event 1\nEvent 2\nError: System Fault\nEvent 4\nWarning: Low Disk\nEvent 6\nEvent 7\nEvent 8\nEvent 9\nEvent 10: All Clear' }
                    }
                },
                'system': { type: 'directory', contents: {
                        'logs': { type: 'directory', contents: { 'kernel.log': { type: 'file', content: 'Boot sequence initiated... OK' } }},
                        'bin': { type: 'directory', contents: { 'reboot': {type: 'file', content:'#!system_call\nrestart', executable:true}}}
                    }
                }
            };

            function updatePrompt() { promptEl.textContent = `user@future-os:${currentDirectoryPath.join('/') || '/'} $ `; }
            function getObjectByPath(pathArray, startNode = fileSystem) { /* ... (same, but ensure robustness for root) ... */
                let current = startNode;
                // Handle absolute paths starting from fileSystem root if pathArray[0] is 'system' or '~' is not the first segment
                if (pathArray.length > 0 && pathArray[0] !== '~' && !fileSystem[pathArray[0]]) {
                    // This case means it's not an absolute path from explicit roots like 'system' or '~' at the start
                    // It might be relative, or an absolute path like /foo/bar which is not directly supported by this simple model's root keys.
                    // For this model, absolute paths must start with a key in `fileSystem` or be `~`.
                }

                for (const segment of pathArray) {
                    if (segment === '' && pathArray.length > 1 && pathArray.indexOf(segment) === 0) continue; // For paths like "/system"
                    if (current && current.type === 'directory' && current.contents && current.contents[segment]) {
                        current = current.contents[segment];
                    } else if (segment === '~' && pathArray.indexOf(segment) === 0) { // ~ can only be the start
                        current = fileSystem['~']; // Go to home from root if ~ is explicitly used
                    }
                    else { return null; }
                }
                return current;
            }
            function resolvePath(rawPath) { /* ... (same, but ensure robustness for root and ..) ... */
                if (!rawPath || rawPath === '~' || rawPath === '~/') return ['~'];
                if (rawPath === '/') return []; // Root representation

                const segments = rawPath.split('/').filter(s => s !== '');
                let tempPath;

                if (rawPath.startsWith('/')) { tempPath = []; }
                else if (rawPath.startsWith('~')) { tempPath = ['~']; segments.shift(); }
                else { tempPath = [...currentDirectoryPath]; }

                for (const segment of segments) {
                    if (segment === '.') continue;
                    if (segment === '..') {
                        if (tempPath.length > 0) {
                            if (tempPath.length === 1 && (tempPath[0] === '~' || tempPath[0] === '')) { /* Can't go above ~ or root */ }
                            else { tempPath.pop(); }
                        }
                    } else { tempPath.push(segment); }
                }
                // If path becomes empty (e.g. cd .. from /system), it's root.
                // If path became empty from ~, stay at ~
                if (tempPath.length === 0 && !rawPath.startsWith('/')) return ['~'];
                return tempPath;
            }

            function appendOutput(htmlContent, type = 'response') { /* ... same ... */
                 const line = document.createElement('div'); line.className = 'terminal-line';
                 if (type === 'command') line.innerHTML = `<span class="terminal-prompt">${promptEl.textContent}</span><span class="terminal-command">${htmlContent}</span>`;
                 else if (type === 'error') line.innerHTML = `<span class="terminal-error">${htmlContent}</span>`;
                 else line.innerHTML = `<span class="terminal-${type}">${htmlContent.replace(/\n/g, '<br>')}</span>`; // Ensure newlines are rendered
                 output.appendChild(line); output.scrollTop = output.scrollHeight;
            }

            const commands = { /* ... (existing commands) ... */
                help: () => appendOutput(`Available: help, clear, echo, ls, cd, pwd, cat, mkdir, touch, rm, date, whoami, system, exit, tree, mv, cp, head, tail, grep. Use TAB for basic autocomplete.`),
                clear: () => output.innerHTML = '',
                echo: (args) => appendOutput(args.join(' ')),
                date: () => appendOutput(new Date().toString()),
                whoami: () => appendOutput('user'),
                system: () => appendOutput(`FutureOS v1.1.0 (WebKernel)\nType 'help' for assistance.`),
                exit: () => { const termWinKey = Array.from(windows.keys()).find(key => windows.get(key) === container.closest('.window')); if(termWinKey) closeWindow(termWinKey); },
                pwd: () => appendOutput(currentDirectoryPath.join('/') || '/'),
                ls: (args) => { /* ... (same, ensure colors and suffixes) ... */
                    const targetPath = args.length > 0 ? resolvePath(args[0]) : currentDirectoryPath;
                    const dirObject = getObjectByPath(targetPath);
                    if (dirObject && dirObject.type === 'directory') {
                        let contentList = "";
                        Object.keys(dirObject.contents).forEach(name => {
                            const item = dirObject.contents[name];
                            const color = item.type === 'directory' ? 'var(--primary-color)' : '#f5f6fa';
                            const suffix = item.type === 'directory' ? '/' : (item.executable ? '*' : '');
                            contentList += `<span style="color:${color}; margin-right:15px; display:inline-block;">${name}${suffix}</span>`;
                        });
                        appendOutput(contentList || '(empty directory)');
                    } else { appendOutput(`ls: cannot access '${args[0] || targetPath.join('/') || '/'}': No such file or directory`, 'error'); }
                },
                cd: (args) => { /* ... (same, ensure root handling) ... */
                    if (!args[0]) { currentDirectoryPath = ['~']; updatePrompt(); return; }
                    const newPathArray = resolvePath(args[0]);
                    const dirObject = getObjectByPath(newPathArray);
                    if (dirObject && dirObject.type === 'directory') { currentDirectoryPath = newPathArray; }
                    else if (newPathArray.length === 0 && args[0] === '/') { currentDirectoryPath = []; } // Explicitly to root
                    else { appendOutput(`cd: ${args[0]}: No such file or directory or not a directory`, 'error'); }
                    updatePrompt();
                },
                cat: (args) => { /* ... (same) ... */
                    if (!args[0]) return appendOutput('cat: missing operand', 'error');
                    const targetPath = resolvePath(args[0]);
                    const fileObject = getObjectByPath(targetPath);
                    if (fileObject && fileObject.type === 'file') appendOutput(fileObject.content);
                    else appendOutput(`cat: ${args[0]}: No such file or not a file`, 'error');
                },
                mkdir: (args) => { /* ... (same) ... */
                    if (!args[0]) return appendOutput('mkdir: missing operand', 'error');
                    const newDirPath = resolvePath(args[0]);
                    const dirName = newDirPath.pop();
                    if (!dirName || !/^[a-zA-Z0-9._-]+$/.test(dirName)) return appendOutput('mkdir: invalid directory name', 'error');
                    const parentDir = getObjectByPath(newDirPath);
                    if (parentDir && parentDir.type === 'directory') {
                        if (parentDir.contents[dirName]) appendOutput(`mkdir: cannot create directory ‘${dirName}’: File exists`, 'error');
                        else parentDir.contents[dirName] = { type: 'directory', contents: {} };
                    } else appendOutput(`mkdir: cannot create directory in ‘${newDirPath.join('/') || '/'}’: Path not found or not a directory`, 'error');
                },
                touch: (args) => { /* ... (same) ... */
                    if (!args[0]) return appendOutput('touch: missing operand', 'error');
                    const newFilePath = resolvePath(args[0]);
                    const fileName = newFilePath.pop();
                     if (!fileName || !/^[a-zA-Z0-9._-]+$/.test(fileName)) return appendOutput('touch: invalid file name', 'error');
                    const parentDir = getObjectByPath(newFilePath);
                    if (parentDir && parentDir.type === 'directory') {
                        if (!parentDir.contents[fileName]) parentDir.contents[fileName] = { type: 'file', content: '' };
                        else if (parentDir.contents[fileName].type === 'file') { /* Update timestamp - no-op here */ }
                        else appendOutput(`touch: cannot touch ‘${fileName}’: It is a directory`, 'error');
                    } else appendOutput(`touch: cannot create file in ‘${newFilePath.join('/') || '/'}’: Path not found or not a directory`, 'error');
                },
                rm: (args) => { /* ... (same, ensure -r for dirs) ... */
                    if (!args[0]) return appendOutput('rm: missing operand', 'error');
                    const itemPath = resolvePath(args[0]);
                    const itemName = itemPath.pop();
                    const parentDir = getObjectByPath(itemPath);
                    if (parentDir && parentDir.contents && parentDir.contents[itemName]) {
                        const itemToRemove = parentDir.contents[itemName];
                        if (itemToRemove.type === 'directory' && Object.keys(itemToRemove.contents).length > 0 && args[1] !== '-r') {
                             appendOutput(`rm: cannot remove '${itemName}': Is a directory. Use -r for recursive.`, 'error');
                        } else delete parentDir.contents[itemName];
                    } else appendOutput(`rm: cannot remove ‘${itemName}’: No such file or directory`, 'error');
                },
                tree: (args) => {
                    const targetPath = args.length > 0 ? resolvePath(args[0]) : currentDirectoryPath;
                    const dirObject = getObjectByPath(targetPath);
                    if (!dirObject || dirObject.type !== 'directory') return appendOutput(`tree: '${targetPath.join('/') || '/'}': No such directory.`, 'error');
                    let treeString = `${targetPath.slice(-1)[0] || '/'}\n`;
                    function buildTree(dir, prefix = '') {
                        const entries = Object.keys(dir.contents);
                        entries.forEach((entry, index) => {
                            const isLast = index === entries.length - 1;
                            treeString += `${prefix}${isLast ? '└── ' : '├── '}${entry}${dir.contents[entry].type === 'directory' ? '/' : ''}\n`;
                            if (dir.contents[entry].type === 'directory') {
                                buildTree(dir.contents[entry], `${prefix}${isLast ? '    ' : '│   '}`);
                            }
                        });
                    }
                    buildTree(dirObject); appendOutput(treeString.trim());
                },
                mv: (args) => {
                    if (args.length < 2) return appendOutput('mv: missing file operand', 'error');
                    const sourcePath = resolvePath(args[0]); const destPathStr = args[1];
                    const sourceName = sourcePath.pop(); const sourceParentDir = getObjectByPath(sourcePath);
                    if (!sourceParentDir || !sourceParentDir.contents || !sourceParentDir.contents[sourceName]) return appendOutput(`mv: cannot stat ‘${args[0]}’: No such file or directory`, 'error');

                    const sourceObject = sourceParentDir.contents[sourceName];
                    let destPath = resolvePath(destPathStr);
                    let destParentObject = getObjectByPath(destPath);

                    if (destParentObject && destParentObject.type === 'directory') { // Destination is a directory, move into it
                        if (destParentObject.contents[sourceName]) return appendOutput(`mv: cannot move ‘${args[0]}’ to ‘${destPathStr}/${sourceName}’: Destination file exists`, 'error');
                        destParentObject.contents[sourceName] = sourceObject;
                        delete sourceParentDir.contents[sourceName];
                    } else { // Destination is a file path (rename or overwrite)
                        const destName = destPath.pop();
                        destParentObject = getObjectByPath(destPath); // Parent of the destination *file*
                        if (!destParentObject || destParentObject.type !== 'directory') return appendOutput(`mv: cannot move to ‘${destPathStr}’: Not a valid directory path`, 'error');
                        if (destParentObject.contents[destName] && destParentObject.contents[destName].type === 'directory' && sourceObject.type === 'file') return appendOutput(`mv: cannot overwrite directory ‘${destName}’ with non-directory`, 'error');
                        destParentObject.contents[destName] = sourceObject;
                        if (`${sourcePath.join('/')}/${sourceName}` !== `${destPath.join('/')}/${destName}`) delete sourceParentDir.contents[sourceName]; // Don't delete if renaming in same dir
                    }
                },
                cp: (args) => { // Simplified: only file to file/dir, no recursive for dirs yet
                    if (args.length < 2) return appendOutput('cp: missing file operand', 'error');
                    const sourcePath = resolvePath(args[0]);
                    const sourceObject = getObjectByPath(sourcePath);
                    if (!sourceObject) return appendOutput(`cp: cannot stat ‘${args[0]}’: No such file or directory`, 'error');
                    if (sourceObject.type === 'directory' && args[0] !== '-r') return appendOutput(`cp: -r not specified; omitting directory ‘${args[0]}’ (basic version)`, 'error');

                    // Deep copy for files, shallow for dir structure if -r was implemented
                    const copiedObject = JSON.parse(JSON.stringify(sourceObject));

                    let destPath = resolvePath(args[1]);
                    let destParentObject = getObjectByPath(destPath);
                    const sourceName = sourcePath.slice(-1)[0];

                    if (destParentObject && destParentObject.type === 'directory') { // Dest is dir
                        if (destParentObject.contents[sourceName]) return appendOutput(`cp: ‘${args[1]}/${sourceName}’: File exists`, 'error');
                        destParentObject.contents[sourceName] = copiedObject;
                    } else { // Dest is file path
                        const destName = destPath.pop();
                        destParentObject = getObjectByPath(destPath);
                        if (!destParentObject || destParentObject.type !== 'directory') return appendOutput(`cp: cannot copy to ‘${args[1]}’: Not a valid directory path`, 'error');
                        destParentObject.contents[destName] = copiedObject;
                    }
                },
                head: (args) => {
                    if (!args[0]) return appendOutput('head: missing filename', 'error');
                    const n = (args[1] && parseInt(args[1])) || 10;
                    const fileObject = getObjectByPath(resolvePath(args[0]));
                    if (!fileObject || fileObject.type !== 'file') return appendOutput(`head: ‘${args[0]}’: No such file or not a file`, 'error');
                    appendOutput(fileObject.content.split('\n').slice(0, n).join('\n'));
                },
                tail: (args) => {
                    if (!args[0]) return appendOutput('tail: missing filename', 'error');
                    const n = (args[1] && parseInt(args[1])) || 10;
                    const fileObject = getObjectByPath(resolvePath(args[0]));
                    if (!fileObject || fileObject.type !== 'file') return appendOutput(`tail: ‘${args[0]}’: No such file or not a file`, 'error');
                    appendOutput(fileObject.content.split('\n').slice(-n).join('\n'));
                },
                grep: (args) => {
                    if (args.length < 2) return appendOutput('grep: usage: grep PATTERN FILE', 'error');
                    const pattern = args[0]; const filePath = resolvePath(args[1]);
                    const fileObject = getObjectByPath(filePath);
                    if (!fileObject || fileObject.type !== 'file') return appendOutput(`grep: ‘${args[1]}’: No such file or not a file`, 'error');
                    const regex = new RegExp(pattern, 'g'); // Simple regex, no fancy flags for now
                    const matchingLines = fileObject.content.split('\n').filter(line => regex.test(line));
                    if (matchingLines.length > 0) appendOutput(matchingLines.join('\n'));
                    else appendOutput(''); // No output if no match, like traditional grep
                }
            };

            inputEl.addEventListener('keydown', (e) => { /* ... (same event handling, ensure tab completion considers new commands) ... */
                 if (e.key === 'Enter') {
                    const fullCommand = inputEl.value.trim(); appendOutput(fullCommand, 'command'); inputEl.value = '';
                    if (fullCommand) {
                        commandHistory.unshift(fullCommand); historyIndex = -1;
                        const [cmd, ...args] = fullCommand.split(/\s+/);
                        if (commands[cmd]) commands[cmd](args);
                        else if (cmd.startsWith('./') && cmd.length > 2) { /* ... script execution ... */ }
                        else appendOutput(`${cmd}: command not found`, 'error');
                    }
                    output.scrollTop = output.scrollHeight;
                } else if (e.key === 'ArrowUp') { /* ... history ... */ }
                else if (e.key === 'ArrowDown') { /* ... history ... */ }
                else if (e.key === 'Tab') { /* ... (tab completion logic, might need minor tweaks for paths vs commands) ... */
                    e.preventDefault(); const currentVal = inputEl.value; const lastSpace = currentVal.lastIndexOf(' ') + 1;
                    const currentWord = currentVal.substring(lastSpace);
                    if (!currentWord) return;

                    let possibleCompletions = [];
                    if (lastSpace === 0) { // Completing command
                        possibleCompletions = Object.keys(commands).filter(c => c.startsWith(currentWord));
                    } else { // Completing path/argument
                        const dirObject = getObjectByPath(currentDirectoryPath);
                        if (dirObject && dirObject.contents) {
                            possibleCompletions = Object.keys(dirObject.contents).filter(item => item.startsWith(currentWord));
                        }
                    }
                    if (possibleCompletions.length === 1) {
                        inputEl.value = currentVal.substring(0, lastSpace) + possibleCompletions[0] + (commands[possibleCompletions[0]] || (getObjectByPath(resolvePath(possibleCompletions[0]))?.type === 'directory') ? (lastSpace === 0 ? ' ' : '/') : ' ');
                    } else if (possibleCompletions.length > 1) { appendOutput(possibleCompletions.join('  '), 'response'); }
                }
            });
            output.innerHTML = `<div class="terminal-line"><span class="terminal-response">FutureOS Terminal [Version 1.1.0]</span></div><div class="terminal-line"><span class="terminal-response">(c) Future Corp. All rights reserved.</span></div><div class="terminal-line"><span class="terminal-response">Type 'help' for commands.</span></div><br>`;
            inputLine.appendChild(promptEl); inputLine.appendChild(inputEl);
            container.appendChild(output); container.appendChild(inputLine);
            updatePrompt(); setTimeout(() => inputEl.focus(), 0);
            return container;
        }


        // Create Neural Network (UPDATED with working buttons)
        function createNeuralNetwork() { /* ... (same structure, ensure run/pause/settings buttons work) ... */
            const container = document.createElement('div'); container.className = 'neural-network';
            const canvas = document.createElement('canvas'); canvas.className = 'network-canvas';
            let nnAnimationId, isNnAnimating = true, renderer, scene, camera, nodeGroups = [];

            try {
                renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
                scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(75, 300 / 200, 0.1, 1000); camera.position.z = 5;
                const layers = 3, nodesPerLayer = [3, 4, 2], layerSpacing = 2, nodeRadius = 0.3;
                const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 16, 16);
                for (let i = 0; i < layers; i++) { /* ... node and line creation ... */
                    const layerGroup = new THREE.Group(); const numNodes = nodesPerLayer[i];
                    for (let j = 0; j < numNodes; j++) {
                        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${(i * 60 + j * 20) % 360}, 100%, 70%)`) });
                        const node = new THREE.Mesh(nodeGeometry, material);
                        node.position.set((i - (layers -1)/2) * layerSpacing, (j - (numNodes - 1)/2) * 1.5, 0);
                        layerGroup.add(node);
                        if (i < layers - 1) {
                            for (let k = 0; k < nodesPerLayer[i+1]; k++) {
                                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
                                const points = [node.position, new THREE.Vector3(((i + 1) - (layers -1)/2) * layerSpacing, (k - (nodesPerLayer[i+1] - 1)/2) * 1.5, 0)];
                                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                                layerGroup.add(new THREE.Line(lineGeometry, lineMaterial));
                            }
                        }
                    }
                    scene.add(layerGroup); nodeGroups.push(layerGroup);
                }
                function nnRenderLoop() {
                    if (!isNnAnimating) return;
                    nnAnimationId = requestAnimationFrame(nnRenderLoop);
                    nodeGroups.forEach((group, i) => { group.rotation.y += 0.005 * (i % 2 === 0 ? 1 : -0.5); group.rotation.x += 0.002; });
                    renderer.render(scene, camera);
                }
                nnRenderLoop();
                const resizeObserver = new ResizeObserver(entries => { for (let entry of entries) { const { width, height } = entry.contentRect; if(renderer && camera && width > 0 && height > 0) { renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();}}});
                setTimeout(() => { if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);}, 100);
            } catch (e) { console.error("NN Vis Error:", e); container.innerHTML = '<p style="padding:20px;text-align:center;">Neural Network Visualization Error.</p>'; return container;}

            const controls = document.createElement('div'); controls.className = 'network-controls';
            controls.innerHTML = `<button id="nn-run-btn" class="network-control"><i class="fas fa-play"></i> Run</button><button id="nn-pause-btn" class="network-control"><i class="fas fa-pause"></i> Pause</button><button id="nn-settings-btn" class="network-control"><i class="fas fa-cogs"></i> Config</button>`;
            container.appendChild(canvas); container.appendChild(controls);
            controls.querySelector('#nn-run-btn').addEventListener('click', () => { if (!isNnAnimating) { isNnAnimating = true; nnRenderLoop(); }});
            controls.querySelector('#nn-pause-btn').addEventListener('click', () => { if (isNnAnimating) isNnAnimating = false; });
            controls.querySelector('#nn-settings-btn').addEventListener('click', () => alert('NN Config: Change layers, nodes, speed (Not Implemented)'));
            return container;
        }

        // Create Calculator (UPDATED classes)
        function createCalculator() {
            const container = document.createElement('div'); container.className = 'calculator-container';
            const display = document.createElement('input'); display.type = 'text'; display.readOnly = true; display.className = 'calculator-display'; display.value = '0';
            container.appendChild(display);
            const buttonsContainer = document.createElement('div'); buttonsContainer.className = 'calculator-buttons';
            const buttons = ['C', 'DEL', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '+/-', '='];
            let currentInput = "", previousInput = "", operation = null;
            buttons.forEach(btnText => {
                const button = document.createElement('button'); button.textContent = btnText;
                if (['/', '*', '-', '+', '='].includes(btnText)) button.classList.add('operator');
                else if (btnText === 'C' || btnText === 'DEL') button.classList.add('special');
                button.addEventListener('click', () => { /* ... same calculator logic ... */
                    if (display.value === 'Error') { currentInput = ""; display.value = "0"; }
                    switch (btnText) {
                        case 'C': currentInput = ""; previousInput = ""; operation = null; display.value = "0"; break;
                        case 'DEL': currentInput = currentInput.slice(0, -1) || "0"; display.value = currentInput; break;
                        case '.': if (!currentInput.includes('.')) currentInput += '.'; display.value = currentInput; break;
                        case '+/-': if (currentInput && currentInput !== "0") currentInput = (parseFloat(currentInput) * -1).toString(); display.value = currentInput; break;
                        case '%': if (currentInput) currentInput = (parseFloat(currentInput) / 100).toString(); display.value = currentInput; break;
                        case '+': case '-': case '*': case '/':
                            if (currentInput) {
                                if (previousInput && operation) { try { previousInput = eval(previousInput + operation + currentInput).toString(); } catch { previousInput = "Error"; }}
                                else { previousInput = currentInput; }
                                operation = btnText; currentInput = ""; display.value = previousInput;
                            } else if (previousInput) { operation = btnText; }
                            break;
                        case '=':
                            if (currentInput && previousInput && operation) {
                                try {
                                    const result = eval(previousInput + operation + currentInput);
                                    display.value = parseFloat(result.toFixed(10)).toString(); currentInput = display.value;
                                    previousInput = ""; operation = null;
                                } catch { display.value = "Error"; currentInput = ""; previousInput = ""; operation = null; }
                            } break;
                        default: currentInput = (currentInput === "0" && btnText !== "0" ? "" : currentInput); if (currentInput.length < 15) currentInput += btnText; display.value = currentInput; break;
                    }
                });
                buttonsContainer.appendChild(button);
            });
            container.appendChild(buttonsContainer); return container;
        }

        // Create Calendar (UPDATED classes)
        function createCalendar() {
            const container = document.createElement('div'); container.className = 'calendar-container';
            let currentDate = new Date();
            const header = document.createElement('div'); header.className = 'calendar-header';
            const prevMonthBtn = document.createElement('button'); prevMonthBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            const monthYearDisplay = document.createElement('div'); monthYearDisplay.className = 'calendar-month-year';
            const nextMonthBtn = document.createElement('button'); nextMonthBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            prevMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
            nextMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
            header.appendChild(prevMonthBtn); header.appendChild(monthYearDisplay); header.appendChild(nextMonthBtn);
            container.appendChild(header);
            const daysGrid = document.createElement('div'); daysGrid.className = 'calendar-days-grid';
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(dn => { const cell = document.createElement('div'); cell.className = 'calendar-day-name'; cell.textContent = dn; daysGrid.appendChild(cell); });
            container.appendChild(daysGrid);
            function renderCalendar() {
                while (daysGrid.children.length > 7) daysGrid.removeChild(daysGrid.lastChild);
                monthYearDisplay.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                const year = currentDate.getFullYear(), month = currentDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let i = 0; i < firstDayOfMonth; i++) { const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-day-cell empty'; daysGrid.appendChild(emptyCell); }
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayCell = document.createElement('div'); dayCell.className = 'calendar-day-cell'; dayCell.textContent = day;
                    const today = new Date();
                    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) dayCell.classList.add('today');
                    daysGrid.appendChild(dayCell);
                }
            }
            renderCalendar(); return container;
        }


        // Create Settings (UPDATED with load/apply persistence)
        function createSettings() {
            const container = document.createElement('div'); container.className = 'settings-container';
            const settingsConfig = [ /* ... (same settings config as before) ... */
                { id: 'theme', title: 'Theme', type: 'select', options: [ { value: 'future', name: 'FutureOS Dark (Default)' }, { value: 'light', name: 'FutureOS Light' }, { value: 'matrix', name: 'Matrix Green' } ], action: (v) => { /* theme logic */ localStorage.setItem('os_theme',v); applyTheme(v); }},
                { id: 'fontSize', title: 'Interface Font Size', type: 'select', options: [ { value: '13px', name: 'Small' }, { value: '14px', name: 'Medium (Default)' }, { value: '16px', name: 'Large' } ], action: (v) => { document.body.style.fontSize = v; localStorage.setItem('os_fontSize', v); }},
                { id: 'animations', title: 'Enable Window Animations', type: 'toggle', action: (enabled) => { document.documentElement.style.setProperty('--window-transition-duration', enabled ? '0.3s' : '0s'); localStorage.setItem('os_animations', enabled); }},
                { id: 'wallpaper', title: 'Desktop Wallpaper', type: 'select', options: [ { value: 'default', name: 'Animated Particles' }, { value: 'staticBlue', name: 'Static Blue Gradient' }, { value: 'staticImage', name: 'Abstract Image' } ], action: (v) => { localStorage.setItem('os_wallpaper', v); applyWallpaper(v); }}
            ];
            settingsConfig.forEach(setting => { /* ... (DOM creation for each setting, same as before) ... */
                const settingGroup = document.createElement('div'); settingGroup.className = 'setting-group';
                const titleLabel = document.createElement('label'); titleLabel.textContent = setting.title; titleLabel.htmlFor = `setting-${setting.id}`; settingGroup.appendChild(titleLabel);
                if (setting.type === 'select') {
                    const select = document.createElement('select'); select.id = `setting-${setting.id}`;
                    setting.options.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.name; select.appendChild(option); });
                    select.value = localStorage.getItem(`os_${setting.id}`) || setting.options[0].value;
                    select.addEventListener('change', (e) => setting.action(e.target.value)); settingGroup.appendChild(select);
                } else if (setting.type === 'toggle') {
                    const toggleLabel = document.createElement('label'); toggleLabel.className = 'switch';
                    const input = document.createElement('input'); input.type = 'checkbox'; input.id = `setting-${setting.id}`;
                    input.checked = localStorage.getItem(`os_${setting.id}`) === 'true' || (localStorage.getItem(`os_${setting.id}`) === null && setting.id === 'animations'); // Default anim on
                    input.addEventListener('change', (e) => setting.action(e.target.checked));
                    toggleLabel.appendChild(input); toggleLabel.appendChild(document.createTextNode('Enable')); settingGroup.appendChild(toggleLabel);
                }
                container.appendChild(settingGroup);
            });
            return container;
        }
        function applyTheme(themeValue) { /* ... (extracted theme logic from previous response) ... */
            const root = document.documentElement;
            if (themeValue === 'light') { root.style.setProperty('--primary-color', '#007bff'); root.style.setProperty('--background-color', '#f4f6f8'); root.style.setProperty('--window-bg', 'rgba(255, 255, 255, 0.8)'); root.style.setProperty('--text-color', '#212529'); /* more light vars */ }
            else if (themeValue === 'matrix') { root.style.setProperty('--primary-color', '#00ff00'); root.style.setProperty('--background-color', '#001000');  root.style.setProperty('--window-bg', 'rgba(0, 20, 0, 0.7)'); root.style.setProperty('--text-color', '#00ff00'); /* more matrix vars */ }
            else { /* Default FutureOS Dark vars */ root.style.setProperty('--primary-color', '#00a8ff'); root.style.setProperty('--background-color', '#192a56'); root.style.setProperty('--window-bg', 'rgba(25, 42, 86, 0.7)'); root.style.setProperty('--text-color', '#f5f6fa'); }
        }
        function applyWallpaper(wallpaperValue) { /* ... (extracted wallpaper logic) ... */
            const bgCanvas = document.getElementById('background-canvas');
            if (wallpaperValue === 'default') {
                bgCanvas.style.display = 'block'; document.body.style.backgroundImage = '';
                if(!bgCanvas.dataset.renderer) initBackground(); // Re-init if it was cleared
                else { /* ensure animation is running if it was stopped */
                    const renderer = bgCanvas.dataset.renderer; if(renderer) renderer.domElement.style.display = 'block';
                    // Consider restarting animation loop if it was properly cancellable
                }
            } else {
                if(bgCanvas.dataset.renderer) { // If Three.js renderer exists for particles
                    const renderer = bgCanvas.dataset.renderer;
                    // renderer.dispose(); // Proper cleanup if you were to fully remove it
                    // cancelAnimationFrame(parseInt(bgCanvas.dataset.animationFrameId));
                    renderer.domElement.style.display = 'none'; // Hide instead of full dispose for simplicity
                }
                bgCanvas.style.display = 'none';
                if (wallpaperValue === 'staticBlue') document.body.style.backgroundImage = 'linear-gradient(to bottom right, #192a56, #273c75)';
                else if (wallpaperValue === 'staticImage') document.body.style.backgroundImage = 'url(https://picsum.photos/seed/futureos/1920/1080)';
            }
        }
        function loadPersistedSettings() {
            applyTheme(localStorage.getItem('os_theme') || 'future');
            document.body.style.fontSize = localStorage.getItem('os_fontSize') || '14px';
            const animationsEnabled = localStorage.getItem('os_animations') === null ? true : localStorage.getItem('os_animations') === 'true';
            document.documentElement.style.setProperty('--window-transition-duration', animationsEnabled ? '0.3s' : '0s');
            applyWallpaper(localStorage.getItem('os_wallpaper') || 'default');
        }