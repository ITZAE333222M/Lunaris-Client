/**
 * @author Darken
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')

class Home {
    static id = "home";

    async init(config) {
        this.config = config;
        this.db = new database();
        this.lastWhitelistState = null;
        
        // Load and display current account info
        await this.loadCurrentAccount();
        
        this.news();
        // Render instance avatars in the sidebar (replaces social icons)
        await this.renderSidebarAvatars();
        await this.instancesSelect();
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'));
        
        // Listen for instance updates from code redemption
        document.addEventListener('instances-updated', async () => {
            console.log('Instances updated, refreshing sidebar avatars');
            await this.renderSidebarAvatars();
        });

        // Listen for instance selection from instances panel
        document.addEventListener('instance-selected', (e) => {
            const instance = e.detail?.instance;
            if (instance) {
                console.log('Instance selected, loading music:', instance.name);
                this.loadInstanceMusic(instance);
            }
        });

        // Listen for login completion to reload instances immediately
        document.addEventListener('login-completed', async (e) => {
            console.log('Login completed event received, reloading instances and profile');
            try {
                await this.loadCurrentAccount();
                await this.renderSidebarAvatars();
                await this.instancesSelect();
                console.log('Instances and profile reloaded after login');
            } catch (err) {
                console.error('Error reloading after login:', err);
            }
        });

        // Start whitelist watcher to detect changes without restarting
        this.startWhitelistWatcher();
    }

    async loadCurrentAccount() {
        try {
            let configClient = await this.db.readData('configClient');
            let account = await this.db.readData('accounts', configClient.account_selected);
            
            if (account) {
                // Actualizar nombre del jugador
                let playerNameLabel = document.querySelector('#player-name-label');
                if (playerNameLabel) {
                    playerNameLabel.textContent = account.name;
                }
                
                // Actualizar avatar del jugador
                if (account?.profile?.skins[0]?.base64) {
                    const { skin2D } = await import('../utils/skin.js');
                    let skin = await new skin2D().creatHeadTexture(account.profile.skins[0].base64);
                    let playerHead = document.querySelector('.player-head');
                    if (playerHead) {
                        playerHead.style.backgroundImage = `url(${skin})`;
                    }
                }
            }
        } catch (err) {
            console.error('Error loading current account:', err);
        }
    }

    startWhitelistWatcher() {
        // Check every 5 seconds if whitelist has changed
        setInterval(async () => {
            try {
                let configClient = await this.db.readData('configClient');
                let auth = await this.db.readData('accounts', configClient.account_selected);
                let instancesList = await config.getInstanceList();

                // Create a hash of current whitelist state
                const whitelistHash = JSON.stringify(
                    instancesList.map(i => ({
                        name: i.name,
                        whitelistActive: i.whitelistActive,
                        whitelist: i.whitelist || []
                    }))
                );

                // If whitelist changed, update UI
                if (this.lastWhitelistState !== null && this.lastWhitelistState !== whitelistHash) {
                    console.log('Whitelist changes detected, updating UI...');
                    
                    // Check if current instance is still accessible
                    const currentInstance = instancesList.find(i => i.name === configClient.instance_selct);
                    let isStillAccessible = true;

                    if (currentInstance?.whitelistActive) {
                        const whitelist = Array.isArray(currentInstance.whitelist) ? currentInstance.whitelist : [];
                        isStillAccessible = whitelist.includes(auth?.name);
                    }

                    // If user was removed from current instance, switch to an accessible one
                    if (!isStillAccessible) {
                        console.log(`User ${auth?.name} was removed from instance ${configClient.instance_selct}`);
                        const accessibleInstance = instancesList.find(i => {
                            if (i.whitelistActive) {
                                const wl = Array.isArray(i.whitelist) ? i.whitelist : [];
                                return wl.includes(auth?.name);
                            }
                            return true;
                        });

                        if (accessibleInstance) {
                            configClient.instance_selct = accessibleInstance.name;
                            await this.db.updateData('configClient', configClient);
                            setStatus(accessibleInstance.status);
                            
                            // Show notification
                            let popupMsg = new popup();
                            popupMsg.openPopup({ 
                                title: 'Acceso eliminado', 
                                content: `Fuiste removido de ${currentInstance.name}. Cambié a ${accessibleInstance.name}.`, 
                                color: 'orange' 
                            });
                        }
                    }

                    // Refresh sidebar avatars
                    await this.renderSidebarAvatars();
                    await this.instancesSelect();
                }

                this.lastWhitelistState = whitelistHash;
            } catch (err) {
                console.warn('Error checking whitelist changes:', err);
            }
        }, 5000);
    }

    // Establece el fondo del launcher, con precarga y fallback
    setBackground(url) {
        try {
            const mainPanel = document.querySelector('.main-panel');
            if (!mainPanel) return;

            if (!url) {
                mainPanel.style.backgroundImage = '';
                this.currentBackground = null;
                return;
            }

            const img = new Image();
            img.onload = () => {
                mainPanel.style.backgroundImage = `url('${url}')`;
                mainPanel.style.backgroundSize = 'cover';
                mainPanel.style.backgroundPosition = 'center';
                mainPanel.style.backgroundRepeat = 'no-repeat';
                this.currentBackground = url;
            };
            img.onerror = () => {
                console.warn('No se pudo cargar la imagen de fondo:', url);
                mainPanel.style.backgroundImage = '';
                this.currentBackground = null;
            };
            img.src = url;
        } catch (e) {
            console.warn('Error estableciendo fondo:', e);
            const mainPanel = document.querySelector('.main-panel');
            if (mainPanel) mainPanel.style.backgroundImage = '';
        }
    }

    // Load and configure music for selected instance
    loadInstanceMusic(instance) {
        try {
            const audioElement = document.getElementById('instance-music');
            const musicBtn = document.querySelector('#music-btn');
            
            if (!audioElement || !musicBtn) return;

            // Stop current music and reset button
            audioElement.pause();
            audioElement.currentTime = 0;
            musicBtn.classList.remove('playing');

            // Check if instance has music URL
            if (instance.music && typeof instance.music === 'string') {
                audioElement.src = instance.music;
                audioElement.loop = true;
                musicBtn.style.display = 'flex';
                console.log('Music loaded for instance:', instance.name, instance.music);
            } else {
                // Hide music button if no music available
                audioElement.src = '';
                musicBtn.style.display = 'none';
                console.log('No music available for instance:', instance.name);
            }
        } catch (e) {
            console.warn('Error loading instance music:', e);
        }
    }

    // Toggle music playback
    toggleMusic() {
        try {
            const audioElement = document.getElementById('instance-music');
            const musicBtn = document.querySelector('#music-btn');
            
            if (!audioElement) return;

            if (audioElement.paused) {
                audioElement.play().catch(err => {
                    console.warn('Error playing music:', err);
                });
                musicBtn.classList.add('playing');
            } else {
                audioElement.pause();
                musicBtn.classList.remove('playing');
            }
        } catch (e) {
            console.warn('Error toggling music:', e);
        }
    }

    // (removed) debug overlay helper — debug UI was temporary and removed

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);

        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">No hay noticias disponibles actualmente.</div>
                        </div>
                        <div class="date">
                            <div class="day">25</div>
                            <div class="month">Abril</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Puedes seguir todas las novedades relativas al servidor aquí.</p>
                        </div>
                    </div>`;
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date);
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '<br>')}</p>
                                <p class="news-author">- <span>${News.author}</span></p>
                            </div>
                        </div>`;
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">25</div>
                            <div class="month">Abril</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No se puede contactar con el servidor de noticias.</br>Por favor verifique su configuración.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block');
        socials.forEach(social => {
            social.addEventListener('click', e => shell.openExternal(social.dataset.url));
        });
    }

    // Render circular instance avatars in the sidebar and wire clicks to change instance
    async renderSidebarAvatars() {
        try {
            let configClient = await this.db.readData('configClient');
            let auth = await this.db.readData('accounts', configClient.account_selected);
            let instancesList = await config.getInstanceList();
            const container = document.querySelector('.instance-avatars');
            if (!container) return;

            // Debug: log instances returned from server and current auth
            console.debug('renderSidebarAvatars: auth=', auth?.name, 'instancesList=', instancesList);

            container.innerHTML = '';

            // Reusable tooltip element for instance names on hover
            let tooltip = document.querySelector('.instance-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'instance-tooltip';
                tooltip.style.display = 'none';
                document.body.appendChild(tooltip);
            }

            const defaultAvatar = 'assets/images/icon.png';
            for (let instance of instancesList) {
                const bg = instance.backgroundUrl || instance.background || '';
                const avatar = instance.avatarUrl || instance.iconUrl || instance.icon || '';
                const el = document.createElement('div');
                el.className = 'instance-avatar';
                el.dataset.name = instance.name;

                // Determine if this instance is available for the current user
                let locked = false;
                
                // Verificar si está bloqueada por whitelist
                if (instance.whitelistActive) {
                    const wl = Array.isArray(instance.whitelist) ? instance.whitelist : [];
                    locked = !wl.includes(auth?.name);
                }
                
                // Skip this instance if it's whitelist-locked
                if (locked) {
                    continue;
                }

                // set avatar image (prefer avatar field; fallback to background or a default icon)
                if (avatar) el.style.backgroundImage = `url('${avatar}')`;
                else if (bg) el.style.backgroundImage = `url('${bg}')`;
                else el.style.backgroundImage = `url('${defaultAvatar}')`;

                if (configClient.instance_selct === instance.name) el.classList.add('active');
                if (locked) {
                    el.classList.add('locked');
                }

                // Show tooltip on hover with the instance name
                el.addEventListener('mouseenter', (ev) => {
                    try {
                        let tooltipText = instance.name;
                        if (locked) {
                            tooltipText += ' (Bloqueado)';
                        }
                        tooltip.textContent = tooltipText;
                        tooltip.style.display = 'block';
                        // position tooltip to the right of avatar by default
                        const rect = el.getBoundingClientRect();
                        tooltip.style.top = `${rect.top + rect.height / 2}px`;
                        tooltip.style.left = `${rect.right + 10}px`;
                    } catch (err) { }
                });
                el.addEventListener('mousemove', (ev) => {
                    // follow cursor a bit to avoid blocking the avatar
                    tooltip.style.top = `${ev.clientY + 12}px`;
                    tooltip.style.left = `${ev.clientX + 12}px`;
                });
                el.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });

                el.addEventListener('click', async () => {
                    try {
                        if (locked) {
                            // feedback for whitelist locked instance
                            console.warn(`Instancia ${instance.name} bloqueada para el usuario ${auth?.name}`);
                            let popupMsg = new popup();
                            popupMsg.openPopup({ title: 'Acceso denegado', content: `No tienes acceso a la instancia ${instance.name}.`, color: 'orange' });
                            return;
                        }

                        // update visual selection
                        const prev = container.querySelector('.instance-avatar.active');
                        if (prev) prev.classList.remove('active');
                        el.classList.add('active');

                        // persist selection
                        configClient.instance_selct = instance.name;
                        await this.db.updateData('configClient', configClient);

                        // Notificar al Rich Presence sobre el cambio de instancia
                        ipcRenderer.send('instance-changed', { instanceName: instance.name });

                        // apply background, status, and music
                        try { this.setBackground(bg || null); } catch (e) { }
                        try { setStatus(instance.status); } catch (e) { }
                        try { this.loadInstanceMusic(instance); } catch (e) { }
                    } catch (err) { console.warn('Error al seleccionar instancia desde sidebar:', err); }
                });

                container.appendChild(el);
            }
        } catch (e) {
            console.warn('Error renderizando avatars de instancia:', e);
        }
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient');
        let auth = await this.db.readData('accounts', configClient.account_selected);
        let instancesList = await config.getInstanceList();
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct)
            ? configClient?.instance_selct
            : null;

        let playBTN = document.querySelector('.play-btn');
        let instanceBTN = document.querySelector('.instance-select');
        let instancePopup = document.querySelector('.instance-popup');
        let instancesListPopup = document.querySelector('.instances-List');
        let instanceCloseBTN = document.querySelector('.close-popup');

        // Siempre mostrar el botón de instancias
        instanceBTN.style.display = 'flex';

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => !i.whitelistActive) || instancesList[0];
            configClient.instance_selct = newInstanceSelect?.name;
            instanceSelect = newInstanceSelect?.name;
            await this.db.updateData('configClient', configClient);
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(w => w === auth?.name);
                if (whitelist !== auth?.name && instance.name === instanceSelect) {
                    let newInstanceSelect = instancesList.find(i => !i.whitelistActive) || instancesList[0];
                    configClient.instance_selct = newInstanceSelect?.name;
                    instanceSelect = newInstanceSelect?.name;
                    setStatus(newInstanceSelect?.status);
                    await this.db.updateData('configClient', configClient);
                }
            } else if (instance.name === instanceSelect) setStatus(instance.status);
        }

        // Aplicar fondo inicial de la instancia seleccionada (si existe)
        try {
            let currentOption = instancesList.find(i => i.name === instanceSelect);
            if (currentOption) {
                this.setBackground(currentOption.backgroundUrl || currentOption.background || null);
                this.loadInstanceMusic(currentOption);
            }
        } catch (e) { console.warn('Error aplicando fondo inicial:', e); }

        // Botón selector de instancia abre el nuevo panel
        instanceBTN.addEventListener('click', async () => {
            changePanel('instances');
        });

        // Botón de música
        let musicBtn = document.querySelector('#music-btn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => this.toggleMusic());
        }

        // Botón Jugar
        playBTN.addEventListener('click', () => this.startGame());
    }

    async startGame() {
        // startGame called
        const rawConfig = await this.db.readData('configClient');
        let configClient = rawConfig || {};
        let needPersist = false;

        // Defensive defaults in case DB record is missing or partially populated
        if (!rawConfig || typeof rawConfig !== 'object') {
            needPersist = true;
            configClient = {
                account_selected: null,
                instance_selct: null,
                java_config: { java_path: null, java_memory: { min: 2, max: 4 } },
                game_config: { screen_size: { width: 854, height: 480 } },
                launcher_config: { download_multi: 5, theme: 'auto', closeLauncher: 'close-launcher', intelEnabledMac: true }
            };
        }

        // Ensure nested configs exist
        if (!configClient.launcher_config) { configClient.launcher_config = { download_multi: 5, theme: 'auto', closeLauncher: 'close-launcher', intelEnabledMac: true }; needPersist = true; }
        if (!configClient.java_config) { configClient.java_config = { java_path: null, java_memory: { min: 2, max: 4 } }; needPersist = true; }
        if (!configClient.java_config.java_memory) { configClient.java_config.java_memory = { min: 2, max: 4 }; needPersist = true; }
        if (!configClient.game_config) { configClient.game_config = { screen_size: { width: 854, height: 480 } }; needPersist = true; }
        if (!configClient.game_config.screen_size) { configClient.game_config.screen_size = { width: 854, height: 480 }; needPersist = true; }
        if (needPersist) {
            try { await this.db.updateData('configClient', configClient); } catch (err) { console.warn('Failed to persist default configClient:', err); }
        }
        const instances = await config.getInstanceList();
        const authenticator = await this.db.readData('accounts', configClient.account_selected);
        const options = instances.find(i => i.name === configClient.instance_selct);

        const playInstanceBTN = document.querySelector('.play-btn');
        const infoStartingBOX = document.querySelector('.info-starting-game');
        const infoStarting = document.querySelector(".info-starting-game-text");
        const progressBar = document.querySelector('.progress-bar');

        // Basic validations before building the launch options
        if (!options) {
            console.error('startGame: no options found for selected instance', configClient.instance_selct);
            new popup().openPopup({ title: 'Error', content: 'No se encontró la instancia seleccionada. Revise la configuración.', color: 'red', options: true });
            return;
        }

        if (!authenticator) {
            console.error('startGame: no authenticator/account selected');
            new popup().openPopup({ title: 'Error', content: 'No hay una cuenta seleccionada. Inicie sesión primero.', color: 'red', options: true });
            return;
        }

        // Validate loader structure to avoid runtime exceptions
        if (!options.loadder || typeof options.loadder !== 'object') {
            console.warn('startGame: instance loader info missing or invalid, attempting to continue with defaults', options.name);
        }

        const opt = {
            url: options.url,
            authenticator,
            timeout: 10000,
            path: `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loadder?.minecraft_version,
            detached: configClient.launcher_config.closeLauncher !== "close-all",
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,
            loader: {
                type: options.loadder?.loadder_type,
                build: options.loadder?.loadder_version,
                enable: options.loadder?.loadder_type !== 'none'
            },
            verify: options.verify,
            ignored: Array.isArray(options.ignored) ? [...options.ignored] : [],
            javaPath: configClient.java_config?.java_path,
            screen: {
                width: configClient.game_config?.screen_size?.width,
                height: configClient.game_config?.screen_size?.height
            },
            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        };

        // Create launcher and attach listeners BEFORE starting the launch to avoid missing early events
        const launch = new Launch();

        launch.on('extract', () => ipcRenderer.send('main-window-progress-load'));
        launch.on('progress', (progress, size) => {
            infoStarting.innerHTML = `Descargando ${((progress / size) * 100).toFixed(0)}%`;
            ipcRenderer.send('main-window-progress', { progress, size });
            if (progressBar) {
                progressBar.value = progress;
                progressBar.max = size;
            }
        });
        launch.on('check', (progress, size) => {
            infoStarting.innerHTML = `Verificando ${((progress / size) * 100).toFixed(0)}%`;
            ipcRenderer.send('main-window-progress', { progress, size });
            if (progressBar) {
                progressBar.value = progress;
                progressBar.max = size;
            }
        });
        launch.on('estimated', time => console.log(`Tiempo estimado: ${time}s`));
        launch.on('speed', speed => console.log(`${(speed / 1067008).toFixed(2)} Mb/s`));
        launch.on('patch', () => { if (infoStarting) infoStarting.innerHTML = `Parche en curso...`; });
        launch.on('data', () => {
            if (progressBar) progressBar.style.display = "none";
            if (infoStarting) infoStarting.innerHTML = `Jugando...`;
            new logger('Minecraft', '#36b030');
        });
        launch.on('close', code => {
            ipcRenderer.send('main-window-progress-reset');
            if (infoStartingBOX) infoStartingBOX.style.display = "none";
            if (playInstanceBTN) playInstanceBTN.style.display = "flex";
            if (infoStarting) infoStarting.innerHTML = `Verificando`;
            new logger(pkg.name, '#7289da');
        });
        launch.on('error', err => {
            let popupError = new popup();
            popupError.openPopup({ title: 'Error', content: err?.error || err?.message || String(err), color: 'red', options: true });
            ipcRenderer.send('main-window-progress-reset');
            if (infoStartingBOX) infoStartingBOX.style.display = "none";
            if (playInstanceBTN) playInstanceBTN.style.display = "flex";
            if (infoStarting) infoStarting.innerHTML = `Verificando`;
            new logger(pkg.name, '#7289da');
        });

        // UI - show progress area
        if (playInstanceBTN) playInstanceBTN.style.display = "none";
        if (infoStartingBOX) infoStartingBOX.style.display = "block";
        if (progressBar) progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load');

        // Set starting popup image to instance avatar (or fallbacks)
        try {
            const startImg = document.querySelector('.starting-icon-big');
            if (startImg) {
                const avatar = options.avatarUrl || options.avatar || options.iconUrl || options.icon || options.backgroundUrl || options.background;
                startImg.src = avatar || 'assets/images/icon.png';
            }
        } catch (err) { console.warn('Failed to set starting image:', err); }

        // Start launch (handle both sync and Promise-returning implementations)
        try {
            console.log('Calling launch.Launch with opt:', opt);
            const maybePromise = launch.Launch(opt);
            // If returns a promise, await to catch immediate rejections
            if (maybePromise && typeof maybePromise.then === 'function') {
                await maybePromise.catch(launchErr => { throw launchErr; });
            }
            console.log('launch.Launch invoked successfully');
        } catch (launchErr) {
            console.error('launch.Launch threw an exception:', launchErr);
            let popupError = new popup();
            popupError.openPopup({ title: 'Error al lanzar', content: launchErr?.message || String(launchErr), color: 'red', options: true });
            ipcRenderer.send('main-window-progress-reset');
            if (infoStartingBOX) infoStartingBOX.style.display = "none";
            if (playInstanceBTN) playInstanceBTN.style.display = "flex";
            return;
        }
    }

    getdate(e) {
        let date = new Date(e);
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let allMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return { year, month: allMonth[month - 1], day };
    }
}

export default Home;
