/**
 * @author Darken
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
// import panel
import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';
import Instances from './panels/instances.js';

// import modules
import { logger, config, changePanel, database, Notification, setBackground, accountSelect, addAccount, pkg } from './utils.js';
const { AZauth, Microsoft, Mojang } = require('@d4rken/minecraft-java-core');

// libs
const { ipcRenderer } = require('electron');
const fs = require('fs');
const os = require('os');

class Launcher {
    async init() {
        this.initLog();
        console.log('Initializing Launcher...');
        this.shortcut()
        await setBackground()
        this.initFrame();
        this.config = await config.GetConfig().then(res => res).catch(err => err);
        if (await this.config.error) return this.errorConnect()
        this.db = new database();
        await this.initConfigClient();
        this.createPanels(Login, Home, Settings, Instances);
        this.startLauncher();
    }

    initLog() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
                ipcRenderer.send('main-window-dev-tools-close');
                ipcRenderer.send('main-window-dev-tools');
            }
        })
        new logger(pkg.name, '#7289da')
    }

    shortcut() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.keyCode == 87) {
                ipcRenderer.send('main-window-close');
            }
        })
    }


    errorConnect() {
        const notif = new Notification();
        notif.error(`${this.config.error.code}: ${this.config.error.message}`);
    }

    initFrame() {
        console.log('Initializing Frame...')
        const platform = os.platform() === 'darwin' ? "darwin" : "other";

        document.querySelector(`.${platform} .frame`).classList.toggle('hide')

        document.querySelector(`.${platform} .frame #minimize`).addEventListener('click', () => {
            ipcRenderer.send('main-window-minimize');
        });

        let maximized = false;
        let maximize = document.querySelector(`.${platform} .frame #maximize`);
        maximize.addEventListener('click', () => {
            if (maximized) ipcRenderer.send('main-window-maximize')
            else ipcRenderer.send('main-window-maximize');
            maximized = !maximized
            maximize.classList.toggle('icon-maximize')
            maximize.classList.toggle('icon-restore-down')
        });

        document.querySelector(`.${platform} .frame #close`).addEventListener('click', () => {
            ipcRenderer.send('main-window-close');
        })
    }

    async initConfigClient() {
        console.log('Initializing Config Client...')
        let configClient = await this.db.readData('configClient')

        if (!configClient) {
            await this.db.createData('configClient', {
                account_selected: null,
                instance_selct: null,
                java_config: {
                    java_path: null,
                    java_memory: {
                        min: 2,
                        max: 4
                    }
                },
                game_config: {
                    screen_size: {
                        width: 854,
                        height: 480
                    }
                },
                launcher_config: {
                    download_multi: 5,
                    theme: 'auto',
                    closeLauncher: 'close-launcher',
                    intelEnabledMac: true
                }
            })
        }
    }

    createPanels(...panels) {
        let panelsElem = document.querySelector('.panels')
        for (let panel of panels) {
            console.log(`Initializing ${panel.name} Panel...`);
            let div = document.createElement('div');
            div.classList.add('panel', panel.id)
            div.innerHTML = fs.readFileSync(`${__dirname}/panels/${panel.id}.html`, 'utf8');
            panelsElem.appendChild(div);
            new panel().init(this.config);
        }
    }

    async startLauncher() {
        let accounts = await this.db.readAllData('accounts')
        let configClient = await this.db.readData('configClient')
        let account_selected = configClient ? configClient.account_selected : null
        let notifRefresh = new Notification();

        if (accounts?.length) {
            for (let account of accounts) {
                let account_ID = account.ID
                // Clean error flags from previous failures - don't delete, just try to refresh
                if (account.error || account.errorMessage) {
                    delete account.error
                    delete account.errorMessage
                    await this.db.updateData('accounts', account, account_ID)
                }
                if (account.meta.type === 'Xbox') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    notifRefresh.info(`Actualizando cuenta: ${account.name}`);

                    let refresh_accounts = await new Microsoft(this.config.client_id).refresh(account);

                    if (refresh_accounts.error) {
                        await this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            await this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        notifRefresh.error(`Error al actualizar ${account.name}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    delete refresh_accounts.error
                    delete refresh_accounts.errorMessage
                    await this.db.updateData('accounts', refresh_accounts, account_ID)
                    console.log(`[Xbox] Account ${account.name} refreshed successfully`);
                    notifRefresh.success(`Cuenta ${account.name} actualizada`);
                } else if (account.meta.type == 'AZauth') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    notifRefresh.info(`Actualizando cuenta: ${account.name}`);
                    let refresh_accounts = await new AZauth(this.config.online).verify(account);

                    if (refresh_accounts.error) {
                        await this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            await this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.message}`);
                        notifRefresh.error(`Error al actualizar ${account.name}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    delete refresh_accounts.error
                    delete refresh_accounts.message
                    await this.db.updateData('accounts', refresh_accounts, account_ID)
                    console.log(`[AZauth] Account ${account.name} refreshed successfully`);
                    notifRefresh.success(`Cuenta ${account.name} actualizada`);
                } else if (account.meta.type == 'Mojang') {
                    console.log(`Account Type: ${account.meta.type} | Username: ${account.name}`);
                    notifRefresh.info(`Actualizando cuenta: ${account.name}`);
                    if (account.meta.online == false) {
                        console.log(`[Mojang] Attempting offline login for ${account.name}`);
                        let refresh_accounts = await Mojang.login(account.name);

                        if (refresh_accounts?.error) {
                            console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                            await this.db.deleteData('accounts', account_ID)
                            if (account_ID == account_selected) {
                                configClient.account_selected = null
                                await this.db.updateData('configClient', configClient)
                            }
                            notifRefresh.error(`Error al actualizar ${account.name}`);
                            continue;
                        }

                        refresh_accounts.ID = account_ID
                        delete refresh_accounts.error
                        delete refresh_accounts.errorMessage
                        await this.db.updateData('accounts', refresh_accounts, account_ID)
                        console.log(`[Mojang] Offline login successful for ${account.name}`);
                        notifRefresh.success(`Cuenta ${account.name} actualizada`);
                        continue;
                    }

                    console.log(`[Mojang] Attempting online refresh for ${account.name}`);
                    let refresh_accounts = await Mojang.refresh(account);
                    console.log(`[Mojang] Refresh completed for ${account.name}`, refresh_accounts);

                    if (refresh_accounts?.error) {
                        await this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            await this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        notifRefresh.error(`Error al actualizar ${account.name}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    delete refresh_accounts.error
                    delete refresh_accounts.errorMessage
                    await this.db.updateData('accounts', refresh_accounts, account_ID)
                    console.log(`[Mojang] Online refresh successful for ${account.name}`);
                    notifRefresh.success(`Cuenta ${account.name} actualizada`);
                } else {
                    console.error(`[Account] ${account.name}: Account Type Not Found`);
                    await this.db.deleteData('accounts', account_ID)
                    if (account_ID == account_selected) {
                        configClient.account_selected = null
                        await this.db.updateData('configClient', configClient)
                    }
                }
            }

            accounts = await this.db.readAllData('accounts')
            configClient = await this.db.readData('configClient')
            account_selected = configClient ? configClient.account_selected : null

            if (!account_selected) {
                let uuid = accounts[0]?.ID
                if (uuid) {
                    configClient.account_selected = uuid
                    await this.db.updateData('configClient', configClient)
                    console.log(`[Launcher] Selected first account: ${uuid}`);
                }
            }

            if (!accounts.length) {
                configClient.account_selected = null
                await this.db.updateData('configClient', configClient);
                return changePanel("login");
            }

            changePanel("home");
        } else {
            changePanel('login');
        }
    }
}

new Launcher().init();