export interface Wave {
  scatter?: number;
  chase?: number;
}

export interface DifficultyLevel {
  multiplier: number;
  powerModeTime: number;
  pacmanSpeed: number;
  ghostSpeed: number;
  wavesDurations: Wave[];
}

export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'dead';
export type PacmanMode = 'normal' | 'power';
export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export interface PortalProps {
  i: number;
  target: number;
}

export interface SFX {
  [key: string]: Phaser.Sound.BaseSound;
}
