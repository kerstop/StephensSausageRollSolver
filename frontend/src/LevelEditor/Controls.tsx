import { IVec3 } from "../types";

export type Tool = "remove" | "grass" | "dirt" | "grill";
export type PlayerDirections = [0, -1, 0] | [1, 0, 0] | [0, 1, 0] | [-1, 0, 0];

function Controls(args: {
  tool: Tool;
  setTool: (arg: Tool) => void;
  playerDir: PlayerDirections;
  setPlayerDir: (arg: PlayerDirections) => void;
}) {
  return (
    <div className="controls">
      <button
        className={args.tool === "remove" ? "active" : ""}
        onClick={() => args.setTool("remove")}
      >
        Remove
      </button>
      <button
        className={args.tool === "dirt" ? "active" : ""}
        onClick={() => args.setTool("dirt")}
      >
        Dirt
      </button>
      <button
        className={args.tool === "grass" ? "active" : ""}
        onClick={() => args.setTool("grass")}
      >
        Grass
      </button>
      <button
        className={args.tool === "grill" ? "active" : ""}
        onClick={() => args.setTool("grill")}
      >
        Grill
      </button>
      <button
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData("internal", "horizontal");
        }}
      >
        Sausage - H
      </button>
      <button
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData("internal", "vertical");
        }}
      >
        Sausage - V
      </button>
      <button
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData("internal", "player");
        }}
      >
        Player
      </button>
      <div className="player-direction-controls">
        <button
          className={IVec3.compare(args.playerDir, [0, -1, 0]) ? "active" : ""}
          onClick={() => {
            args.setPlayerDir([0, -1, 0]);
          }}
        >
          Up
        </button>
        <button
          className={IVec3.compare(args.playerDir, [-1, 0, 0]) ? "active" : ""}
          onClick={() => {
            args.setPlayerDir([-1, 0, 0]);
          }}
        >
          Left
        </button>
        <button
          className={IVec3.compare(args.playerDir, [1, 0, 0]) ? "active" : ""}
          onClick={() => {
            args.setPlayerDir([1, 0, 0]);
          }}
        >
          right
        </button>
        <button
          className={IVec3.compare(args.playerDir, [0, 1, 0]) ? "active" : ""}
          onClick={() => {
            args.setPlayerDir([0, 1, 0]);
          }}
        >
          down
        </button>
      </div>
    </div>
  );
}
export default Controls;
