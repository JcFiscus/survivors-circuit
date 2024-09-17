const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let width = canvas.width;
let height = canvas.height;

let gameOver = false;
let score = 0;
let startTime = Date.now();

const player = {
    x: width / 2,
    y: height / 2,
    size: 20,
    speed: 5,
};

const enemies = [];

const keys = {};

// Handle keyboard input
document.addEventListener('keydown', function(e) {
    keys[e.key] = true;
});

document.addEventListener('keyup', function(e) {
    keys[e.key] = false;
});

// Handle touch input for mobile devices
let touchX = null;
let touchY = null;

canvas.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = touch.clientX - rect.left;
    touchY = touch.clientY - rect.top;
    e.preventDefault();
});

canvas.addEventListener('touchmove', function(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchX = touch.clientX - rect.left;
    touchY = touch.clientY - rect.top;
    e.preventDefault();
});

canvas.addEventListener('touchend', function(e) {
    touchX = null;
    touchY = null;
    e.preventDefault();
});

// Pointer Lock Setup
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

// Click to lock the pointer
canvas.addEventListener('click', function() {
    if (!gameOver) {
        canvas.requestPointerLock();
    }
});

// Listen for pointer lock change
document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

let isPointerLocked = false;

function lockChangeAlert() {
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas) {
        console.log('Pointer locked');
        document.addEventListener("mousemove", updateMousePosition, false);
        isPointerLocked = true;
    } else {
        console.log('Pointer unlocked');
        document.removeEventListener("mousemove", updateMousePosition, false);
        isPointerLocked = false;
    }
}

let mouseMovement = { x: 0, y: 0 };

function updateMousePosition(e) {
    // Accumulate mouse movement
    mouseMovement.x += e.movementX;
    mouseMovement.y += e.movementY;
}

// Function to spawn enemies
function spawnEnemy() {
    const enemySize = 20;
    const enemySpeed = 1 + Math.random() * 2;

    // Spawn at random edge
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
        // Top
        x = Math.random() * width;
        y = -enemySize;
    } else if (edge === 1) {
        // Bottom
        x = Math.random() * width;
        y = height + enemySize;
    } else if (edge === 2) {
        // Left
        x = -enemySize;
        y = Math.random() * height;
    } else {
        // Right
        x = width + enemySize;
        y = Math.random() * height;
    }

    enemies.push({
        x: x,
        y: y,
        size: enemySize,
        speed: enemySpeed,
    });
}

// Combo Mechanic Variables
let comboCooldown = 2000; // 2 seconds cooldown
let lastComboTime = 0;

// Function to trigger combo effect
function triggerCombo() {
    const currentTime = Date.now();
    if ((currentTime - lastComboTime) < comboCooldown) {
        return; // Combo is on cooldown
    }

    // Determine the direction based on combined mouse and keyboard inputs
    let keyboardDirection = { x: 0, y: 0 };
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        keyboardDirection.x -= 1;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        keyboardDirection.x += 1;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        keyboardDirection.y -= 1;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        keyboardDirection.y += 1;
    }

    // Normalize keyboard direction
    let keyboardLength = Math.hypot(keyboardDirection.x, keyboardDirection.y);
    if (keyboardLength > 0) {
        keyboardDirection.x /= keyboardLength;
        keyboardDirection.y /= keyboardLength;
    }

    // Determine mouse direction
    let mouseDirection = { x: 0, y: 0 };
    if (mouseMovement.x !== 0 || mouseMovement.y !== 0) {
        let mouseLength = Math.hypot(mouseMovement.x, mouseMovement.y);
        mouseDirection.x = mouseMovement.x / mouseLength;
        mouseDirection.y = mouseMovement.y / mouseLength;
    }

    // Calculate the angle between keyboard and mouse directions
    let dotProduct = (keyboardDirection.x * mouseDirection.x) + (keyboardDirection.y * mouseDirection.y);
    let angle = Math.acos(dotProduct > 1 ? 1 : (dotProduct < -1 ? -1 : dotProduct));

    const angleThreshold = Math.PI / 4; // 45 degrees

    if (angle < angleThreshold) {
        // Directions are similar; trigger combo
        lastComboTime = currentTime;

        // Find and remove enemies within proximity
        const proximityRadius = 100;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist <= proximityRadius) {
                enemies.splice(i, 1); // Destroy the enemy
            } else {
                // Push back the enemy
                const pushDistance = 20;
                const angleToPlayer = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.x += Math.cos(angleToPlayer) * pushDistance;
                enemy.y += Math.sin(angleToPlayer) * pushDistance;

                // Ensure enemies stay within bounds
                enemy.x = Math.max(enemy.size / 2, Math.min(width - enemy.size / 2, enemy.x));
                enemy.y = Math.max(enemy.size / 2, Math.min(height - enemy.size / 2, enemy.y));
            }
        }

        // Visual Feedback (optional): Flash the screen or show an effect
        // Here, we'll create a brief flash effect
        flashScreen();
    }

    // Reset mouse movement after checking
    mouseMovement.x = 0;
    mouseMovement.y = 0;
}

// Function to create a flash effect upon combo
let flash = { active: false, opacity: 0 };

function flashScreen() {
    flash.active = true;
    flash.opacity = 0.5; // Initial opacity
}

function updateFlash(deltaTime) {
    if (flash.active) {
        flash.opacity -= 1 * (deltaTime / 1000); // Fade out over 0.5 seconds
        if (flash.opacity <= 0) {
            flash.active = false;
            flash.opacity = 0;
        }
    }
}

// Function to update game state
let lastUpdateTime = Date.now();

function update() {
    if (gameOver) {
        return;
    }

    const currentTime = Date.now();
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;

    // Update player position based on keyboard input
    let keyboardDirection = { x: 0, y: 0 };
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        keyboardDirection.x -= 1;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        keyboardDirection.x += 1;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        keyboardDirection.y -= 1;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        keyboardDirection.y += 1;
    }

    // Normalize keyboard direction
    let length = Math.hypot(keyboardDirection.x, keyboardDirection.y);
    if (length > 0) {
        keyboardDirection.x /= length;
        keyboardDirection.y /= length;

        player.x += keyboardDirection.x * player.speed;
        player.y += keyboardDirection.y * player.speed;
    }

    // Keep player within canvas boundaries
    player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));

    // Update player position based on touch input
    if (touchX !== null && touchY !== null) {
        const dx = touchX - player.x;
        const dy = touchY - player.y;
        const angle = Math.atan2(dy, dx);
        player.x += Math.cos(angle) * player.speed;
        player.y += Math.sin(angle) * player.speed;

        // Keep player within canvas boundaries
        player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));
        player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));
    }

    // Move player based on mouse movement
    if (isPointerLocked) {
        // Mouse movement is already handled in the updateMousePosition function
        // Player position has been updated accordingly
    }

    // Detect and trigger combo
    triggerCombo();

    // Spawn enemies periodically
    if (Math.random() < 0.02) {
        spawnEnemy();
    }

    // Update enemies
    enemies.forEach((enemy, index) => {
        // Move enemy towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Check collision with player
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < (player.size / 2 + enemy.size / 2)) {
            gameOver = true;
        }
    });

    // Update score
    score = Math.floor((currentTime - startTime) / 1000);

    // Update flash effect
    updateFlash(deltaTime);
}

// Function to draw game elements
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw flash effect if active
    if (flash.active) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.opacity})`;
        ctx.fillRect(0, 0, width, height);
    }

    // Draw player
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemies
    ctx.fillStyle = '#f00';
    enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 40);

    // Draw game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', width / 2, height / 2 - 30);
        ctx.font = '30px Arial';
        ctx.fillText(`Your Score: ${score}`, width / 2, height / 2 + 20);
        ctx.fillText('Click to Restart', width / 2, height / 2 + 60);
    }
}

// Function to handle the game loop
function loop() {
    update();
    draw();
    if (!gameOver) {
        requestAnimationFrame(loop);
    }
}

// Function to reset the game
function resetGame() {
    gameOver = false;
    score = 0;
    startTime = Date.now();
    player.x = width / 2;
    player.y = height / 2;
    enemies.length = 0;
    flash.active = false;
    flash.opacity = 0;
    lastComboTime = 0;
    mouseMovement = { x: 0, y: 0 };
    // Request pointer lock again if not locked
    if (!isPointerLocked) {
        canvas.requestPointerLock();
    }
    lastUpdateTime = Date.now();
    loop();
}

// Restart the game when Enter is pressed or canvas is clicked after game over
document.addEventListener('keydown', function(e) {
    if (gameOver && e.key === 'Enter') {
        resetGame();
    }
});

canvas.addEventListener('click', function() {
    if (gameOver) {
        resetGame();
    } else if (!isPointerLocked) {
        canvas.requestPointerLock();
    }
});

// Start the game loop
loop();
