export default class Notification {
    constructor() {
        this.container = this.getOrCreateContainer();
    }

    getOrCreateContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '10000';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '12px';
            container.style.maxWidth = '420px';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.position = 'relative';
        notification.style.padding = '14px 18px';
        notification.style.borderRadius = '12px';
        notification.style.fontFamily = 'Poppins, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.animation = 'slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        notification.style.transition = 'all 0.3s ease';
        notification.style.minHeight = '48px';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '12px';
        notification.style.pointerEvents = 'all';
        notification.style.backdropFilter = 'blur(16px)';
        notification.style.WebkitBackdropFilter = 'blur(16px)';

        const colors = {
            success: {
                bg: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
                border: 'rgba(52, 211, 153, 0.4)',
                color: '#fff',
                icon: '✔'
            },
            error: {
                bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: 'rgba(239, 68, 68, 0.4)',
                color: '#fff',
                icon: '✕'
            },
            info: {
                bg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(124, 58, 255, 0.1) 100%)',
                border: 'rgba(147, 51, 234, 0.4)',
                color: '#fff',
                icon: 'ℹ'
            },
            warning: {
                bg: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
                border: 'rgba(251, 146, 60, 0.4)',
                color: '#fff',
                icon: '⚠'
            }
        };

        const color = colors[type] || colors.info;
        notification.style.background = color.bg;
        notification.style.color = color.color;
        notification.style.border = `1.5px solid ${color.border}`;
        notification.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '18px';
        iconSpan.style.fontWeight = 'bold';
        iconSpan.style.minWidth = '24px';
        iconSpan.textContent = color.icon;

        const messageSpan = document.createElement('span');
        messageSpan.style.flex = '1';
        messageSpan.style.lineHeight = '1.4';
        messageSpan.textContent = message;

        notification.appendChild(iconSpan);
        notification.appendChild(messageSpan);

        this.container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }

        return notification;
    }

    success(message, duration = 2500) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    }

    info(message, duration = 2500) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration = 2500) {
        return this.show(message, 'warning', duration);
    }

    confirm(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '10001';
            overlay.style.backdropFilter = 'blur(4px)';
            overlay.style.WebkitBackdropFilter = 'blur(4px)';
            overlay.style.animation = 'fadeIn 0.2s ease-in-out';

            const dialog = document.createElement('div');
            dialog.style.background = 'linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)';
            dialog.style.border = '2px solid rgba(147, 51, 234, 0.4)';
            dialog.style.borderRadius = '20px';
            dialog.style.padding = '2.5rem';
            dialog.style.maxWidth = '480px';
            dialog.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            dialog.style.backdropFilter = 'blur(16px)';
            dialog.style.WebkitBackdropFilter = 'blur(16px)';
            dialog.style.animation = 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

            const titleEl = document.createElement('h2');
            titleEl.textContent = title;
            titleEl.style.margin = '0 0 1.5rem 0';
            titleEl.style.background = 'linear-gradient(135deg, #9333EA 0%, #d699ff 100%)';
            titleEl.style.WebkitBackgroundClip = 'text';
            titleEl.style.WebkitTextFillColor = 'transparent';
            titleEl.style.backgroundClip = 'text';
            titleEl.style.fontFamily = 'Poppins, sans-serif';
            titleEl.style.fontSize = '1.8rem';
            titleEl.style.fontWeight = '800';
            titleEl.style.paddingBottom = '1.5rem';
            titleEl.style.borderBottom = '2px solid rgba(147, 51, 234, 0.3)';

            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.margin = '1.5rem 0 2rem 0';
            messageEl.style.color = 'rgba(255, 255, 255, 0.85)';
            messageEl.style.fontFamily = 'Poppins, sans-serif';
            messageEl.style.fontSize = '1rem';
            messageEl.style.lineHeight = '1.6';
            messageEl.style.textAlign = 'center';

            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '1rem';
            buttonsContainer.style.justifyContent = 'center';
            buttonsContainer.style.marginTop = '1.5rem';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.style.padding = '0.8rem 2rem';
            cancelBtn.style.borderRadius = '8px';
            cancelBtn.style.border = '2px solid';
            cancelBtn.style.color = 'rgba(255, 255, 255, 0.7)';
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            cancelBtn.style.background = 'transparent';
            cancelBtn.style.fontFamily = 'Poppins, sans-serif';
            cancelBtn.style.fontSize = '0.95rem';
            cancelBtn.style.fontWeight = '600';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.transition = 'all 0.3s ease';
            cancelBtn.style.textTransform = 'uppercase';
            cancelBtn.style.letterSpacing = '0.3px';
            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.color = 'rgba(255, 255, 255, 1)';
                cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
                cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                cancelBtn.style.transform = 'translateY(-1px)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.color = 'rgba(255, 255, 255, 0.7)';
                cancelBtn.style.background = 'transparent';
                cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                cancelBtn.style.transform = 'translateY(0)';
            });
            cancelBtn.addEventListener('click', () => {
                overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
                setTimeout(() => overlay.remove(), 200);
                resolve(false);
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirmar';
            confirmBtn.style.padding = '0.8rem 2rem';
            confirmBtn.style.borderRadius = '8px';
            confirmBtn.style.border = '2px solid';
            confirmBtn.style.background = 'linear-gradient(135deg, #9333EA 0%, #b366ff 100%)';
            confirmBtn.style.color = 'white';
            confirmBtn.style.borderColor = '#9333EA';
            confirmBtn.style.fontFamily = 'Poppins, sans-serif';
            confirmBtn.style.fontSize = '0.95rem';
            confirmBtn.style.fontWeight = '700';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.transition = 'all 0.3s ease';
            confirmBtn.style.textTransform = 'uppercase';
            confirmBtn.style.letterSpacing = '0.5px';
            confirmBtn.style.boxShadow = '0 4px 15px rgba(147, 51, 234, 0.3)';
            confirmBtn.addEventListener('mouseenter', () => {
                confirmBtn.style.transform = 'translateY(-2px)';
                confirmBtn.style.boxShadow = '0 6px 24px rgba(147, 51, 234, 0.5)';
                confirmBtn.style.background = 'linear-gradient(135deg, #b366ff 0%, #d699ff 100%)';
            });
            confirmBtn.addEventListener('mouseleave', () => {
                confirmBtn.style.transform = 'translateY(0)';
                confirmBtn.style.boxShadow = '0 4px 15px rgba(147, 51, 234, 0.3)';
                confirmBtn.style.background = 'linear-gradient(135deg, #9333EA 0%, #b366ff 100%)';
            });
            confirmBtn.addEventListener('active', () => {
                confirmBtn.style.transform = 'translateY(0)';
                confirmBtn.style.boxShadow = '0 2px 8px rgba(147, 51, 234, 0.3)';
            });
            confirmBtn.addEventListener('click', () => {
                overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
                setTimeout(() => overlay.remove(), 200);
                resolve(true);
            });

            buttonsContainer.appendChild(cancelBtn);
            buttonsContainer.appendChild(confirmBtn);

            dialog.appendChild(titleEl);
            dialog.appendChild(messageEl);
            dialog.appendChild(buttonsContainer);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            confirmBtn.focus();
        });
    }
}
