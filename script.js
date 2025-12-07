// Configurações do jogo
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverModal = document.getElementById('gameOverModal');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const speedElement = document.getElementById('speed');
const livesElement = document.getElementById('lives');
const finalScoreElement = document.getElementById('finalScore');
const finalHighScoreElement = document.getElementById('finalHighScore');

// Variáveis do jogo
let gameRunning = false;
let gamePaused = false;
let score = 0;
let highScore = localStorage.getItem('carEscapeHighScore') || 0;
let lives = 3;
let gameSpeed = 1;
let nitroActive = false;
let shieldActive = false;
let gameFrame = 0;
let obstacles = [];
let coins = [];
let particles = [];

// Carro do jogador
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 80,
    color: '#ff4444',
    speed: 5,
    nitroBoost: 2,
    nitroFuel: 100,
    nitroMaxFuel: 100,
    draw: function() {
        // Desenhar o carro (pixel art)
        ctx.fillStyle = this.color;
        
        // Corpo principal do carro
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Janelas
        ctx.fillStyle = '#aaddff';
        ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, 15);
        ctx.fillRect(this.x + 5, this.y + 35, this.width - 10, 15);
        
        // Faróis
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 5, this.y, 10, 5); // Esquerdo
        ctx.fillRect(this.x + this.width - 15, this.y, 10, 5); // Direito
        
        // Rodas
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - 5, this.y + 15, 5, 20); // Roda esquerda traseira
        ctx.fillRect(this.x + this.width, this.y + 15, 5, 20); // Roda direita traseira
        ctx.fillRect(this.x - 5, this.y + 45, 5, 20); // Roda esquerda dianteira
        ctx.fillRect(this.x + this.width, this.y + 45, 5, 20); // Roda direita dianteira
        
        // Efeito de nitro
        if (nitroActive && this.nitroFuel > 0) {
            ctx.fillStyle = '#ff9900';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height + 10, 15, 0, Math.PI);
            ctx.fill();
            
            // Chamas do nitro
            ctx.fillStyle = '#ff5500';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height + 25, 10, 0, Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height + 35, 5, 0, Math.PI);
            ctx.fill();
        }
        
        // Escudo
        if (shieldActive) {
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    update: function() {
        // Atualizar posição baseada nas teclas pressionadas
        if (keys.ArrowLeft && this.x > 0) {
            this.x -= this.speed;
        }
        if (keys.ArrowRight && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
        
        // Acelerar com seta para cima
        if (keys.ArrowUp) {
            gameSpeed = 1.5;
        } else {
            gameSpeed = 1;
        }
        
        // Nitro com espaço
        if (keys[' '] && this.nitroFuel > 0) {
            nitroActive = true;
            gameSpeed = 2.5;
            this.nitroFuel -= 0.5;
            
            // Criar partículas de nitro
            if (gameFrame % 2 === 0) {
                particles.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height,
                    size: Math.random() * 5 + 2,
                    speedX: (Math.random() - 0.5) * 2,
                    speedY: Math.random() * 3 + 2,
                    color: `rgb(255, ${Math.floor(Math.random() * 150)}, 0)`,
                    life: 30
                });
            }
        } else {
            nitroActive = false;
            
            // Recarregar nitro
            if (this.nitroFuel < this.nitroMaxFuel) {
                this.nitroFuel += 0.1;
            }
        }
        
        // Atualizar elementos da UI
        speedElement.textContent = `${gameSpeed.toFixed(1)}x`;
    }
};

// Teclas pressionadas
const keys = {};

// Classe de obstáculos
class Obstacle {
    constructor() {
        this.width = Math.random() * 50 + 30;
        this.height = Math.random() * 60 + 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.color = `rgb(${Math.floor(Math.random() * 100 + 100)}, ${Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 50)})`;
        this.speed = Math.random() * 3 + 2;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Detalhes do obstáculo
        ctx.fillStyle = '#555555';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, 10);
        ctx.fillRect(this.x + 5, this.y + this.height - 15, this.width - 10, 10);
    }
    
    update() {
        this.y += this.speed * gameSpeed;
    }
}

// Classe de moedas
class Coin {
    constructor() {
        this.size = 20;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = Math.random() * 2 + 1;
        this.color = '#ffcc00';
        this.spin = 0;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.spin);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, this.size/3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    update() {
        this.y += this.speed * gameSpeed;
        this.spin += 0.1;
    }
}

// Classe de partículas
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 3;
        this.speedY = (Math.random() - 0.5) * 3;
        this.color = color;
        this.life = 50;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Inicializar jogo
function initGame() {
    score = 0;
    lives = 3;
    gameSpeed = 1;
    gameFrame = 0;
    obstacles = [];
    coins = [];
    particles = [];
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 100;
    player.nitroFuel = player.nitroMaxFuel;
    
    updateUI();
    gameOverModal.style.display = 'none';
}

// Atualizar UI
function updateUI() {
    scoreElement.textContent = score.toString().padStart(5, '0');
    highScoreElement.textContent = highScore.toString().padStart(5, '0');
    livesElement.textContent = lives;
    
    // Atualizar barra de nitro visualmente
    const nitroPercent = (player.nitroFuel / player.nitroMaxFuel) * 100;
    document.documentElement.style.setProperty('--nitro-percent', `${nitroPercent}%`);
}

// Verificar colisões
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Gerar obstáculos e moedas
function generateGameElements() {
    // Gerar obstáculos
    if (gameFrame % 90 === 0) {
        obstacles.push(new Obstacle());
    }
    
    // Gerar moedas
    if (gameFrame % 60 === 0) {
        coins.push(new Coin());
    }
}

// Atualizar elementos do jogo
function updateGameElements() {
    // Atualizar obstáculos
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        
        // Verificar colisão com jogador
        if (checkCollision(player, obstacles[i])) {
            if (shieldActive) {
                // Quebrar escudo
                shieldActive = false;
                
                // Criar partículas de escudo quebrando
                for (let j = 0; j < 20; j++) {
                    particles.push(new Particle(
                        player.x + player.width/2,
                        player.y + player.height/2,
                        '#00aaff'
                    ));
                }
            } else {
                lives--;
                
                // Criar partículas de explosão
                for (let j = 0; j < 30; j++) {
                    particles.push(new Particle(
                        player.x + player.width/2,
                        player.y + player.height/2,
                        '#ff4444'
                    ));
                }
                
                if (lives <= 0) {
                    gameOver();
                }
            }
            
            // Remover obstáculo
            obstacles.splice(i, 1);
            continue;
        }
        
        // Remover obstáculos que saíram da tela
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
        }
    }
    
    // Atualizar moedas
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();
        
        // Verificar colisão com jogador
        if (checkCollision(player, coins[i])) {
            // Coletar moeda
            coins.splice(i, 1);
            score += 50;
            
            // Criar partículas de coleta
            for (let j = 0; j < 15; j++) {
                particles.push(new Particle(
                    player.x + player.width/2,
                    player.y + player.height/2,
                    '#ffcc00'
                ));
            }
            
            // Chance de obter escudo
            if (Math.random() < 0.1) {
                shieldActive = true;
            }
            
            continue;
        }
        
        // Remover moedas que saíram da tela
        if (coins[i].y > canvas.height) {
            coins.splice(i, 1);
        }
    }
    
    // Atualizar partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        
        // Remover partículas mortas
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Desenhar elementos do jogo
function drawGameElements() {
    // Limpar canvas
    ctx.fillStyle = '#111133';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar estrada
    ctx.fillStyle = '#333355';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Linhas da estrada
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.fillRect(i, (gameFrame * 2) % 100, 50, 20);
    }
    
    // Desenhar partículas
    particles.forEach(particle => particle.draw());
    
    // Desenhar obstáculos
    obstacles.forEach(obstacle => obstacle.draw());
    
    // Desenhar moedas
    coins.forEach(coin => coin.draw());
    
    // Desenhar jogador
    player.draw();
    
    // Desenbar barra de nitro
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(20, 20, 200 * (player.nitroFuel / player.nitroMaxFuel), 15);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 200, 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText("NITRO", 25, 32);
}

// Game over
function gameOver() {
    gameRunning = false;
    
    // Atualizar high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('carEscapeHighScore', highScore);
    }
    
    // Mostrar modal
    finalScoreElement.textContent = score;
    finalHighScoreElement.textContent = highScore;
    gameOverModal.style.display = 'flex';
}

// Loop do jogo
function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    gameFrame++;
    
    // Gerar elementos
    generateGameElements();
    
    // Atualizar
    player.update();
    updateGameElements();
    
    // Desenhar
    drawGameElements();
    
    // Atualizar UI
    updateUI();
    
    // Continuar loop
    requestAnimationFrame(gameLoop);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Prevenir scroll com setas
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

startBtn.addEventListener('click', () => {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        initGame();
        gameLoop();
    }
});

pauseBtn.addEventListener('click', () => {
    if (gameRunning) {
        gamePaused = !gamePaused;
        if (!gamePaused) {
            gameLoop();
        }
        pauseBtn.innerHTML = gamePaused ? 
            '<i class="fas fa-play"></i> RESUME' : 
            '<i class="fas fa-pause"></i> PAUSE';
    }
});

resetBtn.addEventListener('click', () => {
    initGame();
    if (gameRunning) {
        gameLoop();
    }
});

restartBtn.addEventListener('click', () => {
    initGame();
    gameRunning = true;
    gamePaused = false;
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
    gameLoop();
});

// Inicializar
initGame();
updateUI();

// Desenhar tela inicial
drawGameElements();
ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#00ffcc';
ctx.font = '30px "Press Start 2P"';
ctx.textAlign = 'center';
ctx.fillText("CAR ESCAPE", canvas.width/2, canvas.height/2 - 50);
ctx.font = '20px "Press Start 2P"';
ctx.fillText("PRESS START GAME", canvas.width/2, canvas.height/2);
ctx.font = '14px "Press Start 2P"';
ctx.fillText("Use arrow keys to move", canvas.width/2, canvas.height/2 + 50);
ctx.fillText("SPACE for nitro boost", canvas.width/2, canvas.height/2 + 80);