import { useEffect, useState } from "react";
import { IVec3, LevelDescription, LevelGraph, Sausage } from "./types";
import { produce } from "immer";
import TileGrid from "./LevelEditor/TileGrid";
import { solve } from "solver";
interface Args {
  setSolution: (solution: LevelGraph) => void;
  lenX: number;
  lenY: number;
  lenZ: number;
}

type Tool = "remove" | "grass" | "dirt" | "grill";

function LevelEditor({ setSolution, lenY, lenX, lenZ }: Args) {
  const [groundTiles, setGroundTiles] = useState<Set<string>>(new Set());
  const [grillTiles, setGrillTiles] = useState<Set<string>>(new Set());

  const [tool, setTool] = useState<Tool>("remove");

  const [sausages, setSausages] = useState<Sausage[]>([]);
  const [playerDir, setPlayerDir] = useState<
    [0, -1, 0] | [1, 0, 0] | [0, 1, 0] | [-1, 0, 0]
  >([0, -1, 0]);
  const [playerPos, setPlayerPos] = useState<IVec3 | null>(null);

  const levelDescription = (() => {
    let playerDirVector = playerDir;

    let ground: IVec3[] = [...groundTiles].map((t) => {
      return JSON.parse(t) as IVec3;
    });
    let grills: IVec3[] = [...grillTiles].map((t) => {
      return JSON.parse(t) as IVec3;
    });

    return {
      start_pos: playerPos ?? [-1, -1, -1],
      start_dir: playerDirVector,
      ground,
      grills,
      sausages,
    };
  })();

  const loadLevelDescription: (description: LevelDescription) => void = (
    description: LevelDescription,
  ) => {
    if (IVec3.compare(description.start_dir, [1, 0, 0]))
      setPlayerDir([1, 0, 0]);
    if (IVec3.compare(description.start_dir, [-1, 0, 0]))
      setPlayerDir([-1, 0, 0]);
    if (IVec3.compare(description.start_dir, [0, 1, 0]))
      setPlayerDir([0, 1, 0]);
    if (IVec3.compare(description.start_dir, [0, -1, 0]))
      setPlayerDir([0, -1, 0]);

    setPlayerPos(description.start_pos);
    setSausages(description.sausages);
    setGroundTiles(new Set(description.ground.map((t) => JSON.stringify(t))));
    setGrillTiles(new Set(description.grills.map((t) => JSON.stringify(t))));
  };

  const clearTile: (x: number, y: number, z: number) => void = (
    x: number,
    y: number,
    z: number,
  ) => {
    let sausageToRemove = LevelDescription.getSausageAt(levelDescription, [
      x,
      y,
      z,
    ]);
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

  useEffect(() => {
    const data = JSON.parse(
      '{"start_pos":[2,2,1],"start_dir":[1,0,0],"ground":[[2,2,0],[3,2,0],[4,2,0],[4,1,0]],"grills":[[5,1,0],[5,2,0],[6,2,0],[6,1,0]],"sausages":[{"pos":[4,1,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}',
    ) as LevelDescription;
    loadLevelDescription(data);
    setSolution(JSON.parse(solve(data)));
  }, []);

  return (
    <>
      <form
        action={(e: FormData) => {
          const data = JSON.parse(
            e.get("data")?.toString() ?? "{}",
          ) as LevelDescription;
          loadLevelDescription(data);
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
          Remove
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
            className={IVec3.compare(playerDir, [0, -1, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([0, -1, 0]);
            }}
          >
            Up
          </button>
          <button
            className={IVec3.compare(playerDir, [-1, 0, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([-1, 0, 0]);
            }}
          >
            Left
          </button>
          <button
            className={IVec3.compare(playerDir, [1, 0, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([1, 0, 0]);
            }}
          >
            right
          </button>
          <button
            className={IVec3.compare(playerDir, [0, 1, 0]) ? "active" : ""}
            onClick={() => {
              setPlayerDir([0, 1, 0]);
            }}
          >
            down
          </button>
        </div>
      </div>
      <TileGrid
        description={levelDescription}
        lenX={lenX}
        lenY={lenY}
        lenZ={lenZ}
        onDrop={(e, x, y, viewedLayer) => {
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
        onClick={(x, y, z) => {
          if (tool === "remove") {
            let sausageToRemove = LevelDescription.getSausageAt(
              levelDescription,
              [x, y, z],
            );
            if (sausageToRemove !== null) {
              setSausages(
                produce(sausages, (sausages) => {
                  return sausages.filter(
                    (s) => !IVec3.compare(s.pos, sausageToRemove.pos),
                  );
                }),
              );
            } else if (
              JSON.stringify(playerPos) === JSON.stringify([x, y, z])
            ) {
              setPlayerPos(null);
            } else if (groundTiles.has(JSON.stringify([x, y, z]))) {
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.delete(JSON.stringify([x, y, z]));
                }),
              );
            } else if (groundTiles.has(JSON.stringify([x, y, z - 1]))) {
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.delete(JSON.stringify([x, y, z - 1]));
                }),
              );
            } else if (grillTiles.has(JSON.stringify([x, y, z - 1]))) {
              setGrillTiles(
                produce(grillTiles, (s) => {
                  s.delete(JSON.stringify([x, y, z - 1]));
                }),
              );
            }
          } else if (tool === "dirt") {
            clearTile(x, y, z);
            setGroundTiles(
              produce(groundTiles, (s) => {
                s.add(JSON.stringify([x, y, z]));
              }),
            );
          } else if (tool === "grass") {
            if (z !== 0) {
              clearTile(x, y, z - 1);
              setGroundTiles(
                produce(groundTiles, (s) => {
                  s.add(JSON.stringify([x, y, z - 1]));
                }),
              );
            }
          } else if (tool === "grill") {
            if (z !== 0) {
              clearTile(x, y, z - 1);
              setGrillTiles(
                produce(grillTiles, (s) => {
                  s.add(JSON.stringify([x, y, z - 1]));
                }),
              );
            }
          }
        }}
      />
      <p>LevelDescription</p>
      <code>{JSON.stringify(levelDescription)}</code>
      <br />
      <button
        onClick={() => {
          const isInitialized = (des: any): des is LevelDescription => {
            return des.start_pos !== null;
          };
          if (isInitialized(levelDescription)) {
            setSolution(JSON.parse(solve(LevelDescription)));
          }
        }}
      >
        Show Graph
      </button>
    </>
  );
}

export default LevelEditor;
