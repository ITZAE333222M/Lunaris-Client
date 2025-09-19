/**
 * Control del Splash de inicio
 */

const { ipcRenderer } = require("electron");
const os = require("os");

class Splash {
    constructor() {
        this.splash = document.querySelector("#splash");
        this.logo = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");

        document.addEventListener("DOMContentLoaded", () => {
            if (process.platform === "win32") {
                ipcRenderer.send("update-window-progress-load");
            }
            this.startAnimation();
        });
    }

    async startAnimation() {
        // Mostramos el splash
        await this.sleep(300);
        this.splash.classList.add("visible");

        // Mensajes iniciales
        this.splashMessage.textContent = "Iniciando Lunaris Client";
        this.message.textContent = "Preparando el launcher...";
        this.progress.value = 0;
        this.progress.max = 100;

        await this.sleep(1200);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus("Buscando actualizaciones...");

        ipcRenderer.invoke("update-app").catch(err => {
            return this.shutdown(`Error al buscar actualizaciones:<br>${err.message}`);
        });

        ipcRenderer.on("updateAvailable", () => {
            this.setStatus("Actualización disponible...");
            if (os.platform() === "win32") {
                this.toggleProgress();
                ipcRenderer.send("start-update");
            }
        });

        ipcRenderer.on("error", (event, err) => {
            if (err) return this.shutdown(err.message);
        });

        ipcRenderer.on("download-progress", (event, progress) => {
            ipcRenderer.send("update-window-progress", { 
                progress: progress.transferred, 
                size: progress.total 
            });
            this.setProgress(progress.transferred, progress.total);
        });

        ipcRenderer.on("update-not-available", () => {
            this.setStatus("No hay actualizaciones disponibles.");
            this.startLauncher();
        });
    }

    startLauncher() {
        this.setStatus("Iniciando el launcher...");
        setTimeout(() => {
            ipcRenderer.send("main-window-open");
            ipcRenderer.send("update-window-close");
        }, 1000);
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Saliendo en 5s`);
        let i = 4;
        const interval = setInterval(() => {
            this.setStatus(`${text}<br>Saliendo en ${i--}s`);
            if (i < 0) {
                clearInterval(interval);
                ipcRenderer.send("update-window-close");
            }
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        this.progress.classList.add("show");
        this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }

    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}

new Splash();
