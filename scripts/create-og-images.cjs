#!/usr/bin/env node
/**
 * create-og-images.cjs
 * Generates cinematic OG images for The Skeleton Crew experience.
 * Violet/cyan palette with network graph + grid motifs.
 *
 * Outputs:
 *   public/og-image.png      (1200x630)
 *   public/social-preview.png (1080x1080)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateImage(width, height, outputPath) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(0x5C2026);

  // Background
  ctx.fillStyle = '#0d0a1a';
  ctx.fillRect(0, 0, width, height);

  // Radial glow - violet center
  const grd1 = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.55);
  grd1.addColorStop(0, 'rgba(45, 27, 105, 0.25)');
  grd1.addColorStop(0.5, 'rgba(45, 27, 105, 0.08)');
  grd1.addColorStop(1, 'transparent');
  ctx.fillStyle = grd1;
  ctx.fillRect(0, 0, width, height);

  // Cyan accent glow - upper right
  const grd2 = ctx.createRadialGradient(width * 0.7, height * 0.3, 0, width * 0.7, height * 0.3, width * 0.35);
  grd2.addColorStop(0, 'rgba(0, 229, 255, 0.12)');
  grd2.addColorStop(0.6, 'rgba(0, 229, 255, 0.03)');
  grd2.addColorStop(1, 'transparent');
  ctx.fillStyle = grd2;
  ctx.fillRect(0, 0, width, height);

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(45, 27, 105, 0.15)';
  ctx.lineWidth = 0.5;
  const gridSpacing = Math.min(width, height) / 20;
  for (let x = 0; x < width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Network nodes
  const nodeCount = 40;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: rand() * width,
      y: rand() * height,
      r: 1.5 + rand() * 3,
      bright: rand() > 0.7
    });
  }

  // Central orchestrator node
  nodes.push({ x: width * 0.5, y: height * 0.48, r: 6, bright: true, central: true });

  // Connection edges
  ctx.lineWidth = 0.8;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = width * 0.18;
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.2;
        const isCyan = nodes[i].bright || nodes[j].bright;
        ctx.strokeStyle = isCyan
          ? `rgba(0, 229, 255, ${alpha})`
          : `rgba(45, 27, 105, ${alpha * 1.5})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  for (const node of nodes) {
    if (node.central) {
      // Central node glow
      const ng = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 25);
      ng.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
      ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng;
      ctx.fillRect(node.x - 25, node.y - 25, 50, 50);
    }
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = node.bright ? 'rgba(0, 229, 255, 0.8)' : 'rgba(45, 27, 105, 0.6)';
    ctx.fill();
  }

  // Sonar rings (verification motif)
  for (let r = 1; r <= 3; r++) {
    const radius = width * 0.08 * r;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.48, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 / r})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Title text
  const titleSize = Math.round(width * 0.05);
  ctx.font = `500 ${titleSize}px "SF Mono", "Menlo", "Monaco", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctx.fillText('The Skeleton Crew', width * 0.5 + 2, height * 0.35 + 2);

  // Main title
  ctx.fillStyle = '#F5F0E8';
  ctx.fillText('The Skeleton Crew', width * 0.5, height * 0.35);

  // Subtitle
  const subSize = Math.round(width * 0.018);
  ctx.font = `400 ${subSize}px "SF Pro", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
  ctx.fillText('The operational backbone behind every delivery', width * 0.5, height * 0.35 + titleSize * 1.2);

  // Bottom attribution
  const attrSize = Math.round(width * 0.012);
  ctx.font = `300 ${attrSize}px "SF Mono", "Menlo", monospace`;
  ctx.fillStyle = 'rgba(245, 240, 232, 0.3)';
  ctx.fillText('Project Lavos', width * 0.5, height * 0.92);

  // Vignette
  const vg = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.25, width * 0.5, height * 0.5, width * 0.7);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(13, 10, 26, 0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  // Write file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath} (${width}x${height})`);
}

// Generate both sizes
const publicDir = path.join(__dirname, '..', 'public');
generateImage(1200, 630, path.join(publicDir, 'og-image.png'));
generateImage(1080, 1080, path.join(publicDir, 'social-preview.png'));
console.log('Done.');
