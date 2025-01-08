import { useMemo, useState } from "react";
import "./App.css";
import { solve } from "solver";
import Graph from "./Graph";
import { IVec2, LevelDescription, LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";

function App() {
  const [solution, setSolution] = useState<LevelGraph | null>(null);

  return (
    <>
      <LevelEditor setSolution={setSolution} width={10} height={10} />
      {solution !== null ? <Graph level={solution} /> : ""}
    </>
  );
}

export default App;
