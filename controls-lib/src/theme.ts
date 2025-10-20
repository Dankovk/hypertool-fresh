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

    // Hypertool-specific variables
    '--ht-text-color-main-200': '#00ffd4',
    '--ht-text-color-main-300': '#6ff3dd',
    '--ht-text-color-main-500': '#4b8e85',
    '--ht-text-color-grey-200': '#8c8d8f',

    '--ht-bg-color-200': '#8c8d8f',
    '--ht-bg-color-200-active': '#7a7b7d',
    '--ht-bg-color-200-focus': '#7e7f81',
    '--ht-bg-color-200-hover': '#828384',

    '--ht-bg-color-300': '#5e6068',
    '--ht-bg-color-300-active': '#4c4e56',
    '--ht-bg-color-300-focus': '#55575f',
    '--ht-bg-color-300-hover': '#595b63',

    '--ht-bg-color-400': '#cccccc',
    '--ht-bg-color-400-active': '#b3b3b3',
    '--ht-bg-color-400-focus': '#c0c0c0',
    '--ht-bg-color-400-hover': '#c6c6c6',

    '--ht-bg-color-500': '#1C1D20',
    '--ht-bg-color-500-active': '#0a0b0e',
    '--ht-bg-color-500-focus': '#131417',
    '--ht-bg-color-500-hover': '#16171a',

    '--ht-bg-color-600': '#37383D',
    '--ht-bg-color-600-active': '#25262b',
    '--ht-bg-color-600-focus': '#2e2f34',
    '--ht-bg-color-600-hover': '#323338',

    '--ht-bg-color-700': '#28292e',
    '--ht-bg-color-700-active': '#16171c',
    '--ht-bg-color-700-focus': '#1f2025',
    '--ht-bg-color-700-hover': '#232429',

    '--ht-border-radius': '8px',

    '--ht-base-font-family-base': '"HydrogenType400", ui-sans-serif, system-ui, sans-serif',
    '--ht-base-font-family-display': '"Departure Mono", Roboto Mono, Source Code Pro, Menlo, Courier, monospace',
    '--ht-base-font-family-sans': '"Routed Gothic", ui-sans-serif, system-ui, sans-serif',
    '--ht-base-font-family-mono': '"Routed Gothic Narrow", ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace',
  },

  // Tweakpane-specific theme variables
  tweakpane: {
    '--tp-base-background-color': 'var(--ht-bg-color-700)',
    '--tp-base-shadow-color': 'hsla(0, 0%, 0%, 0.2)',

    '--tp-container-background-color': 'var(--ht-bg-color-600)',
    '--tp-container-background-color-active': 'var(--ht-bg-color-600-active)',
    '--tp-container-background-color-focus': 'var(--ht-bg-color-600-focus)',
    '--tp-container-background-color-hover': 'var(--ht-bg-color-600-hover)',
    '--tp-container-foreground-color': 'var(--ht-text-color-main-300)',

    '--tp-button-background-color': 'var(--ht-bg-color-400)',
    '--tp-button-background-color-active': 'color-mix(in srgb, var(--ht-bg-color-400-active) 80%, white)',
    '--tp-button-background-color-focus': 'color-mix(in srgb, var(--ht-bg-color-400-focus) 85%, white)',
    '--tp-button-background-color-hover': 'color-mix(in srgb, var(--ht-bg-color-400-hover) 90%, white)',
    '--tp-button-foreground-color': 'var(--ht-text-color-main-300)',

    '--tp-groove-foreground-color': 'var(--ht-bg-color-300)',

    '--tp-input-background-color': 'var(--ht-bg-color-500)',
    '--tp-input-background-color-active': 'var(--ht-bg-color-500-active)',
    '--tp-input-background-color-focus': 'var(--ht-bg-color-500-focus)',
    '--tp-input-background-color-hover': 'var(--ht-bg-color-500-hover)',
    '--tp-input-foreground-color': 'var(--ht-text-color-main-300)',

    '--tp-label-foreground-color': 'var(--ht-text-color-main-300)',

    '--tp-monitor-background-color': 'var(--ht-bg-color-500)',
    '--tp-monitor-foreground-color': 'var(--ht-text-color-main-300)',
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

.hypertool-three-sketch {
  width: calc(100% - 256px) !important;
}

.hypertool-three-sketch canvas {
  width: 100% !important;
}

.tp-dfwv {
    top: 0 !important;
    right: 0 !important;
    height: 100%;
    background: var(--tp-base-background-color);
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 10000;
}


.tp-rotv {
    font-family: var(--ht-base-font-family-mono) !important;
}
    
/* Tweakpane title styling */
.tp-dfwv .tp-dfwv-title {
    color: var(--ht-text-color-main-200) !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    letter-spacing: 0.5px !important;
}

/* Tweakpane folder styling */
.tp-dfwv .tp-fldv {
    border-bottom: 1px solid var(--ht-bg-color-300) !important;
}

.tp-dfwv .tp-fldv:last-child {
    border-bottom: none !important;
}

/* Tweakpane folder title */
.tp-dfwv .tp-fldv_t {
    color: var(--ht-text-color-main-300) !important;
    font-weight: 500 !important;
    font-size: 11px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.3px !important;
}

/* Tweakpane input styling */
.tp-dfwv .tp-txtv_i {
    background-color: var(--ht-bg-color-500) !important;
    border: 1px solid var(--tp-base-background-color) !important;
    border-radius: 4px !important;
    color: var(--ht-text-color-main-300) !important;
    font-family: var(--ht-base-font-family-mono) !important;
    font-size: 11px !important;
    padding: 4px 6px !important;
}

.tp-p2dv_b, .tp-btnv_b, .tp-lstv_s {
  background-color: var(--ht-bg-color-500) !important;
}

.tp-p2dv_b:hover, .tp-btnv_b:hover, .tp-lstv_s:hover {
    background-color: var(--ht-bg-color-500) !important;
}

.tp-dfwv .tp-txtv_i:focus {
    border-color: var(--ht-text-color-main-200) !important;
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(0, 255, 212, 0.1) !important;
}

/* Tweakpane button styling */
.tp-dfwv .tp-btni {
    background-color: var(--ht-bg-color-500) !important;
    border: 1px solid var(--ht-bg-color-300) !important;
    border-radius: 4px !important;
    color: var(--ht-text-color-main-300) !important;
    font-family: var(--ht-base-font-family-mono) !important;
    font-size: 11px !important;
    padding: 4px 8px !important;
    transition: all 0.2s ease !important;
}

.tp-dfwv .tp-btni:hover {
    background-color: var(--ht-bg-color-300) !important;
    border-color: var(--ht-text-color-main-200) !important;
    color: var(--ht-text-color-main-200) !important;
}

.tp-dfwv .tp-btni:active {
    background-color: var(--ht-bg-color-200) !important;
    transform: translateY(1px) !important;
}

/* Tweakpane checkbox styling */
.tp-dfwv .tp-chkv_i {
    background-color: var(--ht-bg-color-500) !important;
    border: 1px solid var(--ht-bg-color-300) !important;
    border-radius: 3px !important;
}

.tp-dfwv .tp-chkv_i:checked {
    background-color: var(--ht-text-color-main-200) !important;
    border-color: var(--ht-text-color-main-200) !important;
}

/* Tweakpane color picker styling */
.tp-dfwv .tp-clrv_i {
    border: 1px solid var(--ht-bg-color-300) !important;
    border-radius: 4px !important;
}

/* Tweakpane monitor styling */
.tp-dfwv .tp-mnvi {
    background-color: var(--ht-bg-color-500) !important;
    border: 1px solid var(--ht-bg-color-300) !important;
    border-radius: 4px !important;
    color: var(--ht-text-color-main-300) !important;
    font-family: var(--ht-base-font-family-mono) !important;
    font-size: 11px !important;
    padding: 4px 6px !important;
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
