import { useState } from "react";
import "./App.css";
import Graph from "./Graph";
import { LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";
import * as THREE from "three";
import { MyGraph } from "./MyGraph";

function App() {
  const [solution, setSolution] = useState<LevelGraph | null>(null);

  return (
    <>
      <MyGraph />
      <LevelEditor setSolution={setSolution} width={10} height={10} />
      {solution !== null ? <Graph level={solution} /> : ""}
    </>
  );
}

export default App;
