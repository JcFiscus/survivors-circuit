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
    vx: 0,
    vy: 0,
    lastVx: 0,
    lastVy: 0,
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

let mouseDx = 0;
let mouseDy = 0;

function updateMousePosition(e) {
    mouseDx += e.movementX;
    mouseDy += e.movementY;
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

// Variables for detecting high speed or rapid direction change
let comboActive = false;
let comboCooldown = 1000; // 1 second cooldown
let lastComboTime = 0;

// Function to update game state
function update() {
    if (gameOver) {
        return;
    }

    // Store previous velocities
    player.lastVx = player.vx;
    player.lastVy = player.vy;

    // Reset velocities
    player.vx = 0;
    player.vy = 0;

    // Update player position based on keyboard input
    let keyboardDx = 0;
    let keyboardDy = 0;

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        keyboardDx -= 1;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        keyboardDx += 1;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        keyboardDy -= 1;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        keyboardDy += 1;
    }

    // Normalize keyboard input
    let keyboardLength = Math.hypot(keyboardDx, keyboardDy);
    if (keyboardLength > 0) {
        keyboardDx /= keyboardLength;
        keyboardDy /= keyboardLength;
    }

    // Update player velocity based on keyboard input
    player.vx += keyboardDx * player.speed;
    player.vy += keyboardDy * player.speed;

    // Update player velocity based on mouse movement
    if (isPointerLocked) {
        let mouseLength = Math.hypot(mouseDx, mouseDy);
        if (mouseLength > 0) {
            let mouseDirectionX = mouseDx / mouseLength;
            let mouseDirectionY = mouseDy / mouseLength;

            player.vx += mouseDirectionX * player.speed;
            player.vy += mouseDirectionY * player.speed;
        }
        // Reset mouse deltas
        mouseDx = 0;
        mouseDy = 0;
    }

    // Update player position
    player.x += player.vx;
    player.y += player.vy;

    // Keep player within canvas boundaries
    player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));

    // Detect high speed or rapid direction change (whiplash)
    let currentSpeed = Math.hypot(player.vx, player.vy);
    let speedThreshold = 7; // Threshold speed to trigger effect

    let directionChange = Math.acos(
        (player.vx * player.lastVx + player.vy * player.lastVy) /
        (Math.hypot(player.vx, player.vy) * Math.hypot(player.lastVx, player.lastVy) || 1)
    );

    let directionChangeThreshold = Math.PI / 2; // 90 degrees

    let currentTime = Date.now();

    if ((currentSpeed >= speedThreshold || directionChange >= directionChangeThreshold) &&
        (currentTime - lastComboTime) >= comboCooldown) {
        // Trigger the effect
        destroyNearbyEnemies();
        lastComboTime = currentTime;

        // Visual Feedback
        flashScreen();
    }

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
    score = Math.floor((Date.now() - startTime) / 1000);

    // Update flash effect
    updateFlash();
}

// Function to destroy nearby enemies
function destroyNearbyEnemies() {
    const proximityRadius = 100;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist <= proximityRadius) {
            enemies.splice(i, 1); // Destroy the enemy
        }
    }
}

// Flash effect variables
let flash = { active: false, opacity: 0 };

function flashScreen() {
    flash.active = true;
    flash.opacity = 0.5; // Initial opacity
}

function updateFlash() {
    if (flash.active) {
        flash.opacity -= 0.05;
        if (flash.opacity <= 0) {
            flash.active = false;
            flash.opacity = 0;
        }
    }
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
    player.vx = 0;
    player.vy = 0;
    player.lastVx = 0;
    player.lastVy = 0;
    enemies.length = 0;
    flash.active = false;
    flash.opacity = 0;
    lastComboTime = 0;
    // Request pointer lock again if not locked
    if (!isPointerLocked) {
        canvas.requestPointerLock();
    }
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
