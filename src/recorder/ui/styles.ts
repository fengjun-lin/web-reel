const STYLE_ID = 'web-reel-entry-button-styles';

const STYLES = `
.web-reel-entry-button {
  position: fixed;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  font-size: 20px;
  z-index: 100000;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  overflow: visible;
}

.web-reel-entry-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.web-reel-entry-button:hover::before {
  opacity: 1;
}

.web-reel-entry-button:hover {
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5),
              0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px) scale(1.05);
}

.web-reel-entry-button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4),
              0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Position variants */
.web-reel-entry-button--bottom-right {
  right: 20px;
  bottom: 20px;
  animation: slideInRight 0.5s ease-out;
}

@keyframes slideInRight {
  from {
    right: -80px;
    opacity: 0;
  }
  to {
    right: 20px;
    opacity: 1;
  }
}

.web-reel-entry-button--bottom-left {
  left: 20px;
  bottom: 20px;
  animation: slideInLeft 0.5s ease-out;
}

@keyframes slideInLeft {
  from {
    left: -80px;
    opacity: 0;
  }
  to {
    left: 20px;
    opacity: 1;
  }
}

.web-reel-entry-button--top-right {
  right: 20px;
  top: 80px;
  animation: slideInRight 0.5s ease-out;
}

.web-reel-entry-button--top-left {
  left: 20px;
  top: 80px;
  animation: slideInLeft 0.5s ease-out;
}

/* SVG icon */
.web-reel-entry-button svg {
  width: 24px;
  height: 24px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  transition: transform 0.3s ease;
}

.web-reel-entry-button:hover svg {
  transform: translateY(2px);
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}

/* Tooltip */
.web-reel-entry-button-tooltip {
  position: absolute;
  top: 50%;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.92) 0%, rgba(30, 30, 30, 0.95) 100%);
  color: white;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-weight: 500;
  letter-spacing: 0.3px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-50%) scale(0.85);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100002;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3),
              0 2px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.web-reel-entry-button--bottom-right .web-reel-entry-button-tooltip,
.web-reel-entry-button--top-right .web-reel-entry-button-tooltip {
  right: calc(100% + 14px);
}

.web-reel-entry-button--bottom-left .web-reel-entry-button-tooltip,
.web-reel-entry-button--top-left .web-reel-entry-button-tooltip {
  left: calc(100% + 14px);
}

.web-reel-entry-button:hover .web-reel-entry-button-tooltip {
  opacity: 1;
  transform: translateY(-50%) scale(1);
  transition-delay: 0.6s;
}

/* Tooltip arrow */
.web-reel-entry-button-tooltip::before {
  content: '';
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border-style: solid;
  transform: translateY(-50%);
}

.web-reel-entry-button--bottom-right .web-reel-entry-button-tooltip::before,
.web-reel-entry-button--top-right .web-reel-entry-button-tooltip::before {
  left: 100%;
  border-width: 6px 0 6px 8px;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.92);
}

.web-reel-entry-button--bottom-left .web-reel-entry-button-tooltip::before,
.web-reel-entry-button--top-left .web-reel-entry-button-tooltip::before {
  right: 100%;
  border-width: 6px 8px 6px 0;
  border-color: transparent rgba(0, 0, 0, 0.92) transparent transparent;
}

/* Pulse animation for attention */
.web-reel-entry-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(1);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1);
  }
  70% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.4);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .web-reel-entry-button {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
  
  .web-reel-entry-button svg {
    width: 20px;
    height: 20px;
  }
  
  .web-reel-entry-button--bottom-right,
  .web-reel-entry-button--top-right {
    right: 12px;
  }
  
  .web-reel-entry-button--bottom-left,
  .web-reel-entry-button--top-left {
    left: 12px;
  }
  
  .web-reel-entry-button--bottom-right,
  .web-reel-entry-button--bottom-left {
    bottom: 12px;
  }
}
`;

let injected = false;

/**
 * Inject styles into document
 */
export function injectStyles(): void {
  if (injected) return;

  // Check if style already exists
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;

  document.head.appendChild(style);
  injected = true;
}

/**
 * Remove injected styles
 */
export function removeStyles(): void {
  const style = document.getElementById(STYLE_ID);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    injected = false;
  }
}
