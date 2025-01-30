// Game Engine class to handle core functionality
class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.particles = [];
        this.screenShake = 0;

        // Game objects
        this.player = new Player(50, 300);
        this.currentPlatforms = [];
        this.currentCollectibles = [];
        this.currentEnemies = [];

        // Systems
        this.input = new InputSystem();
        this.physics = new PhysicsSystem();
        this.renderer = new RenderSystem(this.ctx);
        this.audio = new AudioSystem();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.init();
    }

    init() {
        // Initialize systems
        this.input.init();
        this.audio.init();
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.input.handleKeyDown(e, this));
        document.addEventListener('keyup', (e) => this.input.handleKeyUp(e));
    }

    start() {
        if (this.isPlaying) return;
        
        this.resetGameState();
        this.loadLevel(this.currentLevel);
        this.isPlaying = true;
        this.isPaused = false;
        
        requestAnimationFrame(this.update);
    }

    update(timestamp) {
        if (!this.isPlaying || this.isPaused) return;

        // Clear and update
        this.ctx.fillStyle = this.getCurrentLevel().background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply screen shake
        if (this.screenShake > 0) {
            this.ctx.save();
            this.ctx.translate(
                Math.random() * this.screenShake - this.screenShake/2,
                Math.random() * this.screenShake - this.screenShake/2
            );
            this.screenShake *= 0.9;
        }

        // Update game objects
        this.physics.updatePlayer(this.player, this.input.keys);
        this.physics.updateEnemies(this.currentEnemies);
        this.updateParticles();
        
        // Draw everything
        this.renderer.drawLevel(this);
        this.renderer.drawPlayer(this.player);
        this.renderer.drawParticles(this.particles);
        
        if (this.screenShake > 0) {
            this.ctx.restore();
        }

        // Check win condition
        this.checkLevelComplete();
        
        requestAnimationFrame(this.update);
    }

    getCurrentLevel() {
        return levels[this.currentLevel];
    }

    loadLevel(levelNum) {
        const level = levels[levelNum];
        if (!level) return false;
        
        this.currentPlatforms = JSON.parse(JSON.stringify(level.platforms));
        this.currentCollectibles = JSON.parse(JSON.stringify(level.collectibles));
        this.currentEnemies = JSON.parse(JSON.stringify(level.enemies));
        this.player.reset();
        
        return true;
    }

    resetGameState() {
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.updateHUD();
        this.hideAllMenus();
    }

    collectCoin(coin) {
        coin.active = false;
        this.score += 100;
        this.updateHUD();
        this.createParticles(coin.x + coin.width/2, coin.y + coin.height/2, coin.color, 10);
        this.screenShake = 3;
        this.audio.playSound('collect');
    }

    handleDeath() {
        this.lives--;
        this.updateHUD();
        this.screenShake = 10;
        this.createParticles(this.player.x + this.player.width/2, 
                           this.player.y + this.player.height/2, 
                           this.player.color, 20);
        this.audio.playSound('death');
        
        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            this.player.reset();
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
    }

    checkLevelComplete() {
        const remainingCollectibles = this.currentCollectibles.filter(c => c.active).length;
        if (remainingCollectibles === 0) {
            this.levelComplete();
        }
    }

    levelComplete() {
        this.isPlaying = false;
        document.querySelector('.level-complete').style.display = 'flex';
        document.getElementById('level-score').textContent = this.score;
    }

    startNextLevel() {
        this.currentLevel++;
        if (this.loadLevel(this.currentLevel)) {
            this.isPlaying = true;
            document.querySelector('.level-complete').style.display = 'none';
            requestAnimationFrame(this.update);
        } else {
            this.endGame(true);
        }
    }

    endGame(completed) {
        this.isPlaying = false;
        document.querySelector('.game-over').style.display = 'flex';
        document.getElementById('final-score').textContent = this.score;
        if (completed) {
            document.querySelector('.game-over-content').innerHTML = 
                `Congratulations!<br>You completed the game!<br>
                <div class="final-score">Final Score: ${this.score}</div>
                <button class="game-button" onclick="game.start()">Play Again</button>`;
        }
    }

    togglePause() {
        if (!this.isPlaying) return;
        
        this.isPaused = !this.isPaused;
        document.querySelector('.pause-menu').style.display = 
            this.isPaused ? 'flex' : 'none';
    }

    resumeGame() {
        if (!this.isPlaying) return;
        this.isPaused = false;
        document.querySelector('.pause-menu').style.display = 'none';
        requestAnimationFrame(this.update);
    }

    hideAllMenus() {
        document.querySelector('.game-over').style.display = 'none';
        document.querySelector('.level-complete').style.display = 'none';
        document.querySelector('.pause-menu').style.display = 'none';
    }

    updateHUD() {
        document.getElementById('level').textContent = this.currentLevel;
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnGround = false;
        this.direction = 1;
        this.color = '#FF5722';
    }

    reset() {
        this.x = 50;
        this.y = 300;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnGround = false;
    }
}

// Input System
class InputSystem {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            jump: false
        };
    }

    init() {
        // Touch controls initialization would go here
    }

    handleKeyDown(e, game) {
        switch(e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                this.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = true;
                break;
            case ' ':
                this.keys.jump = true;
                if (!game.player.isJumping && game.player.isOnGround) {
                    game.player.velocityY = -20;
                    game.player.isJumping = true;
                    game.player.isOnGround = false;
                    game.createParticles(game.player.x + game.player.width/2, 
                                       game.player.y + game.player.height, 
                                       '#fff', 5);
                    game.audio.playSound('jump');
                }
                e.preventDefault();
                break;
            case 'escape':
                game.togglePause();
                break;
            case 'r':
                if (!game.isPlaying) game.start();
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                this.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.jump = false;
                break;
        }
    }
}

// Physics System
class PhysicsSystem {
    static get CONSTANTS() {
        return {
            GRAVITY: 0.6,
            MOVE_SPEED: 5,
            FRICTION: 0.85,
            MAX_SPEED: 6
        };
    }

    updatePlayer(player, keys) {
        // Horizontal movement
        if (keys.left) {
            player.velocityX -= PhysicsSystem.CONSTANTS.MOVE_SPEED;
            player.direction = -1;
        }
        if (keys.right) {
            player.velocityX += PhysicsSystem.CONSTANTS.MOVE_SPEED;
            player.direction = 1;
        }
        
        // Apply friction and limit speed
        player.velocityX *= PhysicsSystem.CONSTANTS.FRICTION;
        player.velocityX = Math.max(-PhysicsSystem.CONSTANTS.MAX_SPEED, 
                                   Math.min(PhysicsSystem.CONSTANTS.MAX_SPEED, 
                                   player.velocityX));
        
        // Apply gravity
        player.velocityY += PhysicsSystem.CONSTANTS.GRAVITY;
        
        // Update position
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // Keep player in bounds
        player.x = Math.max(0, Math.min(800 - player.width, player.x));
        
        // Check collisions
        this.handleCollisions(game);
    }

    updateEnemies(enemies) {
        enemies.forEach(enemy => {
            enemy.x += enemy.speedX;
            
            if (Math.abs(enemy.x - enemy.startX) > enemy.range) {
                enemy.speedX *= -1;
            }
        });
    }

    handleCollisions(game) {
        game.player.isOnGround = false;
        
        // Platform collisions
        game.currentPlatforms.forEach(platform => {
            if (this.checkCollision(game.player, platform)) {
                this.resolveCollision(game.player, platform);
            }
        });
        
        // Collectible collisions
        game.currentCollectibles.forEach(coin => {
            if (coin.active && this.checkCollision(game.player, coin)) {
                game.collectCoin(coin);
            }
        });
        
        // Enemy collisions
        game.currentEnemies.forEach(enemy => {
            if (this.checkCollision(game.player, enemy)) {
                game.handleDeath();
            }
        });
        
        // Check if fallen off
        if (game.player.y > 600) {
            game.handleDeath();
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    resolveCollision(player, platform) {
        const overlapX = (player.x + player.width/2 < platform.x + platform.width/2) ?
            platform.x - (player.x + player.width) :
            platform.x + platform.width - player.x;
            
        const overlapY = (player.y + player.height/2 < platform.y + platform.height/2) ?
            platform.y - (player.y + player.height) :
            platform.y + platform.height - player.y;

        if (Math.abs(overlapX) < Math.abs(overlapY)) {
            player.x += overlapX;
            player.velocityX = 0;
        } else {
            player.y += overlapY;
            if (overlapY < 0) {
                player.isOnGround = true;
                player.isJumping = false;
            }
            player.velocityY = 0;
        }
    }
}

// Render System
class RenderSystem {
    constructor(ctx) {
        this.ctx = ctx;
    }

    drawLevel(game) {
        // Draw platforms
        game.currentPlatforms.forEach(platform => {
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        // Draw collectibles
        game.currentCollectibles.forEach(coin => {
            if (coin.active) {
                const bounce = Math.sin(Date.now() / 200) * 3;
                this.ctx.fillStyle = coin.color;
                this.ctx.fillRect(coin.x, coin.y + bounce, coin.width, coin.height);
            }
        });
        
        // Draw enemies
        game.currentEnemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    }

    drawPlayer(player) {
        this.ctx.save();
        this.ctx.translate(player.x + player.width/2, player.y + player.height/2);
        this.ctx.scale(player.direction, 1);
        this.ctx.translate(-(player.x + player.width/2), -(player.y + player.height/2));
        
        const bounceOffset = player.isOnGround ? Math.sin(Date.now() / 150) * 2 : 0;
        // Draw body
        this.ctx.fillStyle = player.color;
        this.ctx.fillRect(player.x, player.y + bounceOffset, player.width, player.height);
        
        // Draw eyes
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            player.x + player.width * 0.6,
            player.y + player.height * 0.2 + bounceOffset,
            8, 8
        );
        
        // Draw running animation
        if (Math.abs(player.velocityX) > 0.1) {
            const legOffset = Math.sin(Date.now() / 100) * 5;
            this.ctx.fillRect(
                player.x + 5,
                player.y + player.height + bounceOffset,
                8, 10 + legOffset
            );
            this.ctx.fillRect(
                player.x + player.width - 13,
                player.y + player.height + bounceOffset,
                8, 10 - legOffset
            );
        }
        
        this.ctx.restore();
    }

    drawParticles(particles) {
        particles.forEach(particle => particle.draw(this.ctx));
    }
}

// Audio System
class AudioSystem {
    constructor() {
        this.sounds = new Map();
        this.isInitialized = false;
    }

    async init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            await this.loadSounds();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing audio:', error);
        }
    }

    async loadSounds() {
        const soundFiles = {
            jump: 'jump.wav',
            collect: 'collect.wav',
            death: 'death.wav'
        };

        for (const [name, file] of Object.entries(soundFiles)) {
            try {
                const response = await fetch(file);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
                this.sounds.set(name, audioBuffer);
            } catch (error) {
                console.error(`Error loading sound ${name}:`, error);
            }
        }
    }

    playSound(name) {
        if (!this.isInitialized || !this.sounds.has(name)) return;

        try {
            const source = this.context.createBufferSource();
            source.buffer = this.sounds.get(name);
            source.connect(this.context.destination);
            source.start(0);
        } catch (error) {
            console.error(`Error playing sound ${name}:`, error);
        }
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.gravity = 0.5;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Level configuration
const levels = {
    1: {
        name: "The Beginning",
        platforms: [
            { x: 0, y: 550, width: 800, height: 50, color: '#4CAF50', type: 'solid' },
            { x: 300, y: 400, width: 200, height: 20, color: '#795548', type: 'solid' },
            { x: 100, y: 300, width: 200, height: 20, color: '#795548', type: 'solid' },
            { x: 500, y: 200, width: 200, height: 20, color: '#795548', type: 'solid' }
        ],
        collectibles: [
            { x: 350, y: 350, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 150, y: 250, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 550, y: 150, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' }
        ],
        enemies: [
            { x: 400, y: 360, width: 30, height: 30, color: '#F44336', speedX: 0.8, range: 100, startX: 400 },
            { x: 200, y: 260, width: 30, height: 30, color: '#F44336', speedX: 0.8, range: 100, startX: 200 }
        ],
        background: '#87CEEB'
    },
    2: {
        name: "The Challenge",
        platforms: [
            { x: 0, y: 550, width: 800, height: 50, color: '#673AB7', type: 'solid' },
            { x: 100, y: 450, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 300, y: 400, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 500, y: 350, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 700, y: 300, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 500, y: 200, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 300, y: 150, width: 100, height: 20, color: '#4527A0', type: 'solid' },
            { x: 100, y: 200, width: 100, height: 20, color: '#4527A0', type: 'solid' }
        ],
        collectibles: [
            { x: 140, y: 400, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 340, y: 350, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 540, y: 300, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 740, y: 250, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' },
            { x: 540, y: 150, width: 20, height: 20, color: '#FFD700', active: true, type: 'coin' }
        ],
        enemies: [
            { x: 200, y: 410, width: 30, height: 30, color: '#F44336', speedX: 3, range: 150, startX: 200 },
            { x: 400, y: 360, width: 30, height: 30, color: '#F44336', speedX: 3, range: 150, startX: 400 },
            { x: 600, y: 310, width: 30, height: 30, color: '#F44336', speedX: 3, range: 150, startX: 600 }
        ],
        background: '#3F51B5'
    }
};

// Create and initialize game instance
const game = new GameEngine('game-canvas');