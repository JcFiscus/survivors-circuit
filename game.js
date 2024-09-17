const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize width and height before using them
let width = window.innerWidth;
let height = window.innerHeight;

// Set canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    width = canvas.width;
    height = canvas.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let gameOver = false;
let score = 0;
let startTime = Date.now();

// Starfield
const stars = [];
const numStars = 150;

// Initialize stars
for (let i = 0; i < numStars; i++) {
    stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        alpha: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01
    });
}

// Player (Spacecraft)
const player = {
    x: width / 2,
    y: height / 2,
    size: 30, // Increased size for better visibility
    speed: 5,
    vx: 0,
    vy: 0,
    lastVx: 0,
    lastVy: 0,
    // Drawing the spacecraft using paths
    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.size / 30, this.size / 30);
        ctx.fillStyle = '#00FF00'; // Bright green for contrast
        ctx.beginPath();
        // Simple triangular spacecraft
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 10);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();

        // Drawing the cockpit
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};

const enemies = [];
const enemySize = 20;

// Handle keyboard input
const keys = {};
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

// Explosion Effects
const explosions = [];

// Explosion class
class Explosion {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.type = type; // 'speed' or 'whiplash'
        this.init();
    }

    init() {
        const numParticles = this.type === 'speed' ? 30 : 40;
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (this.type === 'speed' ? 3 : 5);
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 2,
                alpha: 1,
                decay: Math.random() * 0.015 + 0.005,
                color: this.type === 'speed' ? '#FFD700' : '#FF4500' // Gold or OrangeRed
            });
        }
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        });
        // Remove particles that are fully faded
        this.particles = this.particles.filter(p => p.alpha > 0);
    }

    draw() {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    isDone() {
        return this.particles.length === 0;
    }
}

function spawnEnemy() {
    const enemy = {
        x: 0,
        y: 0,
        size: enemySize,
        speed: 2 + Math.random() * 3, // Speed between 2 and 5
        // Randomly spawn at edges
        spawn: function() {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) { // Top
                this.x = Math.random() * width;
                this.y = -this.size;
            } else if (edge === 1) { // Bottom
                this.x = Math.random() * width;
                this.y = height + this.size;
            } else if (edge === 2) { // Left
                this.x = -this.size;
                this.y = Math.random() * height;
            } else { // Right
                this.x = width + this.size;
                this.y = Math.random() * height;
            }
        },
        draw: function() {
            ctx.fillStyle = '#FF0000'; // Bright red for contrast
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: function() {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }
    };
    enemy.spawn();
    enemies.push(enemy);
}

// Combo Mechanic Variables
let comboCooldown = 1000; // 1 second cooldown
let lastComboTime = 0;

// Function to trigger the combo effect
function triggerCombo(type) {
    // type can be 'speed' or 'whiplash'
    // Create explosion effect
    explosions.push(new Explosion(player.x, player.y, type));

    // Destroy enemies within proximity
    const proximityRadius = 120;
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

// Function to create a flash effect
function flashScreen() {
    flash.active = true;
    flash.opacity = 0.3; // Initial opacity
}

// Function to update flash effect
function updateFlash(deltaTime) {
    if (flash.active) {
        flash.opacity -= 0.01 * (deltaTime / 16); // Adjust fade speed as needed
        if (flash.opacity <= 0) {
            flash.active = false;
            flash.opacity = 0;
        }
    }
}

// Function to draw stars
function drawStars() {
    stars.forEach(star => {
        star.alpha += star.twinkleSpeed;
        if (star.alpha >= 1) star.alpha = 0;
        if (star.alpha <= 0) star.alpha = 1;
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
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

    // Store previous velocities
    player.lastVx = player.vx;
    player.lastVy = player.vy;

    // Reset velocities
    player.vx = 0;
    player.vy = 0;

    // Update player velocity based on keyboard input
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
    let speedThreshold = 10; // Threshold speed to trigger 'speed' combo

    let directionChange = 0;
    if (player.lastVx !== 0 || player.lastVy !== 0) {
        const dotProduct = (player.vx * player.lastVx + player.vy * player.lastVy) /
            (Math.hypot(player.vx, player.vy) * Math.hypot(player.lastVx, player.lastVy) || 1);
        directionChange = Math.acos(Math.min(Math.max(dotProduct, -1), 1)); // Clamp value between -1 and 1
    }

    let directionChangeThreshold = Math.PI / 2; // 90 degrees

    if ((currentSpeed >= speedThreshold || directionChange >= directionChangeThreshold) &&
        (currentTime - lastComboTime) >= comboCooldown) {
        if (currentSpeed >= speedThreshold) {
            // High-speed synchronization
            triggerCombo('speed');
        } else {
            // Whiplash (rapid direction change)
            triggerCombo('whiplash');
        }
        lastComboTime = currentTime;
        flashScreen();
    }

    // Spawn enemies periodically
    if (Math.random() < 0.02) { // Approximately 1 enemy per 50 frames
        spawnEnemy();
    }

    // Update enemies
    enemies.forEach(enemy => {
        enemy.update();
    });

    // Check for collisions
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < (player.size / 2 + enemy.size / 2)) {
            gameOver = true;
        }
    });

    // Update explosions
    explosions.forEach(explosion => {
        explosion.update();
    });

    // Remove completed explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        if (explosions[i].isDone()) {
            explosions.splice(i, 1);
        }
    }

    // Update flash effect
    updateFlash(deltaTime);

    // Update score
    score = Math.floor((currentTime - startTime) / 1000);
}

// Function to draw game elements
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw stars
    drawStars();

    // Draw explosions
    explosions.forEach(explosion => {
        explosion.draw();
    });

    // Draw flash effect if active
    if (flash.active) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.opacity})`;
        ctx.fillRect(0, 0, width, height);
    }

    // Draw player (spacecraft)
    player.draw();

    // Draw enemies
    enemies.forEach(enemy => {
        enemy.draw();
    });

    // Draw score
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 40);

    // Draw game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#FFFFFF';
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
    explosions.length = 0;
    flash.active = false;
    flash.opacity = 0;
    lastComboTime = 0;
    mouseDx = 0;
    mouseDy = 0;
    // Reset stars position if desired
    // For now, stars remain static
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
