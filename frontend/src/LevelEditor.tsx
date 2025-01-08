import { useEffect, useRef, useState } from "react";
import { IVec2, LevelDescription, LevelGraph, Sausage } from "./types";
import SolutionWorker from "./worker?worker";
import { produce } from "immer";
interface Args {
  setSolution: (solution: LevelGraph) => void;
  width: number;
  height: number;
}

type Tool = "water" | "ground" | "grill";

function LevelEditor({ setSolution, height, width }: Args) {
  const worker = useRef(new SolutionWorker());

  const [groundTiles, setGroundTiles] = useState<Set<string>>(new Set());
  const [grillTiles, setGrillTiles] = useState<Set<string>>(new Set());

  const [tool, setTool] = useState<Tool>("water");

  const [sausages, setSausages] = useState<Sausage[]>([]);
  const [playerDir, setPlayerDir] = useState<"up" | "right" | "down" | "left">(
    "up",
  );
  const [playerPos, setPlayerPos] = useState<IVec2 | null>(null);
  const [waiting, setWaiting] = useState<boolean>(false);

  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      let tileType = "water";
      if (groundTiles.has(JSON.stringify([x, y]))) tileType = "ground";
      if (grillTiles.has(JSON.stringify([x, y]))) tileType = "grill";
      row.push(
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
              setGrillTiles(
                produce(grillTiles, (s) => {
                  s.delete(JSON.stringify([x, y]));
                }),
              );
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.delete(JSON.stringify([x, y]));
                }),
              );
            }
            if (tool === "ground") {
              setGrillTiles(
                produce(grillTiles, (s) => {
                  s.delete(JSON.stringify([x, y]));
                }),
              );
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.add(JSON.stringify([x, y]));
                }),
              );
            }
            if (tool === "grill") {
              setGrillTiles(
                produce(grillTiles, (s) => {
                  s.add(JSON.stringify([x, y]));
                }),
              );
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.delete(JSON.stringify([x, y]));
                }),
              );
            }
          }}
        >
          {sausages.map((s) => {
            if (s.pos[0] === x && s.pos[1] === y) {
              return s.orientation === "Vertical" ? "V" : "H";
            }
          })}
          {playerPos?.[0] === x && playerPos[1] === y ? "P" : ""}
        </div>,
      );
    }
    tiles.push(row);
  }

  useEffect(() => {
    worker.current.onmessage = (e) => {
      setWaiting(false);
      setSolution(e.data);
      return () => worker.current.terminate();
    };
  }, [worker]);

  const levelDescription = (() => {
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

    let ground: IVec2[] = [...groundTiles].map((t) => {
      return JSON.parse(t) as IVec2;
    });
    let grills: IVec2[] = [...grillTiles].map((t) => {
      return JSON.parse(t) as IVec2;
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
      {waiting ? <p>waiting for solution</p> : null}
      <form
        action={(e: FormData) => {
          const data = JSON.parse(
            e.get("data")?.toString() ?? "{}",
          ) as LevelDescription;
          if (JSON.stringify(data.start_dir) === "[1,0]") setPlayerDir("right");
          if (JSON.stringify(data.start_dir) === "[-1,0]") setPlayerDir("left");
          if (JSON.stringify(data.start_dir) === "[0,1]") setPlayerDir("down");
          if (JSON.stringify(data.start_dir) === "[0,-1]") setPlayerDir("up");
          setPlayerPos(data.start_pos);
          setSausages(data.sausages);
          setGroundTiles(new Set(data.ground.map((t) => JSON.stringify(t))));
          setGrillTiles(new Set(data.grills.map((t) => JSON.stringify(t))));
        }}
      >
        <label>
          {"Paste here to load a description "}
          <input type="text" name="data" />
        </label>
      </form>
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
      <div className="tilegrid">
        {tiles.map((row, y) => {
          return (
            <div className="row" key={y}>
              {row.map((tile) => {
                return tile;
              })}
            </div>
          );
        })}
      </div>
      <p>LevelDescription</p>
      <code>{JSON.stringify(levelDescription)}</code>
      <br />
      <button
        onClick={() => {
          const isInitialized = (des: any): des is LevelDescription => {
            return des.start_pos !== null;
          };
          if (isInitialized(levelDescription)) {
            setWaiting(true);
            worker.current.postMessage(levelDescription);
          }
        }}
      >
        Show Graph
      </button>
    </>
  );
}

export default LevelEditor;
