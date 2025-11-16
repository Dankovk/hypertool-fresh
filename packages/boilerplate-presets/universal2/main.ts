import { createSandbox } from "./__hypertool__";

const controlDefinitions: ControlDefinitions = {
  playerXColor: {
    type: "color",
    label: "Player X Color",
    value: "#06b6d4",
  },
  playerOColor: {
    type: "color",
    label: "Player O Color",
    value: "#ec4899",
  },
  background: {
    type: "color",
    label: "Background",
    value: "#0f172a",
  },
  gridColor: {
    type: "color",
    label: "Grid Color",
    value: "#1e293b",
  },
  particleCount: {
    type: "number",
    label: "Particle Trail",
    value: 30,
    min: 0,
    max: 100,
    step: 5,
  },
  rippleIntensity: {
    type: "number",
    label: "Ripple Intensity",
    value: 1,
    min: 0,
    max: 2,
    step: 0.1,
  },
  glowIntensity: {
    type: "number",
    label: "Glow Intensity",
    value: 0.8,
    min: 0,
    max: 1,
    step: 0.1,
  },
  message: {
    type: "text",
    label: "Game Message",
    value: "Tic-Tac-Toe",
  }
};

createSandbox({
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "Tic-Tac-Toe",
    },
  },
  exportWidget: {
    filename: "tic-tac-toe",
    useCanvasCapture: true,
    enabled: true,
  },
  setup: (context: SandboxContext) => initialiseTicTacToe(context),
}).catch((error) => {
  console.error("[tic-tac-toe] Failed to initialise sandbox", error);
});

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

function initialiseTicTacToe(context: SandboxContext) {
  const { mount, params, exports, environment } = context;

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.cursor = "pointer";
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to obtain 2D rendering context");
  }

  exports.setFilename("tic-tac-toe");
  exports.useDefaultCanvasCapture(true);

  // Game state
  const board: (null | "X" | "O")[] = Array(9).fill(null);
  let currentPlayer: "X" | "O" = "X";
  let winner: null | "X" | "O" | "draw" = null;
  let winningLine: number[] | null = null;
  let hoveredCell: number | null = null;
  let mouseX = 0;
  let mouseY = 0;
  const particles: Particle[] = [];
  const ripples: Ripple[] = [];
  let animationProgress = 0;

  // Helper functions
  const checkWinner = (): null | "X" | "O" | "draw" => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6], // diagonals
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        winningLine = line;
        return board[a];
      }
    }

    if (board.every((cell) => cell !== null)) {
      return "draw";
    }

    return null;
  };

  const resetGame = () => {
    board.fill(null);
    currentPlayer = "X";
    winner = null;
    winningLine = null;
    animationProgress = 0;
  };

  const getCellFromPosition = (x: number, y: number): number | null => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const size = Math.min(width, height) * 0.7;
    const cellSize = size / 3;
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;

    if (x < offsetX || x > offsetX + size || y < offsetY || y > offsetY + size) {
      return null;
    }

    const col = Math.floor((x - offsetX) / cellSize);
    const row = Math.floor((y - offsetY) / cellSize);
    return row * 3 + col;
  };

  const addParticles = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 60 + 30,
        size: Math.random() * 3 + 1,
        hue: Math.random() * 60 + (currentPlayer === "X" ? 180 : 320),
      });
    }
  };

  const addRipple = (x: number, y: number, color: string) => {
    ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 150,
      alpha: 1,
      color,
    });
  };

  // Event listeners
  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hoveredCell = getCellFromPosition(mouseX, mouseY);

    // Add trailing particles
    const maxParticles = Math.floor(params.particleCount ?? 30);
    if (particles.length < maxParticles && Math.random() < 0.3) {
      particles.push({
        x: mouseX,
        y: mouseY,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        maxLife: 60,
        size: Math.random() * 2 + 1,
        hue: Math.random() * 360,
      });
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (winner) {
      resetGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellFromPosition(x, y);

    if (cell !== null && board[cell] === null) {
      board[cell] = currentPlayer;
      const color = currentPlayer === "X" ? (params.playerXColor ?? "#06b6d4") : (params.playerOColor ?? "#ec4899");
      addRipple(x, y, color);
      addParticles(x, y, 20);
      
      winner = checkWinner();
      if (!winner) {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
      }
    }
  };

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleClick);

  const resize = () => {
    const { clientWidth, clientHeight } = mount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  };

  resize();
  environment.onResize(resize);

  let animationFrame = 0;

  const render = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Background
    ctx.fillStyle = params.background ?? "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Update and draw ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      ripple.radius += 5 * (params.rippleIntensity ?? 1);
      ripple.alpha -= 0.02;

      if (ripple.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ripple.alpha;
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vy += 0.05; // gravity

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Calculate board dimensions
    const size = Math.min(width, height) * 0.7;
    const cellSize = size / 3;
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;

    // Draw grid
    ctx.strokeStyle = params.gridColor ?? "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    for (let i = 1; i < 3; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + size);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + size, offsetY + i * cellSize);
      ctx.stroke();
    }

    // Draw hover effect
    if (hoveredCell !== null && board[hoveredCell] === null && !winner) {
      const col = hoveredCell % 3;
      const row = Math.floor(hoveredCell / 3);
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      const glowIntensity = params.glowIntensity ?? 0.8;
      const gradient = ctx.createRadialGradient(
        x + cellSize / 2,
        y + cellSize / 2,
        0,
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize / 2
      );
      const hoverColor = currentPlayer === "X" ? (params.playerXColor ?? "#06b6d4") : (params.playerOColor ?? "#ec4899");
      gradient.addColorStop(0, withAlpha(hoverColor, 0.2 * glowIntensity));
      gradient.addColorStop(1, withAlpha(hoverColor, 0));

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    // Draw X's and O's
    for (let i = 0; i < 9; i++) {
      if (board[i]) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = offsetX + col * cellSize + cellSize / 2;
        const y = offsetY + row * cellSize + cellSize / 2;
        const symbolSize = cellSize * 0.3;

        if (board[i] === "X") {
          ctx.strokeStyle = params.playerXColor ?? "#06b6d4";
          ctx.lineWidth = 8;
          ctx.lineCap = "round";

          // X shape
          ctx.beginPath();
          ctx.moveTo(x - symbolSize, y - symbolSize);
          ctx.lineTo(x + symbolSize, y + symbolSize);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x + symbolSize, y - symbolSize);
          ctx.lineTo(x - symbolSize, y + symbolSize);
          ctx.stroke();

          // Glow effect
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = params.playerXColor ?? "#06b6d4";
          ctx.strokeStyle = params.playerXColor ?? "#06b6d4";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x - symbolSize, y - symbolSize);
          ctx.lineTo(x + symbolSize, y + symbolSize);
          ctx.moveTo(x + symbolSize, y - symbolSize);
          ctx.lineTo(x - symbolSize, y + symbolSize);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = params.playerOColor ?? "#ec4899";
          ctx.lineWidth = 8;

          ctx.beginPath();
          ctx.arc(x, y, symbolSize, 0, Math.PI * 2);
          ctx.stroke();

          // Glow effect
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = params.playerOColor ?? "#ec4899";
          ctx.strokeStyle = params.playerOColor ?? "#ec4899";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, symbolSize, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw winning line
    if (winner && winner !== "draw" && winningLine) {
      animationProgress = Math.min(animationProgress + 0.05, 1);
      const [a, b, c] = winningLine;

      const getCenter = (index: number) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        return {
          x: offsetX + col * cellSize + cellSize / 2,
          y: offsetY + row * cellSize + cellSize / 2,
        };
      };

      const start = getCenter(a);
      const end = getCenter(c);

      const currentX = start.x + (end.x - start.x) * animationProgress;
      const currentY = start.y + (end.y - start.y) * animationProgress;

      ctx.save();
      ctx.strokeStyle = winner === "X" ? (params.playerXColor ?? "#06b6d4") : (params.playerOColor ?? "#ec4899");
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.shadowBlur = 30;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw status text
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Draw game message (title)
    const gameMessage = params.message ?? "Tic-Tac-Toe";
    ctx.fillStyle = "#cbd5e1";
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(gameMessage, width / 2, offsetY - 100);
    ctx.restore();

    // Draw game status messages
    ctx.font = "bold 32px sans-serif";
    if (winner) {
      const text = winner === "draw" ? "It's a Draw!" : `${winner} Wins!`;
      ctx.fillStyle = winner === "draw" ? "#94a3b8" : (winner === "X" ? (params.playerXColor ?? "#06b6d4") : (params.playerOColor ?? "#ec4899"));
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(text, width / 2, offsetY - 60);
      ctx.restore();

      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Click to play again", width / 2, offsetY - 25);
    } else {
      ctx.fillStyle = currentPlayer === "X" ? (params.playerXColor ?? "#06b6d4") : (params.playerOColor ?? "#ec4899");
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(`${currentPlayer}'s Turn`, width / 2, offsetY - 60);
      ctx.restore();
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("click", handleClick);
  };
}

function withAlpha(color: string, alpha: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return color;
  }
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;

  if (computed.startsWith("#")) {
    const bigint = parseInt(computed.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }

  return computed.replace(/rgba?\(([^)]+)\)/, (_match, parts) => {
    const [r, g, b] = parts.split(",").map((value: string) => Number(value.trim()));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  });
}
