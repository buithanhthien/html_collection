// --- CONFIGURATION CONSTANTS ---
const numRows = 15;        // Number of peg rows
const pegSpacing = 30;     // The side length of the equilateral triangle
const dropRate = 4;        // Drop a marble every X frames
// -------------------------------

let pegs = [];
let marbles = [];
let bins = [];
let numBins;
let binWidth;
let binStartX;
let maxBinCount = 0;
let pegSpacingY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Calculate the vertical height for an equilateral triangle
  pegSpacingY = pegSpacing * (sqrt(3) / 2);
  resetSimulation();
}

function resetSimulation() {
  pegs = [];
  marbles = [];
  
  // In a Galton board, numBins is rows + 1
  numBins = numRows + 1;
  bins = Array(numBins).fill(0);
  maxBinCount = 0;
  
  // Bin width is now exactly the horizontal peg spacing
  binWidth = pegSpacing;
  binStartX = width / 2 - (numBins * binWidth) / 2;
  
  let startY = 80;
  for (let r = 0; r < numRows; r++) {
    for (let i = 0; i <= r; i++) {
      // Horizontal centering
      let x = width / 2 + (i - r / 2) * pegSpacing;
      let y = startY + r * pegSpacingY;
      pegs.push({ x: x, y: y, r: 4 });
    }
  }
}

function draw() {
  background(255, 230, 200);
  
  drawHistogram();
  
  // Draw Pegs
  noFill();
  stroke(0);
  strokeWeight(1);
  for (let p of pegs) {
    ellipse(p.x, p.y, p.r * 2);
  }
  
  // Drop marbles
  if (frameCount % dropRate === 0) {
    marbles.push({
      x: width / 2 + random(-0.5, 0.5),
      y: 40,
      vx: 0,
      vy: 2,
      r: 4
    });
  }
  
  // Update Marbles
  fill(0);
  noStroke();
  for (let i = marbles.length - 1; i >= 0; i--) {
    let m = marbles[i];
    
    m.vy += 0.25; 
    m.x += m.vx;
    m.y += m.vy;
    m.vx *= 0.97; 
    
    for (let p of pegs) {
      let d = dist(m.x, m.y, p.x, p.y);
      if (d < m.r + p.r) {
        let nx = (m.x - p.x) / d;
        let ny = (m.y - p.y) / d;
        m.x = p.x + nx * (m.r + p.r);
        m.y = p.y + ny * (m.r + p.r);
        
        let dot = m.vx * nx + m.vy * ny;
        m.vx = (m.vx - 2 * dot * nx) * 0.4;
        m.vy = (m.vy - 2 * dot * ny) * 0.4;
        
        m.vx += random(-0.6, 0.6); // Brownian-style nudge
      }
    }
    
    let baseY = height - 16;
    if (m.y > baseY) {
      let binIndex = floor((m.x - binStartX) / binWidth);
      if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex]++;
        if (bins[binIndex] > maxBinCount) maxBinCount = bins[binIndex];
      }
      marbles.splice(i, 1);
      continue;
    }
    
    ellipse(m.x, m.y, m.r * 2);
  }
}

function drawHistogram() {
  let baseY = height - 16;
  let wallY = baseY - 20;
  
  stroke(0);
  for (let i = 0; i <= numBins; i++) {
    let x = binStartX + i * binWidth;
    line(x, wallY, x, baseY);
  }
  line(binStartX, baseY, binStartX + (numBins * binWidth), baseY);
  
  noStroke();
  fill(0);
  
  // Calculate dynamic scale to prevent bars from hitting the triangle
  let triangleBottom = 80 + (numRows * pegSpacingY);
  let availableHeight = (height - 16) - triangleBottom - 40;
  let scaleH = 5;
  if (maxBinCount * scaleH > availableHeight) {
    scaleH = availableHeight / maxBinCount;
  }
  
  for (let i = 0; i < numBins; i++) {
    let x = binStartX + i * binWidth;
    let h = bins[i] * scaleH;
    rect(x + 2, baseY - h, binWidth - 4, h);
  }
}

function mousePressed() {
  resetSimulation();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetSimulation();
}