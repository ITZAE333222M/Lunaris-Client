/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const { app, ipcMain, nativeTheme, shell } = require('electron');
// javascript-obfuscator:disable
const mclib = require('@d4rken/minecraft-java-core');
// Prefer explicit class ref to avoid obfuscation/case issues in prod builds
const MicrosoftAuth = mclib.Microsoft || mclib.microsoft || require('@d4rken/minecraft-java-core/build/Authenticator/Microsoft.js').default;
// javascript-obfuscator:enable
const { autoUpdater } = require('electron-updater')
const path = require('path');
const fs = require('fs');
const RPC = require('discord-rpc'); 

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

const CLIENT_ID = '1389689026914553967';
RPC.register(CLIENT_ID);

let rpc;

let currentInstance = 'Sin seleccionar';
let currentPanel = 'home';
let currentAvatar = 'launcher_logo';
let currentPlayer = null;

async function setActivity(instanceName = currentInstance, panelName = currentPanel, avatar = currentAvatar) {
    if (!rpc) return;

    // Definir mensaje según el panel
    let details = 'En el menú principal';
    if (panelName === 'settings') {
        details = 'Configurando Launcher';
    } else if (panelName === 'login') {
        details = 'En el login';
    }

    let smallImageKey = 'icon';
    let smallImageText = 'Lunaris Client';

    if (currentPlayer) {
        smallImageKey = `https://minotar.net/helm/${currentPlayer}`;
        smallImageText = currentPlayer;
    }

    rpc.setActivity({
        startTimestamp: new Date(),
        largeImageKey: avatar || 'launcher_logo',
        largeImageText: 'Lunaris Client',
        smallImageKey: smallImageKey,
        smallImageText: smallImageText,
        details: details,
        state: `Jugando: ${instanceName}`,
        instance: true,
    }).catch(() => {});
}

function initRPC() {
    if (rpc) return;
    rpc = new RPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
        console.log('Rich Presence conectado.');
        setActivity();
    });

    rpc.login({ clientId: CLIENT_ID }).catch(console.error);
}

function destroyRPC() {
    if (!rpc) return;
    rpc.clearActivity().catch(() => {});
    rpc.destroy().catch(() => {});
    rpc = null;
    console.log('Rich Presence desconectado.');
}

function getDiscordRpcEnabled() {
    try {
        const userDataPath = app.getPath('userData');
        const configPath = path.join(userDataPath, 'configClient.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.discord_rpc !== false;
        }
    } catch (e) {
        console.error("Error reading config for RPC:", e);
    }
    return true; // Default
}

// Configuración del launcher

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('userData', appPath);
    app.setPath('appData', appdata)
}

// Initialize RPC if enabled
if (getDiscordRpcEnabled()) {
    initRPC();
}

ipcMain.on('discord-rpc-toggle', (event, enabled) => {
    if (enabled) {
        initRPC();
    } else {
        destroyRPC();
    }
});


if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => {
    if (dev) return MainWindow.createWindow()
    UpdateWindow.createWindow()
});

ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('main-window-dev-tools-close', () => MainWindow.getWindow().webContents.closeDevTools())
ipcMain.on('main-window-close', () => MainWindow.destroyWindow())
ipcMain.on('main-window-reload', () => MainWindow.getWindow().reload())
ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow().setProgressBar(options.progress / options.size))
ipcMain.on('main-window-progress-reset', () => MainWindow.getWindow().setProgressBar(-1))
ipcMain.on('main-window-progress-load', () => MainWindow.getWindow().setProgressBar(2))
ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize())

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('update-window-progress', (event, options) => UpdateWindow.getWindow().setProgressBar(options.progress / options.size))
ipcMain.on('update-window-progress-reset', () => UpdateWindow.getWindow().setProgressBar(-1))
ipcMain.on('update-window-progress-load', () => UpdateWindow.getWindow().setProgressBar(2))

ipcMain.handle('path-user-data', () => app.getPath('userData'))
ipcMain.handle('appData', e => app.getPath('appData'))

ipcMain.on('main-window-maximize', () => {
    if (MainWindow.getWindow().isMaximized()) {
        MainWindow.getWindow().unmaximize();
    } else {
        MainWindow.getWindow().maximize();
    }
})

ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide())
ipcMain.on('main-window-show', () => MainWindow.getWindow().show())

ipcMain.handle('Microsoft-window', async (_, client_id_renderer) => {
    // SV Launcher credentials and flow
    const client_id = "28345b95-0610-4565-b77d-03a20a541560";
    const client_secret = "9Bg8Q~NJTmVivAv2WUV_6wTxLPF3C27Ap_TFKdB-";

    // Fallback to renderer provided client_id if needed, but SV Launcher logic uses hardcoded
    // const cid = client_id_renderer || client_id; 

    const loginRedirect = fs.readFileSync(path.join(__dirname, "assets/login.html"), {
        encoding: "utf-8"
    });
    
    // javascript-obfuscator:disable
    const ms = new MicrosoftAuth(client_id);
    // javascript-obfuscator:enable
    
    try {
        const port = 8888;
        // Ensure redirect is set for raw flow and open the browser explicitly
        ms.redirect = `http://localhost:${port}`;
        const authUrl = ms.createUrl();
        shell.openExternal(authUrl);

        const mc = await ms.getAuth(
            "raw",
            port,
            undefined,
            loginRedirect
        );
        
        if (!mc) return null;
        console.log("Main Process: Microsoft auth successful", mc);
        
        // Return directly what getAuth returns (likely the account object)
        return mc; 
    } catch (e) {
        console.error("Microsoft auth error:", e);
        return { error: true, message: e?.message || "Microsoft auth error" };
    }
})

ipcMain.handle('is-dark-theme', (_, theme) => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return nativeTheme.shouldUseDarkColors;
})

// Escuchar cambios de instancia para actualizar el Rich Presence
ipcMain.on('instance-changed', (event, data) => {
    currentInstance = data.instanceName;
    currentAvatar = data.avatar || 'launcher_logo';
    setActivity(currentInstance, currentPanel, currentAvatar);
    console.log(`Instancia cambió a: ${currentInstance}`);
})

// Escuchar cambios de panel para actualizar el Rich Presence
ipcMain.on('panel-changed', (event, data) => {
    currentPanel = data.panelName;
    setActivity(currentInstance, currentPanel, currentAvatar);
    console.log(`Panel cambió a: ${currentPanel}`);
})

ipcMain.on('player-info-updated', (event, data) => {
    currentPlayer = data.name;
    setActivity(currentInstance, currentPanel, currentAvatar);
    console.log(`Player info updated: ${currentPlayer}`);
})

app.on('window-all-closed', () => app.quit());

 

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
    return await new Promise(async (resolve, reject) => {
        autoUpdater.checkForUpdates().then(res => {
            resolve(res);
        }).catch(error => {
            reject({
                error: true,
                message: error
            })
        })
    })
})

autoUpdater.on('update-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
    autoUpdater.downloadUpdate();
})

autoUpdater.on('update-not-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('download-progress', progress);
})

autoUpdater.on('error', (err) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('error', err);
});
