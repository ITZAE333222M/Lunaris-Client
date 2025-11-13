/**
 * @author Darken
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

import { changePanel, database, Slider, popup } from '../utils.js'
const os = require('os');

class Settings {
    static id = "settings";
    async init(config) {
        this.config = config;
        this.db = new database();
        console.log('Settings init() comenzando');
        
        this.navBTN();
        
        // Esperar a que currentAccount se complete antes de configurar logout
        await this.currentAccount();
        this.logoutBtn();
        
        // Las siguientes son async pero pueden ejecutarse en paralelo
        await Promise.all([
            this.ram(),
            this.resolution(),
            this.launcher()
        ]);
        
        // Listen for login completion to reload account info
        document.addEventListener('login-completed', async () => {
            console.log('Login completed event received in settings, reloading account info');
            try {
                await this.currentAccount();
                this.logoutBtn(); // Reinitialize logout button with new account
            } catch (err) {
                console.error('Error reloading account in settings after login:', err);
            }
        });
        
        console.log('Settings init() completado');
    }

    navBTN() {
        // Handle close button (save)
        const saveBtn = document.querySelector('#save.settings-close-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Hide any temporary UI that could remain (e.g., cancel button in login)
                const cancelHome = document.querySelector('.cancel-home');
                if (cancelHome) cancelHome.style.display = 'none';

                changePanel('home')
            })
        }
    }

    logoutBtn() {
        // Manejar botón de cerrar sesión
        let logoutBtn = document.querySelector('.logout-btn');
        console.log('logoutBtn() called, elemento encontrado:', !!logoutBtn);
        
        if (!logoutBtn) {
            console.warn('Elemento .logout-btn no encontrado');
            return;
        }

        // Remover event listeners anteriores clonando el nodo
        let newLogoutBtn = logoutBtn.cloneNode(true);
        if (logoutBtn.parentNode) {
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        }
        logoutBtn = newLogoutBtn;
        console.log('Event listeners limpios, agregando nuevo listener');

        const handleLogout = async (e) => {
            console.log('Botón logout clickeado', e);
            e.preventDefault();
            e.stopPropagation();
            
            try {
                let configClient = await this.db.readData('configClient');
                let account = await this.db.readData('accounts', configClient.account_selected);
                
                console.log('Abriendo popup de confirmación para:', account?.name);
                
                const confirmPopup = new popup();
                const confirmed = await confirmPopup.openConfirm({
                    title: 'Cerrar Sesión',
                    content: `¿Estás seguro de que quieres cerrar sesión de <strong>${account?.name || 'Usuario'}</strong>?`,
                    confirmText: 'Sí, cerrar sesión',
                    cancelText: 'Cancelar',
                    color: '#ff9999'
                });
                
                console.log('Resultado del popup:', confirmed);
                
                if (confirmed) {
                    console.log('Eliminando cuenta:', configClient.account_selected);
                    // Eliminar la cuenta actual
                    await this.db.deleteData('accounts', configClient.account_selected);
                    
                    // Esperar un poco para que la base de datos se actualice
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Verificar si hay más cuentas
                    let allAccounts = await this.db.readAllData('accounts');
                    console.log('Cuentas restantes:', allAccounts?.length || 0);
                    
                    if (allAccounts && allAccounts.length > 0) {
                        // Si hay más cuentas, seleccionar la primera
                        console.log('Seleccionando nueva cuenta:', allAccounts[0].name);
                        configClient.account_selected = allAccounts[0].ID;
                        await this.db.updateData('configClient', configClient);
                        
                        // Actualizar UI con pequeño delay
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Iniciar transición suave
                        let playerNameLabel = document.querySelector('#player-name-label');
                        let playerHead = document.querySelector('.player-head');
                        let currentPlayerHead = document.querySelector('.current-player-head');
                        
                        // Fade out
                        if (playerNameLabel) playerNameLabel.classList.add('transitioning');
                        if (playerHead) playerHead.classList.add('transitioning');
                        if (currentPlayerHead) currentPlayerHead.classList.add('transitioning');
                        
                        // Esperar a que termine el fade out
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // Actualizar datos
                        await this.currentAccount();
                        this.logoutBtn(); // Reinicializar el listener con la nueva cuenta
                        
                        // Actualizar nombre en home
                        if (playerNameLabel) {
                            playerNameLabel.textContent = allAccounts[0].name;
                        }
                        
                        // Actualizar avatar en home
                        if (allAccounts[0]?.profile?.skins[0]?.base64) {
                            let skin = await this.getHeadTexture(allAccounts[0].profile.skins[0].base64);
                            if (playerHead) {
                                playerHead.style.backgroundImage = `url(${skin})`;
                            }
                        }
                        
                        // Fade in
                        if (playerNameLabel) playerNameLabel.classList.remove('transitioning');
                        if (playerHead) playerHead.classList.remove('transitioning');
                        if (currentPlayerHead) currentPlayerHead.classList.remove('transitioning');
                        
                        console.log('Logout completado exitosamente, nueva cuenta seleccionada');
                    } else {
                        // Si no hay más cuentas, ir a login
                        console.log('Sin más cuentas, yendo a login');
                        changePanel('login');
                    }
                } else {
                    console.log('Logout cancelado por el usuario');
                }
            } catch (err) {
                console.error('Error durante logout:', err);
                alert('Error al cerrar sesión: ' + err.message);
            }
        };

        // Agregar listener al botón
        logoutBtn.addEventListener('click', handleLogout);
        
        // También agregar listener a los spans por si el click va ahí
        const spans = logoutBtn.querySelectorAll('span');
        spans.forEach(span => {
            span.addEventListener('click', handleLogout);
        });
        
        console.log('Listeners agregados al botón y sus spans');
    }

    async currentAccount() {
        try {
            let configClient = await this.db.readData('configClient');
            let account = await this.db.readData('accounts', configClient.account_selected);
            
            // Actualizar nombre de la cuenta
            let accountNameElement = document.querySelector('#current-account-name');
            if (accountNameElement && account) {
                accountNameElement.textContent = account.name;
            }

            // Actualizar avatar de la cuenta
            if (account?.profile?.skins[0]?.base64) {
                let skin = await this.getHeadTexture(account.profile.skins[0].base64);
                let playerHead = document.querySelector('.current-player-head');
                if (playerHead) {
                    playerHead.style.backgroundImage = `url(${skin})`;
                }
            }
        } catch (err) {
            console.error('Error loading current account:', err);
        }
    }

    async getHeadTexture(skinBase64) {
        // Importar skin2D dinámicamente
        const { skin2D } = await import('../utils.js');
        let skinRenderer = new skin2D();
        return await skinRenderer.creatHeadTexture(skinBase64);
    }

    async ram() {
        let config = await this.db.readData('configClient');
        let totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        let freeMem = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram").textContent = `${totalMem} Go`;
        document.getElementById("free-ram").textContent = `${freeMem} Go`;

        let sliderDiv = document.querySelector(".memory-slider");
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

        let ram = config?.java_config?.java_memory ? {
            ramMin: config.java_config.java_memory.min,
            ramMax: config.java_config.java_memory.max
        } : { ramMin: "1", ramMax: "2" };

        if (totalMem < ram.ramMin) {
            config.java_config.java_memory = { min: 1, max: 2 };
            await this.db.updateData('configClient', config);
            ram = { ramMin: "1", ramMax: "2" }
        };

        let slider = new Slider(".memory-slider", parseFloat(ram.ramMin), parseFloat(ram.ramMax));

        let minSpan = document.querySelector(".slider-touch-left span");
        let maxSpan = document.querySelector(".slider-touch-right span");

        minSpan.setAttribute("value", `${ram.ramMin} Go`);
        maxSpan.setAttribute("value", `${ram.ramMax} Go`);

        slider.on("change", async (min, max) => {
            let config = await this.db.readData('configClient');
            minSpan.setAttribute("value", `${min} Go`);
            maxSpan.setAttribute("value", `${max} Go`);
            config.java_config.java_memory = { min: min, max: max };
            await this.db.updateData('configClient', config);
        });
    }

    async resolution() {
        let configClient = await this.db.readData('configClient')
        let resolution = configClient?.game_config?.screen_size || { width: 1920, height: 1080 };

        let width = document.querySelector(".width-size");
        let height = document.querySelector(".height-size");
        let resolutionReset = document.querySelector(".size-reset");

        width.value = resolution.width;
        height.value = resolution.height;

        width.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.width = width.value;
            await this.db.updateData('configClient', configClient);
        })

        height.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.height = height.value;
            await this.db.updateData('configClient', configClient);
        })

        resolutionReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size = { width: '854', height: '480' };
            width.value = '854';
            height.value = '480';
            await this.db.updateData('configClient', configClient);
        })
    }

    async launcher() {
        let configClient = await this.db.readData('configClient');

        let closeBox = document.querySelector(".close-box");
        let closeLauncher = configClient?.launcher_config?.closeLauncher || "close-launcher";

        if (closeLauncher == "close-launcher") {
            document.querySelector('.close-launcher').classList.add('active-close');
        } else if (closeLauncher == "close-all") {
            document.querySelector('.close-all').classList.add('active-close');
        } else if (closeLauncher == "close-none") {
            document.querySelector('.close-none').classList.add('active-close');
        }

        closeBox.addEventListener("click", async e => {
            if (e.target.classList.contains('close-btn')) {
                let activeClose = document.querySelector('.active-close');
                if (e.target.classList.contains('active-close')) return
                activeClose?.classList.toggle('active-close');

                let configClient = await this.db.readData('configClient')

                if (e.target.classList.contains('close-launcher')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-launcher";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-all')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-all";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-none')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-none";
                    await this.db.updateData('configClient', configClient);
                }
            }
        })
    }
}
export default Settings;