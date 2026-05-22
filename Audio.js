import { gameState } from './State.js'; // Import to check current boss phase

export function safePlayAudio(id, resetTrack = true) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Audio element with id "${id}" was not found in HTML.`);
        return;
    }
    
    if (typeof el.play !== 'function') return;

    // Reset track position to beginning for sound effects, but NOT for BGM
    if (resetTrack) {
        el.currentTime = 0;
    }

    el.play().catch(e => console.log(`Audio play blocked/failed: ${id}`));
}

export function playClashSFX() { 
    safePlayAudio('clashSFX', true); 
}

export function playHurtSFX() { 
    safePlayAudio('hurtSFX', true); 
}

export function playBGM() {
    // Dynamic music selection based on current boss phase
    const trackId = (gameState.enemyPhase === 1) ? 'bgm' : 'bgmPhase2';
    const bgm = document.getElementById(trackId);
    
    // Only play if the track is paused so we don't restart it on every click
    if (bgm && bgm.paused) {
        safePlayAudio(trackId, false); // false = don't reset track time to 0
    }
}
export function playVictoryChime() {
    // Kill existing BGMs
    const bgm1 = document.getElementById('bgm');
    const bgm2 = document.getElementById('bgmPhase2');
    if (bgm1) bgm1.pause();
    if (bgm2) bgm2.pause();

    safePlayAudio('victorySFX', true);
}

export function playDefeatDrone() {
    const bgm1 = document.getElementById('bgm');
    const bgm2 = document.getElementById('bgmPhase2');
    if (bgm1) bgm1.pause();
    if (bgm2) bgm2.pause();

    safePlayAudio('defeatSFX', true);
}
