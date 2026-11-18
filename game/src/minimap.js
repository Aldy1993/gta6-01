// Minimap: a 2D canvas in the corner that draws the road grid, the sea,
// the player (white arrow), traffic (grey dots), police (red dots) and the
// mission marker (pulsing gold dot).
import { WORLD } from './config.js';
import { ROAD_LINES } from './world.js';

const SIZE = 190;

export function createMinimap() {
  const canvas = document.getElementById('minimap');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  let pulse = 0;

  function toMap(x, z) {
    const s = SIZE / (WORLD.halfSize * 2 + 20);
    return [(x + WORLD.halfSize + 10) * s, (z + WORLD.halfSize + 10) * s];
  }

  function draw(state) {
    pulse += 0.05;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(12, 20, 28, 0.85)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Sea corner.
    ctx.fillStyle = 'rgba(29, 111, 143, 0.9)';
    const [sx, sy] = toMap(-WORLD.halfSize, WORLD.halfSize);
    ctx.fillRect(0, sy, SIZE - sx, SIZE - sy);
    // Roads.
    ctx.strokeStyle = '#8a94a6';
    ctx.lineWidth = 4;
    for (const line of ROAD_LINES) {
      const [ax] = toMap(line, 0);
      ctx.beginPath();
      ctx.moveTo(ax, 0);
      ctx.lineTo(ax, SIZE);
      ctx.stroke();
      const [, by] = toMap(0, line);
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(SIZE, by);
      ctx.stroke();
    }
    // Mission marker.
    if (state.target) {
      const [mx, my] = toMap(state.target.x, state.target.z);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(mx, my, 5 + Math.sin(pulse * 2) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 9 + Math.sin(pulse * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Traffic.
    ctx.fillStyle = '#c8ccd4';
    for (const car of state.trafficCars) {
      const [cx, cy] = toMap(car.x, car.z);
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    // Police.
    ctx.fillStyle = '#ff3b30';
    for (const car of state.policeCars) {
      const [cx, cy] = toMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { draw };
}
