import { useMemo, useState } from "react";
import "./App.css";
import { solve } from "solver";
import Graph from "./Graph";
import { IVec2, LevelDescription, LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";

function App() {
  const [descriptonToSolve, setDescriptionToSolve] =
    useState<null | LevelDescription>(null);

  const solution: LevelGraph = useMemo(
    () =>
      descriptonToSolve !== null ? JSON.parse(solve(descriptonToSolve)) : null,
    [descriptonToSolve],
  );

  return (
    <>
      <LevelEditor showLevel={setDescriptionToSolve} />
      {solution !== null && descriptonToSolve !== null ? (
        <Graph level={solution} description={descriptonToSolve} />
      ) : (
        ""
      )}
    </>
  );
}

export default App;
