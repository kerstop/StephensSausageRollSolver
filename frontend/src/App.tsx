import { useState } from "react";
import "./App.css";
import * as solver from "solver";
import Graph from "./Graph";
import { IVec2, Sausage } from "./types";

type Tool = "water" | "ground" | "grill";
type TileType = "water" | "ground" | "grill";

function App() {
  const [tileTypes, setTileTypes] = useState<TileType[][]>(
    new Array(10).fill(0).map(() => new Array(10).fill("water")),
  );

  const [tool, setTool] = useState<Tool>("water");

  const [sausages, setSausages] = useState<Sausage[]>([]);
  const [playerDir, setPlayerDir] = useState<"up" | "right" | "down" | "left">(
    "up",
  );
  const [playerPos, setPlayerPos] = useState<IVec2 | null>(null);
  const [solution, setSolution] = useState<null | any>(null);

  const level_description = (() => {
    let playerDirVector = [1, 0];
    switch (playerDir) {
      case "up":
        playerDirVector = [0, -1];
        break;
      case "right":
        playerDirVector = [1, 0];
        break;
      case "down":
        playerDirVector = [0, 1];
        break;
      case "left":
        playerDirVector = [-1, 0];
        break;
    }
    let ground: IVec2[] = [];
    let grills: IVec2[] = [];
    tileTypes.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile === "ground") {
          ground.push([x, y]);
        }
        if (tile === "grill") {
          grills.push([x, y]);
        }
      });
    });
    return {
      start_pos: playerPos,
      start_dir: playerDirVector,
      ground,
      grills,
      sausages,
    };
  })();

  return (
    <>
      <div className="controls">
        <button
          className={tool === "water" ? "active" : ""}
          onClick={() => setTool("water")}
        >
          Water
        </button>
        <button
          className={tool === "ground" ? "active" : ""}
          onClick={() => setTool("ground")}
        >
          Ground
        </button>
        <button
          className={tool === "grill" ? "active" : ""}
          onClick={() => setTool("grill")}
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
            className={playerDir === "up" ? "active" : ""}
            onClick={() => {
              setPlayerDir("up");
            }}
          >
            Up
          </button>
          <button
            className={playerDir === "left" ? "active" : ""}
            onClick={() => {
              setPlayerDir("left");
            }}
          >
            Left
          </button>
          <button
            className={playerDir === "right" ? "active" : ""}
            onClick={() => {
              setPlayerDir("right");
            }}
          >
            right
          </button>
          <button
            className={playerDir === "down" ? "active" : ""}
            onClick={() => {
              setPlayerDir("down");
            }}
          >
            down
          </button>
        </div>
      </div>
      {tileTypes.map((row, y) => {
        return (
          <div className="row" key={y}>
            {row.map((tileType, x) => {
              return (
                <div
                  key={x}
                  className={`tile ${tileType} `}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => {
                    let data = e.dataTransfer.getData("internal");
                    if (data.length > 0) {
                      switch (data) {
                        case "horizontal":
                          setSausages([
                            ...sausages,
                            {
                              pos: [x, y],
                              cooked: [
                                [0, 0],
                                [0, 0],
                              ],
                              orientation: "Horizontal",
                            },
                          ]);
                          break;
                        case "vertical":
                          setSausages([
                            ...sausages,
                            {
                              pos: [x, y],
                              cooked: [
                                [0, 0],
                                [0, 0],
                              ],
                              orientation: "Vertical",
                            },
                          ]);
                          break;
                        case "player":
                          setPlayerPos([x, y]);
                          break;
                      }
                    }
                  }}
                  onClick={() => {
                    if (tool === "water") {
                      tileTypes[y][x] = "water";
                      setTileTypes([...tileTypes]);
                    }
                    if (tool === "ground") {
                      tileTypes[y][x] = "ground";
                      setTileTypes([...tileTypes]);
                    }
                    if (tool === "grill") {
                      tileTypes[y][x] = "grill";
                      setTileTypes([...tileTypes]);
                    }
                  }}
                >
                  {sausages.map((s) => {
                    if (s.pos[0] === x && s.pos[1] === y) {
                      return s.orientation === "Vertical" ? "V" : "H";
                    }
                  })}
                  {playerPos?.[0] === x && playerPos[1] === y ? "P" : ""}
                </div>
              );
            })}
          </div>
        );
      })}
      <textarea
        readOnly={true}
        value={JSON.stringify(level_description)}
      ></textarea>
      <br />
      <button
        onClick={() => {
          if (playerPos !== null) {
            const graph = JSON.parse(solver.solve(level_description));
            console.log("solution found", graph);
            setSolution(graph);
          }
        }}
      >
        Solve
      </button>
      {solution !== null ? <Graph level={solution}></Graph> : ""}
    </>
  );
}

export default App;
