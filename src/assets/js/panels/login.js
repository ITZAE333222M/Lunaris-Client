// javascript-obfuscator:disable
const mclib = require('@d4rken/minecraft-java-core');
const AZauth = mclib.AZauth;
const Mojang = mclib.Mojang;
// javascript-obfuscator:enable
const { ipcRenderer } = require('electron');

import { Notification, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";

    async init(config) {
        this.config = config;
        this.db = new database();

        // Mostrar panel de selección inicial
        this.showTab('.login-select');

        // Eventos de selección de login
        document.querySelector('.select-microsoft').addEventListener('click', () => {
            this.showMicrosoftLogin();
        });

        document.querySelector('.select-offline').addEventListener('click', () => {
            this.showOfflineLogin();
        });

        // Cancelar Microsoft
        document.querySelector('.cancel-home').addEventListener('click', () => {
            this.showTab('.login-select');
        });

        // Cancelar Offline
        document.querySelector('.cancel-offline').addEventListener('click', () => {
            this.showTab('.login-select');
        });

        // Cancelar AZauth
        const cancelAZauth = document.querySelector('.cancel-AZauth');
        if(cancelAZauth){
            cancelAZauth.addEventListener('click', () => {
                this.showTab('.login-select');
            });
        }

        // Cancelar AZauth-A2F
        const cancelAZauthA2F = document.querySelector('.cancel-AZauth-A2F');
        if(cancelAZauthA2F){
            cancelAZauthA2F.addEventListener('click', () => {
                this.showTab('.login-select');
            });
        }
    }

    // Mostrar una pestaña y ocultar las demás
    showTab(selector) {
        document.querySelectorAll('.login-tabs').forEach(tab => {
            tab.style.display = 'none';
        });
        const tab = document.querySelector(selector);
        if(tab) tab.style.display = 'block';
    }

    // Mostrar login Microsoft
    showMicrosoftLogin() {
        this.showTab('.login-home');
        
        // Asegurar que el botón cancelar sea visible
        const cancelBtn = document.querySelector('.cancel-home');
        if (cancelBtn) {
            cancelBtn.style.display = ''; // Limpiar cualquier 'none' inline
        }
        
        this.getMicrosoft();
    }

    // Mostrar login Offline
    showOfflineLogin() {
        this.showTab('.login-offline');
        this.getCrack();
    }

    async getMicrosoft() {
        console.log('Initializing Microsoft login...');
        const notif = new Notification();
        const microsoftBtn = document.querySelector('.connect-home');

        // Evitar duplicar listener
        microsoftBtn.replaceWith(microsoftBtn.cloneNode(true));
        const btn = document.querySelector('.connect-home');
        const originalText = btn.innerHTML; // Guardar texto original

        btn.addEventListener("click", () => {
            notif.info('Conectando...');
            
            // UI Loading State
            btn.innerHTML = 'Esperando...';
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            btn.style.opacity = '0.7';

            ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
                console.log("Microsoft auth result:", account_connect);
                
                // Reset UI
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';

                if (!account_connect || account_connect === 'cancel') {
                    return;
                }
                try {
                    await this.saveData(account_connect);
                } catch (err) {
                    console.error('Error saving Microsoft account:', err);
                    notif.error('No se pudo guardar la cuenta de Microsoft. Intenta de nuevo.');
                    return;
                }
                notif.success('Sesión iniciada correctamente');
            }).catch(err => {
                // Reset UI on error
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                
                console.error('Microsoft login error:', err);
                notif.error(`Error de inicio de sesión: ${err?.message || 'Error desconocido'}`);
            });
        });

        // Asegurar que el botón de cancelar restaure el estado del botón de conectar
        const cancelBtn = document.querySelector('.cancel-home');
        // Clonar para limpiar listeners anteriores si los hubiera
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        const newCancelBtn = document.querySelector('.cancel-home');
        
        newCancelBtn.addEventListener('click', () => {
             // Reset UI si el usuario cancela
             const currentBtn = document.querySelector('.connect-home');
             if(currentBtn) {
                 currentBtn.innerHTML = 'Conectar'; // O usar originalText si estuviera en el scope, pero aquí hardcodeamos o asumimos
                 currentBtn.disabled = false;
                 currentBtn.style.cursor = 'pointer';
                 currentBtn.style.opacity = '1';
             }
             this.showTab('.login-select');
        });
    }

    async getCrack() {
        console.log('Initializing offline login...');
        const notif = new Notification();
        const emailOffline = document.querySelector('.email-offline');
        const connectOffline = document.querySelector('.connect-offline');

        // Evitar duplicar listener
        connectOffline.replaceWith(connectOffline.cloneNode(true));
        const btn = document.querySelector('.connect-offline');

        btn.addEventListener('click', async () => {
            const nick = emailOffline.value.trim();
            if (nick.length < 3) {
                notif.error('Tu Nick debe tener al menos 3 caracteres.');
                return;
            }
            if (nick.includes(' ')) {
                notif.error('Tu Nick no debe contener espacios.');
                return;
            }

            const MojangConnect = await Mojang.login(nick);
            if (MojangConnect.error) {
                notif.error(MojangConnect.message);
                return;
            }
            await this.saveData(MojangConnect);
            notif.success('Sesión iniciada correctamente');
        });
    }

    async getAZauth() {
        // Aquí tu lógica AZauth como estaba antes
    }

    async saveData(connectionData) {
        // Validar que el nombre de usuario esté disponible
        if (!connectionData || !connectionData.name) {
            console.error('saveData: connectionData or name is missing', connectionData);
            const notif = new Notification();
            notif.error('No se pudo obtener el nombre de usuario. Intenta de nuevo.');
            return null;
        }

        const configClient = await this.db.readData('configClient');
        const account = await this.db.createData('accounts', connectionData);
        const instanceSelect = configClient.instance_selct;
        const instancesList = await config.getInstanceList();

        // Select the newly created account
        configClient.account_selected = account.ID;

        // Ensure instance selection respects whitelist after adding account
        try {
            for (let instance of instancesList) {
                if (instance.whitelistActive) {
                    const whitelist = instance.whitelist.find(u => u === account.name);
                    if (whitelist !== account.name && instance.name === instanceSelect) {
                        const newInstanceSelect = instancesList.find(i => !i.whitelistActive);
                        if (newInstanceSelect) {
                            configClient.instance_selct = newInstanceSelect.name;
                            await setStatus(newInstanceSelect.status);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Error while adjusting instance selection for new account:', err);
        }

        // Persist config changes
        await this.db.updateData('configClient', configClient);

        // Update UI; be defensive: if addAccount/accountSelect fail, still attempt to go Home
        try {
            await addAccount(account);
        } catch (err) {
            console.warn('addAccount failed (UI list update) but account was created:', err);
        }

        try {
            await accountSelect(account);
        } catch (err) {
            console.warn('accountSelect failed (UI selection) but account was created:', err);
        }

        try {
            changePanel('home');
            
            // Disparar evento para que home recargue las instancias inmediatamente
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('login-completed', {
                    detail: { account: account, configClient: configClient }
                }));
                console.log('Login completado, event dispatcheado');
            }, 100);
        } catch (err) {
            console.error('changePanel to home failed after login:', err);
        }

        return account;
    }
}

export default Login;
