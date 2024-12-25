export type IVec2 = [number, number];

export interface Sausage {
  pos: IVec2;
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
  player_pos: IVec2;
  player_dir: IVec2;
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
}

export interface LevelDescription {
  start_pos: IVec2;
  start_dir: IVec2;
  ground: IVec2[];
  grills: IVec2[];
  sausages: IVec2[];
}
