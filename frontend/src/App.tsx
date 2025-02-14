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
      <LevelEditor setSolution={setSolution} />
      {solution !== null ? (
        <>
          <MyGraph solution={solution} />
        </>
      ) : (
        ""
      )}
    </>
  );
}

export default App;
