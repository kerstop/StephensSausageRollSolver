export type IVec2 = [number, number];

export interface Sausage {
  pos: IVec2;
  cooked: [[number, number], [number, number]];
  orientation: SausageOrientation;
}

export type SausageOrientation = "Vertical" | "Horizontal";

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
}

export interface LevelGraph {
  states: LevelState[];
  edges: [number, number][];
  initial_state: number;
}
