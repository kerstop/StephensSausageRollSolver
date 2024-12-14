import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import * as solver from "solver";
import { Sausage, SausageOrientation } from "solver";
import { Tile, TileType } from "./Tile";

type Tool = "water" | "ground" | "grill";

function App() {
  const [tileTypes, setTileTypes] = useState<TileType[][]>(
    new Array(10).fill(0).map(() => new Array(10).fill("water")),
  );

  const [tool, setTool] = useState<Tool>("water");

  const [sausages, setSausages] = useState<solver.Sausage[]>([]);
  const [playerDir, setPlayerDir] = useState<"up" | "right" | "down" | "left">(
    "up",
  );
  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null);

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
                            new Sausage(x, y, SausageOrientation.Horizantal),
                          ]);
                          break;
                        case "vertical":
                          setSausages([
                            ...sausages,
                            new Sausage(x, y, SausageOrientation.Vertical),
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
                    if (s.check_collision(x, y)) {
                      return s.orientation === SausageOrientation.Vertical
                        ? "V"
                        : "H";
                    }
                  })}
                  {playerPos?.[0] === x && playerPos[1] === y ? "P" : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export default App;
