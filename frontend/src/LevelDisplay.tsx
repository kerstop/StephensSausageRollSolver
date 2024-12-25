import { LevelDescription, LevelState } from "./types";

interface Args {
  level: LevelState;
  size: [number, number];
  description: LevelDescription;
}

function LevelDisplay({ level, size, description }: Args) {
  const player_pos2 = [
    level.player_pos[0] + level.player_dir[0],
    level.player_pos[1] + level.player_dir[1],
  ];
  const start_pos2 = [
    description.start_pos[0] + description.start_dir[0],
    description.start_pos[1] + description.start_dir[1],
  ];
  return (
    <>
      <textarea>{JSON.stringify(level)}</textarea>
      {new Array(size[1]).fill(0).map((_, y) => {
        return (
          <div key={y} className="row">
            {new Array(size[0]).fill(0).map((_, x) => {
              let tileType = "water";
              if (description.ground.find((v) => v[0] === x && v[1] === y))
                tileType = "ground";
              if (description.grills.find((v) => v[0] === x && v[1] === y))
                tileType = "grill";
              return (
                <div key={x} className={`tile ${tileType}`}>
                  {level.sausages.map((s) => {
                    let pos2 = [...s.pos];
                    if (s.orientation === "Vertical") pos2[1] += 1;
                    if (s.orientation === "Horizontal") pos2[0] += 1;
                    if (
                      (s.pos[0] === x && s.pos[1] === y) ||
                      (pos2[0] === x && pos2[1] === y)
                    ) {
                      return s.orientation === "Vertical" ? "V" : "H";
                    }
                  })}
                  {level.player_pos[0] === x && level.player_pos[1] === y
                    ? "P"
                    : ""}
                  {player_pos2[0] === x && player_pos2[1] === y ? "f" : ""}
                  {description.start_pos[0] === x &&
                  description.start_pos[1] === y
                    ? "G"
                    : ""}
                  {start_pos2[0] === x && start_pos2[1] === y ? "g" : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export default LevelDisplay;
