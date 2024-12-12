import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import * as solver from "solver";

type Tool = "water" | "ground" | "grill";
type TileType = "water" | "ground" | "grill";

function App() {
  const [tileTypes, setTileTypes] = useState<TileType[][]>(
    new Array(10).fill(0).map(() => new Array(10).fill("water")),
  );

  const [tool, setTool] = useState<Tool>("water");

  return (
    <>
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
      {tileTypes.map((row, y) => {
        return (
          <div className="row" key={y}>
            {row.map((tileType, x) => {
              return (
                <div
                  key={x}
                  className={`tile ${tileType} `}
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
                ></div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export default App;
