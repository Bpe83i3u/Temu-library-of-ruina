export const gameState = {
    playerHealth: 150,
    enemyHealth: 100,
    playerStagger: 0,
    enemyStagger: 0,
    enemyPhase: 1, 
    playerLight: 4,
    enemyLight: 4,
    maxLight: 4, 
    sanity: 0,
    enemySanity: 0,
    combatPhase: false,
    playerMemulaiTurnTanpaAksi: false,
    enemyMemulaiTurnTanpaAksi: false,
    playerHand: [],
    enemyHand: [],
    
    // MODIFIKASI: Queue sekarang menampung objek { card, speed }
    playerQueue: [],
    enemyQueue: [],
    
    playerStart: 0,
    enemyStart: 0,
    clashDistance: 0,

    // ==========================================
    // SISTEM BARU: SPEED DICE & EMOTION LEVEL
    // ==========================================
    playerEmotionPoints: 0,
    playerEmotionLevel: 0,
    enemyEmotionPoints: 0,
    enemyEmotionLevel: 0,
    
    playerSpeedDice: [], // Angka dadu kecepatan yang di-roll turn ini
    enemySpeedDice: [],  
};