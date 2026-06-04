export enum Dir {
  NONE = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
  DOWN = 4,
}

export const OPPOSITE: Record<Dir, Dir> = {
  [Dir.NONE]: Dir.NONE,
  [Dir.LEFT]: Dir.RIGHT,
  [Dir.RIGHT]: Dir.LEFT,
  [Dir.UP]: Dir.DOWN,
  [Dir.DOWN]: Dir.UP,
};

export const DELTA: Record<Dir, { x: number; y: number }> = {
  [Dir.NONE]: { x: 0, y: 0 },
  [Dir.LEFT]: { x: -1, y: 0 },
  [Dir.RIGHT]: { x: 1, y: 0 },
  [Dir.UP]: { x: 0, y: -1 },
  [Dir.DOWN]: { x: 0, y: 1 },
};
