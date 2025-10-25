/**
 * URL change interceptor
 * Records URL changes including history API and hash changes
 */

export interface URLChangeHandler {
  onURLChange: (_url: string, _trigger: 'initial' | 'pushState' | 'replaceState' | 'popstate' | 'hashchange') => void;
}

export class URLInterceptor {
  private handler: URLChangeHandler;
  private originalPushState: typeof history.pushState;
  private originalReplaceState: typeof history.replaceState;
  private isInstalled: boolean = false;

  constructor(handler: URLChangeHandler) {
    this.handler = handler;
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
  }

  /**
   * Install URL change interceptors
   */
  public install(): void {
    if (this.isInstalled) {
      console.warn('[URLInterceptor] Already installed');
      return;
    }

    // Record initial URL
    this.handler.onURLChange(window.location.href, 'initial');

    // Intercept pushState
    history.pushState = (...args) => {
      this.originalPushState(...args);
      this.handler.onURLChange(window.location.href, 'pushState');
    };

    // Intercept replaceState
    history.replaceState = (...args) => {
      this.originalReplaceState(...args);
      this.handler.onURLChange(window.location.href, 'replaceState');
    };

    // Listen to popstate (browser back/forward)
    window.addEventListener('popstate', this.handlePopstate);

    // Listen to hash changes
    window.addEventListener('hashchange', this.handleHashchange);

    this.isInstalled = true;
  }

  /**
   * Uninstall URL change interceptors
   */
  public uninstall(): void {
    if (!this.isInstalled) {
      return;
    }

    // Restore original methods
    history.pushState = this.originalPushState;
    history.replaceState = this.originalReplaceState;

    // Remove event listeners
    window.removeEventListener('popstate', this.handlePopstate);
    window.removeEventListener('hashchange', this.handleHashchange);

    this.isInstalled = false;
  }

  /**
   * Handle popstate event
   */
  private handlePopstate = (): void => {
    this.handler.onURLChange(window.location.href, 'popstate');
  };

  /**
   * Handle hashchange event
   */
  private handleHashchange = (): void => {
    this.handler.onURLChange(window.location.href, 'hashchange');
  };

  /**
   * Check if interceptor is installed
   */
  public isActive(): boolean {
    return this.isInstalled;
  }
}
