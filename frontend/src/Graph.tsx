import cytoscape, { ElementDefinition } from "cytoscape";
import { useEffect, useRef } from "react";
import { IVec2, LevelGraph, LevelState } from "./types";

interface Args {
  level: LevelGraph;
}

function Graph({ level }: Args) {
  const nodes: ElementDefinition[] = (() => {
    return level.states.map((state, i) => {
      return { data: { ...state, id: state.id.toString() } };
    });
  })();
  const edges: ElementDefinition[] = level.edges.map((e, i) => {
    return {
      data: {
        id: i.toString(),
        source: e[0].toString(),
        target: e[1].toString(),
      },
    };
  });
  const graph = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    cytoscape({
      container: graph.current,
      elements: [...nodes, ...edges],
      layout: {
        name: "cose",
        animate: true,
        fit: true,
      },
    });
  }, [level]);
  return <div ref={graph} className="cytoscape-target"></div>;
}

export default Graph;
