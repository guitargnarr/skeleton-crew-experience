import { useEffect, useRef } from "react";
import p5 from "p5";

interface P5OverlayProps {
  progress: number;
}

// Assembly stream rectangle positions, persistent across draws
interface StreamRect {
  y: number;
}

const STREAM_COUNTS = [18, 22, 15, 20];
const STREAM_SPEEDS = [1.5, 2.0, 1.2, 1.7];
const STREAM_COLORS: [number, number, number][] = [
  [0, 229, 255],     // cyan
  [245, 240, 232],   // cream
  [106, 93, 186],    // violet-blue
  [176, 240, 255],   // white-cyan
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export default function P5Overlay({ progress }: P5OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Assembly stream state lives here so it persists across draws
    let streams: StreamRect[][] | null = null;

    // Track which verification cells have been verified for flash effect
    let verifiedCells: boolean[][] | null = null;
    let flashCells: { col: number; row: number; frame: number }[] = [];

    function initStreams(p: p5) {
      streams = [];
      for (let col = 0; col < 4; col++) {
        const rects: StreamRect[] = [];
        for (let i = 0; i < STREAM_COUNTS[col]; i++) {
          rects.push({ y: p.random(-p.height, p.height) });
        }
        streams.push(rects);
      }
    }

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.textFont("monospace");
        initStreams(p);
        verifiedCells = null;
      };

      p.draw = () => {
        p.clear();
        const prog = progressRef.current;

        // Inventory grid: 0.03 - 0.18
        if (prog >= 0.02 && prog <= 0.20) {
          const sceneP = clamp01((prog - 0.03) / 0.15);
          drawInventoryGrid(p, sceneP);
        }

        // Decision tree: 0.20 - 0.35
        if (prog >= 0.18 && prog <= 0.37) {
          const sceneP = clamp01((prog - 0.20) / 0.15);
          drawDecisionTree(p, sceneP);
        }

        // Assembly streams: 0.37 - 0.52
        if (prog >= 0.35 && prog <= 0.54) {
          const sceneP = clamp01((prog - 0.37) / 0.15);
          if (!streams) initStreams(p);
          drawAssemblyStreams(p, sceneP, streams!);
        }

        // Verification grid: 0.54 - 0.69
        if (prog >= 0.52 && prog <= 0.71) {
          const sceneP = clamp01((prog - 0.54) / 0.15);
          drawVerificationGrid(p, sceneP);
        }

        // Accumulation counter: 0.71 - 0.86
        if (prog >= 0.69 && prog <= 0.88) {
          const sceneP = clamp01((prog - 0.71) / 0.15);
          drawAccumulationCounter(p, sceneP);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        initStreams(p);
        verifiedCells = null;
      };

      // ─── Scene 1: Inventory Grid ───────────────────────────────
      function drawInventoryGrid(p: p5, sceneP: number) {
        const cols = 10;
        const rows = 6;
        const cellSize = Math.min(p.width, p.height) * 0.05;
        const gridW = cols * cellSize;
        const gridH = rows * cellSize;
        const originX = (p.width - gridW) / 2 + cellSize / 2;
        const originY = (p.height - gridH) / 2 + cellSize / 2;
        const totalDots = cols * rows;
        const visibleCount = Math.floor(sceneP * totalDots);

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            const x = originX + col * cellSize;
            const y = originY + row * cellSize;
            const active = idx < visibleCount;

            // Connecting lines to adjacent active dots
            if (active) {
              p.strokeWeight(0.5);
              p.stroke(45, 27, 105, 25);
              // Right neighbor
              if (col < cols - 1 && idx + 1 < visibleCount) {
                p.line(x, y, x + cellSize, y);
              }
              // Bottom neighbor
              if (row < rows - 1 && idx + cols < visibleCount) {
                p.line(x, y, x, y + cellSize);
              }
            }

            p.noStroke();
            if (active) {
              // Glow behind active dot
              p.fill(0, 229, 255, 30);
              p.circle(x, y, 14);
              // Active dot
              p.fill(0, 229, 255, 200);
              const isNewest = idx === visibleCount - 1;
              const radius = isNewest
                ? 4 + Math.sin(p.frameCount * 0.1) * 1.5
                : 4;
              p.circle(x, y, radius * 2);
            } else {
              // Unrevealed dot
              p.fill(45, 27, 105, 40);
              p.circle(x, y, 6);
            }
          }
        }
      }

      // ─── Scene 2: Decision Tree ────────────────────────────────
      function drawDecisionTree(p: p5, sceneP: number) {
        const rootX = p.width / 2;
        const rootY = p.height * 0.15;
        const hSpread = p.width * 0.35;
        const vSpacing = p.height * 0.18;
        const levelThresholds = [0.1, 0.3, 0.5, 0.7];
        const leafLabelsLeft = ["DESIGN", "TRUST", "VOICE", "JUDGE"];
        const leafLabelsRight = ["DEPLOY", "GENERATE", "VALIDATE", "SCALE"];
        const cursorBlink = Math.sin(p.frameCount * 0.08) > 0;

        // Build nodes level by level
        interface TreeNode {
          x: number;
          y: number;
          level: number;
          index: number;
          parentX: number;
          parentY: number;
          isLeft: boolean;
        }

        const nodes: TreeNode[] = [];
        // Root
        nodes.push({ x: rootX, y: rootY, level: 0, index: 0, parentX: 0, parentY: 0, isLeft: true });

        for (let level = 1; level <= 3; level++) {
          const count = Math.pow(2, level);
          const spread = hSpread / Math.pow(2, level - 1);

          for (let i = 0; i < count; i++) {
            const parentIdx = Math.floor(i / 2);
            const parent = nodes.find(n => n.level === level - 1 && n.index === parentIdx)!;
            const isLeft = i % 2 === 0;
            const offsetX = isLeft ? -spread / 2 : spread / 2;
            nodes.push({
              x: parent.x + offsetX,
              y: rootY + level * vSpacing,
              level,
              index: i,
              parentX: parent.x,
              parentY: parent.y,
              isLeft,
            });
          }
        }

        // Determine the current decision point for cursor
        let cursorNode: TreeNode | null = null;

        for (const node of nodes) {
          const visible = sceneP >= levelThresholds[node.level];
          if (!visible) continue;

          const isLeftBranch = node.index % 2 === 0;
          const cyanColor: [number, number, number, number] = [0, 229, 255, 220];
          const violetColor: [number, number, number, number] = [45, 27, 105, 100];
          const branchColor = isLeftBranch ? cyanColor : violetColor;

          // Draw branch line from parent
          if (node.level > 0) {
            p.strokeWeight(1);
            p.stroke(...branchColor);
            p.line(node.parentX, node.parentY, node.x, node.y);
          }

          // Draw node circle
          p.noStroke();
          p.fill(...branchColor);
          p.circle(node.x, node.y, node.level === 3 ? 12 : 14);

          // Leaf labels
          if (node.level === 3) {
            p.textSize(9);
            p.textAlign(p.CENTER, p.TOP);
            p.fill(branchColor[0], branchColor[1], branchColor[2], branchColor[3]);
            const leafIdx = Math.floor(node.index / 2);
            const label = isLeftBranch ? leafLabelsLeft[leafIdx] : leafLabelsRight[leafIdx];
            p.text(label, node.x, node.y + 12);
          }

          cursorNode = node;
        }

        // Blinking cursor at current decision point
        if (cursorNode && cursorBlink) {
          p.fill(0, 229, 255, 180);
          p.noStroke();
          p.rect(cursorNode.x + 10, cursorNode.y - 5, 6, 12);
        }
      }

      // ─── Scene 3: Assembly Streams ─────────────────────────────
      function drawAssemblyStreams(p: p5, sceneP: number, strms: StreamRect[][]) {
        const colPositions = [0.25, 0.4, 0.6, 0.75];
        const alphaBase = sceneP * 200;

        for (let col = 0; col < 4; col++) {
          const cx = p.width * colPositions[col];
          const [cr, cg, cb] = STREAM_COLORS[col];
          const speed = STREAM_SPEEDS[col];

          for (const rect of strms[col]) {
            rect.y += speed;
            if (rect.y > p.height + 10) {
              rect.y = -10;
            }
            p.noStroke();
            p.fill(cr, cg, cb, alphaBase);
            p.rect(cx - 4, rect.y, 8, 3);
          }
        }

        // Convergence bar at bottom
        const barY = p.height * 0.85;
        const barW = p.width * 0.5 * sceneP;
        const barX = (p.width - barW) / 2;

        // Glow
        p.noStroke();
        p.fill(245, 240, 232, 30);
        p.rect(barX - 4, barY - 4, barW + 8, 12, 2);

        // Bar
        p.fill(245, 240, 232, 180);
        p.rect(barX, barY, barW, 4, 1);
      }

      // ─── Scene 4: Verification Grid ───────────────────────────
      function drawVerificationGrid(p: p5, sceneP: number) {
        const cols = 16;
        const rows = 10;
        const cellSize = Math.min(p.width, p.height) * 0.04;
        const gap = cellSize * 0.3;
        const totalCellSize = cellSize + gap;
        const gridW = cols * totalCellSize;
        const gridH = rows * totalCellSize;
        const originX = (p.width - gridW) / 2;
        const originY = (p.height - gridH) / 2;
        const centerX = originX + gridW / 2;
        const centerY = originY + gridH / 2;
        const maxRadius = Math.sqrt(gridW * gridW + gridH * gridH) / 2;
        const rippleRadius = sceneP * maxRadius;

        // Initialize verified tracking
        if (!verifiedCells || verifiedCells.length !== cols) {
          verifiedCells = [];
          for (let c = 0; c < cols; c++) {
            verifiedCells.push(new Array(rows).fill(false));
          }
          flashCells = [];
        }

        // Clean up old flash effects
        flashCells = flashCells.filter(f => p.frameCount - f.frame < 12);

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = originX + col * totalCellSize;
            const y = originY + row * totalCellSize;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);
            const scanBand = cellSize * 2;

            if (dist < rippleRadius - scanBand) {
              // Verified
              if (!verifiedCells![col][row]) {
                verifiedCells![col][row] = true;
                flashCells.push({ col, row, frame: p.frameCount });
              }
              p.noStroke();
              p.fill(0, 229, 255, 200);
              p.rect(x, y, cellSize, cellSize, 1);

              // Tiny checkmark
              p.stroke(13, 10, 26, 220);
              p.strokeWeight(1.5);
              p.noFill();
              const mx = x + cellSize * 0.25;
              const my = y + cellSize * 0.55;
              p.line(mx, my, x + cellSize * 0.45, y + cellSize * 0.75);
              p.line(x + cellSize * 0.45, y + cellSize * 0.75, x + cellSize * 0.75, y + cellSize * 0.3);
            } else if (dist < rippleRadius && dist >= rippleRadius - scanBand) {
              // Scanning zone - blinking
              const blinkAlpha = 80 + Math.sin(p.frameCount * 0.15 + dist * 0.05) * 60;
              p.noStroke();
              p.fill(0, 229, 255, blinkAlpha);
              p.rect(x, y, cellSize, cellSize, 1);
            } else {
              // Unverified - outline only
              p.noFill();
              p.stroke(45, 27, 105, 40);
              p.strokeWeight(0.5);
              p.rect(x, y, cellSize, cellSize, 1);
            }
          }
        }

        // Flash effect for newly verified cells
        for (const f of flashCells) {
          const age = p.frameCount - f.frame;
          const flashAlpha = Math.max(0, 1 - age / 12) * 120;
          const x = originX + f.col * totalCellSize;
          const y = originY + f.row * totalCellSize;
          p.noStroke();
          p.fill(0, 255, 136, flashAlpha);
          p.rect(x - 2, y - 2, cellSize + 4, cellSize + 4, 2);
        }
      }

      // ─── Scene 5: Accumulation Counter ────────────────────────
      function drawAccumulationCounter(p: p5, sceneP: number) {
        const eased = smoothstep(sceneP);
        const targets = [69, 45, 2, 1];
        const labels = ["sites", "repos", "clients", "LLC"];
        const cx = p.width / 2;
        const cy = p.height / 2;
        const spacing = Math.min(p.width, p.height) * 0.15;

        // 2x2 grid of numbers
        const positions = [
          { x: cx - spacing, y: cy - spacing * 0.6 },
          { x: cx + spacing, y: cy - spacing * 0.6 },
          { x: cx - spacing, y: cy + spacing * 0.6 },
          { x: cx + spacing, y: cy + spacing * 0.6 },
        ];

        for (let i = 0; i < 4; i++) {
          const val = Math.floor(eased * targets[i]);
          const { x, y } = positions[i];

          // Cyan glow (drawn offset behind)
          p.textSize(48);
          p.textAlign(p.CENTER, p.CENTER);
          p.textFont("monospace");
          p.noStroke();
          p.fill(0, 229, 255, 50);
          p.text(String(val), x + 2, y + 2);

          // Main number in cream
          p.fill(245, 240, 232, 240);
          p.text(String(val), x, y);

          // Label below
          p.textSize(12);
          p.fill(184, 176, 200, 180);
          p.text(labels[i], x, y + 34);
        }

        // Orbiting labeled nodes
        const nodeLabels = ["Sites", "Repos", "Clients", "Entity", "Models", "Skills", "Scripts"];
        const orbitRadius = Math.min(p.width, p.height) * 0.3;

        for (let i = 0; i < nodeLabels.length; i++) {
          const angle = (i / nodeLabels.length) * p.TWO_PI - p.HALF_PI;
          const nx = cx + Math.cos(angle) * orbitRadius;
          const ny = cy + Math.sin(angle) * orbitRadius;

          // Connecting line drawn progressively
          const lineLen = sceneP;
          const lx = cx + (nx - cx) * lineLen;
          const ly = cy + (ny - cy) * lineLen;

          p.stroke(0, 229, 255, 60);
          p.strokeWeight(0.5);
          p.line(cx, cy, lx, ly);

          // Traveling dot along line
          const dotT = ((p.frameCount * 0.01 + i * 0.3) % 1) * sceneP;
          const dx = cx + (nx - cx) * dotT;
          const dy = cy + (ny - cy) * dotT;
          p.noStroke();
          p.fill(0, 229, 255, 140);
          p.circle(dx, dy, 4);

          // Node dot at end (only if line reached it)
          if (sceneP > 0.3) {
            p.fill(0, 229, 255, 200);
            p.circle(nx, ny, 8);

            // Node label
            p.textSize(10);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(184, 176, 200, 160);
            const labelOffset = 14;
            const labelY = ny > cy ? ny + labelOffset : ny - labelOffset;
            p.text(nodeLabels[i], nx, labelY);
          }
        }
      }
    };

    p5Ref.current = new p5(sketch, containerRef.current);

    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
      }}
    />
  );
}
