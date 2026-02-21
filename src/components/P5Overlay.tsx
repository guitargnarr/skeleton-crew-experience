import { useEffect, useRef } from "react";
import p5 from "p5";

interface P5OverlayProps {
  progress: number;
}

interface StreamBlock {
  y: number;
  h: number;
  speed: number;
  alpha: number;
}

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

    // Persistent state across frames
    let streams: StreamBlock[][] | null = null;
    let verifiedCells: boolean[][] | null = null;
    let flashCells: { col: number; row: number; frame: number }[] = [];
    let inventoryRevealed: boolean[][] | null = null;
    let inventoryFlash: { col: number; row: number; frame: number }[] = [];

    function initStreams(p: p5) {
      streams = [];
      const counts = [35, 40, 30, 38];
      for (let col = 0; col < 4; col++) {
        const blocks: StreamBlock[] = [];
        for (let i = 0; i < counts[col]; i++) {
          blocks.push({
            y: p.random(-p.height * 1.5, p.height),
            h: p.random(8, 35),
            speed: p.random(1.5, 4.5),
            alpha: p.random(0.4, 1.0),
          });
        }
        streams.push(blocks);
      }
    }

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.textFont("monospace");
        initStreams(p);
        verifiedCells = null;
        inventoryRevealed = null;
      };

      p.draw = () => {
        p.clear();
        const prog = progressRef.current;

        if (prog >= 0.02 && prog <= 0.20) {
          const sceneP = clamp01((prog - 0.03) / 0.15);
          drawInventoryGrid(p, sceneP);
        }

        if (prog >= 0.18 && prog <= 0.37) {
          const sceneP = clamp01((prog - 0.20) / 0.15);
          drawDecisionTree(p, sceneP);
        }

        if (prog >= 0.35 && prog <= 0.54) {
          const sceneP = clamp01((prog - 0.37) / 0.15);
          if (!streams) initStreams(p);
          drawAssemblyStreams(p, sceneP, streams!);
        }

        if (prog >= 0.52 && prog <= 0.71) {
          const sceneP = clamp01((prog - 0.54) / 0.15);
          drawVerificationGrid(p, sceneP);
        }

        if (prog >= 0.69 && prog <= 0.88) {
          const sceneP = clamp01((prog - 0.71) / 0.15);
          drawAccumulationCounter(p, sceneP);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        initStreams(p);
        verifiedCells = null;
        inventoryRevealed = null;
      };

      // ─── Scene 1: Inventory Grid ───────────────────────────────
      // Large screen-filling grid with scanner reveal from left to right
      function drawInventoryGrid(p: p5, sceneP: number) {
        const cols = 20;
        const rows = 12;
        const cellSize = Math.min(p.width / (cols + 2), p.height / (rows + 4));
        const gap = cellSize * 0.25;
        const totalCell = cellSize + gap;
        const gridW = cols * totalCell;
        const gridH = rows * totalCell;
        const originX = (p.width - gridW) / 2;
        const originY = (p.height - gridH) / 2;

        // Scanner line sweeps left to right
        const scanX = originX + sceneP * (gridW + totalCell * 2);
        const scanBand = totalCell * 3;

        // Init revealed tracking
        if (!inventoryRevealed || inventoryRevealed.length !== cols) {
          inventoryRevealed = [];
          for (let c = 0; c < cols; c++) {
            inventoryRevealed.push(new Array(rows).fill(false));
          }
          inventoryFlash = [];
        }

        inventoryFlash = inventoryFlash.filter(f => p.frameCount - f.frame < 15);

        // Scanner glow line
        p.noStroke();
        for (let i = 0; i < 30; i++) {
          const a = (1 - i / 30) * 40 * Math.min(1, sceneP * 5);
          p.fill(0, 229, 255, a);
          p.rect(scanX - i * 3, originY - gap, 3, gridH + gap * 2);
        }

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = originX + col * totalCell;
            const y = originY + row * totalCell;
            const cellCenterX = x + cellSize / 2;

            if (cellCenterX < scanX - scanBand) {
              // Revealed -- filled square with category color
              if (!inventoryRevealed![col][row]) {
                inventoryRevealed![col][row] = true;
                inventoryFlash.push({ col, row, frame: p.frameCount });
              }

              // Alternate between cyan and violet-cyan for visual texture
              const isCyan = (col + row) % 3 !== 0;
              if (isCyan) {
                p.fill(0, 229, 255, 180);
              } else {
                p.fill(106, 93, 186, 160);
              }
              p.noStroke();
              p.rect(x, y, cellSize, cellSize, 2);

              // Tiny inner detail -- small dot
              p.fill(13, 10, 26, 100);
              p.circle(x + cellSize / 2, y + cellSize / 2, cellSize * 0.25);
            } else if (cellCenterX < scanX && cellCenterX >= scanX - scanBand) {
              // Scanning zone -- blinking
              const dist = scanX - cellCenterX;
              const bandP = dist / scanBand;
              const blinkAlpha = (60 + Math.sin(p.frameCount * 0.2 + col * 0.5) * 40) * bandP;
              p.noStroke();
              p.fill(0, 229, 255, blinkAlpha);
              p.rect(x, y, cellSize, cellSize, 2);
            } else {
              // Unrevealed -- dim outline
              p.noFill();
              p.stroke(45, 27, 105, 30);
              p.strokeWeight(0.5);
              p.rect(x, y, cellSize, cellSize, 2);
            }
          }
        }

        // Flash for newly revealed
        for (const f of inventoryFlash) {
          const age = p.frameCount - f.frame;
          const flashAlpha = Math.max(0, 1 - age / 15) * 100;
          const x = originX + f.col * totalCell;
          const y = originY + f.row * totalCell;
          p.noStroke();
          p.fill(255, 255, 255, flashAlpha);
          p.rect(x - 2, y - 2, cellSize + 4, cellSize + 4, 3);
        }

        // Scanner count text
        const revealed = inventoryRevealed ? inventoryRevealed.flat().filter(Boolean).length : 0;
        const total = cols * rows;
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(14);
        p.noStroke();
        p.fill(0, 229, 255, 180);
        p.text(`${revealed}/${total} catalogued`, originX + gridW, originY - 10);
      }

      // ─── Scene 2: Decision Tree ────────────────────────────────
      // Full-width tree with thick glowing branches and animated path tracing
      function drawDecisionTree(p: p5, sceneP: number) {
        const rootX = p.width / 2;
        const rootY = p.height * 0.08;
        const hSpread = p.width * 0.42;
        const vSpacing = p.height * 0.21;
        const levels = 4;

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
        nodes.push({ x: rootX, y: rootY, level: 0, index: 0, parentX: 0, parentY: 0, isLeft: true });

        for (let level = 1; level < levels; level++) {
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

        const leafLabelsLeft = ["DESIGN", "TRUST", "VOICE", "JUDGE"];
        const leafLabelsRight = ["DEPLOY", "GENERATE", "VALIDATE", "SCALE"];

        // Draw branches and nodes with progressive reveal
        for (const node of nodes) {
          // Each level reveals at a different progress threshold
          const levelThreshold = node.level * 0.22;
          const levelProgress = clamp01((sceneP - levelThreshold) / 0.2);
          if (levelProgress <= 0) continue;

          const isLeftBranch = node.isLeft;

          // Branch colors: left = cyan (human), right = violet (delegated)
          const cyanR = 0, cyanG = 229, cyanB = 255;
          const violetR = 130, violetG = 100, violetB = 220;
          const bR = isLeftBranch ? cyanR : violetR;
          const bG = isLeftBranch ? cyanG : violetG;
          const bB = isLeftBranch ? cyanB : violetB;
          const branchAlpha = levelProgress * 220;

          // Draw branch line from parent with glow
          if (node.level > 0) {
            // Glow layer
            p.strokeWeight(5);
            p.stroke(bR, bG, bB, branchAlpha * 0.1);
            const drawLen = smoothstep(levelProgress);
            const dx = node.x - node.parentX;
            const dy = node.y - node.parentY;
            p.line(node.parentX, node.parentY, node.parentX + dx * drawLen, node.parentY + dy * drawLen);

            // Main line
            p.strokeWeight(2.5);
            p.stroke(bR, bG, bB, branchAlpha);
            p.line(node.parentX, node.parentY, node.parentX + dx * drawLen, node.parentY + dy * drawLen);

            // Animated electricity pulse traveling down the branch
            const pulseT = ((p.frameCount * 0.03 + node.index * 0.7) % 1);
            const px = node.parentX + dx * pulseT * drawLen;
            const py = node.parentY + dy * pulseT * drawLen;
            p.noStroke();
            p.fill(255, 255, 255, branchAlpha * 0.35);
            p.circle(px, py, 4);
            p.fill(bR, bG, bB, branchAlpha * 0.12);
            p.circle(px, py, 10);
          }

          // Draw node
          p.noStroke();
          // Outer glow
          p.fill(bR, bG, bB, branchAlpha * 0.1);
          p.circle(node.x, node.y, 24 * levelProgress);
          // Inner fill
          p.fill(bR, bG, bB, branchAlpha);
          const nodeSize = node.level === 0 ? 20 : node.level === levels - 1 ? 14 : 16;
          p.circle(node.x, node.y, nodeSize * levelProgress);

          // Leaf labels (bottom level)
          if (node.level === levels - 1 && levelProgress > 0.5) {
            const labelAlpha = (levelProgress - 0.5) * 2 * 200;
            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.fill(bR, bG, bB, labelAlpha);
            const leafIdx = Math.floor(node.index / 2);
            const label = isLeftBranch ? leafLabelsLeft[leafIdx] : leafLabelsRight[leafIdx];
            p.text(label, node.x, node.y + 14);

            // Category indicator
            p.textSize(8);
            p.fill(184, 176, 200, labelAlpha * 0.6);
            p.text(isLeftBranch ? "HUMAN" : "DELEGATED", node.x, node.y + 28);
          }
        }

        // Root label
        if (sceneP > 0.05) {
          p.textSize(10);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.fill(0, 229, 255, Math.min(200, sceneP * 400));
          p.text("ORCHESTRATOR", rootX, rootY - 16);

          // Blinking cursor
          if (Math.sin(p.frameCount * 0.08) > 0) {
            p.fill(0, 229, 255, 180);
            p.rect(rootX + 48, rootY - 26, 2, 14);
          }
        }

        // Legend at bottom
        if (sceneP > 0.4) {
          const legendAlpha = smoothstep((sceneP - 0.4) / 0.3) * 160;
          p.textSize(11);
          p.textAlign(p.CENTER, p.CENTER);
          const legendY = p.height * 0.92;
          p.fill(0, 229, 255, legendAlpha);
          p.circle(p.width * 0.38, legendY, 8);
          p.fill(184, 176, 200, legendAlpha);
          p.text("stays human", p.width * 0.38 + 60, legendY);
          p.fill(130, 100, 220, legendAlpha);
          p.circle(p.width * 0.62, legendY, 8);
          p.fill(184, 176, 200, legendAlpha);
          p.text("gets delegated", p.width * 0.62 + 60, legendY);
        }
      }

      // ─── Scene 3: Assembly Streams ─────────────────────────────
      // Dense matrix-rain columns with prominent convergence
      function drawAssemblyStreams(p: p5, sceneP: number, strms: StreamBlock[][]) {
        const colPositions = [0.18, 0.38, 0.58, 0.78];
        const colWidths = [p.width * 0.06, p.width * 0.06, p.width * 0.06, p.width * 0.06];
        const streamColors: [number, number, number][] = [
          [0, 229, 255],
          [245, 240, 232],
          [130, 100, 220],
          [176, 240, 255],
        ];
        const colLabels = ["DESIGN", "CODE", "TEST", "DEPLOY"];

        const fadeIn = smoothstep(Math.min(1, sceneP * 3));
        const convergeP = smoothstep(clamp01((sceneP - 0.3) / 0.7));

        for (let col = 0; col < 4; col++) {
          const baseCx = p.width * colPositions[col];
          // Columns converge toward center as progress increases
          const targetX = p.width / 2;
          const cx = baseCx + (targetX - baseCx) * convergeP * 0.6;
          const colW = colWidths[col] * (1 - convergeP * 0.5);
          const [cr, cg, cb] = streamColors[col];

          // Column glow track
          p.noStroke();
          p.fill(cr, cg, cb, fadeIn * 15);
          p.rect(cx - colW / 2, 0, colW, p.height);

          // Column header label
          if (sceneP > 0.05) {
            p.textSize(12);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(cr, cg, cb, fadeIn * 160 * (1 - convergeP));
            p.text(colLabels[col], baseCx, p.height * 0.05);
          }

          // Stream blocks
          for (const block of strms[col]) {
            block.y += block.speed * fadeIn;
            if (block.y > p.height + 40) {
              block.y = -block.h - Math.random() * 100;
              block.h = 8 + Math.random() * 30;
              block.speed = 1.5 + Math.random() * 3;
            }

            const blockX = cx - colW / 2 + Math.random() * 0.5; // Slight jitter
            const alpha = fadeIn * block.alpha * 200;

            // Glow
            p.fill(cr, cg, cb, alpha * 0.3);
            p.rect(blockX - 1, block.y - 1, colW + 2, block.h + 2, 1);

            // Block
            p.fill(cr, cg, cb, alpha);
            p.rect(blockX, block.y, colW, block.h, 1);
          }
        }

        // Convergence zone at bottom
        const barY = p.height * 0.88;
        const barW = p.width * 0.6 * sceneP;
        const barX = (p.width - barW) / 2;
        const barH = 6;

        // Bar glow
        p.fill(0, 229, 255, fadeIn * 25);
        p.rect(barX - 8, barY - 8, barW + 16, barH + 16, 4);

        // Bar track
        p.fill(45, 27, 105, fadeIn * 40);
        p.rect((p.width - p.width * 0.6) / 2, barY, p.width * 0.6, barH, 3);

        // Bar fill
        p.fill(0, 229, 255, fadeIn * 200);
        p.rect(barX, barY, barW, barH, 3);

        // Percentage text
        p.textSize(14);
        p.textAlign(p.CENTER, p.TOP);
        p.fill(0, 229, 255, fadeIn * 180);
        p.text(`${Math.floor(sceneP * 100)}% converged`, p.width / 2, barY + 14);
      }

      // ─── Scene 4: Verification Grid ───────────────────────────
      // (This is the standout -- keeping as-is with minor enhancements)
      function drawVerificationGrid(p: p5, sceneP: number) {
        const cols = 20;
        const rows = 12;
        const cellSize = Math.min(p.width / (cols + 2), p.height / (rows + 4)) * 0.85;
        const gap = cellSize * 0.25;
        const totalCellSize = cellSize + gap;
        const gridW = cols * totalCellSize;
        const gridH = rows * totalCellSize;
        const originX = (p.width - gridW) / 2;
        const originY = (p.height - gridH) / 2;
        const centerX = originX + gridW / 2;
        const centerY = originY + gridH / 2;
        const maxRadius = Math.sqrt(gridW * gridW + gridH * gridH) / 2;
        const rippleRadius = sceneP * maxRadius * 1.2;

        if (!verifiedCells || verifiedCells.length !== cols) {
          verifiedCells = [];
          for (let c = 0; c < cols; c++) {
            verifiedCells.push(new Array(rows).fill(false));
          }
          flashCells = [];
        }

        flashCells = flashCells.filter(f => p.frameCount - f.frame < 12);

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = originX + col * totalCellSize;
            const y = originY + row * totalCellSize;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);
            const scanBand = cellSize * 2.5;

            if (dist < rippleRadius - scanBand) {
              if (!verifiedCells![col][row]) {
                verifiedCells![col][row] = true;
                flashCells.push({ col, row, frame: p.frameCount });
              }
              p.noStroke();
              p.fill(0, 229, 255, 200);
              p.rect(x, y, cellSize, cellSize, 1);

              // Checkmark
              p.stroke(13, 10, 26, 220);
              p.strokeWeight(1.5);
              p.noFill();
              const mx = x + cellSize * 0.25;
              const my = y + cellSize * 0.55;
              p.line(mx, my, x + cellSize * 0.45, y + cellSize * 0.75);
              p.line(x + cellSize * 0.45, y + cellSize * 0.75, x + cellSize * 0.75, y + cellSize * 0.3);
            } else if (dist < rippleRadius && dist >= rippleRadius - scanBand) {
              const blinkAlpha = 80 + Math.sin(p.frameCount * 0.15 + dist * 0.05) * 60;
              p.noStroke();
              p.fill(0, 229, 255, blinkAlpha);
              p.rect(x, y, cellSize, cellSize, 1);
            } else {
              p.noFill();
              p.stroke(45, 27, 105, 35);
              p.strokeWeight(0.5);
              p.rect(x, y, cellSize, cellSize, 1);
            }
          }
        }

        for (const f of flashCells) {
          const age = p.frameCount - f.frame;
          const flashAlpha = Math.max(0, 1 - age / 12) * 120;
          const x = originX + f.col * totalCellSize;
          const y = originY + f.row * totalCellSize;
          p.noStroke();
          p.fill(0, 255, 136, flashAlpha);
          p.rect(x - 2, y - 2, cellSize + 4, cellSize + 4, 2);
        }

        // Verification count
        const verified = verifiedCells ? verifiedCells.flat().filter(Boolean).length : 0;
        const total = cols * rows;
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(14);
        p.noStroke();
        p.fill(0, 229, 255, 180);
        p.text(`${verified}/${total} verified`, originX + gridW, originY - 10);
      }

      // ─── Scene 5: Accumulation Counter ────────────────────────
      // Much larger numbers, visible orbital network, glowing connections
      function drawAccumulationCounter(p: p5, sceneP: number) {
        const eased = smoothstep(sceneP);
        const targets = [69, 45, 2, 1];
        const labels = ["SITES", "REPOS", "CLIENTS", "LLC"];
        const cx = p.width / 2;
        const cy = p.height / 2;
        const spacing = Math.min(p.width, p.height) * 0.2;

        const positions = [
          { x: cx - spacing, y: cy - spacing * 0.55 },
          { x: cx + spacing, y: cy - spacing * 0.55 },
          { x: cx - spacing, y: cy + spacing * 0.55 },
          { x: cx + spacing, y: cy + spacing * 0.55 },
        ];

        // Orbital network first (behind numbers)
        const nodeLabels = ["Automation", "Templates", "Models", "Skills", "Scripts", "Hooks", "Pipelines", "APIs"];
        const orbitRadius = Math.min(p.width, p.height) * 0.38;

        // Draw connecting web between orbital nodes
        for (let i = 0; i < nodeLabels.length; i++) {
          const angle1 = (i / nodeLabels.length) * p.TWO_PI - p.HALF_PI;
          const nx1 = cx + Math.cos(angle1) * orbitRadius;
          const ny1 = cy + Math.sin(angle1) * orbitRadius;

          // Connection to center
          const lineLen = smoothstep(sceneP);
          const lx = cx + (nx1 - cx) * lineLen;
          const ly = cy + (ny1 - cy) * lineLen;

          // Glow line
          p.strokeWeight(4);
          p.stroke(0, 229, 255, 20 * lineLen);
          p.line(cx, cy, lx, ly);

          // Main line
          p.strokeWeight(1.5);
          p.stroke(0, 229, 255, 80 * lineLen);
          p.line(cx, cy, lx, ly);

          // Cross-connections to adjacent nodes
          if (sceneP > 0.4) {
            const j = (i + 1) % nodeLabels.length;
            const angle2 = (j / nodeLabels.length) * p.TWO_PI - p.HALF_PI;
            const nx2 = cx + Math.cos(angle2) * orbitRadius;
            const ny2 = cy + Math.sin(angle2) * orbitRadius;
            const crossAlpha = smoothstep((sceneP - 0.4) / 0.4) * 50;
            p.strokeWeight(1);
            p.stroke(45, 27, 105, crossAlpha);
            p.line(nx1, ny1, nx2, ny2);
          }

          // Traveling pulse dots
          const pulseCount = 2;
          for (let pd = 0; pd < pulseCount; pd++) {
            const dotT = ((p.frameCount * 0.015 + i * 0.4 + pd * 0.5) % 1) * sceneP;
            const dx = cx + (nx1 - cx) * dotT;
            const dy = cy + (ny1 - cy) * dotT;
            p.noStroke();
            p.fill(0, 229, 255, 100 * lineLen);
            p.circle(dx, dy, 5);
          }

          // Node at end
          if (sceneP > 0.2) {
            const nodeAlpha = smoothstep((sceneP - 0.2) / 0.3);
            // Glow
            p.noStroke();
            p.fill(0, 229, 255, 30 * nodeAlpha);
            p.circle(nx1, ny1, 28);
            // Node
            p.fill(0, 229, 255, 200 * nodeAlpha);
            p.circle(nx1, ny1, 14);
            // Label
            p.textSize(11);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(184, 176, 200, 180 * nodeAlpha);
            const labelOffset = 20;
            const labelY = ny1 > cy ? ny1 + labelOffset : ny1 - labelOffset;
            p.text(nodeLabels[i], nx1, labelY);
          }
        }

        // Numbers (drawn on top)
        for (let i = 0; i < 4; i++) {
          const val = Math.floor(eased * targets[i]);
          const { x, y } = positions[i];

          // Large glow behind number
          p.noStroke();
          p.fill(0, 229, 255, 25 * eased);
          p.circle(x, y, 100);

          // Number -- much larger
          p.textFont("monospace");
          p.textSize(80);
          p.textAlign(p.CENTER, p.CENTER);

          // Cyan shadow
          p.fill(0, 229, 255, 40);
          p.text(String(val), x + 2, y + 2);

          // Main number in cream
          p.fill(245, 240, 232, 240);
          p.text(String(val), x, y);

          // Label below
          p.textSize(13);
          p.fill(0, 229, 255, 160);
          p.text(labels[i], x, y + 48);
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
