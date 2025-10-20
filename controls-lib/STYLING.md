# Styling HypertoolControls

The `HypertoolControls` class now automatically wraps the Tweakpane in a `.control-container` div, making it easy to style.

## 🎨 CSS Classes Available

### `.control-container`
The main wrapper around the entire controls panel.

### `.control-container .tp-dfwv`
The actual Tweakpane element inside the container.

## 📝 Example Usage

```html
<div id="my-controls"></div>
```

```javascript
import { HypertoolControls } from './dist/index.js';

const controls = new HypertoolControls({
  // your control definitions
}, {
  container: document.getElementById('my-controls')
});
```

## 🎨 Custom Styling Examples

### Basic Container Styling
```css
.control-container {
  /* Custom background */
  background: linear-gradient(135deg, #1a2332, #2a3a4a);
  
  /* Custom border */
  border: 2px solid #58d5ff;
  border-radius: 12px;
  
  /* Custom padding */
  padding: 16px;
  
  /* Custom shadow */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### Resizable Container
```css
.control-container {
  width: 320px;
  min-width: 280px;
  max-width: 500px;
  height: 100%;
  resize: horizontal;
  overflow: auto;
}
```

### Dark Theme Override
```css
.control-container {
  background: #0a0e14;
  border: 1px solid #21262d;
}

.control-container .tp-dfwv {
  background: #0f1419 !important;
  color: #e6edf3 !important;
}
```

### Compact Layout
```css
.control-container {
  padding: 8px;
}

.control-container .tp-dfwv {
  font-size: 11px !important;
  padding: 8px !important;
}
```

### Floating Panel
```css
.control-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  height: 400px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  background: rgba(15, 20, 25, 0.9);
}
```

## 🔧 Advanced Styling

### Custom Scrollbar
```css
.control-container .tp-dfwv::-webkit-scrollbar {
  width: 8px;
}

.control-container .tp-dfwv::-webkit-scrollbar-track {
  background: #1a2332;
}

.control-container .tp-dfwv::-webkit-scrollbar-thumb {
  background: #58d5ff;
  border-radius: 4px;
}
```

### Animation on Hover
```css
.control-container {
  transition: all 0.3s ease;
}

.control-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
```

### Responsive Design
```css
@media (max-width: 768px) {
  .control-container {
    width: 100%;
    max-width: 100%;
    height: 300px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 12px 12px 0 0;
  }
}
```

## 🎯 Integration with Your App

The `.control-container` class makes it easy to integrate with your existing design system:

```css
/* Your app's design tokens */
:root {
  --panel-bg: #1a2332;
  --panel-border: #58d5ff;
  --panel-radius: 8px;
}

.control-container {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--panel-radius);
}
```
