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
    velX: 0,
    velY: 0,
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
    canvas.requestPointerLock();
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

let mouseSensitivity = 0.1;

function updateMousePosition(e) {
    // Move player based on mouse movement
    player.x += e.movementX * mouseSensitivity;
    player.y += e.movementY * mouseSensitivity;

    // Keep player within canvas boundaries
    player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));
}

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

function update() {
    if (gameOver) {
        return;
    }

    // Update player position based on keyboard input
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y += player.speed;
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
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

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

function loop() {
    update();
    draw();
    if (!gameOver) {
        requestAnimationFrame(loop);
    }
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

function resetGame() {
    gameOver = false;
    score = 0;
    startTime = Date.now();
    player.x = width / 2;
    player.y = height / 2;
    enemies.length = 0;
    // Request pointer lock again if not locked
    if (!isPointerLocked) {
        canvas.requestPointerLock();
    }
    loop();
}

// Start the game loop
loop();
