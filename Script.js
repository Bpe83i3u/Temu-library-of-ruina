/* =======================================================
   DOM ELEMENTS & GAME CONFIGURATION
   ======================================================= */
const playerHpBar = document.getElementById('playerHp');
const enemyHpBar = document.getElementById('enemyHp');
const player = document.getElementById('player');
const enemy = document.getElementById('enemy');
const startCombatBtn = document.getElementById('startCombatBtn');
const battleLog = document.getElementById('battleLog');
const lightText = document.getElementById('lightText');
const enemyLightText = document.getElementById('enemyLightText');
const sanityText = document.getElementById('sanityText');
const enemySanityText = document.getElementById('enemySanityText');
const playerQueueText = document.getElementById('playerQueueText');
const enemyQueueText = document.getElementById('enemyQueueText');
const handContainer = document.getElementById('handContainer');
const gameStage = document.getElementById('game');

// STATE CONTROL
let playerHealth = 150;
const maxPlayerHealth = 150;
let enemyHealth = 100;
const maxEnemyHealth = 100;

let playerStagger = 0; // 0 = Normal, 1 = Staggered
let enemyStagger = 0;
const staggerThreshold = 50; // HP thresholds for stagger

let enemyPhase = 1; 
let playerLight = 4;
let enemyLight = 4;
let maxLight = 4; 

let sanity = 0;
let enemySanity = 0;
let combatPhase = false;

let playerMemulaiTurnTanpaAksi = false;
let enemyMemulaiTurnTanpaAksi = false;

// COORDINATE CALCULATIONS
let playerStart, enemyStart, clashDistance;

function hitungKoordinatPanggung() {
    if (!gameStage) return;
    let stageWidth = gameStage.offsetWidth;
    playerStart = stageWidth * 0.1;
    enemyStart = stageWidth * 0.1;
    clashDistance = (stageWidth / 2) - 90; 
}

/* =======================================================
   AUDIO HELPERS (PREVENTS CRASHES IF ELEMENTS ARE MISSING)
   ======================================================= */
function safePlayAudio(id) {
    const el = document.getElementById(id);
    if (el && typeof el.play === 'function') {
        el.currentTime = 0;
        el.play().catch(e => console.log(`Audio playback failed/blocked for: ${id}`, e));
    }
}
function playBGM() { safePlayAudio('bgm'); }
function playHurtSFX() { safePlayAudio('hurtSFX'); }
function playClashSFX() { safePlayAudio('clashSFX'); }

/* =======================================================
   CARD ENGINE DATABASE & INITIALIZATION
   ======================================================= */
const cardDatabase = [
    { id: 'punch',   name: 'PUNCH',   cost: 1, type: 'attack',  power: 4 },
    { id: 'kick',    name: 'KICK',    cost: 2, type: 'attack',  power: 7 },
    { id: 'slash',   name: 'SLASH',   cost: 3, type: 'attack',  power: 11 },
    { id: 'defend',  name: 'BLOCK',   cost: 0, type: 'defend',  power: 5 },
    { id: 'dodge',   name: 'EVADE',   cost: 0, type: 'dodge',   power: 6 },
    { id: 'counter', name: 'COUNTER', cost: 0, type: 'counter', power: 6 }
];

let playerHand = [];
let enemyHand = [];
let playerQueue = [];
let enemyQueue = [];
const maxHandSize = 12;

function rollCoin(sp) {
    const chance = 0.5 + (sp / 100); 
    return Math.random() < chance ? 6 : -2;
}

// Helper to draw a card respecting the Max 2 Defend rule
function drawCard(hand) {
    let randomCard = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    let defendCount = hand.filter(c => c.type === 'defend').length;
    
    if (randomCard.type === 'defend' && defendCount >= 2) {
        const attackCards = cardDatabase.filter(c => c.type === 'attack');
        randomCard = attackCards[Math.floor(Math.random() * attackCards.length)];
    }
    return { ...randomCard, instanceId: Math.random() };
}

function fillPlayerHand() {
    const cardsToDraw = Math.floor(Math.random() * 4) + 1; 
    let drawn = 0;
    while (playerHand.length < maxHandSize && drawn < cardsToDraw) {
        playerHand.push(drawCard(playerHand));
        drawn++;
    }
    renderHand();
}

function fillEnemyHand() {
    const cardsToDraw = Math.floor(Math.random() * 4) + 1;
    let drawn = 0;
    while (enemyHand.length < maxHandSize && drawn < cardsToDraw) {
        enemyHand.push(drawCard(enemyHand));
        drawn++;
    }
}

/* =======================================================
   DAMAGE ENGINE & STAGGER DETECTION
   ======================================================= */
function checkStagger(targetType, currentHp) {
    if (currentHp <= staggerThreshold) {
        if (targetType === 'player' && playerStagger === 0) {
            playerStagger = 1;
            battleLog.innerText = "⚠️ PLAYER STAGGERED! Pertahanan jebol!";
        } else if (targetType === 'enemy' && enemyStagger === 0) {
            enemyStagger = 1;
            battleLog.innerText = "⚠️ ENEMY STAGGERED! Musuh tidak berdaya!";
        }
    }
}

function dealDamage(target, amount) {
    if (target === 'player') {
        playerHealth = Math.max(0, playerHealth - amount);
        checkStagger('player', playerHealth);
    } else if (target === 'enemy') {
        enemyHealth = Math.max(0, enemyHealth - amount);
        checkStagger('enemy', enemyHealth);
    }
    updateUI();
    checkGameOver();
}

function checkGameOver() {
    if (playerHealth <= 0) {
        battleLog.innerText = "GAME OVER... Kamu telah dikalahkan.";
        startCombatBtn.style.display = 'none';
    } else if (enemyHealth <= 0 && enemyPhase === 2) {
        battleLog.innerText = "VICTORY! Musuh berhasil ditumbangkan.";
        startCombatBtn.style.display = 'none';
    }
}

/* =======================================================
   UI RENDERING SYSTEMS
   ======================================================= */
function updateUI(){
    if (lightText) lightText.innerText = 'Light: ' + playerLight + ' / ' + maxLight;
    if (enemyLightText) enemyLightText.innerText = 'Enemy Light: ' + enemyLight + ' / ' + maxLight;
    if (sanityText) sanityText.innerText = 'Sanity: ' + sanity;
    
    if (playerHpBar) {
        playerHpBar.style.width = (playerHealth / maxPlayerHealth * 100) + '%';
        playerHpBar.style.background = playerStagger ? '#ff0000' : 'linear-gradient(90deg, #111111 0%, #666666 100%)';
        
        if (playerHpBar.parentElement && playerHpBar.parentElement.nextElementSibling) {
            playerHpBar.parentElement.nextElementSibling.innerText = 
                `Sanity: ${sanity} ${playerStagger ? '[STAGGERED]' : ''}`;
        }
    }
    
    if (enemyHpBar) {
        enemyHpBar.style.width = (enemyHealth / maxEnemyHealth * 100) + '%';
        enemyHpBar.style.background = enemyStagger ? '#ff0000' : 'linear-gradient(90deg, #111111 0%, #666666 100%)';
    }

    if (enemySanityText) {
        enemySanityText.innerText = `Enemy Sanity: ${enemySanity} ${enemyStagger ? '[STAGGERED]' : ''}`;
    }
    
    if (playerQueueText) playerQueueText.innerText = playerQueue.length > 0 ? playerQueue.map(c => c.name).join(' -> ') : '-';
    if (enemyQueueText) enemyQueueText.innerText = combatPhase ? enemyQueue.map(c => c.name).join(' -> ') : `${enemyQueue.length} Slots Terisi`;
}

function renderHand() {
    if (!handContainer) return;
    handContainer.innerHTML = '';
    if (combatPhase) return; 

    playerHand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.type}`;
        cardDiv.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-power">Dice: ${card.power}</div>
        `;
        
        let currentQueuedCost = playerQueue.reduce((sum, c) => sum + c.cost, 0);
        if (playerLight - currentQueuedCost < card.cost) {
            cardDiv.classList.add('disabled');
        }

        cardDiv.addEventListener('click', () => {
            playBGM();
            if (playerLight - currentQueuedCost >= card.cost) {
                playerQueue.push(card);
                playerHand.splice(index, 1);
                renderHand();
                updateUI();
            }
        });
        handContainer.appendChild(cardDiv);
    });
}

function generateEnemyQueue() {
    enemyQueue = [];
    let tempLight = enemyLight;
    
    if (Math.random() < 0.15 && enemyLight > 0) {
        return; 
    }

    let totalSlotAksi = Math.floor(Math.random() * 3) + 1; 

    for (let i = 0; i < totalSlotAksi; i++) {
        let affordableCards = enemyHand.filter(c => c.cost <= tempLight);
        if (affordableCards.length === 0) break;
        
        let randomIndex = Math.floor(Math.random() * affordableCards.length);
        let chosenCard = affordableCards[randomIndex];

        enemyQueue.push(chosenCard);
        tempLight -= chosenCard.cost;

        let realIndex = enemyHand.findIndex(c => c.instanceId === chosenCard.instanceId);
        if (realIndex !== -1) enemyHand.splice(realIndex, 1);
    }
}

/* =======================================================
   COMBAT SYSTEM RESOLUTION
   ======================================================= */
startCombatBtn.addEventListener('click', () => {
    if (combatPhase || playerHealth <= 0 || enemyHealth <= 0) return;

    hitungKoordinatPanggung();

    playerMemulaiTurnTanpaAksi = (playerQueue.length === 0);
    enemyMemulaiTurnTanpaAksi = (enemyQueue.length === 0);

    if (playerQueue.length === 0 && enemyQueue.length === 0) {
        battleLog.innerText = "Kedua pihak tidak memilih aksi! Turn dilewati langsung.";
        setTimeout(() => { endTurnPhase(); }, 1200);
        return;
    }

    combatPhase = true;
    startCombatBtn.style.display = 'none'; 
    renderHand(); 
    executeCombatLoop();
});

function executeCombatLoop() {
    if (playerQueue.length === 0 && enemyQueue.length === 0) {
        endTurnPhase();
        return;
    }

    let pCard = playerQueue.shift();
    let eCard = enemyQueue.shift();

    if (!pCard && eCard && (eCard.type === 'defend' || eCard.type === 'dodge' || eCard.type === 'counter')) {
        battleLog.innerText = `Musuh bersiap bertahan (${eCard.name}), tetapi kamu tidak bergerak. Sesi terlewati!`;
        enemyLight -= eCard.cost;
        updateUI();
        
        setTimeout(() => {
            executeCombatLoop();
        }, 1000);
        return;
    }

    if (!pCard && eCard) {
        battleLog.innerText = `ONE-SIDED PUNISH! Musuh melesat menghantam dengan ${eCard.name}!`;
        enemyLight -= eCard.cost;
        playHurtSFX(); 
        executeOneSidedEnemy(eCard);
        return;
    }
    
    if (pCard && !eCard) {
        battleLog.innerText = `ONE-SIDED PUNISH! Kamu menghajar musuh dengan ${pCard.name}!`;
        playerLight -= pCard.cost;
        playHurtSFX(); 
        executeOneSidedPlayer(pCard);
        return;
    }

    playerLight -= pCard.cost;
    enemyLight -= eCard.cost;
    updateUI();

    battleLog.innerText = `CLASH: ${pCard.name} VS ${eCard.name}!`;
    
    player.style.transition = 'left 0.35s ease-out';
    enemy.style.transition = 'right 0.35s ease-out';
    player.style.left = clashDistance + 'px';
    enemy.style.right = clashDistance + 'px';

    setTimeout(() => {
        if (pCard.type === 'attack') player.className = pCard.id;
        else if (pCard.type === 'defend' || pCard.type === 'counter') player.className = 'player-guard';
        else player.className = 'evade-flip';

        if (eCard.type === 'attack') enemy.className = 'enemy-' + eCard.id;
        else if (eCard.type === 'defend') enemy.className = 'enemy-guard';
        else if (eCard.type === 'counter') enemy.className = 'enemy-counter-pose';
        else enemy.className = 'enemy-evade';

        setTimeout(() => {
            let pPower = pCard.power + rollCoin(sanity);
            let ePower = eCard.power + rollCoin(enemySanity);

            if (pCard.type === 'attack' && eCard.type === 'attack') {
                if (pPower > ePower) {
                    playHurtSFX(); 
                    resolveAttackHit(true, pCard.id, 14);
                } else if (pPower < ePower) {
                    playHurtSFX(); 
                    resolveAttackHit(false, eCard.id, 14);
                } else {
                    playClashSFX(); 
                    battleLog.innerText = "CLASH DRAW! Senjata beradu seimbang!";
                    screenFlash('#ffff0022');
                }
                updateUI();
                checkAndTriggerPhase2();
            } 
            else if (pCard.type === 'counter' && eCard.type === 'attack') {
                battleLog.innerText = `${enemy.className.toUpperCase()} menyerang! Menahan serangan untuk membalas...`;
                playClashSFX(); 
                
                let dmgKePlayer = Math.floor(ePower * 0.6);
                dealDamage('player', dmgKePlayer);
                playerHitEffect();
                player.className = 'player-hit';
                screenFlash('#ff000023');
                updateUI();

                let randomDelayBalasan = Math.floor(Math.random() * 400) + 400;
                
                setTimeout(() => {
                    battleLog.innerText = `COUNTER STRIKE! Membalas hantaman musuh dengan telak!`;
                    playHurtSFX(); 
                    dealDamage('enemy', 20);
                    
                    enemy.className = 'enemy-hurt-counter enemy-damaged';
                    createHitEffect(false);
                    screenFlash('#ffffff22');
                    
                    updateUI();
                    checkAndTriggerPhase2();
                }, randomDelayBalasan);
            }
            else if (pCard.type === 'defend' && eCard.type === 'attack') {
                let diff = ePower - pPower;
                if (diff > 0) {
                    playHurtSFX(); 
                    dealDamage('player', diff);
                    playerHitEffect();
                    battleLog.innerText = `BLOCK Tembus! Menerima sisa ${diff} Damage.`;
                } else {
                    playClashSFX(); 
                    sanity = Math.min(45, sanity + 3);
                    battleLog.innerText = `PERFECT BLOCK! Serangan tertahan penuh.`;
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
                    createHitEffect(false);
                    battleLog.innerText = `Menjebol pertahanan musuh! Dealt ${diff} Damage.`;
                } else {
                    playClashSFX(); 
                    enemySanity = Math.min(45, enemySanity + 3);
                    battleLog.innerText = `Seranganmu mental tertangkis musuh!`;
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

function checkAndTriggerPhase2() {
    if (enemyHealth <= 0 && enemyPhase === 1) {
        enemyHealth = 100; 
        enemyPhase = 2;    
        
        const bgm1 = document.getElementById('bgm');
        const bgm2 = document.getElementById('bgmPhase2');
        
        if (bgm1) bgm1.pause();
        if (bgm2) {
            bgm2.currentTime = 0;
            bgm2.play().catch(e => console.log("BGM 2 blocked"));
        }

        screenFlash('#ff0000a1');
        battleLog.innerHTML = "<strong>⚠️ DISTORTION MANIFESTED! Musuh bangkit kembali ke Fase 2! ⚠️</strong>";
        
        enemySanity = Math.min(45, enemySanity + 15);
        enemyLight = Math.min(maxLight, enemyLight + 2);
        updateUI();
    }
    resetPositionsAfterDice();
}

function executeOneSidedPlayer(card) {
    player.style.transition = 'left 0.25s ease-out';
    player.style.left = (gameStage.offsetWidth - enemyStart - 130) + 'px';
    setTimeout(() => {
        player.className = card.type === 'attack' ? card.id : 'player-guard';
        if (card.type === 'attack') {
            dealDamage('enemy', 15);
            enemy.className = 'enemy-hurt-counter enemy-damaged';
            createHitEffect(false);
        } else {
            playerLight = Math.min(maxLight, playerLight + 1);
        }
        updateUI();
        checkAndTriggerPhase2(); 
    }, 250);
}

function executeOneSidedEnemy(card) {
    enemy.style.transition = 'right 0.25s ease-out';
    enemy.style.right = (gameStage.offsetWidth - playerStart - 130) + 'px';
    setTimeout(() => {
        enemy.className = 'enemy-' + card.id;
        dealDamage('player', 12);
        playerHitEffect();
        player.className = 'player-hit';
        updateUI();
        resetPositionsAfterDice();
    }, 250);
}

function resolveAttackHit(isPlayerWinner, animName, rawDmg) {
    if (isPlayerWinner) {
        sanity = Math.min(45, sanity + 8);
        enemySanity = Math.max(-45, enemySanity - 8);
        dealDamage('enemy', rawDmg);
        enemy.className = 'enemy-hurt-counter enemy-damaged';
        createHitEffect(false);
        screenFlash('#ffffff22');
    } else {
        sanity = Math.max(-45, sanity - 8);
        enemySanity = Math.min(45, enemySanity + 8);
        dealDamage('player', rawDmg);
        playerHitEffect();
        player.className = 'player-hit';
        screenFlash('#ff000023');
    }
}

function resetPositionsAfterDice() {
    setTimeout(() => {
        player.className = 'player-backdash';
        enemy.className = 'enemy-backdash';
        player.style.transition = 'left 0.15s ease-in';
        enemy.style.transition = 'right 0.15s ease-in';
        player.style.left = playerStart + 'px';
        enemy.style.right = enemyStart + 'px';

        setTimeout(() => {
            player.className = 'idle';
            enemy.className = 'enemy-idle';
            executeCombatLoop();
        }, 150);
    }, 500);
}

/* =======================================================
   END TURN PHASE
   ======================================================= */
function endTurnPhase() {
    combatPhase = false;

    if (maxLight < 12) {
        maxLight += 1;
    }

    if (playerMemulaiTurnTanpaAksi) {
        playerLight = maxLight;
    } else {
        playerLight = Math.min(maxLight, playerLight + 1);
    }

    if (enemyMemulaiTurnTanpaAksi) { 
        enemyLight = maxLight;
    } else {
        enemyLight = Math.min(maxLight, enemyLight + 1);
    }
    
    playerMemulaiTurnTanpaAksi = false;
    enemyMemulaiTurnTanpaAksi = false;

    fillPlayerHand();
    fillEnemyHand(); 
    
    generateEnemyQueue();
    
    if (startCombatBtn) startCombatBtn.style.display = 'block'; 
    battleLog.innerText = "Turn baru dimulai! Pilih lembar kartumu.";
    updateUI();
}

/* =======================================================
   VFX / ANIMATION EFFECTS
   ====================================================== */
function createHitEffect(isCounter){
    const fx = document.createElement('div');
    fx.className = 'hit-effect';
    fx.style.left = '50%';
    fx.style.top = '45%';
    if (gameStage) gameStage.appendChild(fx);
    setTimeout(()=> fx.remove(), 300);
}

function playerHitEffect(){
    if (!player) return;
    player.classList.add('player-damaged');
    setTimeout(()=> player.classList.remove('player-damaged'), 120);
}

function screenFlash(color){
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.left = '0'; 
    flash.style.top = '0';
    flash.style.width = '100%'; 
    flash.style.height = '100%';
    flash.style.pointerEvents = 'none';
    flash.style.background = color;
    flash.style.zIndex = '999';
    if (gameStage) gameStage.appendChild(flash);
    setTimeout(()=> flash.remove(), 100);
}

/* =======================================================
   GAME INITIALIZATION
   ======================================================= */
hitungKoordinatPanggung();
window.addEventListener('resize', hitungKoordinatPanggung);

// Deal Initial Hands (4 Cards Each)
while (playerHand.length < 4) {
    playerHand.push(drawCard(playerHand));
}

while (enemyHand.length < 4) {
    enemyHand.push(drawCard(enemyHand));
}

// Initial strategy construction & Screen Update
generateEnemyQueue();
renderHand();
updateUI();