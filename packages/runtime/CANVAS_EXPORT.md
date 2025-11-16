# Canvas Export Behavior

## Automatic DPI Detection & Export Size Matching

The Hypertool runtime **automatically detects your display's DPI** and adjusts the canvas size inputs to match the actual export dimensions. What you see in the width/height inputs is exactly what you'll get in exports.

## How It Works

### DPI Detection

Modern displays (like Retina/4K screens) have **devicePixelRatio > 1**, typically 2 or 3. Graphics libraries like **p5.js** and **Three.js** automatically create canvases at higher resolution to look crisp on these displays:

```javascript
// p5.js internally does this:
canvas.width = displayWidth * devicePixelRatio;   // e.g., 800 * 2 = 1600px
canvas.height = displayHeight * devicePixelRatio; // e.g., 600 * 2 = 1200px

// But CSS displays it at:
canvas.style.width = '800px';
canvas.style.height = '600px';
```

### Automatic Sync: UI Inputs Match Export Size ✨

**The runtime automatically detects the actual canvas dimensions and updates the UI inputs:**

| Display DPI | You Set in UI | Canvas Created At | Export Size | Match? |
|------------|--------------|------------------|-------------|--------|
| 2x (Retina) | 1600×1200 | 1600×1200px | 1600×1200px | ✅ Yes |
| 2x (Retina) | 2000×1600 | 2000×1600px | 2000×1600px | ✅ Yes |
| 1x (Standard) | 800×600 | 800×600px | 800×600px | ✅ Yes |

**What you see in the inputs = what gets exported!**

The system:
1. **Initializes** inputs accounting for `devicePixelRatio` (e.g., 800px → 1600px on Retina)
2. **Detects** the actual canvas element after it's created
3. **Syncs** the UI inputs to match the canvas's real dimensions
4. **Exports** capture the exact dimensions shown in inputs

### Why This Is Great

✅ **WYSIWYG** - What you see in inputs is what you get in exports  
✅ **Sharp exports** - Images maintain high resolution for your display  
✅ **Crisp on retina displays** - Looks sharp on 4K/Retina screens  
✅ **No confusion** - UI always shows true canvas dimensions  
✅ **No manual setup** - Automatic DPI detection and sync  

### How Detection Works

```typescript
// 1. Initial dimensions account for DPI
const dpr = window.devicePixelRatio; // e.g., 2 on Retina
const initialWidth = viewportWidth * 0.9 * dpr; // e.g., 800 * 0.9 * 2 = 1440px

// 2. After canvas is created, we detect and sync
const canvas = container.querySelector('canvas');
const actualWidth = canvas.width;   // e.g., 1600px
const actualHeight = canvas.height; // e.g., 1200px

// 3. UI inputs update to match actual canvas
setCanvasWidth(actualWidth);   // Input now shows: 1600
setCanvasHeight(actualHeight); // Input now shows: 1200

// 4. Export captures actual pixels
canvas.toBlob((blob) => {
  // Exports 1600×1200px - matches what UI shows!
  downloadBlob(blob, `${filename}.png`);
});
```

### Manual Control (Optional)

The automatic detection works great for most cases, but you can still manually control canvas creation:

**For p5.js - Lower resolution:**
```javascript
function setup() {
  pixelDensity(1); // Disable high DPI
  createCanvas(800, 600);
  // UI will detect and show: 800×600
  // Export will be: 800×600
}
```

**For Three.js - Custom DPI:**
```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); // Or any value
renderer.setSize(800, 600);
// UI will detect and update inputs to match
```

### Behavior Summary

| Component | Behavior |
|-----------|----------|
| **Initial inputs** | Calculated with `viewportSize * 0.9 * devicePixelRatio` |
| **Canvas detection** | Automatically reads `canvas.width` and `canvas.height` after creation |
| **Input sync** | UI inputs update to show actual canvas dimensions |
| **Scale indicator** | Shows how display is scaled to fit viewport (accounting for DPI) |
| **Drag resize** | Adjusts canvas dimensions accounting for DPI and scale |
| **Export** | Captures exact dimensions shown in inputs |

### Examples by Display Type

**Standard Display (DPI = 1):**
- Initial: ~800×600
- Canvas created: 800×600
- Inputs show: 800×600
- Export: 800×600 ✅

**Retina Display (DPI = 2):**
- Initial: ~1600×1200
- Canvas created: 1600×1200
- Inputs show: 1600×1200
- Export: 1600×1200 ✅

**4K Display (DPI = 3):**
- Initial: ~2400×1800
- Canvas created: 2400×1800
- Inputs show: 2400×1800
- Export: 2400×1800 ✅

### Best Practices

1. **Trust the inputs** - They always show the true export dimensions
2. **Use default DPI** - Best quality for your display
3. **Reduce for smaller files** - Use `pixelDensity(1)` if needed
4. **Check scale indicator** - Shows if canvas is too large for viewport

---

**Note**: The system automatically handles all DPI complexity. The numbers in the UI inputs are always the exact export dimensions!

