import { useState } from "react";
import "./App.css";
import { LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";
import { MyGraph } from "./MyGraph";

function App() {
  const [solution, setSolution] = useState<LevelGraph | null>(null);

  return (
    <>
      <div className="column">
        <LevelEditor setSolution={setSolution} />
      </div>
      {solution !== null ? (
        <div className="column">
          <MyGraph solution={solution} />
        </div>
      ) : (
        ""
      )}
    </>
  );
}

export default App;
