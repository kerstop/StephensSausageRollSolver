import { useEffect, useRef, useState } from "react";
import {
  compareIVec3,
  IVec3,
  LevelDescription,
  LevelGraph,
  Sausage,
} from "./types";
import SolutionWorker from "./worker?worker";
import { produce } from "immer";
interface Args {
  setSolution: (solution: LevelGraph) => void;
  lenX: number;
  lenY: number;
  lenZ: number;
}

type Tool = "remove" | "grass" | "dirt" | "grill";

function LevelEditor({ setSolution, lenY, lenX, lenZ }: Args) {
  const worker = useRef(new SolutionWorker());

  const [groundTiles, setGroundTiles] = useState<Set<string>>(new Set());
  const [grillTiles, setGrillTiles] = useState<Set<string>>(new Set());
  const [viewedLayer, setViewedLayer] = useState<number>(1);

  const [tool, setTool] = useState<Tool>("remove");

  const [sausages, setSausages] = useState<Sausage[]>([]);
  const [playerDir, setPlayerDir] = useState<
    [0, -1, 0] | [1, 0, 0] | [0, 1, 0] | [-1, 0, 0]
  >([0, -1, 0]);
  const [playerPos, setPlayerPos] = useState<IVec3 | null>(null);
  const [waiting, setWaiting] = useState<boolean>(false);

  const getSausageAt: (x: number, y: number, z: number) => Sausage | null = (
    x: number,
    y: number,
    z: number,
  ) => {
    return (
      sausages.find((s) => {
        if (s.pos[0] === x && s.pos[1] === y && s.pos[2] === z) {
          return true;
        }
        if (
          s.pos[0] === x - 1 &&
          s.pos[1] === y &&
          s.pos[2] === z &&
          s.orientation === "Horizontal"
        ) {
          return true;
        }
        if (
          s.pos[0] === x &&
          s.pos[1] === y - 1 &&
          s.pos[2] === viewedLayer &&
          s.orientation === "Vertical"
        ) {
          return true;
        }
        return false;
      }) ?? null
    );
  };

  const clearTile: (x: number, y: number, z: number) => void = (
    x: number,
    y: number,
    z: number,
  ) => {
    let sausageToRemove = getSausageAt(x, y, z);
    if (sausageToRemove !== null) {
      setSausages(
        produce(sausages, (sausages) => {
          sausages.filter(
            (s) =>
              JSON.stringify(s.pos) !== JSON.stringify(sausageToRemove.pos),
          );
          return sausages;
        }),
      );
    }
    if (JSON.stringify(playerPos) === JSON.stringify([x, y, z])) {
      setPlayerPos(null);
    }
    if (groundTiles.has(JSON.stringify([x, y, z]))) {
      setGroundTiles(
        produce(groundTiles, (s) => {
          s.delete(JSON.stringify([x, y, z]));
        }),
      );
    }
    if (grillTiles.has(JSON.stringify([x, y, z]))) {
      setGrillTiles(
        produce(grillTiles, (s) => {
          s.delete(JSON.stringify([x, y, z]));
        }),
      );
    }
  };

  const tiles = [];
  for (let y = 0; y < lenY; y++) {
    const row = [];
    for (let x = 0; x < lenX; x++) {
      let tileType;
      if (groundTiles.has(JSON.stringify([x, y, viewedLayer])))
        tileType = "dirt";
      else if (grillTiles.has(JSON.stringify([x, y, viewedLayer])))
        tileType = "dirt";
      else if (groundTiles.has(JSON.stringify([x, y, viewedLayer - 1])))
        tileType = "grass";
      else if (grillTiles.has(JSON.stringify([x, y, viewedLayer - 1])))
        tileType = "grill";
      else {
        if (viewedLayer > 1) tileType = "air";
        else tileType = "water";
      }
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
                  clearTile(x, y, viewedLayer);
                  clearTile(x + 1, y, viewedLayer);
                  setSausages(
                    produce(sausages, (sausages) => {
                      sausages.push({
                        pos: [x, y, viewedLayer],
                        cooked: [
                          [0, 0],
                          [0, 0],
                        ],
                        orientation: "Horizontal",
                      });
                    }),
                  );
                  break;
                case "vertical":
                  clearTile(x, y, viewedLayer);
                  clearTile(x, y + 1, viewedLayer);
                  setSausages(
                    produce(sausages, (sausages) => {
                      sausages.push({
                        pos: [x, y, viewedLayer],
                        cooked: [
                          [0, 0],
                          [0, 0],
                        ],
                        orientation: "Vertical",
                      });
                    }),
                  );
                  break;
                case "player":
                  clearTile(x, y, viewedLayer);
                  setPlayerPos([x, y, viewedLayer]);
                  break;
              }
            }
          }}
          onClick={() => {
            if (tool === "remove") {
              let sausageToRemove = getSausageAt(x, y, viewedLayer);
              if (sausageToRemove !== null) {
                setSausages(
                  produce(sausages, (sausages) => {
                    sausages.filter(
                      (s) =>
                        JSON.stringify(s.pos) !==
                        JSON.stringify(sausageToRemove.pos),
                    );
                    return sausages;
                  }),
                );
              } else if (
                JSON.stringify(playerPos) ===
                JSON.stringify([x, y, viewedLayer])
              ) {
                setPlayerPos(null);
              } else if (groundTiles.has(JSON.stringify([x, y, viewedLayer]))) {
                setGroundTiles(
                  produce(groundTiles, (s) => {
                    s.delete(JSON.stringify([x, y, viewedLayer]));
                  }),
                );
              } else if (
                groundTiles.has(JSON.stringify([x, y, viewedLayer - 1]))
              ) {
                setGroundTiles(
                  produce(groundTiles, (s) => {
                    s.delete(JSON.stringify([x, y, viewedLayer - 1]));
                  }),
                );
              } else if (
                grillTiles.has(JSON.stringify([x, y, viewedLayer - 1]))
              ) {
                setGrillTiles(
                  produce(grillTiles, (s) => {
                    s.delete(JSON.stringify([x, y, viewedLayer - 1]));
                  }),
                );
              }
            } else if (tool === "dirt") {
              clearTile(x, y, viewedLayer);
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.add(JSON.stringify([x, y, viewedLayer]));
                }),
              );
            } else if (tool === "grass") {
              if (viewedLayer !== 0) {
                clearTile(x, y, viewedLayer - 1);
                setGroundTiles(
                  produce(groundTiles, (s) => {
                    s.add(JSON.stringify([x, y, viewedLayer - 1]));
                  }),
                );
              }
            } else if (tool === "grill") {
              if (viewedLayer !== 0) {
                clearTile(x, y, viewedLayer - 1);
                setGrillTiles(
                  produce(grillTiles, (s) => {
                    s.add(JSON.stringify([x, y, viewedLayer - 1]));
                  }),
                );
              }
            }
          }}
        >
          {getSausageAt(x, y, viewedLayer)?.orientation[0]}
          {playerPos?.[0] === x &&
          playerPos[1] === y &&
          playerPos[2] === viewedLayer
            ? "P"
            : ""}
          {playerPos !== null
            ? playerPos[0] + playerDir[0] === x &&
              playerPos[1] + playerDir[1] === y &&
              playerPos[2] === viewedLayer
              ? "F"
              : ""
            : ""}
        </div>,
      );
    }
    tiles.push(row);
  }

  const layersControls = [];
  for (let i = 0; i < lenZ; i++) {
    layersControls.push(
      <button
        className={`layer-control ${viewedLayer === i ? "active" : null}`}
        onClick={() => {
          setViewedLayer(i);
        }}
      >
        {i === 0 ? "W" : i}
      </button>,
    );
  }

  useEffect(() => {
    worker.current.onmessage = (e) => {
      setWaiting(false);
      setSolution(e.data);
      return () => worker.current.terminate();
    };
  }, [worker]);

  const levelDescription = (() => {
    let playerDirVector = JSON.stringify(playerDir);

    let ground: IVec3[] = [...groundTiles].map((t) => {
      return JSON.parse(t) as IVec3;
    });
    let grills: IVec3[] = [...grillTiles].map((t) => {
      return JSON.parse(t) as IVec3;
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
          if (compareIVec3(data.start_dir, [1, 0, 0])) setPlayerDir([1, 0, 0]);
          if (compareIVec3(data.start_dir, [-1, 0, 0]))
            setPlayerDir([-1, 0, 0]);
          if (compareIVec3(data.start_dir, [0, 1, 0])) setPlayerDir([0, 1, 0]);
          if (compareIVec3(data.start_dir, [0, -1, 0]))
            setPlayerDir([0, -1, 0]);

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
          className={tool === "remove" ? "active" : ""}
          onClick={() => setTool("remove")}
        >
          Water
        </button>
        <button
          className={tool === "dirt" ? "active" : ""}
          onClick={() => setTool("dirt")}
        >
          Dirt
        </button>
        <button
          className={tool === "grass" ? "active" : ""}
          onClick={() => setTool("grass")}
        >
          Grass
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
            className={compareIVec3(playerDir, [0, -1, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([0, -1, 0]);
            }}
          >
            Up
          </button>
          <button
            className={compareIVec3(playerDir, [-1, 0, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([-1, 0, 0]);
            }}
          >
            Left
          </button>
          <button
            className={compareIVec3(playerDir, [1, 0, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([1, 0, 0]);
            }}
          >
            right
          </button>
          <button
            className={compareIVec3(playerDir, [0, 1, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([0, 1, 0]);
            }}
          >
            down
          </button>
        </div>
        <div>{layersControls}</div>
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
