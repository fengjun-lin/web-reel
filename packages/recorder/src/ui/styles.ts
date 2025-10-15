const STYLE_ID = 'web-reel-entry-button-styles'

const STYLES = `
.web-reel-entry-button {
  position: fixed;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.35s ease;
  cursor: pointer;
  user-select: none;
  background-color: white;
  color: #59afe6;
  box-shadow: 0 0 6px rgba(89, 175, 230, 0.6);
  border-radius: 0.2rem;
  font-size: 1.2rem;
  z-index: 100000;
  backdrop-filter: blur(10px);
}

.web-reel-entry-button:hover {
  box-shadow: 0 0 12px rgba(24, 144, 255, 0.8);
  transform: scale(1.1);
  color: #1890ff;
}

.web-reel-entry-button:active {
  transform: scale(0.95);
}

/* Position variants */
.web-reel-entry-button--bottom-right {
  right: -0.5rem;
  bottom: 3rem;
}

.web-reel-entry-button--bottom-right:hover {
  right: 0;
}

.web-reel-entry-button--bottom-left {
  left: -0.5rem;
  bottom: 3rem;
}

.web-reel-entry-button--bottom-left:hover {
  left: 0;
}

.web-reel-entry-button--top-right {
  right: -0.5rem;
  top: 3rem;
}

.web-reel-entry-button--top-right:hover {
  right: 0;
}

.web-reel-entry-button--top-left {
  left: -0.5rem;
  top: 3rem;
}

.web-reel-entry-button--top-left:hover {
  left: 0;
}

/* SVG icon */
.web-reel-entry-button svg {
  width: 1.2em;
  height: 1.2em;
}
`

let injected = false

/**
 * Inject styles into document
 */
export function injectStyles(): void {
  if (injected) return

  // Check if style already exists
  if (document.getElementById(STYLE_ID)) {
    injected = true
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES

  document.head.appendChild(style)
  injected = true
}

/**
 * Remove injected styles
 */
export function removeStyles(): void {
  const style = document.getElementById(STYLE_ID)
  if (style && style.parentNode) {
    style.parentNode.removeChild(style)
    injected = false
  }
}
