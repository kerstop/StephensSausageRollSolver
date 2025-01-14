import { useState } from "react";
import "./App.css";
import Graph from "./Graph";
import { LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";

function App() {
  const [solution, setSolution] = useState<LevelGraph | null>(null);
  const [dimensions, setDimensions] = useState<[number, number, number]>([
    10, 10, 3,
  ]);

  return (
    <>
      <form>
        <label>
          Width
          <input
            type="number"
            onChange={(e) => {
              setDimensions([
                e.target.valueAsNumber,
                dimensions[1],
                dimensions[2],
              ]);
            }}
            defaultValue={dimensions[0]}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            onChange={(e) => {
              setDimensions([
                dimensions[0],
                e.target.valueAsNumber,
                dimensions[2],
              ]);
            }}
            defaultValue={dimensions[1]}
          />
        </label>
        <label>
          Layers
          <input
            type="number"
            onChange={(e) => {
              setDimensions([
                dimensions[0],
                dimensions[1],
                e.target.valueAsNumber,
              ]);
            }}
            defaultValue={dimensions[2]}
          />
        </label>
      </form>
      <LevelEditor
        setSolution={setSolution}
        lenX={dimensions[0]}
        lenY={dimensions[1]}
        lenZ={dimensions[2]}
      />
      {solution !== null ? <Graph level={solution} /> : ""}
    </>
  );
}

export default App;
