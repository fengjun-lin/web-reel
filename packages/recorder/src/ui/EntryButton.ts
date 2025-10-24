import { injectStyles } from './styles';

export interface EntryButtonOptions {
  onClick?: () => void;
  disabled?: boolean;
  extraClass?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  mode?: 'download' | 'upload'; // Button mode: download or upload
}

const DOWNLOAD_ICON_SVG = `
<svg viewBox="64 64 896 896" focusable="false" fill="currentColor" width="1em" height="1em" data-icon="download" aria-hidden="true">
  <path d="M505.7 661a8 8 0 0012.6 0l112-141.7c4.1-5.2.4-12.9-6.3-12.9h-74.1V168c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v338.3H400c-6.7 0-10.4 7.7-6.3 12.9l112 141.8zM878 626h-60c-4.4 0-8 3.6-8 8v154H214V634c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v198c0 17.7 14.3 32 32 32h684c17.7 0 32-14.3 32-32V634c0-4.4-3.6-8-8-8z"></path>
</svg>
`;

const UPLOAD_ICON_SVG = `
<svg viewBox="64 64 896 896" focusable="false" fill="currentColor" width="1em" height="1em" data-icon="upload" aria-hidden="true">
  <path d="M400 317.7h73.9V656c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V317.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 163a8 8 0 00-12.6 0l-112 141.7c-4.1 5.3-.4 13 6.3 13zM878 626h-60c-4.4 0-8 3.6-8 8v154H214V634c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v198c0 17.7 14.3 32 32 32h684c17.7 0 32-14.3 32-32V634c0-4.4-3.6-8-8-8z"></path>
</svg>
`;

/**
 * Floating entry button for recorder controls
 */
export class EntryButton {
  private element: HTMLElement | null = null;
  private options: EntryButtonOptions;

  constructor(options: EntryButtonOptions = {}) {
    this.options = {
      position: 'bottom-right',
      mode: 'download',
      ...options,
    };

    if (!this.options.disabled) {
      this.init();
    }
  }

  /**
   * Initialize the entry button
   */
  private init(): void {
    // Inject styles
    injectStyles();

    // Create button element
    this.element = this.createButton();

    // Append to body
    document.body.appendChild(this.element);

    // Setup event listeners
    this.setupEvents();

    console.log('[EntryButton] Initialized');
  }

  /**
   * Create button element
   */
  private createButton(): HTMLElement {
    const button = document.createElement('div');

    // Set base class
    let className = 'web-reel-entry-button';

    // Add position class
    className += ` web-reel-entry-button--${this.options.position}`;

    // Add extra class if provided
    if (this.options.extraClass) {
      className += ` ${this.options.extraClass}`;
    }

    button.className = className;

    // Set icon and text based on mode
    const isUploadMode = this.options.mode === 'upload';
    button.innerHTML = isUploadMode ? UPLOAD_ICON_SVG : DOWNLOAD_ICON_SVG;
    button.title = isUploadMode ? 'Report an Issue' : 'Download to Local';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', isUploadMode ? 'Report an Issue' : 'Download to Local');

    // Add tooltip element
    const tooltip = document.createElement('span');
    tooltip.className = 'web-reel-entry-button-tooltip';
    tooltip.textContent = isUploadMode ? 'Report an Issue' : 'Download to Local';
    button.appendChild(tooltip);

    return button;
  }

  /**
   * Setup event listeners
   */
  private setupEvents(): void {
    if (!this.element) return;

    this.element.addEventListener('click', () => {
      if (this.options.onClick) {
        this.options.onClick();
      }
    });
  }

  /**
   * Show the button
   */
  public show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /**
   * Hide the button
   */
  public hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Destroy the button
   */
  public destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }

    console.log('[EntryButton] Destroyed');
  }

  /**
   * Check if button is visible
   */
  public isVisible(): boolean {
    return this.element !== null && this.element.style.display !== 'none';
  }

  /**
   * Update button position
   */
  public setPosition(position: EntryButtonOptions['position']): void {
    if (!this.element) return;

    // Remove old position class
    this.element.classList.remove(
      'web-reel-entry-button--bottom-right',
      'web-reel-entry-button--bottom-left',
      'web-reel-entry-button--top-right',
      'web-reel-entry-button--top-left',
    );

    // Add new position class
    this.element.classList.add(`web-reel-entry-button--${position}`);
    this.options.position = position;
  }

  /**
   * Update button mode
   */
  public setMode(mode: 'download' | 'upload'): void {
    if (!this.element) return;

    this.options.mode = mode;

    // Update icon and text
    const isUploadMode = mode === 'upload';
    this.element.innerHTML = isUploadMode ? UPLOAD_ICON_SVG : DOWNLOAD_ICON_SVG;
    this.element.title = isUploadMode ? 'Report an Issue' : 'Download to Local';
    this.element.setAttribute('aria-label', isUploadMode ? 'Report an Issue' : 'Download to Local');

    // Update tooltip
    const tooltip = document.createElement('span');
    tooltip.className = 'web-reel-entry-button-tooltip';
    tooltip.textContent = isUploadMode ? 'Report an Issue' : 'Download to Local';
    this.element.appendChild(tooltip);
  }

  /**
   * Get button element
   */
  public getElement(): HTMLElement | null {
    return this.element;
  }
}
