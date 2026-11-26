// Jediný zdroj pravdy pre zdieľané konštanty (DRY). Lokálne konštanty modulu patria do modulu.
export const SITE_URL = 'https://codecon.digitalnyinovator.sk'
export const HASHTAG = '#CodeconGulovacka'
export const HITS_TO_WIN = 5
export const LEADERBOARD_SIZE = 10

export const WORLD = { W: 1600, H: 900, GROUND_Y: 780 }
export const PLAYERS = [{ x: 170 }, { x: 1430 }] // 0 = vľavo, 1 = vpravo
export const PLAYER_HITBOX = { r: 55, offsetY: 70 } // kruh so stredom (x, GROUND_Y - offsetY)
export const BALL_R = 12
export const WIND_MAX = 260 // px/s²

export const COLORS = {
  bg: '#0b1026',
  bg2: '#1b2a5c',
  snow: '#f4f8ff',
  red: '#e63946',
  green: '#2ec4b6',
  gold: '#ffd166',
  text: '#ffffff',
  players: ['#e63946', '#2ec4b6'],
}

export const TEXTS = {
  title: 'Vianočná guľovačka',
  modes: { cpu: 'vs Počítač', vs: 'VS Online' },
  cpuName: 'Počítač',
  defaultName: 'Hráč',
}
