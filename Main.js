import { gameState } from 'state.js';
import { elements, updateUI, renderHand } from 'ui.js';
import { 
    drawCard, 
    generateEnemyQueue, 
    executeCombatLoop, 
    endTurnPhase,
    rollSpeedDice // BARU
} from 'combat.js';

function hitungKoordinatPanggung() {
    if (!elements.gameStage) return;
    let stageWidth = elements.gameStage.offsetWidth;
    gameState.playerStart = stageWidth * 0.1;
    gameState.enemyStart = stageWidth * 0.1;
    gameState.clashDistance = (stageWidth / 2) - 90; 
}

window.addEventListener('resize', () => {
    hitungKoordinatPanggung();
});

if (elements.startCombatBtn) {
    elements.startCombatBtn.addEventListener('click', () => {
        if (gameState.combatPhase || gameState.playerHealth <= 0 || gameState.enemyHealth <= 0) return;

        hitungKoordinatPanggung();

        gameState.playerMemulaiTurnTanpaAksi = (gameState.playerQueue.length === 0);
        gameState.enemyMemulaiTurnTanpaAksi = (gameState.enemyQueue.length === 0);

        if (gameState.playerQueue.length === 0 && gameState.enemyQueue.length === 0) {
            elements.battleLog.innerText = "Kedua pihak tidak memilih aksi! Turn dilewati langsung.";
            setTimeout(() => { endTurnPhase(); }, 1200);
            return;
        }

        gameState.combatPhase = true;
        elements.startCombatBtn.style.display = 'none'; 
        renderHand(); 
        executeCombatLoop();
    });
}

// Binding tombol Restart
if (elements.restartBtn) {
    elements.restartBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

// INITIALIZATION
function initGame() {
    hitungKoordinatPanggung();

    // Deal Initial Hands (4 Cards Each)
    while (gameState.playerHand.length < 4) {
        gameState.playerHand.push(drawCard(gameState.playerHand));
    }
    while (gameState.enemyHand.length < 4) {
        gameState.enemyHand.push(drawCard(gameState.enemyHand));
    }

    // BARU: Lempar Dadu Kecepatan di awal pertarungan!
    rollSpeedDice('player');
    rollSpeedDice('enemy');

    generateEnemyQueue();
    renderHand();
    updateUI();
}

initGame();
