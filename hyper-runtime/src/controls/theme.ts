/**
 * Design tokens inherited from the parent Studio application
 * These CSS variables are defined in src/app/globals.css
 */
export const studioTheme = {
  // CSS variables that should be available in the iframe
  cssVariables: {
    '--bg': '#0a0e14',
    '--bg-elevated': '#0f1419',
    '--muted': '#1a2332',
    '--text': '#e6edf3',
    '--text-secondary': '#8b949e',
    '--accent': '#58d5ff',
    '--accent-2': '#42a5cc',
    '--border': '#21262d',
    '--border-hover': '#30363d',
    '--success': '#3fb950',
    '--error': '#f85149',
  },

  // Tweakpane-specific theme variables
  tweakpane: {
    '--tp-base-background-color': 'var(--bg-elevated)',
    '--tp-base-shadow-color': 'rgba(0, 0, 0, 0.4)',

    '--tp-button-background-color': 'var(--muted)',
    '--tp-button-background-color-active': 'var(--accent-2)',
    '--tp-button-background-color-focus': 'var(--accent)',
    '--tp-button-background-color-hover': 'var(--border-hover)',
    '--tp-button-foreground-color': 'var(--text)',

    '--tp-container-background-color': 'rgba(15, 20, 25, 0.6)',
    '--tp-container-background-color-active': 'rgba(15, 20, 25, 0.8)',
    '--tp-container-background-color-focus': 'rgba(15, 20, 25, 0.9)',
    '--tp-container-background-color-hover': 'rgba(15, 20, 25, 0.7)',
    '--tp-container-foreground-color': 'var(--text)',

    '--tp-groove-foreground-color': 'var(--border)',

    '--tp-input-background-color': 'rgba(26, 35, 50, 0.5)',
    '--tp-input-background-color-active': 'rgba(26, 35, 50, 0.7)',
    '--tp-input-background-color-focus': 'rgba(26, 35, 50, 0.8)',
    '--tp-input-background-color-hover': 'rgba(26, 35, 50, 0.6)',
    '--tp-input-foreground-color': 'var(--text)',

    '--tp-label-foreground-color': 'var(--text-secondary)',

    '--tp-monitor-background-color': 'rgba(26, 35, 50, 0.5)',
    '--tp-monitor-foreground-color': 'var(--text)',
  }
};

/**
 * Inject CSS variables into the document
 */
export function injectThemeVariables() {
  const style = document.createElement('style');
  style.id = 'hypertool-theme';

  const cssVars = Object.entries({
    ...studioTheme.cssVariables,
    ...studioTheme.tweakpane
  })
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  style.textContent = `
  body {
   margin: 0;
   padding: 0;
  }
  
:root {
${cssVars}
}

/* Tweakpane container styling */
.tp-dfwv {
  width: 300px !important;
  max-height: calc(100vh - 40px);
  display: flex;
  
  
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  // overflow: auto;
}

/* Title styling */
.tp-dfwv .tp-rotv_t {
  color: var(--accent);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.3px;
}

/* Folder styling */
.tp-dfwv .tp-fldv_t {
  color: var(--text);
  font-weight: 500;
}

/* Scrollbar styling */
.tp-dfwv ::-webkit-scrollbar {
  width: 8px;
}

.tp-dfwv ::-webkit-scrollbar-track {
  background: transparent;
}

.tp-dfwv ::-webkit-scrollbar-thumb {
  background: var(--border-hover);
  border-radius: 4px;
}

.tp-dfwv ::-webkit-scrollbar-thumb:hover {
  background: #3a4149;
}

/* Animation */
.tp-dfwv {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

  document.head.appendChild(style);
}
