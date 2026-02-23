import { useEffect, useRef } from "react";
import p5 from "p5";

interface P5OverlayProps {
  progress: number;
  isMobile?: boolean;
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

export default function P5Overlay({ progress, isMobile = false }: P5OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const progressRef = useRef(0);
  const isMobileRef = useRef(isMobile);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

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
        const mobile = isMobileRef.current;

        if (prog >= 0.02 && prog <= 0.20) {
          const sceneP = clamp01((prog - 0.03) / 0.15);
          if (mobile) {
            drawMobileInventoryGrid(p, sceneP);
          } else {
            drawInventoryGrid(p, sceneP);
          }
        }

        if (prog >= 0.18 && prog <= 0.40) {
          const sceneP = clamp01((prog - 0.19) / 0.18);
          if (mobile) {
            drawMobileDecisionTree(p, sceneP);
          } else {
            drawDecisionTree(p, sceneP);
          }
        }

        if (!mobile && prog >= 0.35 && prog <= 0.54) {
          const sceneP = clamp01((prog - 0.37) / 0.15);
          if (!streams) initStreams(p);
          drawAssemblyStreams(p, sceneP, streams!);
        }

        if (prog >= 0.52 && prog <= 0.71) {
          const sceneP = clamp01((prog - 0.54) / 0.15);
          if (mobile) {
            drawMobileVerificationGrid(p, sceneP);
          } else {
            drawVerificationGrid(p, sceneP);
          }
        }

        if (prog >= 0.69 && prog <= 0.88) {
          const sceneP = clamp01((prog - 0.71) / 0.15);
          if (mobile) {
            drawMobileAccumulationCounter(p, sceneP);
          } else {
            drawAccumulationCounter(p, sceneP);
          }
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
      // 5-level binary tree with progressive reveal, electricity pulses, leaf labels
      function drawDecisionTree(p: p5, sceneP: number) {
        const rootX = p.width / 2;
        const rootY = p.height * 0.05;
        const hSpread = p.width * 0.44;
        const levels = 5;
        const vSpacing = (p.height * 0.82) / (levels - 1);

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

        // Labels for the 16 leaf nodes (level 4), paired left(human)/right(delegated)
        const leafLabelsLeft = ["DESIGN", "NARRATIVE", "TRUST", "STRATEGY", "VOICE", "TASTE", "JUDGMENT", "ETHICS"];
        const leafLabelsRight = ["LAYOUT", "FORMATTING", "DEPLOY", "PIPELINE", "GENERATE", "COMPILE", "VALIDATE", "SCALE"];

        // Colors
        const cyanR = 0, cyanG = 229, cyanB = 255;
        const violetR = 130, violetG = 100, violetB = 220;

        // Draw branches and nodes with progressive reveal
        for (const node of nodes) {
          // Slower reveal: each level takes 0.15 of sceneP, spaced 0.17 apart
          const levelThreshold = node.level * 0.17;
          const levelProgress = clamp01((sceneP - levelThreshold) / 0.18);
          if (levelProgress <= 0) continue;

          const isLeftBranch = node.isLeft;
          const bR = isLeftBranch ? cyanR : violetR;
          const bG = isLeftBranch ? cyanG : violetG;
          const bB = isLeftBranch ? cyanB : violetB;
          const branchAlpha = levelProgress * 220;

          // Draw branch line from parent
          if (node.level > 0) {
            const drawLen = smoothstep(levelProgress);
            const dx = node.x - node.parentX;
            const dy = node.y - node.parentY;
            const endX = node.parentX + dx * drawLen;
            const endY = node.parentY + dy * drawLen;

            // Glow layer
            p.strokeWeight(6);
            p.stroke(bR, bG, bB, branchAlpha * 0.08);
            p.line(node.parentX, node.parentY, endX, endY);

            // Main line
            p.strokeWeight(2);
            p.stroke(bR, bG, bB, branchAlpha);
            p.line(node.parentX, node.parentY, endX, endY);

            // Electricity pulse traveling down the branch
            if (levelProgress > 0.3) {
              const pulseT = ((p.frameCount * 0.025 + node.index * 0.7 + node.level * 1.3) % 1);
              const px = node.parentX + dx * pulseT * drawLen;
              const py = node.parentY + dy * pulseT * drawLen;
              p.noStroke();
              p.fill(255, 255, 255, branchAlpha * 0.4);
              p.circle(px, py, 3);
              p.fill(bR, bG, bB, branchAlpha * 0.15);
              p.circle(px, py, 8);
            }
          }

          // Draw node
          p.noStroke();
          const nodePulse = 1 + Math.sin(p.frameCount * 0.04 + node.index * 2) * 0.12;

          // Outer glow ring
          p.fill(bR, bG, bB, branchAlpha * 0.06);
          p.circle(node.x, node.y, 28 * levelProgress * nodePulse);

          // Inner fill
          p.fill(bR, bG, bB, branchAlpha);
          const baseSize = node.level === 0 ? 18 : node.level === levels - 1 ? 10 : 14 - node.level;
          p.circle(node.x, node.y, baseSize * levelProgress);

          // Bright center dot
          if (levelProgress > 0.5) {
            p.fill(255, 255, 255, branchAlpha * 0.5);
            p.circle(node.x, node.y, 3 * levelProgress);
          }

          // Leaf labels (bottom level)
          if (node.level === levels - 1 && levelProgress > 0.6) {
            const labelAlpha = (levelProgress - 0.6) * 2.5 * 180;
            p.textSize(9);
            p.textAlign(p.CENTER, p.TOP);
            p.fill(bR, bG, bB, labelAlpha);
            const leafIdx = Math.floor(node.index / 2);
            const label = isLeftBranch ? leafLabelsLeft[leafIdx] : leafLabelsRight[leafIdx];
            p.text(label, node.x, node.y + 10);

            // Category indicator
            p.textSize(7);
            p.fill(184, 176, 200, labelAlpha * 0.5);
            p.text(isLeftBranch ? "HUMAN" : "DELEGATED", node.x, node.y + 22);
          }
        }

        // Horizontal connecting lines between sibling leaf pairs
        if (sceneP > 0.85) {
          const connectAlpha = smoothstep((sceneP - 0.85) / 0.15) * 80;
          const leafNodes = nodes.filter(n => n.level === levels - 1);
          p.stroke(184, 176, 200, connectAlpha);
          p.strokeWeight(0.5);
          for (let i = 0; i < leafNodes.length; i += 2) {
            if (i + 1 < leafNodes.length) {
              // Dotted line between pairs
              const lx = leafNodes[i].x;
              const rx = leafNodes[i + 1].x;
              const ly = leafNodes[i].y;
              const segments = 12;
              for (let s = 0; s < segments; s += 2) {
                const t1 = s / segments;
                const t2 = (s + 1) / segments;
                p.line(lx + (rx - lx) * t1, ly, lx + (rx - lx) * t2, ly);
              }
            }
          }
        }

        // Root label
        if (sceneP > 0.03) {
          const rootAlpha = Math.min(200, sceneP * 300);
          p.textSize(10);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.fill(0, 229, 255, rootAlpha);
          p.noStroke();
          p.text("ORCHESTRATOR", rootX, rootY - 14);

          // Blinking cursor
          if (Math.sin(p.frameCount * 0.08) > 0) {
            p.fill(0, 229, 255, rootAlpha * 0.8);
            p.rect(rootX + 48, rootY - 24, 2, 12);
          }
        }

        // Level labels on the left edge
        if (sceneP > 0.5) {
          const labelAlpha = smoothstep((sceneP - 0.5) / 0.3) * 100;
          const levelNames = ["DECISION", "DOMAIN", "CATEGORY", "TASK", "EXECUTION"];
          p.textSize(8);
          p.textAlign(p.LEFT, p.CENTER);
          p.fill(184, 176, 200, labelAlpha);
          p.noStroke();
          for (let l = 0; l < levels; l++) {
            p.text(levelNames[l], 12, rootY + l * vSpacing);
          }
        }

        // Legend at bottom
        if (sceneP > 0.35) {
          const legendAlpha = smoothstep((sceneP - 0.35) / 0.25) * 150;
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          const legendY = p.height * 0.96;
          p.noStroke();
          p.fill(0, 229, 255, legendAlpha);
          p.circle(p.width * 0.35, legendY, 7);
          p.fill(184, 176, 200, legendAlpha);
          p.text("stays human", p.width * 0.35 + 55, legendY);
          p.fill(130, 100, 220, legendAlpha);
          p.circle(p.width * 0.58, legendY, 7);
          p.fill(184, 176, 200, legendAlpha);
          p.text("gets delegated", p.width * 0.58 + 60, legendY);

          // Stats counter
          const revealed = nodes.filter(n => {
            const lt = n.level * 0.17;
            return clamp01((sceneP - lt) / 0.18) > 0.5;
          }).length;
          p.textSize(9);
          p.fill(0, 229, 255, legendAlpha * 0.7);
          p.text(`${revealed}/${nodes.length} decisions mapped`, p.width * 0.5, legendY - 16);
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

      // ─── MOBILE VARIANTS ─────────────────────────────────────
      // Simplified versions with reduced grid sizes and lower draw cost

      function drawMobileInventoryGrid(p: p5, sceneP: number) {
        const cols = 10;
        const rows = 6;
        const cellSize = Math.min((p.width - 40) / (cols + 1), (p.height * 0.45) / (rows + 1));
        const gap = cellSize * 0.2;
        const totalCell = cellSize + gap;
        const gridW = cols * totalCell;
        const gridH = rows * totalCell;
        const originX = (p.width - gridW) / 2;
        const originY = p.height * 0.15;
        const scanX = originX + sceneP * (gridW + totalCell * 2);
        const scanBand = totalCell * 2;

        // Scanner glow
        p.noStroke();
        for (let i = 0; i < 15; i++) {
          const a = (1 - i / 15) * 50 * Math.min(1, sceneP * 5);
          p.fill(0, 229, 255, a);
          p.rect(scanX - i * 3, originY - gap, 3, gridH + gap * 2);
        }

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = originX + col * totalCell;
            const y = originY + row * totalCell;
            const cx = x + cellSize / 2;
            if (cx < scanX - scanBand) {
              const isCyan = (col + row) % 3 !== 0;
              p.fill(isCyan ? [0, 229, 255, 160] : [106, 93, 186, 140]);
              p.noStroke();
              p.rect(x, y, cellSize, cellSize, 2);
            } else if (cx < scanX && cx >= scanX - scanBand) {
              const blinkAlpha = 50 + Math.sin(p.frameCount * 0.2 + col) * 30;
              p.noStroke();
              p.fill(0, 229, 255, blinkAlpha);
              p.rect(x, y, cellSize, cellSize, 2);
            } else {
              p.noFill();
              p.stroke(45, 27, 105, 25);
              p.strokeWeight(0.5);
              p.rect(x, y, cellSize, cellSize, 2);
            }
          }
        }

        const revealed = Math.floor(sceneP * cols * rows);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(11);
        p.noStroke();
        p.fill(0, 229, 255, 160);
        p.text(`${revealed}/${cols * rows} catalogued`, originX + gridW, originY - 6);
      }

      function drawMobileDecisionTree(p: p5, sceneP: number) {
        const rootX = p.width / 2;
        const rootY = p.height * 0.12;
        const levels = 3;
        const hSpread = p.width * 0.38;
        const vSpacing = p.height * 0.28;

        interface MNode { x: number; y: number; level: number; parentX: number; parentY: number; isLeft: boolean }
        const nodes: MNode[] = [];
        nodes.push({ x: rootX, y: rootY, level: 0, parentX: 0, parentY: 0, isLeft: true });

        for (let level = 1; level < levels; level++) {
          const count = Math.pow(2, level);
          const spread = hSpread / Math.pow(2, level - 1);
          for (let i = 0; i < count; i++) {
            const parentIdx = Math.floor(i / 2);
            const actualParent = nodes.filter(n => n.level === level - 1)[parentIdx];
            const isLeft = i % 2 === 0;
            const offsetX = isLeft ? -spread / 2 : spread / 2;
            nodes.push({
              x: actualParent.x + offsetX,
              y: rootY + level * vSpacing,
              level,
              parentX: actualParent.x,
              parentY: actualParent.y,
              isLeft,
            });
          }
        }

        const cyanR = 0, cyanG = 229, cyanB = 255;
        const violetR = 130, violetG = 100, violetB = 220;

        for (const node of nodes) {
          const lt = node.level * 0.25;
          const lp = clamp01((sceneP - lt) / 0.3);
          if (lp <= 0) continue;

          const bR = node.isLeft ? cyanR : violetR;
          const bG = node.isLeft ? cyanG : violetG;
          const bB = node.isLeft ? cyanB : violetB;
          const alpha = lp * 200;

          if (node.level > 0) {
            const dl = smoothstep(lp);
            const dx = node.x - node.parentX;
            const dy = node.y - node.parentY;
            p.strokeWeight(2);
            p.stroke(bR, bG, bB, alpha);
            p.line(node.parentX, node.parentY, node.parentX + dx * dl, node.parentY + dy * dl);
          }

          p.noStroke();
          p.fill(bR, bG, bB, alpha * 0.08);
          p.circle(node.x, node.y, 24 * lp);
          p.fill(bR, bG, bB, alpha);
          const size = node.level === 0 ? 14 : 10;
          p.circle(node.x, node.y, size * lp);

          // Labels on leaf nodes
          if (node.level === levels - 1 && lp > 0.6) {
            const la = (lp - 0.6) * 2.5 * 160;
            p.textSize(9);
            p.textAlign(p.CENTER, p.TOP);
            p.fill(bR, bG, bB, la);
            p.text(node.isLeft ? "HUMAN" : "DELEGATED", node.x, node.y + 12);
          }
        }

        if (sceneP > 0.03) {
          p.textSize(9);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.fill(0, 229, 255, Math.min(180, sceneP * 300));
          p.noStroke();
          p.text("ORCHESTRATOR", rootX, rootY - 12);
        }
      }

      function drawMobileVerificationGrid(p: p5, sceneP: number) {
        const cols = 10;
        const rows = 6;
        const cellSize = Math.min((p.width - 40) / (cols + 1), (p.height * 0.45) / (rows + 1));
        const gap = cellSize * 0.2;
        const totalCell = cellSize + gap;
        const gridW = cols * totalCell;
        const gridH = rows * totalCell;
        const originX = (p.width - gridW) / 2;
        const originY = (p.height - gridH) / 2 - p.height * 0.05;
        const centerX = originX + gridW / 2;
        const centerY = originY + gridH / 2;
        const maxR = Math.sqrt(gridW * gridW + gridH * gridH) / 2;
        const rippleR = sceneP * maxR * 1.2;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = originX + col * totalCell;
            const y = originY + row * totalCell;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);

            if (dist < rippleR - cellSize * 2) {
              p.noStroke();
              p.fill(0, 229, 255, 180);
              p.rect(x, y, cellSize, cellSize, 1);
              // Checkmark
              p.stroke(13, 10, 26, 200);
              p.strokeWeight(1.5);
              p.noFill();
              p.line(x + cellSize * 0.25, y + cellSize * 0.55, x + cellSize * 0.45, y + cellSize * 0.75);
              p.line(x + cellSize * 0.45, y + cellSize * 0.75, x + cellSize * 0.75, y + cellSize * 0.3);
            } else if (dist < rippleR) {
              p.noStroke();
              p.fill(0, 229, 255, 60 + Math.sin(p.frameCount * 0.15 + dist * 0.05) * 40);
              p.rect(x, y, cellSize, cellSize, 1);
            } else {
              p.noFill();
              p.stroke(45, 27, 105, 25);
              p.strokeWeight(0.5);
              p.rect(x, y, cellSize, cellSize, 1);
            }
          }
        }

        const verified = Math.floor(sceneP * cols * rows);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(11);
        p.noStroke();
        p.fill(0, 229, 255, 160);
        p.text(`${verified}/${cols * rows} verified`, originX + gridW, originY - 6);
      }

      function drawMobileAccumulationCounter(p: p5, sceneP: number) {
        const eased = smoothstep(sceneP);
        const targets = [69, 45, 2, 1];
        const labels = ["SITES", "REPOS", "CLIENTS", "LLC"];
        const cx = p.width / 2;
        const cy = p.height / 2;
        const spacing = Math.min(p.width * 0.28, 100);

        const positions = [
          { x: cx - spacing, y: cy - spacing * 0.7 },
          { x: cx + spacing, y: cy - spacing * 0.7 },
          { x: cx - spacing, y: cy + spacing * 0.7 },
          { x: cx + spacing, y: cy + spacing * 0.7 },
        ];

        for (let i = 0; i < 4; i++) {
          const val = Math.floor(eased * targets[i]);
          const { x, y } = positions[i];

          p.noStroke();
          p.fill(0, 229, 255, 20 * eased);
          p.circle(x, y, 70);

          p.textFont("monospace");
          p.textSize(48);
          p.textAlign(p.CENTER, p.CENTER);
          p.fill(0, 229, 255, 30);
          p.text(String(val), x + 1, y + 1);
          p.fill(245, 240, 232, 220);
          p.text(String(val), x, y);

          p.textSize(10);
          p.fill(0, 229, 255, 140);
          p.text(labels[i], x, y + 32);
        }
      }
    };

    p5Ref.current = new p5(sketch, containerRef.current);

    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [isMobile]);

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
