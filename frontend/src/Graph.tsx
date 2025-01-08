import cytoscape, { ElementDefinition, NodeSingular } from "cytoscape";
import { useEffect, useRef, useState } from "react";
import { IVec2, LevelDescription, LevelGraph, LevelState } from "./types";
import LevelDisplay from "./LevelDisplay";

interface Args {
  level: LevelGraph;
  description: LevelDescription;
}

function Graph({ level, description }: Args) {
  const nodes: ElementDefinition[] = (() => {
    return level.states.map((state, i) => {
      return { data: { id: state.id.toString(), level: state } };
    });
  })();
  const edges: ElementDefinition[] = level.edges.map((e) => {
    return {
      data: {
        id: e.id.toString(),
        source: e.source.toString(),
        target: e.target.toString(),
        movement: e.movement,
      },
    };
  });
  const graph = useRef<null | HTMLDivElement>(null);
  const [viewedState, setViewedState] = useState<null | LevelState>(null);
  useEffect(() => {
    let cy = cytoscape({
      container: graph.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "edge",
          style: { "font-size": "0.8em", "curve-style": "bezier" },
        },
        {
          selector: "edge[movement = 'forward']",
          style: { label: "forward" },
        },
        {
          selector: "edge[movement = 'back']",
          style: { label: "back" },
        },
        {
          selector: "edge[movement = 'left']",
          style: { label: "left" },
        },
        {
          selector: "edge[movement = 'right']",
          style: { label: "right" },
        },
        {
          selector: `node[id = "${level.initial_state.id.toString()}"]`,
          style: {
            "border-color": "green",
            "border-width": "2px",
          },
        },
        {
          selector: `node[level.status = "Lost"]`,
          style: {
            "background-color": "blue",
          },
        },
        {
          selector: `node[level.status = "Burnt"]`,
          style: {
            "background-color": "red",
          },
        },
        {
          selector: `node[level.status = "Solved"]`,
          style: {
            "background-color": "green",
          },
        },
      ],
      layout: {
        name: "cose",
        idealEdgeLength: () => 32,
        edgeElasticity: () => 1024,
        nodeRepulsion: () => 4096,
        animate: true,
        fit: true,
      },
    });

    cy.on("click", "node", (e) => {
      setViewedState((e.target as NodeSingular).data("level"));
    });
  }, [level]);
  return (
    <>
      <div ref={graph} className="cytoscape-target"></div>
      <p>generated level graph</p>
      <textarea>{JSON.stringify(level)}</textarea>
      <br />
      {viewedState !== null ? (
        <>
          <LevelDisplay
            level={viewedState}
            size={[10, 10]}
            description={description}
          />
        </>
      ) : (
        <p>Select a Node to view the state</p>
      )}
    </>
  );
}

export default Graph;
