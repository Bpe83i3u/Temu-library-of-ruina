export const maxPlayerHealth = 150;
export const maxEnemyHealth = 100;
export const maxHandSize = 12;
export const staggerThreshold = 50;

export const cardDatabase = [
    { id: 'punch',   name: 'PUNCH',   cost: 1, type: 'attack',  power: 4 },
    { id: 'kick',    name: 'KICK',    cost: 2, type: 'attack',  power: 7 },
    { id: 'slash',   name: 'SLASH',   cost: 3, type: 'attack',  power: 11 },
    { id: 'defend',  name: 'BLOCK',   cost: 0, type: 'defend',  power: 5 },
    { id: 'dodge',   name: 'EVADE',   cost: 0, type: 'dodge',   power: 6 },
    { id: 'counter', name: 'COUNTER', cost: 0, type: 'counter', power: 6 }
];