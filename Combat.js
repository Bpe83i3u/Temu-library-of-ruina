import { gameState } from './state.js';
import { cardDatabase, maxHandSize, staggerThreshold } from './constants.js';
import { elements, updateUI, renderHand, showResultsScreen } from './ui.js';
import { playHurtSFX, playClashSFX, playBGM, playVictoryChime, playDefeatDrone } from './audio.js';
import { screenFlash, createHitEffect, playerHitEffect, triggerLimbusImpactShake } from './vfx.js';

// Roll coin untuk adu dadu clash
export function rollCoin(sp) {
    const chance = 0.5 + (sp / 100); 
    return Math.random() < chance ? 6 : -2;
}

// Kocok Dadu Kecepatan (Library of Ruina style)
// Kocok Dadu Kecepatan dengan batas maksimal yang lebih besar (Library of Ruina Endgame)
export function rollSpeedDice(owner) {
    let diceCount = 2; // Default awal game langsung dapet 2 Dadu (Maks 2 kartu)

    if (owner === 'player') {
        if (gameState.playerEmotionLevel >= 4) {
            diceCount = 4; // Emotion Lv 4-5 dapet 4 Dadu (Maks 4 kartu)
        } else if (gameState.playerEmotionLevel >= 2) {
            diceCount = 3; // Emotion Lv 2-3 dapet 3 Dadu (Maks 3 kartu)
        }
    } else {
        // Musuh juga mengikuti skala Emotion Level-nya sendiri
        if (gameState.enemyEmotionLevel >= 4) {
            diceCount = 4;
        } else if (gameState.enemyEmotionLevel >= 2) {
            diceCount = 3;
        }
    }

    const rolls = [];
    for (let i = 0; i < diceCount; i++) {
        rolls.push(Math.floor(Math.random() * 6) + 1); // Kocok dadu 1-6
    }
    // Urutkan dadu dari nilai tertinggi
    rolls.sort((a, b) => b - a);

    if (owner === 'player') gameState.playerSpeedDice = rolls;
    else gameState.enemySpeedDice = rolls;
}

// Tambah Emotion Points
export function gainEmotionPoints(target, points) {
    if (target === 'player') {
        gameState.playerEmotionPoints += points;
        if (gameState.playerEmotionPoints >= 3 && gameState.playerEmotionLevel < 5) {
            gameState.playerEmotionLevel++;
            gameState.playerEmotionPoints = 0;
            gameState.playerLight = Math.min(gameState.maxLight + 1, 12); // Level up memulihkan Light sepenuhnya
            if (gameState.maxLight < 12) gameState.maxLight++;
            elements.battleLog.innerText = `✨ EMOTION LEVEL UP! Player mencapai Level ${gameState.playerEmotionLevel}!`;
        }
    } else {
        gameState.enemyEmotionPoints += points;
        if (gameState.enemyEmotionPoints >= 3 && gameState.enemyEmotionLevel < 5) {
            gameState.enemyEmotionLevel++;
            gameState.enemyEmotionPoints = 0;
            gameState.enemyLight = Math.min(gameState.maxLight + 1, 12); // Musuh juga pulih Light saat Level Up
            elements.battleLog.innerText = `😈 EMOTION LEVEL UP! Musuh mencapai Level ${gameState.enemyEmotionLevel}!`;
        }
    }
    updateUI();
}

export function checkStagger(targetType, currentHp) {
    if (currentHp <= staggerThreshold) {
        if (targetType === 'player' && gameState.playerStagger === 0) {
            gameState.playerStagger = 1;
            elements.battleLog.innerText = "⚠️ PLAYER STAGGERED! Pertahanan jebol!";
        } else if (targetType === 'enemy' && gameState.enemyStagger === 0) {
            gameState.enemyStagger = 1;
            elements.battleLog.innerText = "⚠️ ENEMY STAGGERED! Musuh tidak berdaya!";
        }
    }
}

export function dealDamage(target, amount) {
    if (target === 'player') {
        gameState.playerHealth = Math.max(0, gameState.playerHealth - amount);
        checkStagger('player', gameState.playerHealth);
    } else if (target === 'enemy') {
        gameState.enemyHealth = Math.max(0, gameState.enemyHealth - amount);
        checkStagger('enemy', gameState.enemyHealth);
    }
    updateUI();
    checkGameOver();
}

export function checkGameOver() {
    const { gameStage, startCombatBtn } = elements;
    if (gameState.playerHealth <= 0) {
        if (startCombatBtn) startCombatBtn.style.display = 'none';
        triggerLimbusImpactShake(gameStage);
        playDefeatDrone();
        showResultsScreen(false);
        return true;
    } 
    if (gameState.enemyHealth <= 0 && gameState.enemyPhase === 2) {
        if (startCombatBtn) startCombatBtn.style.display = 'none';
        triggerLimbusImpactShake(gameStage);
        playVictoryChime();
        showResultsScreen(true);
        return true;
    }
    return false;
}

export function drawCard(hand) {
    let randomCard = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    let defendCount = hand.filter(c => c.type === 'defend').length;
    if (randomCard.type === 'defend' && defendCount >= 2) {
        const attackCards = cardDatabase.filter(c => c.type === 'attack');
        randomCard = attackCards[Math.floor(Math.random() * attackCards.length)];
    }
    return { ...randomCard, instanceId: Math.random() };
}

export function fillPlayerHand() {
    const cardsToDraw = Math.floor(Math.random() * 4) + 1; 
    let drawn = 0;
    while (gameState.playerHand.length < maxHandSize && drawn < cardsToDraw) {
        gameState.playerHand.push(drawCard(gameState.playerHand));
        drawn++;
    }
    renderHand();
}

export function fillEnemyHand() {
    const cardsToDraw = Math.floor(Math.random() * 4) + 1;
    let drawn = 0;
    while (gameState.enemyHand.length < maxHandSize && drawn < cardsToDraw) {
        gameState.enemyHand.push(drawCard(gameState.enemyHand));
        drawn++;
    }
}

export function generateEnemyQueue() {
    gameState.enemyQueue = [];
    let tempLight = gameState.enemyLight;
    const totalSlotAksi = gameState.enemySpeedDice.length;

    for (let i = 0; i < totalSlotAksi; i++) {
        let affordableCards = gameState.enemyHand.filter(c => c.cost <= tempLight);
        if (affordableCards.length === 0) break;
        
        let randomIndex = Math.floor(Math.random() * affordableCards.length);
        let chosenCard = affordableCards[randomIndex];

        const assignedSpeed = gameState.enemySpeedDice[i];
        gameState.enemyQueue.push({ card: chosenCard, speed: assignedSpeed });
        tempLight -= chosenCard.cost;

        let realIndex = gameState.enemyHand.findIndex(c => c.instanceId === chosenCard.instanceId);
        if (realIndex !== -1) gameState.enemyHand.splice(realIndex, 1);
    }
}

export function executeCombatLoop() {
    const { player, enemy, battleLog, gameStage } = elements;

    if (gameState.playerHealth <= 0 || (gameState.enemyHealth <= 0 && gameState.enemyPhase === 2)) {
        return;
    }

    if (gameState.playerQueue.length === 0 && gameState.enemyQueue.length === 0) {
        endTurnPhase();
        return;
    }

    gameState.playerQueue.sort((a, b) => b.speed - a.speed);
    gameState.enemyQueue.sort((a, b) => b.speed - a.speed);

    let pAction = gameState.playerQueue.shift();
    let eAction = gameState.enemyQueue.shift();

    let pCard = pAction ? pAction.card : null;
    let eCard = eAction ? eAction.card : null;

    // Skenario One-Sided Serangan Sepihak atau Defense
    if (!pCard && eCard) {
        if (eCard.type === 'defend' || eCard.type === 'dodge' || eCard.type === 'counter') {
            battleLog.innerText = `Musuh bersiap bertahan (${eCard.name}), tetapi kamu diam. Sesi dilewati!`;
            gameState.enemyLight -= eCard.cost;
            updateUI();
            setTimeout(executeCombatLoop, 1000);
        } else {
            battleLog.innerText = `ONE-SIDED PUNISH! Musuh menghantam cepat [Speed ${eAction.speed}] dengan ${eCard.name}!`;
            gameState.enemyLight -= eCard.cost;
            playHurtSFX(); 
            executeOneSidedEnemy(eCard);
        }
        return;
    }
    
    if (pCard && !eCard) {
        if (pCard.type === 'defend' || pCard.type === 'dodge' || pCard.type === 'counter') {
            battleLog.innerText = `Kamu bersiap bertahan (${pCard.name}), tetapi musuh diam. Sesi dilewati!`;
            gameState.playerLight -= pCard.cost;
            updateUI();
            setTimeout(executeCombatLoop, 1000);
        } else {
            battleLog.innerText = `ONE-SIDED PUNISH! Kamu menyabet musuh [Speed ${pAction.speed}] dengan ${pCard.name}!`;
            gameState.playerLight -= pCard.cost;
            playHurtSFX(); 
            executeOneSidedPlayer(pCard);
        }
        return;
    }

    // Clash terjadi
    gameState.playerLight -= pCard.cost;
    gameState.enemyLight -= eCard.cost;
    updateUI();

    battleLog.innerText = `CLASH SPEED (${pAction.speed} VS ${eAction.speed}): ${pCard.name} VS ${eCard.name}!`;
    
    player.style.transition = 'left 0.35s ease-out';
    enemy.style.transition = 'right 0.35s ease-out';
    player.style.left = gameState.clashDistance + 'px';
    enemy.style.right = gameState.clashDistance + 'px';

    setTimeout(() => {
        if (pCard.type === 'attack') player.className = pCard.id;
        else if (pCard.type === 'defend' || pCard.type === 'counter') player.className = 'player-guard';
        else player.className = 'evade-flip';

        if (eCard.type === 'attack') enemy.className = 'enemy-' + eCard.id;
        else if (eCard.type === 'defend') enemy.className = 'enemy-guard';
        else if (eCard.type === 'counter') enemy.className = 'enemy-counter-pose';
        else enemy.className = 'enemy-evade';

        setTimeout(() => {
            let pPower = pCard.power + rollCoin(gameState.sanity);
            let ePower = eCard.power + rollCoin(gameState.enemySanity);

            if (pCard.type === 'attack' && eCard.type === 'attack') {
                if (pPower > ePower) {
                    playHurtSFX(); 
                    resolveAttackHit(true, pCard.id, 14);
                    
                    // KEDUA PIHAK DAPAT EMOSI (Pemenang dapat 2, yang kalah dapat 1 karena menerima damage)
                    gainEmotionPoints('player', 2); 
                    gainEmotionPoints('enemy', 1);  
                } else if (pPower < ePower) {
                    playHurtSFX(); 
                    resolveAttackHit(false, eCard.id, 14);
                    
                    gainEmotionPoints('enemy', 2);
                    gainEmotionPoints('player', 1);
                } else {
                    playClashSFX(); 
                    battleLog.innerText = "CLASH DRAW! Senjata beradu seimbang!";
                    screenFlash(gameStage, '#ffff0022');
                    
                    // Draw Clash memberikan poin emosi seimbang ke kedua belah pihak
                    gainEmotionPoints('player', 1);
                    gainEmotionPoints('enemy', 1);
                }
                updateUI();
                checkAndTriggerPhase2();
            } 
            else if (pCard.type === 'counter' && eCard.type === 'attack') {
                battleLog.innerText = `COUNTER STRIKE SIAGA! Menahan serangan musuh...`;
                playClashSFX(); 
                
                let dmgKePlayer = Math.floor(ePower * 0.6);
                dealDamage('player', dmgKePlayer);
                playerHitEffect(player);
                player.className = 'player-hit';
                screenFlash(gameStage, '#ff000023');
                updateUI();

                setTimeout(() => {
                    battleLog.innerText = `COUNTER STRIKE! Memukul balik musuh dengan telak!`;
                    playHurtSFX(); 
                    dealDamage('enemy', 20);
                    
                    // Counter berhasil: Player dapat 2, musuh yang dipukul dapat 1
                    gainEmotionPoints('player', 2);
                    gainEmotionPoints('enemy', 1);
                    
                    enemy.className = 'enemy-hurt-counter enemy-damaged';
                    createHitEffect(gameStage);
                    screenFlash(gameStage, '#ffffff22');
                    
                    updateUI();
                    checkAndTriggerPhase2();
                }, 500);
            }
            else if (pCard.type === 'defend' && eCard.type === 'attack') {
                let diff = ePower - pPower;
                if (diff > 0) {
                    playHurtSFX(); 
                    dealDamage('player', diff);
                    playerHitEffect(player);
                    battleLog.innerText = `BLOCK Tembus! Menerima sisa ${diff} Damage.`;
                    
                    gainEmotionPoints('enemy', 2); // Musuh menembus block
                    gainEmotionPoints('player', 1); // Player menahan sebagian damage
                } else {
                    playClashSFX(); 
                    gameState.sanity = Math.min(45, gameState.sanity + 3);
                    battleLog.innerText = `PERFECT BLOCK! Serangan tertahan penuh.`;
                    
                    gainEmotionPoints('player', 2); // Perfect block memberi emosi tinggi
                }
                updateUI();
                resetPositionsAfterDice();
            }
            else if (pCard.type === 'attack' && eCard.type === 'defend') {
                let diff = pPower - ePower;
                if (diff > 0) {
                    playHurtSFX(); 
                    dealDamage('enemy', diff);
                    enemy.className = 'enemy-hurt-counter enemy-damaged';
                    createHitEffect(gameStage);
                    battleLog.innerText = `Menjebol pertahanan musuh! Dealt ${diff} Damage.`;
                    
                    gainEmotionPoints('player', 2);
                    gainEmotionPoints('enemy', 1);
                } else {
                    playClashSFX(); 
                    gameState.enemySanity = Math.min(45, gameState.enemySanity + 3);
                    battleLog.innerText = `Seranganmu mental tertangkis musuh!`;
                    
                    gainEmotionPoints('enemy', 2);
                }
                updateUI();
                checkAndTriggerPhase2();
            }
            else {
                battleLog.innerText = "Kedua pihak mengambil langkah siaga.";
                updateUI();
                resetPositionsAfterDice();
            }
        }, 350);
    }, 300);
}

export function checkAndTriggerPhase2() {
    if (gameState.enemyHealth <= 0 && gameState.enemyPhase === 1) {
        gameState.enemyHealth = 100; 
        gameState.enemyPhase = 2;    
        
        const bgm1 = document.getElementById('bgm');
        if (bgm1) bgm1.pause();
        playBGM();

        screenFlash(elements.gameStage, '#ff0000a1');
        elements.battleLog.innerHTML = "<strong>⚠️ DISTORTION MANIFESTED! Musuh bangkit kembali ke Fase 2! ⚠️</strong>";
        
        gameState.enemySanity = Math.min(45, gameState.enemySanity + 15);
        gameState.enemyLight = Math.min(gameState.maxLight, gameState.enemyLight + 2);
        updateUI();
    }
    resetPositionsAfterDice();
}

export function executeOneSidedPlayer(card) {
    const { player, enemy, gameStage } = elements;
    player.style.transition = 'left 0.25s ease-out';
    player.style.left = (gameStage.offsetWidth - gameState.enemyStart - 130) + 'px';
    setTimeout(() => {
        player.className = card.type === 'attack' ? card.id : 'player-guard';
        if (card.type === 'attack') {
            dealDamage('enemy', 15);
            enemy.className = 'enemy-hurt-counter enemy-damaged';
            createHitEffect(gameStage);
            
            // Serangan sepihak: Penyerang dapat 1, penerima damage dapat 1
            gainEmotionPoints('player', 1);
            gainEmotionPoints('enemy', 1);
        } else {
            gameState.playerLight = Math.min(gameState.maxLight, gameState.playerLight + 1);
        }
        updateUI();
        checkAndTriggerPhase2(); 
    }, 250);
}

export function executeOneSidedEnemy(card) {
    const { player, enemy, gameStage } = elements;
    enemy.style.transition = 'right 0.25s ease-out';
    enemy.style.right = (gameStage.offsetWidth - gameState.playerStart - 130) + 'px';
    setTimeout(() => {
        enemy.className = 'enemy-' + card.id;
        dealDamage('player', 12);
        playerHitEffect(player);
        player.className = 'player-hit';
        
        // Serangan sepihak musuh
        gainEmotionPoints('enemy', 1);
        gainEmotionPoints('player', 1);
        
        updateUI();
        resetPositionsAfterDice();
    }, 250);
}

export function resolveAttackHit(isPlayerWinner, animName, rawDmg) {
    const { player, enemy, gameStage } = elements;
    if (isPlayerWinner) {
        gameState.sanity = Math.min(45, gameState.sanity + 8);
        gameState.enemySanity = Math.max(-45, gameState.enemySanity - 8);
        dealDamage('enemy', rawDmg);
        enemy.className = 'enemy-hurt-counter enemy-damaged';
        createHitEffect(gameStage);
        screenFlash(gameStage, '#ffffff22');
    } else {
        gameState.sanity = Math.max(-45, gameState.sanity - 8);
        gameState.enemySanity = Math.min(45, gameState.enemySanity + 8);
        dealDamage('player', rawDmg);
        playerHitEffect(player);
        player.className = 'player-hit';
        screenFlash(gameStage, '#ff000023');
    }
}

export function resetPositionsAfterDice() {
    const { player, enemy } = elements;
    setTimeout(() => {
        player.className = 'player-backdash';
        enemy.className = 'enemy-backdash';
        player.style.transition = 'left 0.15s ease-in';
        enemy.style.transition = 'right 0.15s ease-in';
        player.style.left = gameState.playerStart + 'px';
        enemy.style.right = gameState.enemyStart + 'px';

        setTimeout(() => {
            player.className = 'idle';
            enemy.className = 'enemy-idle';
            executeCombatLoop();
        }, 150);
    }, 500);
}

export function endTurnPhase() {
    gameState.combatPhase = false;

    if (gameState.maxLight < 12) {
        gameState.maxLight += 1;
    }

    if (gameState.playerMemulaiTurnTanpaAksi) gameState.playerLight = gameState.maxLight;
    else gameState.playerLight = Math.min(gameState.maxLight, gameState.playerLight + 1);

    if (gameState.enemyMemulaiTurnTanpaAksi) gameState.enemyLight = gameState.maxLight;
    else gameState.enemyLight = Math.min(gameState.maxLight, gameState.enemyLight + 1);
    
    gameState.playerMemulaiTurnTanpaAksi = false;
    gameState.enemyMemulaiTurnTanpaAksi = false;

    // Kocok Dadu Kecepatan untuk Turn baru sebelum kartu ditarik
    rollSpeedDice('player');
    rollSpeedDice('enemy');

    fillPlayerHand();
    fillEnemyHand(); 
    generateEnemyQueue();
    
    if (elements.startCombatBtn) elements.startCombatBtn.style.display = 'block'; 
    elements.battleLog.innerText = "Turn baru dimulai! Kocok dadu selesai, tentukan kartumu.";
    updateUI();
}