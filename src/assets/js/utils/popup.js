/**
 * @author Darken
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer } = require('electron');

export default class popup {
    constructor() {
        this.popup = document.querySelector('.popup');
        this.popupTitle = document.querySelector('.popup-title');
        this.popupContent = document.querySelector('.popup-content');
        this.popupOptions = document.querySelector('.popup-options');
        this.popupButton = document.querySelector('.popup-button');
        this.isClosing = false;
    }

    openPopup(info) {
        this.isClosing = false;
        this.popup.classList.remove('hidden');
        this.popup.style.display = 'flex';
        
        this.popupTitle.innerHTML = info.title;
        
        // Aplicar color especial solo si lo especifica
        if (info.color && info.color !== 'var(--color)') {
            this.popupContent.style.color = info.color;
        } else {
            this.popupContent.style.color = 'rgba(255, 255, 255, 0.85)';
        }
        
        this.popupContent.innerHTML = info.content;

        if (info.options) this.popupOptions.style.display = 'flex';

        // Limpiar listeners antiguos
        const newButton = this.popupButton.cloneNode(true);
        this.popupButton.parentNode.replaceChild(newButton, this.popupButton);
        this.popupButton = newButton;

        if (this.popupOptions.style.display !== 'none') {
            this.popupButton.addEventListener('click', () => {
                if (info.exit) return ipcRenderer.send('main-window-close');
                this.closePopup();
            })
        }
    }

    closePopup() {
        if (this.isClosing) return;
        this.isClosing = true;
        
        this.popup.classList.add('hidden');
        
        // Esperar a que termine la animación antes de ocultar
        setTimeout(() => {
            this.popup.style.display = 'none';
            this.popupTitle.innerHTML = '';
            this.popupContent.innerHTML = '';
            this.popupContent.style.color = 'rgba(255, 255, 255, 0.85)';
            this.popupOptions.style.display = 'none';
            this.popup.classList.remove('hidden');
        }, 300);
    }

    openConfirm(options) {
        return new Promise((resolve) => {
            this.isClosing = false;
            this.popup.classList.remove('hidden');
            this.popup.style.display = 'flex';
            
            this.popupTitle.innerHTML = options.title;
            
            // Aplicar color especial si está especificado
            if (options.color && options.color !== 'var(--color)') {
                this.popupContent.style.color = options.color;
            } else {
                this.popupContent.style.color = 'rgba(255, 255, 255, 0.85)';
            }
            
            this.popupContent.innerHTML = options.content;

            // Mostrar opciones y configurar los botones
            this.popupOptions.style.display = 'flex';
            
            // Limpiar y recrear los botones
            this.popupOptions.innerHTML = '';
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'popup-option-btn confirm-btn';
            confirmBtn.textContent = options.confirmText || 'Confirmar';
            confirmBtn.style.color = options.color || 'rgba(255, 255, 255, 0.85)';
            confirmBtn.style.borderColor = options.color || 'rgba(255, 255, 255, 0.85)';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'popup-option-btn cancel-btn';
            cancelBtn.textContent = options.cancelText || 'Cancelar';
            
            confirmBtn.addEventListener('click', () => {
                this.closePopup();
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                this.closePopup();
                resolve(false);
            });
            
            this.popupOptions.appendChild(confirmBtn);
            this.popupOptions.appendChild(cancelBtn);
        });
    }
}