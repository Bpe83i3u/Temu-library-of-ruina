export function createHitEffect(gameStage) {
    if (!gameStage) return;
    const fx = document.createElement('div');
    fx.className = 'hit-effect';
    fx.style.left = '50%';
    fx.style.top = '45%';
    gameStage.appendChild(fx);
    setTimeout(() => fx.remove(), 300);
}

export function playerHitEffect(playerElement) {
    if (!playerElement) return;
    playerElement.classList.add('player-damaged');
    setTimeout(() => playerElement.classList.remove('player-damaged'), 120);
}

export function screenFlash(gameStage, color) {
    if (!gameStage) return;
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.left = '0'; 
    flash.style.top = '0';
    flash.style.width = '100%'; 
    flash.style.height = '100%';
    flash.style.pointerEvents = 'none';
    flash.style.background = color;
    flash.style.zIndex = '999';
    gameStage.appendChild(flash);
    setTimeout(() => flash.remove(), 100);
}
export function triggerLimbusImpactShake(gameStage) {
    if (!gameStage) return;
    gameStage.classList.add('screen-shake-heavy');
    setTimeout(() => {
        gameStage.classList.remove('screen-shake-heavy');
    }, 800); // Shake hard for 800ms
}