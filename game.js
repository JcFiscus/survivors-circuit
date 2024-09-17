const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const playerSize = 20;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
let playerX = canvasWidth / 2 - playerSize / 2;
let playerY = canvasHeight / 2 - playerSize / 2;
let playerSpeed = 5;

// Player movement
let keys = {};

// Keypress events
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas
  
  // Move player
  if (keys['ArrowUp'] && playerY > 0) playerY -= playerSpeed;
  if (keys['ArrowDown'] && playerY < canvasHeight - playerSize) playerY += playerSpeed;
  if (keys['ArrowLeft'] && playerX > 0) playerX -= playerSpeed;
  if (keys['ArrowRight'] && playerX < canvasWidth - playerSize) playerX += playerSpeed;

  // Draw player
  ctx.fillStyle = 'blue';
  ctx.fillRect(playerX, playerY, playerSize, playerSize);

  // Request the next frame
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
