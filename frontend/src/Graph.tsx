import cytoscape from "cytoscape";
import { useEffect, useRef } from "react";
import { IVec2, LevelGraph, LevelState } from "./types";

interface Args {
  level: LevelGraph;
}

function Graph({ level }: Args) {
  const nodes = (() => {
    let nodes = level.states;
    return nodes.map((state, i) => {
      return { data: { ...state, id: state.id.toString() } };
    });
  })();
  const edges = level.edges.map((e, i) => ({
    id: i.toString(),
    source: e[0].toString(),
    target: e[1].toString(),
  }));
  const graph = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    cytoscape({ container: graph.current, elements: [...nodes, ...edges] });
  }, []);
  return <div ref={graph}></div>;
}

export default Graph;
