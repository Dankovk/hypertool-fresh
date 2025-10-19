export const controlDefinitions = {
    background: {
        type: 'color',
        label: 'Background',
        value: '#0b0c10',
    },
    strokeColor: {
        type: 'color',
        label: 'Stroke',
        value: '#66fcf1',
    },
    radius: {
        type: 'number',
        label: 'Radius Base',
        min: 10,
        max: 300,
        step: 1,
        value: 120,
    },
    amplitude: {
        type: 'number',
        label: 'Animation Amplitude',
        min: 0,
        max: 50,
        step: 1,
        value: 8,
    },
    animationSpeed: {
        type: 'number',
        label: 'Animation Speed',
        min: 0.001,
        max: 0.5,
        step: 0.001,
        value: 0.05,
    },
    strokeWeight: {
        type: 'number',
        label: 'Stroke Weight',
        min: 0.5,
        max: 10,
        step: 0.5,
        value: 2,
    },
    autoRegenerate: {
        type: 'boolean',
        label: 'Auto Regenerate',
        value: false,
    },
    regenerateSpeed: {
        type: 'number',
        label: 'Regenerate Speed',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        value: 1,
    },
} as const;

let lastRegenerateTime = 0;

export function setup(p5: any) {
    p5.createCanvas(window.innerWidth, window.innerHeight);
    p5Instance = p5;
}

export function draw(p5: any) {
    p5.background(params.background);
    p5.stroke(params.strokeColor);
    p5.strokeWeight(params.strokeWeight);
    p5.noFill();

    const r = params.radius + params.amplitude * p5.sin(p5.frameCount * params.animationSpeed);
    p5.circle(p5.width / 2, p5.height / 2, r * 2);

    if (params.autoRegenerate) {
        const currentTime = p5.millis();
        const regenerateInterval = 1000 / params.regenerateSpeed;

        if (currentTime - lastRegenerateTime > regenerateInterval) {
            lastRegenerateTime = currentTime;
            p5.redraw();
        }
    }
}

export function mousePressed(p5: any) {
    p5.redraw();
    console.info(`Mouse pressed. Current radius: ${params.radius.toFixed(2)}`);
}

export function keyPressed(p5: any) {
    if (p5.key === 'r' || p5.key === 'R') {
        const newRadius = Math.random() * 200 + 50;
        controls.set('radius', newRadius);
    }
}
