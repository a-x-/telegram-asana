/*
 * Event#stopPropagation alternative.
 * Only top registred layer will receive keydown events.
 * Usualy used for Escaping topmost layers in combination with ModalManager.
 */

export class KeyboardHandler {
    constructor(onKeyDown) {
        this.onKeyDown = onKeyDown;
    }
}

class KeyboardManager {
    constructor() {
        this.handlers = [];

        document.addEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown = event => {
        // console.log('[keydown] KeyboardManager.handleKeyDown', this.handlers, event.key);

        const { handlers } = this;
        if (!handlers.length) return;

        const handler = handlers[handlers.length - 1];
        if (handler) {
            const { onKeyDown } = handler;
            if (onKeyDown) {
                onKeyDown(event);
            }
        }
    };

    /** register layer */
    add(handler) {
        // console.log('[keydown] KeyboardManager.add', handler);
        this.handlers.push(handler);
    }

    /** pop layer */
    remove(handler) {
        // console.log('[keydown] KeyboardManager.remove', handler);
        const index = this.handlers.indexOf(handler);
        if (index === -1) return;

        this.handlers.splice(index, 1);
    }
}

const manager = new KeyboardManager();
export default manager;
