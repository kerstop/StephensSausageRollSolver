export type IVec3 = [number, number, number];
export function compareIVec3(v1: IVec3, v2: IVec3): boolean {
  return v1[0] === v2[0] && v1[1] === v2[1] && v1[2] === v2[2];
}

export interface Sausage {
  pos: IVec3;
  cooked: [[number, number], [number, number]];
  orientation: SausageOrientation;
}

export type SausageOrientation = "Vertical" | "Horizontal";
export type TileType = "water" | "ground" | "grill";

export interface NodeNeighbors {
  forward: number;
  back: number;
  right: number;
  left: number;
}

export interface LevelState {
  id: number;
  player_pos: IVec3;
  player_dir: IVec3;
  sausages: Sausage[];
  neighbors: NodeNeighbors | null;
  status: "Lost" | "Unsolved" | "Solved" | "Burnt";
}

export interface Edge {
  id: number;
  source: number;
  target: number;
  movement: string;
}

export interface LevelGraph {
  states: LevelState[];
  edges: Edge[];
  initial_state: LevelState;
  level_description: LevelDescription;
}

export interface LevelDescription {
  start_pos: IVec3;
  start_dir: IVec3;
  ground: IVec3[];
  grills: IVec3[];
  sausages: Sausage[];
}
