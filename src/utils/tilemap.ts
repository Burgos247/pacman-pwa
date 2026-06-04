import type { GhostName } from '../types/game';

export interface MapPoint {
  x: number;
  y: number;
}

export function getObjectsByType(
  map: Phaser.Tilemaps.Tilemap,
  type: string,
  layer = 'objects',
): Phaser.Types.Tilemaps.TiledObject[] {
  return map.getObjectLayer(layer)?.objects.filter((o) => o.type === type) ?? [];
}

export function getRespawnPoint(
  map: Phaser.Tilemaps.Tilemap,
  name: GhostName | 'pacman',
  layer = 'objects',
): MapPoint {
  const obj = map
    .getObjectLayer(layer)
    ?.objects.find((o) => o.type === 'respawn' && o.name === name);

  if (!obj || obj.x === undefined || obj.y === undefined) {
    throw new Error(`Respawn point for "${name}" not found`);
  }
  return { x: obj.x, y: obj.y };
}

export function getTargetPoint(
  map: Phaser.Tilemaps.Tilemap,
  name: GhostName,
  layer = 'objects',
): MapPoint {
  const obj = map
    .getObjectLayer(layer)
    ?.objects.find((o) => o.type === 'target' && o.name === name);

  if (!obj || obj.x === undefined || obj.y === undefined) {
    throw new Error(`Target point for "${name}" not found`);
  }
  return { x: obj.x, y: obj.y };
}
