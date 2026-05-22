import { gameState } from './state.js';
import { maxPlayerHealth, maxEnemyHealth } from './constants.js';
import { playBGM } from './audio.js';

// Central DOM elements mapper
export const elements = {
    playerHpBar: document.getElementById('playerHp'),
    enemyHpBar: document.getElementById('enemyHp'),
    player: document.getElementById('player'),
    enemy: document.getElementById('enemy'),
    startCombatBtn: document.getElementById('startCombatBtn'),
    battleLog: document.getElementById('battleLog'),
    lightText: document.getElementById('lightText'),
    enemyLightText: document.getElementById('enemyLightText'),
    sanityText: document.getElementById('sanityText'),
    enemySanityText: document.getElementById('enemySanityText'),
    playerQueueText: document.getElementById('playerQueueText'),
    enemyQueueText: document.getElementById('enemyQueueText'),
    handContainer: document.getElementById('handContainer'),
    gameStage: document.getElementById('game'),
    
    // Limbus Results Overlay Elements
    resultsScreen: document.getElementById('resultsScreen'),
    resultsTitle: document.getElementById('resultsTitle'),
    resultsSubtitle: document.getElementById('resultsSubtitle'),
    resultsGrade: document.getElementById('resultsGrade'),
    statTurns: document.getElementById('statTurns'),
    statSanity: document.getElementById('statSanity'),
    restartBtn: document.getElementById('restartBtn')
};

export function updateUI() {
    const { 
        lightText, 
        enemyLightText, 
        sanityText, 
        playerHpBar, 
        enemySanityText, 
        enemyHpBar, 
        playerQueueText, 
        enemyQueueText 
    } = elements;
    
    // Tampilkan Light dan Emotion Level
    if (lightText) {
        lightText.innerText = `Light: ${gameState.playerLight}/${gameState.maxLight} | Emotion: Lv.${gameState.playerEmotionLevel} (${gameState.playerEmotionPoints}/3)`;
    }
    if (enemyLightText) {
        enemyLightText.innerText = `Enemy Light: ${gameState.enemyLight}/${gameState.maxLight} | Emotion: Lv.${gameState.enemyEmotionLevel}`;
    }
    
    if (sanityText) sanityText.innerText = `Sanity: ${gameState.sanity}`;
    
    if (playerHpBar) {
        playerHpBar.style.width = (gameState.playerHealth / maxPlayerHealth * 100) + '%';
        playerHpBar.style.background = gameState.playerStagger ? '#ff0000' : 'linear-gradient(90deg, #111111 0%, #666666 100%)';
        
        if (playerHpBar.parentElement && playerHpBar.parentElement.nextElementSibling) {
            playerHpBar.parentElement.nextElementSibling.innerText = 
                `Sanity: ${gameState.sanity} ${gameState.playerStagger ? '[STAGGERED]' : ''}`;
        }
    }
    
    if (enemyHpBar) {
        enemyHpBar.style.width = (gameState.enemyHealth / maxEnemyHealth * 100) + '%';
        enemyHpBar.style.background = gameState.enemyStagger ? '#ff0000' : 'linear-gradient(90deg, #111111 0%, #666666 100%)';
    }

    if (enemySanityText) {
        enemySanityText.innerText = `Enemy Sanity: ${gameState.enemySanity} ${gameState.enemyStagger ? '[STAGGERED]' : ''}`;
    }
    
    // Menampilkan antrean beserta dadu kecepatan yang dipasangkan
    if (playerQueueText) {
        playerQueueText.innerText = gameState.playerQueue.length > 0 
            ? gameState.playerQueue.map(q => `[Speed ${q.speed}] ${q.card.name}`).join(' -> ') 
            : `Dadu Kecepatan: [ ${gameState.playerSpeedDice.join(' | ')} ]`;
    }
    
    if (enemyQueueText) {
        enemyQueueText.innerText = gameState.combatPhase 
            ? gameState.enemyQueue.map(q => `[Speed ${q.speed}] ${q.card.name}`).join(' -> ') 
            : `Dadu Kecepatan Musuh: [ ${gameState.enemySpeedDice.join(' | ')} ]`;
    }
}

export function renderHand() {
    const { handContainer } = elements;
    if (!handContainer) return;
    
    handContainer.innerHTML = '';
    if (gameState.combatPhase) return; 

    gameState.playerHand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.type}`;
        cardDiv.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-power">Dice: ${card.power}</div>
        `;
        
        let currentQueuedCost = gameState.playerQueue.reduce((sum, q) => sum + q.card.cost, 0);
        
        // Batasi jumlah kartu yang bisa dipilih berdasarkan jumlah Speed Dice yang tersedia
        const maxSlots = gameState.playerSpeedDice.length;
        const slotsFull = gameState.playerQueue.length >= maxSlots;

        if (gameState.playerLight - currentQueuedCost < card.cost || slotsFull) {
            cardDiv.classList.add('disabled');
        }

        cardDiv.addEventListener('click', () => {
            playBGM();
            if (gameState.playerLight - currentQueuedCost >= card.cost && !slotsFull) {
                // Pasangkan kartu dengan Speed Die yang kosong secara berurutan
                const assignedSpeed = gameState.playerSpeedDice[gameState.playerQueue.length];
                gameState.playerQueue.push({ card: card, speed: assignedSpeed });
                
                gameState.playerHand.splice(index, 1);
                renderHand();
                updateUI();
            }
        });
        handContainer.appendChild(cardDiv);
    });
}

export function showResultsScreen(isVictory) {
    const { resultsScreen, resultsTitle, resultsSubtitle, resultsGrade, statTurns, statSanity } = elements;
    if (!resultsScreen) return;

    // Tentukan tema visual hasil pertarungan (Limbus Company Style)
    if (isVictory) {
        resultsScreen.className = "results-overlay victory-theme";
        resultsTitle.innerText = "VICTORY";
        resultsSubtitle.innerText = "ALL TARGETS NEUTRALIZED";
        resultsGrade.innerText = "EX";
    } else {
        resultsScreen.className = "results-overlay defeat-theme";
        resultsTitle.innerText = "DEFEAT";
        resultsSubtitle.innerText = "E.G.O CORROSION DETECTED";
        resultsGrade.innerText = "FAIL";
    }

    // Ambil data statistik dari game
    if (statTurns) statTurns.innerText = gameState.maxLight - 3; // Estimasi Turn
    if (statSanity) statSanity.innerText = gameState.sanity;

    // Munculkan layar transisi hasil secara halus
    resultsScreen.classList.remove('hidden');
    setTimeout(() => {
        resultsScreen.classList.add('show');
    }, 50);
}