import { useState } from "react";
import "./App.css";
import { LevelGraph } from "./types";
import LevelEditor from "./LevelEditor";
import { MyGraph } from "./MyGraph";

function App() {
  const [solution, setSolution] = useState<LevelGraph | null>(null);

  return (
    <div id="tool-container">
      <div>
        <LevelEditor setSolution={setSolution} />
      </div>
      {solution !== null ? (
        <div>
          <MyGraph solution={solution} />
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default App;
