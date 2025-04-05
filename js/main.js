// Main.js - Initialize the game and levels

document.addEventListener('DOMContentLoaded', () => {
    // Create the game instance
    const game = DOMGameEngine.initialize('game-container', 800, 600);
    
    // Define the levels
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
        // Additional levels can be added here
    ];
    
    game.totalLevels = game.levels.length;
});
