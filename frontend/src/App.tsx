import { useMemo, useState } from "react";
import "./App.css";
import { solve } from "solver";
import Graph from "./Graph";
import { IVec2, LevelDescription, LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";

function App() {
  const [levelToSolve, setLevelToSolve] = useState<null | LevelDescription>(
    null,
  );

  const solution: LevelGraph = useMemo(
    () => JSON.parse(solve(levelToSolve)),
    [levelToSolve],
  );

  return (
    <>
      <LevelEditor showLevel={setLevelToSolve} />
      {solution !== null ? <Graph level={solution}></Graph> : ""}
    </>
  );
}

export default App;
