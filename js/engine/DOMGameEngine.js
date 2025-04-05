// js/engine/DOMGameEngine.js
class DOMGameEngine {
     constructor(containerId, width, height) {
         this.container = document.getElementById(containerId);
         this.width = width;
         this.height = height;
         this.elements = [];
         this.player = null;
         this.gravity = 0.5;
         this.friction = 0.8; // Add friction for better movement
         this.maxVelocityX = 8; // Add maximum horizontal speed
         this.maxVelocityY = 15; // Add maximum fall speed
         this.isGameRunning = false;
         this.keysPressed = {};
         this.score = 0;
         this.lives = 3; // Initialize with 3 lives
         this.currentLevel = 1;
         this.isRespawning = false; // Flag to prevent multiple deaths during respawn
         
         // Configurer le conteneur
         this.container.style.width = `${width}px`;
         this.container.style.height = `${height}px`;
         this.container.style.position = 'relative';
         this.container.style.overflow = 'hidden';
         
         // Gestionnaires d'événements pour les touches
         document.addEventListener('keydown', this.handleKeyDown.bind(this));
         document.addEventListener('keyup', this.handleKeyUp.bind(this));
     }
     
     start() {
         this.isGameRunning = true;
         this.gameLoop();
     }
     
     stop() {
         this.isGameRunning = false;
     }
     
     gameLoop() {
         if (!this.isGameRunning) return;
         
         // Mettre à jour tous les éléments
         this.update();
         
         // Vérifier les collisions
         this.checkCollisions();
         
         // Continuer la boucle de jeu
         requestAnimationFrame(this.gameLoop.bind(this));
     }
     
     update() {
         // Mettre à jour la position de tous les éléments
         for (const element of this.elements) {
             if (element.update) {
                 element.update();
             }
             
             // Apply improved physics
             if (element.affectedByGravity && !element.isOnGround) {
                 element.velocityY = Math.min(element.velocityY + this.gravity, this.maxVelocityY);
             }
             
             // Apply friction when on ground
             if (element.isOnGround) {
                 element.velocityX *= this.friction;
             }
             
             // Limit horizontal speed
             element.velocityX = Math.max(-this.maxVelocityX, Math.min(this.maxVelocityX, element.velocityX));
             
             // Mettre à jour la position
             element.x += element.velocityX;
             element.y += element.velocityY;
             
             // Mettre à jour la position DOM
             element.domElement.style.left = `${element.x}px`;
             element.domElement.style.top = `${element.y}px`;
         }
         
         // Centrer la vue sur le joueur
         if (this.player) {
             this.centerViewOnPlayer();
         }
     }
     
     centerViewOnPlayer() {
         const viewX = this.player.x - this.width / 2;
         const viewY = this.player.y - this.height / 2;
         
         // Limiter la vue aux limites du niveau
         const limitedX = Math.max(0, Math.min(viewX, this.levelWidth - this.width));
         const limitedY = Math.max(0, Math.min(viewY, this.levelHeight - this.height));
         
         // Appliquer le déplacement à tous les éléments
         for (const element of this.elements) {
             const elementX = element.x - limitedX;
             const elementY = element.y - limitedY;
             
             element.domElement.style.left = `${elementX}px`;
             element.domElement.style.top = `${elementY}px`;
         }
     }
     
     checkCollisions() {
         if (!this.player) return;
         
         // Check collision for every element with platforms
         for (const element of this.elements) {
             if (element.type === 'platform') continue;
             
             // Check each element's collision with platforms
             for (const platform of this.elements.filter(e => e.type === 'platform')) {
                 if (this.isColliding(element, platform)) {
                     if (element === this.player) {
                         this.handlePlatformCollision(element, platform);
                     } else if (element.type === 'enemy') {
                         this.handlePlatformCollision(element, platform);
                     }
                 }
             }
         }
         
         // Check player collision with other elements (not platforms)
         for (const element of this.elements) {
             if (element === this.player || element.type === 'platform') continue;
             
             if (this.isColliding(this.player, element)) {
                 // Handle the collision based on element type
                 if (element.type === 'coin') {
                     this.handleCoinCollision(this.player, element);
                 } else if (element.type === 'enemy') {
                     this.handleEnemyCollision(this.player, element);
                 } else if (element.type === 'powerup') {
                     this.handlePowerupCollision(this.player, element);
                 } else if (element.type === 'flag') {
                     this.handleFlagCollision(this.player, element);
                 }
             }
         }
     }
     
     isColliding(element1, element2) {
         return (
             element1.x < element2.x + element2.width &&
             element1.x + element1.width > element2.x &&
             element1.y < element2.y + element2.height &&
             element1.y + element1.height > element2.y
         );
     }
     
     handlePlatformCollision(element, platform) {
         // Collision by top (element is on the platform)
         if (element.velocityY > 0 && 
             element.y + element.height - element.velocityY <= platform.y) {
             element.y = platform.y - element.height;
             element.velocityY = 0;
             element.isOnGround = true;
         }
         // Collision by bottom (element hits the platform from below)
         else if (element.velocityY < 0 && 
                 element.y - element.velocityY >= platform.y + platform.height) {
             element.y = platform.y + platform.height;
             element.velocityY = 0;
             
             // If it's the player hitting a question block, activate the effect
             if (element === this.player && platform.subType === 'question-block') {
                 this.activateQuestionBlock(platform);
             }
         }
         // Collision from left side
         else if (element.velocityX > 0 && 
                 element.x + element.width - element.velocityX <= platform.x) {
             element.x = platform.x - element.width;
             element.velocityX = element.type === 'enemy' ? -element.velocityX : 0;
             
             // If it's an enemy, make it turn around
             if (element.type === 'enemy') {
                 element.domElement.style.transform = `scaleX(${element.velocityX > 0 ? 1 : -1})`;
             }
         }
         // Collision from right side
         else if (element.velocityX < 0 && 
                 element.x - element.velocityX >= platform.x + platform.width) {
             element.x = platform.x + platform.width;
             element.velocityX = element.type === 'enemy' ? -element.velocityX : 0;
             
             // If it's an enemy, make it turn around
             if (element.type === 'enemy') {
                 element.domElement.style.transform = `scaleX(${element.velocityX > 0 ? 1 : -1})`;
             }
         }
     }
     
     handleCoinCollision(player, coin) {
         // Create sparkle effect
         const sparkle = this.createElement('effect', coin.x, coin.y, 32, 32);
         sparkle.domElement.classList.add('sparkle');
         
         // Animate coin collection
         coin.domElement.style.animation = 'collect-coin 0.3s ease-out';
         
         setTimeout(() => {
             this.removeElement(coin);
             this.removeElement(sparkle);
             this.score += 10;
             this.updateScore();
             this.playSound('coin');
         }, 300);
     }
     
     handleEnemyCollision(player, enemy) {
         // Si le joueur saute sur l'ennemi
         if (player.velocityY > 0 && player.y + player.height - player.velocityY <= enemy.y) {
             // Create a visual effect for stomping
             const squishEffect = this.createElement('effect', enemy.x, enemy.y, enemy.width, enemy.height);
             squishEffect.domElement.style.backgroundColor = 'transparent';
             squishEffect.domElement.innerHTML = '💥';
             squishEffect.domElement.style.fontSize = '24px';
             squishEffect.domElement.style.display = 'flex';
             squishEffect.domElement.style.justifyContent = 'center';
             squishEffect.domElement.style.alignItems = 'center';
             
             // Show a flattened version of the enemy when stomped
             if (enemy.subType === 'goomba') {
                 enemy.domElement.style.height = '16px';
                 enemy.domElement.style.opacity = '0.7';
                 enemy.velocityX = 0;
                 enemy.state = 'squished';
                 
                 // Remove the enemy after a short delay to show the squished animation
                 setTimeout(() => {
                     if (this.elements.includes(enemy)) {
                         this.removeElement(enemy);
                     }
                 }, 300);
             } else {
                 // Remove koopa immediately
                 this.removeElement(enemy);
             }
             
             setTimeout(() => {
                 if (this.elements.includes(squishEffect)) {
                     this.removeElement(squishEffect);
                 }
             }, 300);
             
             player.velocityY = -10; // Stronger bounce for more satisfaction
             this.score += enemy.subType === 'koopa' ? 200 : 100;
             this.updateScore();
             this.playSound('stomp');
         } 
         // Si le joueur est invincible
         else if (player.isInvincible) {
             // Create a visual effect for destroying enemy with star power
             const starEffect = this.createElement('effect', enemy.x, enemy.y, enemy.width, enemy.height);
             starEffect.domElement.style.backgroundColor = 'transparent';
             starEffect.domElement.innerHTML = '✨';
             starEffect.domElement.style.fontSize = '24px';
             starEffect.domElement.style.display = 'flex';
             starEffect.domElement.style.justifyContent = 'center';
             starEffect.domElement.style.alignItems = 'center';
             
             setTimeout(() => {
                 if (this.elements.includes(starEffect)) {
                     this.removeElement(starEffect);
                 }
             }, 300);
             
             this.removeElement(enemy);
             this.score += enemy.subType === 'koopa' ? 200 : 100;
             this.updateScore();
         }
         // Si le joueur est touché par l'ennemi
         else if (player.isSuper) {
             player.shrink();
             player.becomeInvincible(1500);
             this.playSound('power-down');
         } else {
             // Player died
             this.playerDied();
         }
     }
     
     playerDied() {
         if (this.isRespawning) return; // Prevent multiple deaths
         
         this.isRespawning = true;
         this.lives--;
         this.updateLives(this.lives);
         
         // Show death animation
         this.player.domElement.style.animation = 'death 1s forwards';
         this.playSound('die');
         
         // Pause the game briefly
         this.stop();
         
         setTimeout(() => {
             if (this.lives > 0) {
                 // Player has lives left, respawn
                 this.respawnPlayer();
             } else {
                 // Game over
                 this.gameOver(false);
             }
         }, 1500);
     }
     
     respawnPlayer() {
         // Remove the current player
         if (this.player) {
             this.removeElement(this.player);
             this.player = null;
         }
         
         // Reset enemies positions
         // Optional: Restore all enemies to their starting positions
         // Or just keep them as is for more difficulty
         
         // Create a new player at the spawn point
         const currentLevel = this.levels[this.currentLevel - 1];
         this.createPlayer(currentLevel.playerSpawn.x, currentLevel.playerSpawn.y);
         
         // Show temporary invincibility
         this.player.becomeInvincible(3000);
         
         // Reset the flag and restart the game
         this.isRespawning = false;
         this.start();
     }
     
     handlePowerupCollision(player, powerup) {
         this.removeElement(powerup);
         
         if (powerup.subType === 'mushroom') {
             player.grow();
         } else if (powerup.subType === 'star') {
             player.becomeInvincible();
         } else if (powerup.subType === 'flower') {
             player.enableFireball();
         }
         
         this.playSound('powerup');
     }
     
     handleFlagCollision(player, flag) {
         // Fin du niveau
         this.levelCompleted();
     }
     
     activateQuestionBlock(block) {
         // Changer l'apparence du bloc
         block.domElement.classList.remove('question-block');
         block.domElement.classList.add('brick');
         
         // Créer un power-up au-dessus du bloc
         const powerupType = Math.random() < 0.7 ? 'mushroom' : (Math.random() < 0.5 ? 'star' : 'flower');
         this.createPowerup(block.x, block.y - 32, powerupType);
         
         this.playSound('block-hit');
     }
     
     createPowerup(x, y, type) {
         const powerup = this.createElement('powerup', x, y, 32, 32);
         powerup.subType = type;
         powerup.domElement.classList.add(type);
         powerup.velocityY = -2;
         powerup.affectedByGravity = true;
         
         // Add movement behavior
         powerup.update = () => {
             if (powerup.isOnGround) {
                 // Move horizontally when on ground
                 if (!powerup.velocityX) {
                     powerup.velocityX = 2;
                 }
                 // Change direction when hitting obstacles
                 for (const element of this.elements) {
                     if (element.type === 'platform' && this.isColliding(powerup, element)) {
                         powerup.velocityX *= -1;
                     }
                 }
             }
         };
         
         return powerup;
     }
     
     createElement(type, x, y, width, height) {
         const element = {
             type: type,
             x: x,
             y: y,
             width: width,
             height: height,
             velocityX: 0,
             velocityY: 0,
             affectedByGravity: false,
             isOnGround: false,
             domElement: document.createElement('div')
         };
         
         // Configurer l'élément DOM
         element.domElement.className = `game-element ${type}`;
         element.domElement.style.width = `${width}px`;
         element.domElement.style.height = `${height}px`;
         element.domElement.style.left = `${x}px`;
         element.domElement.style.top = `${y}px`;
         
         // Ajouter l'élément au conteneur
         this.container.appendChild(element.domElement);
         
         // Ajouter l'élément à la liste
         this.elements.push(element);
         
         return element;
     }
     
     removeElement(element) {
         // Supprimer l'élément DOM
         this.container.removeChild(element.domElement);
         
         // Supprimer l'élément de la liste
         const index = this.elements.indexOf(element);
         if (index !== -1) {
             this.elements.splice(index, 1);
         }
     }
     
     createPlayer(x, y) {
         const player = this.createElement('player', x, y, 32, 48);
         player.affectedByGravity = true;
         player.isSuper = false;
         player.isInvincible = false;
         player.canShootFireball = false;
         
         // Méthodes spécifiques au joueur
         player.jump = () => {
             if (player.isOnGround) {
                 // Increase jump height to reach higher platforms
                 player.velocityY = -17;
                 player.isOnGround = false;
                 this.playSound('jump');
                 
                 // Apply jump animation
                 player.domElement.style.animation = 'jump 0.5s';
                 setTimeout(() => {
                     // Only reset animation if not walking
                     if (!this.keysPressed['ArrowLeft'] && !this.keysPressed['ArrowRight']) {
                         player.domElement.style.animation = '';
                     } else {
                         player.domElement.style.animation = 'walk 0.3s infinite';
                     }
                 }, 500);
             }
         };
         
         player.grow = () => {
             if (!player.isSuper) {
                 player.isSuper = true;
                 player.height = 64;
                 player.domElement.style.height = `${player.height}px`;
                 player.domElement.classList.add('super');
             }
         };
         
         player.shrink = () => {
             if (player.isSuper) {
                 player.isSuper = false;
                 player.height = 48;
                 player.domElement.style.height = `${player.height}px`;
                 player.domElement.classList.remove('super');
                 player.domElement.classList.remove('fire');
                 player.canShootFireball = false;
             }
         };
         
         player.becomeInvincible = (duration = 10000) => {
             player.isInvincible = true;
             player.domElement.classList.add('invincible');
             
             setTimeout(() => {
                 player.isInvincible = false;
                 player.domElement.classList.remove('invincible');
             }, duration);
         };
         
         player.enableFireball = () => {
             player.grow();
             player.canShootFireball = true;
             player.domElement.classList.add('fire');
         };
         
         player.shootFireball = () => {
             if (player.canShootFireball) {
                 const direction = player.domElement.style.transform.includes('scaleX(-1)') ? -1 : 1;
                 const fireball = this.createElement('fireball', 
                     player.x + (direction === 1 ? player.width : -16), 
                     player.y + 16, 
                     16, 16);
                 
                 fireball.velocityX = direction * 8;
                 fireball.velocityY = -2;
                 fireball.affectedByGravity = true;
                 
                 // Supprimer la boule de feu après un certain temps
                 setTimeout(() => {
                     if (this.elements.includes(fireball)) {
                         this.removeElement(fireball);
                     }
                 }, 2000);
                 
                 this.playSound('fireball');
             }
         };
         
         player.update = () => {
             // Gérer les mouvements du joueur en fonction des touches pressées
             if (this.keysPressed['ArrowLeft']) {
                 player.velocityX = -5;
                 player.domElement.style.transform = 'scaleX(-1)';
                 if (player.isOnGround) {
                     player.domElement.style.animation = 'bounce 0.3s infinite alternate';
                 }
             } else if (this.keysPressed['ArrowRight']) {
                 player.velocityX = 5;
                 player.domElement.style.transform = 'scaleX(1)';
                 if (player.isOnGround) {
                     player.domElement.style.animation = 'bounce 0.3s infinite alternate';
                 }
             } else {
                 player.velocityX = 0;
                 if (player.isOnGround) {
                     player.domElement.style.animation = '';
                 }
             }
             
             if (this.keysPressed['ArrowUp'] || this.keysPressed[' ']) {
                 player.jump();
             }
             
             if (this.keysPressed['Shift'] && player.canShootFireball) {
                 if (!player.lastFireballTime || Date.now() - player.lastFireballTime > 500) {
                     player.shootFireball();
                     player.lastFireballTime = Date.now();
                 }
             }
         };
         
         this.player = player;
         return player;
     }
     
     createEnemy(x, y, subType) {
         const enemy = this.createElement('enemy', x, y, 32, subType === 'koopa' ? 48 : 32);
         enemy.subType = subType;
         enemy.domElement.classList.add(subType);
         enemy.velocityX = -2;
         enemy.affectedByGravity = true;
         enemy.isOnGround = false;  // Initialize isOnGround property
         enemy.state = 'walking'; 
         enemy.patrolDistance = 200; // Add patrol distance
         enemy.startX = x; // Track starting position for patrol
         
         // Set initial direction - make the enemy face right
         enemy.domElement.style.transform = `scaleX(-1)`;
         
         enemy.update = () => {
             if (enemy.isOnGround) {
                 // IMPROVED AI BEHAVIOR
                 if (this.player) {
                     const distanceToPlayer = Math.abs(this.player.x - enemy.x);
                     
                     // Patrol behavior when player is not nearby
                     if (distanceToPlayer > 300 && enemy.state === 'walking') {
                         // Patrol back and forth around starting point
                         if (Math.abs(enemy.x - enemy.startX) > enemy.patrolDistance) {
                             enemy.velocityX *= -1;
                             // Update the enemy direction based on movement
                             enemy.domElement.style.transform = `scaleX(${enemy.velocityX < 0 ? -1 : 1})`;
                         }
                     } else if (distanceToPlayer < 300 && enemy.state === 'walking') {
                         // Chase player when nearby
                         const direction = enemy.x > this.player.x ? -1 : 1;
                         enemy.velocityX = direction * (subType === 'koopa' ? 3 : 2); // Koopas are faster
                         // Update the enemy direction based on movement
                         enemy.domElement.style.transform = `scaleX(${enemy.velocityX < 0 ? -1 : 1})`;
                     }
                     
                     // Make koopas jump occasionally when player is above
                     if (enemy.subType === 'koopa' && 
                         this.player.y < enemy.y - 50 && 
                         Math.random() < 0.02 && 
                         enemy.isOnGround) {
                         enemy.velocityY = -10;
                         enemy.isOnGround = false;
                     }
                 }
             }
             
             // Reset isOnGround for each frame to check if the enemy is still on ground
             if (enemy.velocityY === 0 && enemy.isOnGround) {
                 // Only reset if we're currently on ground but need to check again
                 enemy.isOnGround = false;
             }
         };
         
         return enemy;
     }
     
     createPlatform(x, y, width, height, subType = 'ground') {
         const platform = this.createElement('platform', x, y, width, height);
         platform.subType = subType;
         platform.domElement.classList.add(subType);
         
         return platform;
     }
     
     createCoin(x, y) {
         return this.createElement('coin', x, y, 24, 24);
     }
     
     createFlag(x, y, height = 200) {
         return this.createElement('flag', x, y, 8, height);
     }
     
     createCloud(x, y, size = 1) {
         const cloud = this.createElement('cloud', x, y, 96 * size, 64 * size);
         cloud.velocityX = -0.5 - Math.random() * 0.5; // Slow random movement
         
         cloud.update = () => {
             // Move clouds slowly and loop them back when they go off-screen
             if (cloud.x + cloud.width < 0) {
                 cloud.x = this.levelWidth;
             }
         };
         
         return cloud;
     }
     
     createTree(x, y, size = 1) {
         const tree = this.createElement('tree', x, y, 64 * size, 96 * size);
         return tree;
     }
     
     createPipe(x, y, height = 64) {
         const pipe = this.createElement('pipe', x, y, 64, height);
         return pipe;
     }
     
     loadLevel(levelData) {
         this.levelWidth = levelData.width;
         this.levelHeight = levelData.height;
         
         // Reset level-specific states
         this.isRespawning = false;
         
         this.score = 0; // Reset score when loading a level
         
         // Définir la couleur de fond
         this.container.style.backgroundColor = levelData.backgroundColor;
         
         // Créer les plateformes
         for (const platform of levelData.platforms) {
             this.createPlatform(platform.x, platform.y, platform.width, platform.height, platform.type || 'ground');
         }
         
         // Créer les pièces
         for (const coin of levelData.coins) {
             this.createCoin(coin.x, coin.y);
         }
         
         // Créer les power-ups
         for (const powerup of levelData.powerUps) {
             this.createPowerup(powerup.x, powerup.y, powerup.type);
         }
         
         // Créer les ennemis
         for (const enemy of levelData.enemies) {
             this.createEnemy(enemy.x, enemy.y, enemy.type);
         }
         
         // Créer les éléments décoratifs
         if (levelData.decorations) {
             for (const cloud of levelData.decorations.clouds || []) {
                 this.createCloud(cloud.x, cloud.y, cloud.size);
             }
             
             for (const tree of levelData.decorations.trees || []) {
                 this.createTree(tree.x, tree.y, tree.size);
             }
             
             for (const pipe of levelData.decorations.pipes || []) {
                 this.createPipe(pipe.x, pipe.y, pipe.height);
             }
         }
         
         // Créer le drapeau (point d'arrivée)
         this.createFlag(levelData.endPoint.x, levelData.endPoint.y);
         
         // Créer le joueur
         this.createPlayer(levelData.playerSpawn.x, levelData.playerSpawn.y);
         
         // Créer l'interface utilisateur
         this.createUI();
         this.updateLives(this.lives);
     }
     
     createUI() {
         // Créer l'affichage du score
         this.scoreDisplay = document.createElement('div');
         this.scoreDisplay.className = 'ui-element score';
         this.scoreDisplay.textContent = `Score: 0`;
         document.body.appendChild(this.scoreDisplay);
         
         // Créer l'affichage des vies
         this.livesDisplay = document.createElement('div');
         this.livesDisplay.className = 'ui-element lives';
         this.livesDisplay.innerHTML = `Lives: ${'❤️'.repeat(this.lives)}`;
         document.body.appendChild(this.livesDisplay);
     }
     
     updateScore() {
         if (this.scoreDisplay) {
             this.scoreDisplay.textContent = `Score: ${this.score}`;
         }
     }
     
     updateLives(lives) {
         if (this.livesDisplay) {
             this.livesDisplay.innerHTML = `Lives: ${'❤️'.repeat(lives)}`;
         }
     }
     
     handleKeyDown(event) {
         this.keysPressed[event.key] = true;
     }
     
     handleKeyUp(event) {
         this.keysPressed[event.key] = false;
     }
     
     playSound(soundType) {
         // Implémentation simple de sons
         const sounds = {
             'coin': new Audio('sounds/coin.mp3'),
             'jump': new Audio('sounds/jump.mp3'),
             'powerup': new Audio('sounds/powerup.mp3'),
             'stomp': new Audio('sounds/stomp.mp3'),
             'fireball': new Audio('sounds/fireball.mp3'),
             'block-hit': new Audio('sounds/block-hit.mp3'),
             'die': new Audio('sounds/die.mp3'),
             'power-down': new Audio('sounds/power-down.mp3')
         };
         
         if (sounds[soundType]) {
             sounds[soundType].play().catch(e => console.log('Sound play error:', e));
         }
     }
     
     gameOver(win = false) {
         this.stop();
         
         // Créer l'écran de game over
         const gameOverScreen = document.createElement('div');
         gameOverScreen.className = 'game-over';
         
         if (win) {
             gameOverScreen.innerHTML = `Congratulations!<br>You Won!<br>Score: ${this.score}`;
         } else {
             gameOverScreen.innerHTML = `Game Over<br>Score: ${this.score}`;
         }
         
         // Bouton de redémarrage
         const restartButton = document.createElement('button');
         restartButton.textContent = 'Restart';
         restartButton.onclick = () => this.restartGame();
         gameOverScreen.appendChild(restartButton);
         
         this.container.appendChild(gameOverScreen);
     }
     
     levelCompleted() {
         // Passer au niveau suivant ou terminer le jeu
         if (this.currentLevel < this.totalLevels) {
             this.currentLevel++;
             this.loadNextLevel();
         } else {
             this.gameOver(true);
         }
     }
     
     loadNextLevel() {
         // Nettoyer le niveau actuel
         while (this.container.firstChild) {
             this.container.removeChild(this.container.firstChild);
         }
         
         // Réinitialiser les éléments
         this.elements = [];
         this.player = null;
         
         // Charger le niveau suivant
         const nextLevelData = this.levels[this.currentLevel - 1];
         this.loadLevel(nextLevelData);
         this.start();
     }
     
     restartGame() {
         // Réinitialiser tous les paramètres du jeu
         this.score = 0;
         this.currentLevel = 1;
         this.lives = 3;
         this.isRespawning = false;
         
         // Supprimer l'écran de game over
         const gameOverScreen = this.container.querySelector('.game-over');
         if (gameOverScreen) {
             this.container.removeChild(gameOverScreen);
         }
         
         // Nettoyer le niveau actuel
         while (this.container.firstChild) {
             this.container.removeChild(this.container.firstChild);
         }
         
         // Réinitialiser les éléments
         this.elements = [];
         this.player = null;
         
         // Recréer l'interface utilisateur
         this.createUI();
         
         // Charger le premier niveau
         const firstLevelData = this.levels[0];
         this.loadLevel(firstLevelData);
         this.start();
     }
 }
 
 // Exemple de configuration et d'initialisation du jeu
 document.addEventListener('DOMContentLoaded', () => {
     const gameContainer = document.getElementById('game-container');
     const game = new DOMGameEngine('game-container', 800, 600);
 
     // Définir les niveaux
     game.levels = [
         {
             name: "Level 1-1",
             width: 3200,
             height: 600,
             backgroundColor: "#5c94fc",
             playerSpawn: { x: 100, y: 450 },
             endPoint: { x: 3100, y: 400 },
             platforms: [
                 { x: 0, y: 568, width: 3200, height: 32, type: 'ground' },
                 { x: 300, y: 350, width: 128, height: 32, type: 'platform' }, // Lower platform for better access
                 { x: 600, y: 400, width: 128, height: 32, type: 'platform' },
                 { x: 800, y: 300, width: 128, height: 32, type: 'question-block' },
                 { x: 1000, y: 200, width: 128, height: 32, type: 'brick' },
                 // Added stepping platforms to reach higher coins
                 { x: 1250, y: 400, width: 64, height: 32, type: 'platform' },
                 { x: 1350, y: 350, width: 64, height: 32, type: 'platform' },
                 { x: 1400, y: 300, width: 128, height: 32, type: 'platform' },
                 { x: 1550, y: 350, width: 64, height: 32, type: 'platform' },
                 { x: 1600, y: 250, width: 128, height: 32, type: 'platform' },
                 { x: 1750, y: 300, width: 64, height: 32, type: 'platform' },
                 { x: 1800, y: 200, width: 128, height: 32, type: 'platform' }
             ],
             coins: [
                 { x: 300, y: 300 }, // Higher coins are now reachable
                 { x: 350, y: 300 },
                 { x: 400, y: 300 },
                 { x: 1400, y: 250 },
                 { x: 1600, y: 200 },
                 { x: 1800, y: 150 }
             ],
             powerUps: [
                 { x: 700, y: 450, type: 'mushroom' },
                 { x: 1800, y: 450, type: 'star' },
                 { x: 2500, y: 450, type: 'flower' }
             ],
             enemies: [
                 { x: 500, y: 530, type: 'goomba' },
                 { x: 900, y: 530, type: 'koopa' },
                 { x: 1200, y: 530, type: 'goomba' },
                 { x: 1500, y: 530, type: 'goomba' },
                 { x: 1700, y: 530, type: 'koopa' },
                 { x: 2000, y: 530, type: 'goomba' },
                 { x: 2200, y: 530, type: 'koopa' },
                 { x: 2500, y: 530, type: 'goomba' },
                 { x: 2700, y: 530, type: 'goomba' }
             ],
             decorations: {
                 clouds: [
                     { x: 200, y: 100, size: 1 },
                     { x: 600, y: 50, size: 1.5 },
                     { x: 1000, y: 80, size: 1 },
                     { x: 1400, y: 60, size: 1.2 },
                     { x: 1800, y: 100, size: 1 },
                     { x: 2200, y: 70, size: 1.3 },
                     { x: 2600, y: 90, size: 1.1 },
                     { x: 3000, y: 50, size: 1.4 }
                 ],
                 trees: [
                     { x: 100, y: 500, size: 1 },
                     { x: 400, y: 500, size: 0.8 },
                     { x: 700, y: 500, size: 1.2 },
                     { x: 1000, y: 500, size: 1 },
                     { x: 1300, y: 500, size: 0.9 },
                     { x: 1600, y: 500, size: 1.1 },
                     { x: 1900, y: 500, size: 1 },
                     { x: 2200, y: 500, size: 1.2 },
                     { x: 2500, y: 500, size: 0.8 },
                     { x: 2800, y: 500, size: 1 }
                 ],
                 pipes: [
                     { x: 1200, y: 500, height: 96 },
                     { x: 2000, y: 500, height: 96 },
                     { x: 2600, y: 500, height: 96 }
                 ]
             }
         }
         // Additional levels can be added here
     ];
 
     game.totalLevels = game.levels.length;
     game.loadLevel(game.levels[0]);
     game.start();
 });

