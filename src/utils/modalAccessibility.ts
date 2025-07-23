// Focus trap utility for modal accessibility
export class FocusTrap {
    private modal: HTMLElement;
    private focusableElements: HTMLElement[];
    private firstFocusableElement: HTMLElement | null = null;
    private lastFocusableElement: HTMLElement | null = null;
    private previousActiveElement: HTMLElement | null = null;

    constructor(modal: HTMLElement) {
        this.modal = modal;
        this.focusableElements = [];
        this.updateFocusableElements();
    }

    private updateFocusableElements(): void {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        this.focusableElements = Array.from(
            this.modal.querySelectorAll(focusableSelectors)
        ) as HTMLElement[];

        this.firstFocusableElement = this.focusableElements[0] || null;
        this.lastFocusableElement =
            this.focusableElements[this.focusableElements.length - 1] || null;
    }

    public activate(): void {
        this.previousActiveElement = document.activeElement as HTMLElement;
        this.modal.addEventListener('keydown', this.handleKeyDown);

        // Focus the first focusable element or the modal itself
        if (this.firstFocusableElement) {
            this.firstFocusableElement.focus();
        } else {
            this.modal.focus();
        }
    }

    public deactivate(): void {
        this.modal.removeEventListener('keydown', this.handleKeyDown);

        // Return focus to the previously active element
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Tab') {
            if (this.focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            if (event.shiftKey) {
                // Shift + Tab: move to previous element
                if (document.activeElement === this.firstFocusableElement) {
                    event.preventDefault();
                    this.lastFocusableElement?.focus();
                }
            } else {
                // Tab: move to next element
                if (document.activeElement === this.lastFocusableElement) {
                    event.preventDefault();
                    this.firstFocusableElement?.focus();
                }
            }
        }
    };
}

// Modal manager for handling multiple modals and accessibility
export class ModalManager {
    private static instance: ModalManager;
    private activeModal: HTMLElement | null = null;
    private focusTrap: FocusTrap | null = null;
    private bodyScrollPosition: number = 0;

    public static getInstance(): ModalManager {
        if (!ModalManager.instance) {
            ModalManager.instance = new ModalManager();
        }
        return ModalManager.instance;
    }

    public openModal(modal: HTMLElement): void {
        // Debug: log modal state before opening
        console.log('[ModalManager] Opening modal:', modal);
        console.log('[ModalManager] Modal classes before:', modal.className);
        console.log('[ModalManager] Modal bounding rect before:', modal.getBoundingClientRect());
        // Close any existing modal first
        if (this.activeModal) {
            this.closeModal();
        }

        this.activeModal = modal;

        // Prevent body scroll
        this.bodyScrollPosition = window.pageYOffset;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.bodyScrollPosition}px`;
        document.body.style.width = '100%';

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // Debug: log modal state after opening
        setTimeout(() => {
            console.log('[ModalManager] Modal classes after:', modal.className);
            console.log('[ModalManager] Modal bounding rect after:', modal.getBoundingClientRect());
            console.log('[ModalManager] Modal computed style:', window.getComputedStyle(modal));
        }, 50);

        // Set up focus trap
        this.focusTrap = new FocusTrap(modal);
        this.focusTrap.activate();

        // Add event listeners
        modal.addEventListener('click', this.handleModalClick);
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    public closeModal(): void {
        if (!this.activeModal) return;

        const modal = this.activeModal;

        // Add closing animation class
        modal.classList.add('closing');

        // Wait for animation to complete
        setTimeout(() => {
            // Hide modal
            modal.classList.add('hidden');
            modal.classList.remove('flex', 'closing');

            // Restore body scroll
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, this.bodyScrollPosition);

            // Deactivate focus trap
            if (this.focusTrap) {
                this.focusTrap.deactivate();
                this.focusTrap = null;
            }

            // Remove event listeners
            modal.removeEventListener('click', this.handleModalClick);
            document.removeEventListener('keydown', this.handleEscapeKey);

            this.activeModal = null;
        }, 200); // Match animation duration
    }

    private handleModalClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;

        // Close if clicking on backdrop or close button
        if (target.classList.contains('project-modal') ||
            target.classList.contains('modal-close') ||
            target.closest('.modal-close')) {
            this.closeModal();
        }
    };

    private handleEscapeKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            this.closeModal();
        }
    };
}

// Initialize modal functionality
export function initializeModalSystem(): void {
    const modalManager = ModalManager.getInstance();

    // Add click handlers to project links
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const projectLink = target.closest('.project-link') as HTMLElement;

        if (projectLink) {
            event.preventDefault();
            const projectId = projectLink.dataset.projectId;

            if (projectId) {
                const modal = document.querySelector(`[data-project-id="${projectId}"].project-modal`) as HTMLElement;
                if (modal) {
                    modalManager.openModal(modal);
                }
            }
        }
    });
}