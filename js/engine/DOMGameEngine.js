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
         this.gameStarted = false; // Flag to track if game has started
         this.soundEnabled = false; // Default to disabled to prevent 404 errors
         this.isChangingLevel = false; // Flag to prevent multiple level changes
         
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
         
         // Add boundary check at the end
         this.checkBoundaries();
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
         // Prevent multiple collisions with the same coin
         if (coin.isCollected) return;
         coin.isCollected = true;
         
         // Create sparkle effect
         const sparkle = this.createElement('effect', coin.x, coin.y, 32, 32);
         sparkle.domElement.classList.add('sparkle');
         
         // Animate coin collection
         coin.domElement.style.animation = 'collect-coin 0.3s ease-out';
         
         // Play sound immediately to improve response time
         this.playSound('coin');
         
         // Update score immediately
         this.score += 10;
         this.updateScore();
         
         setTimeout(() => {
             // Remove elements if they still exist
             if (this.elements.includes(coin)) {
                 this.removeElement(coin);
             }
             
             if (this.elements.includes(sparkle)) {
                 this.removeElement(sparkle);
             }
         }, 300);
     }
     
     handleEnemyCollision(player, enemy) {
         // Prevent handling collision with already defeated enemies
         if (enemy.state === 'defeated') return;
         
         // Si le joueur saute sur l'ennemi
         if (player.velocityY > 0 && player.y + player.height - player.velocityY <= enemy.y + 10) {
             // Mark enemy as defeated to prevent multiple collisions
             enemy.state = 'defeated';
             
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
             // Player died - FIXED FUNCTIONALITY
             this.playerDied();
         }
     }
     
     playerDied() {
         if (this.isRespawning) return; // Prevent multiple deaths
         
         this.isRespawning = true;
         this.lives--;
         this.updateLives(this.lives);
         
         // Add opacity to make player ghost-like during death
         this.player.domElement.style.opacity = '0.7';
         
         // Show death animation
         this.player.domElement.style.animation = 'death 1s forwards';
         this.playSound('die');
         
         // Pause the game briefly
         this.stop();
         
         // Make sure the player is marked as "dead" to prevent any interactions
         this.player.isDead = true;
         
         // Wait for animation to complete then respawn or game over
         setTimeout(() => {
             // Ensure player DOM element is removed immediately
             if (this.player && this.player.domElement) {
                 // Make the element invisible before any DOM operations
                 this.player.domElement.style.display = 'none';
                 
                 // Explicitly remove from DOM without going through removeElement
                 if (this.player.domElement.parentNode === this.container) {
                     this.container.removeChild(this.player.domElement);
                 }
             }
             
             // Process game outcome
             if (this.lives > 0) {
                 // Clean up the old player completely
                 this.cleanupDeadPlayer();
                 
                 // Short delay before respawn to ensure cleanup is complete
                 setTimeout(() => {
                     this.respawnPlayer();
                 }, 100);
             } else {
                 // Game over
                 this.gameOver(false);
             }
         }, 1000);
     }
     
     cleanupDeadPlayer() {
         // Force remove the player from the elements array
         this.elements = this.elements.filter(el => el !== this.player && el.type !== 'player');
         
         // Clear player reference
         this.player = null;
     }
     
     respawnPlayer() {
         // Double-check that no player elements exist
         this.elements = this.elements.filter(el => el.type !== 'player');
         
         // Create a new player at the spawn point
         const currentLevel = this.levels[this.currentLevel - 1];
         if (!currentLevel || !currentLevel.playerSpawn) {
             console.error("Missing level data for respawn");
             return;
         }
         
         // Create the new player - we're sure there's no existing player reference
         this.createPlayer(currentLevel.playerSpawn.x, currentLevel.playerSpawn.y);
         
         // Verify that we only have one player
         const playerCount = this.elements.filter(el => el.type === 'player').length;
         if (playerCount > 1) {
             console.error(`Found ${playerCount} players after respawn!`);
             // Emergency fix: keep only the newest player
             const allPlayers = this.elements.filter(el => el.type === 'player');
             const latestPlayer = allPlayers[allPlayers.length - 1];
             this.elements = this.elements.filter(el => el.type !== 'player');
             this.elements.push(latestPlayer);
             this.player = latestPlayer;
         }
         
         // Show temporary invincibility
         this.player.becomeInvincible(3000);
         
         // Reset the flags and restart the game
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
         // Check if the element's DOM node is actually a child of the container
         // This prevents "Failed to execute 'removeChild' on 'Node'" errors
         if (element.domElement && element.domElement.parentNode === this.container) {
             // Supprimer l'élément DOM
             this.container.removeChild(element.domElement);
         } else {
             console.log('Warning: Attempted to remove an element that is not a child of the container');
         }
         
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
         
         // Ensure enemy is visible by setting content
         if (subType === 'goomba') {
             enemy.domElement.innerHTML = '<span style="font-size:32px;">👾</span>';
         } else if (subType === 'koopa') {
             enemy.domElement.innerHTML = '<span style="font-size:32px;">🐢</span>';
         }
         
         // Set initial direction - make the enemy face right
         enemy.domElement.style.transform = `scaleX(-1)`;
         
         // Fix for initial ground collision detection
         // Force a collision check at creation
         setTimeout(() => {
             // Check all platforms for collision with this enemy
             for (const platform of this.elements.filter(e => e.type === 'platform')) {
                 if (this.isColliding(enemy, platform)) {
                     this.handlePlatformCollision(enemy, platform);
                 }
             }
         }, 50);
         
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
         
         // Add size class for different cloud styles
         if (size < 1) {
             cloud.domElement.classList.add('small');
         } else if (size > 1) {
             cloud.domElement.classList.add('large');
         }
         
         // Add slight vertical variation to animation
         cloud.domElement.style.animationDelay = `${Math.random() * 5}s`;
         
         // Check if cloud image loads properly and use fallback if not
         setTimeout(() => {
             // Check if computed background is transparent/empty
             const style = window.getComputedStyle(cloud.domElement, '::before');
             const bgImage = style.backgroundImage;
             
             if (!bgImage || bgImage === 'none' || bgImage.includes('undefined')) {
                 cloud.domElement.classList.add('image-failed');
             }
         }, 500);
         
         cloud.update = () => {
             // Move clouds slowly and loop them back when they go off-screen
             if (cloud.x + cloud.width < 0) {
                 cloud.x = this.levelWidth;
                 cloud.y = 50 + Math.random() * 150; // Random height when re-entering
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
         if (!levelData) {
             console.error("Level data is undefined!");
             return;
         }
         
         this.levelWidth = levelData.width;
         this.levelHeight = levelData.height;
         
         // Reset level-specific states but keep score and lives
         this.isRespawning = false;
         
         // Définir la couleur de fond
         this.container.style.backgroundColor = levelData.backgroundColor;
         
         // Safely create level elements
         if (levelData.platforms && Array.isArray(levelData.platforms)) {
             for (const platform of levelData.platforms) {
                 this.createPlatform(platform.x, platform.y, platform.width, platform.height, platform.type || 'ground');
             }
         }
         
         if (levelData.coins && Array.isArray(levelData.coins)) {
             for (const coin of levelData.coins) {
                 this.createCoin(coin.x, coin.y);
             }
         }
         
         if (levelData.powerUps && Array.isArray(levelData.powerUps)) {
             for (const powerup of levelData.powerUps) {
                 this.createPowerup(powerup.x, powerup.y, powerup.type);
             }
         }
         
         if (levelData.enemies && Array.isArray(levelData.enemies)) {
             for (const enemy of levelData.enemies) {
                 this.createEnemy(enemy.x, enemy.y, enemy.type);
             }
         }
         
         if (levelData.decorations) {
             for (const cloud of levelData.decorations.clouds || []) {
                 this.createCloud(cloud.x, cloud.y, cloud.size || Math.random() * 0.5 + 0.8); // Random sizes
             }
             
             for (const tree of levelData.decorations.trees || []) {
                 this.createTree(tree.x, tree.y, tree.size);
             }
             
             for (const pipe of levelData.decorations.pipes || []) {
                 this.createPipe(pipe.x, pipe.y, pipe.height);
             }
         }
         
         this.createFlag(levelData.endPoint.x, levelData.endPoint.y);
         this.createPlayer(levelData.playerSpawn.x, levelData.playerSpawn.y);
         this.createUI();
         this.updateLives(this.lives);
     }
     
     createUI() {
         // Remove any existing UI elements first
         this.cleanupUI();
         
         // Create new UI elements
         this.scoreDisplay = document.createElement('div');
         this.scoreDisplay.className = 'ui-element score';
         this.scoreDisplay.textContent = `Score: ${this.score}`;
         document.body.appendChild(this.scoreDisplay);
         
         this.livesDisplay = document.createElement('div');
         this.livesDisplay.className = 'ui-element lives';
         this.livesDisplay.innerHTML = `Lives: ${'❤️'.repeat(this.lives)}`;
         document.body.appendChild(this.livesDisplay);
     }
     
     cleanupUI() {
         // Remove UI elements to prevent duplicates
         if (this.scoreDisplay && document.body.contains(this.scoreDisplay)) {
             document.body.removeChild(this.scoreDisplay);
             this.scoreDisplay = null;
         }
         
         if (this.livesDisplay && document.body.contains(this.livesDisplay)) {
             document.body.removeChild(this.livesDisplay);
             this.livesDisplay = null;
         }
         
         // Supprimer l'écran de game over
         const gameOverScreen = this.container.querySelector('.game-over');
         if (gameOverScreen) {
             this.container.removeChild(gameOverScreen);
         }
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
     
     checkBoundaries() {
         // Check if player has fallen out of bounds
         if (this.player && this.player.y > this.levelHeight + 100) {
             this.playerDied();
         }
         
         // Remove elements that have fallen out of bounds
         for (let i = this.elements.length - 1; i >= 0; i--) {
             const element = this.elements[i];
             if (element !== this.player && element.y > this.levelHeight + 200) {
                 this.removeElement(element);
             }
         }
     }
     
     handleKeyDown(event) {
         this.keysPressed[event.key] = true;
     }
     
     handleKeyUp(event) {
         this.keysPressed[event.key] = false;
     }
     
     playSound(soundType) {
         // Check if sounds are enabled - can be toggled in options
         if (!this.soundEnabled) return;
         
         // More reliable sound URLs using short sounds
         const soundURLs = {
             'coin': 'https://assets.mixkit.co/sfx/preview/mixkit-coin-flip-1971.mp3',
             'jump': 'https://assets.mixkit.co/sfx/preview/mixkit-player-jumping-in-a-video-game-2043.mp3',
             'powerup': 'https://assets.mixkit.co/sfx/preview/mixkit-game-level-completed-2059.mp3',
             'stomp': 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3',
             'fireball': 'https://assets.mixkit.co/sfx/preview/mixkit-short-laser-gun-shot-1670.mp3',
             'block-hit': 'https://assets.mixkit.co/sfx/preview/mixkit-video-game-retro-click-237.mp3',
             'die': 'https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3',
             'power-down': 'https://assets.mixkit.co/sfx/preview/mixkit-game-show-buzz-in-3090.mp3'
         };
         
         // Safe check for the sound type
         if (!soundType || !soundURLs[soundType]) return;
         
         try {
             // Create a new Audio object each time to allow overlapping sounds
             const sound = new Audio(soundURLs[soundType]);
             
             // Set volume lower because these sounds might be louder
             sound.volume = 0.3;
             
             // Use a simple state check to avoid autoplay issues
             // This pattern helps with browsers that block autoplay
             let playAttempt = setInterval(() => {
                 sound.play()
                     .then(() => {
                         clearInterval(playAttempt);
                     })
                     .catch(e => {
                         console.log("Auto-play blocked, waiting for user interaction", e);
                         // We'll try again in the interval
                     });
             }, 300);
             
             // Clear the interval after 2 seconds if it hasn't played yet
             setTimeout(() => {
                 clearInterval(playAttempt);
             }, 2000);
             
         } catch (e) {
             console.error('Error creating audio:', e);
         }
     }
     
     gameOver(win = false) {
         // Ensure game is stopped
         this.isGameRunning = false;
         
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
         // Flag to prevent multiple level completions
         if (this.isChangingLevel) return;
         this.isChangingLevel = true;
         
         // Show completion animation/effect
         this.playSound('powerup');
         
         // Wait a moment before changing level
         setTimeout(() => {
             // Passer au niveau suivant ou terminer le jeu
             if (this.currentLevel < this.totalLevels) {
                 this.currentLevel++;
                 this.loadNextLevel();
             } else {
                 this.gameOver(true);
             }
             
             this.isChangingLevel = false;
         }, 1000);
     }
     
     loadNextLevel() {
         // Nettoyer le niveau actuel
         this.clearLevel();
         
         // Charger le niveau suivant
         const nextLevelData = this.levels[this.currentLevel - 1];
         this.loadLevel(nextLevelData);
         this.start();
     }
     
     clearLevel() {
         // Safely remove all elements and clear the container
         while (this.container.firstChild) {
             this.container.removeChild(this.container.firstChild);
         }
         
         // Reset elements array
         this.elements = [];
         this.player = null;
     }
     
     restartGame() {
         // Réinitialiser tous les paramètres du jeu
         this.score = 0;
         this.currentLevel = 1;
         this.lives = 3;
         this.isRespawning = false;
         
         // Safe removal of UI elements
         this.cleanupUI();
         
         // Nettoyer le niveau actuel
         this.clearLevel();
         
         // Recréer l'interface utilisateur
         this.createUI();
         
         // Charger le premier niveau
         const firstLevelData = this.levels[0];
         this.loadLevel(firstLevelData);
         this.start();
     }
     
     showLoadingScreen() {
         // Create loading screen
         this.loadingScreen = document.createElement('div');
         this.loadingScreen.className = 'loading-screen';
         
         const loadingText = document.createElement('div');
         loadingText.className = 'loading-text';
         loadingText.textContent = 'Loading...';
         
         const loadingBarContainer = document.createElement('div');
         loadingBarContainer.className = 'loading-bar-container';
         
         const loadingBar = document.createElement('div');
         loadingBar.className = 'loading-bar';
         
         loadingBarContainer.appendChild(loadingBar);
         this.loadingScreen.appendChild(loadingText);
         this.loadingScreen.appendChild(loadingBarContainer);
         
         document.body.appendChild(this.loadingScreen);
         
         // Simulate loading progress
         let progress = 0;
         const loadingInterval = setInterval(() => {
             progress += Math.random() * 10;
             if (progress >= 100) {
                 progress = 100;
                 clearInterval(loadingInterval);
                 
                 // Wait a bit then show menu
                 setTimeout(() => {
                     this.loadingScreen.style.opacity = '0';
                     setTimeout(() => {
                         document.body.removeChild(this.loadingScreen);
                         this.showMenu();
                     }, 500);
                 }, 500);
             }
             loadingBar.style.width = `${progress}%`;
         }, 200);
     }
     
     showMenu() {
         this.menuScreen = document.createElement('div');
         this.menuScreen.className = 'menu-screen';
         
         const gameTitle = document.createElement('div');
         gameTitle.className = 'game-title';
         gameTitle.textContent = 'SUPER MARIO CLONE';
         
         const menuButtons = document.createElement('div');
         menuButtons.className = 'menu-buttons';
         
         // Play button
         const playButton = document.createElement('div');
         playButton.className = 'menu-button';
         playButton.textContent = 'Play';
         playButton.addEventListener('click', () => {
             this.hideMenu();
             this.startGame();
         });
         
         // Leaderboard button
         const leaderboardButton = document.createElement('div');
         leaderboardButton.className = 'menu-button';
         leaderboardButton.textContent = 'Leaderboard';
         leaderboardButton.addEventListener('click', () => {
             alert('Leaderboard feature coming soon!');
         });
         
         // Options button
         const optionsButton = document.createElement('div');
         optionsButton.className = 'menu-button';
         optionsButton.textContent = 'Options';
         optionsButton.addEventListener('click', () => {
             // Toggle sound option when options is clicked
             this.soundEnabled = !this.soundEnabled;
             alert(`Sounds ${this.soundEnabled ? 'enabled' : 'disabled'}`);
         });
         
         menuButtons.appendChild(playButton);
         menuButtons.appendChild(leaderboardButton);
         menuButtons.appendChild(optionsButton);
         
         this.menuScreen.appendChild(gameTitle);
         this.menuScreen.appendChild(menuButtons);
         
         document.body.appendChild(this.menuScreen);
     }
     
     hideMenu() {
         if (this.menuScreen) {
             this.menuScreen.style.opacity = '0';
             setTimeout(() => {
                 document.body.removeChild(this.menuScreen);
             }, 500);
         }
     }
     
     startGame() {
         this.gameStarted = true;
         const firstLevelData = this.levels[0];
         this.loadLevel(firstLevelData);
         this.start();
     }
     
     static initialize(containerId, width, height) {
         const game = new DOMGameEngine(containerId, width, height);
         
         // Define levels
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
                     { x: 300, y: 350, width: 128, height: 32, type: 'platform' },
                     { x: 600, y: 400, width: 128, height: 32, type: 'platform' },
                     { x: 800, y: 300, width: 128, height: 32, type: 'question-block' },
                     { x: 1000, y: 200, width: 128, height: 32, type: 'brick' },
                     { x: 1250, y: 400, width: 64, height: 32, type: 'platform' },
                     { x: 1350, y: 350, width: 64, height: 32, type: 'platform' },
                     { x: 1400, y: 300, width: 128, height: 32, type: 'platform' },
                     { x: 1550, y: 350, width: 64, height: 32, type: 'platform' },
                     { x: 1600, y: 250, width: 128, height: 32, type: 'platform' },
                     { x: 1750, y: 300, width: 64, height: 32, type: 'platform' },
                     { x: 1800, y: 200, width: 128, height: 32, type: 'platform' }
                 ],
                 coins: [
                     { x: 300, y: 300 },
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
         ];
         
         game.totalLevels = game.levels.length;
         
         // Show loading screen first
         game.showLoadingScreen();
         
         return game;
     }
 }

 // Use the new initialization method
 document.addEventListener('DOMContentLoaded', () => {
     const game = DOMGameEngine.initialize('game-container', 800, 600);
 });

