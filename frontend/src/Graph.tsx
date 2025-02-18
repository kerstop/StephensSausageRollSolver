import cytoscape, { ElementDefinition, NodeSingular } from "cytoscape";
import { useEffect, useRef, useState } from "react";
import { LevelGraph, LevelState } from "./types";
import LevelDisplay from "./LevelDisplay";

interface Args {
  level: LevelGraph;
}

function Graph({ level }: Args) {
  const nodes: ElementDefinition[] = (() => {
    return level.states.map((state, _i) => {
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
          style: {
            "font-size": "0.8em",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
          },
        },
        {
          selector: "edge[movement]",
          style: { label: "data(movement)" },
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
          selector: `node[level.status = "Solution"]`,
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
      <code>{JSON.stringify(level)}</code>
      <br />
      {viewedState !== null ? (
        <>
          <LevelDisplay
            level={viewedState}
            size={[10, 10]}
            description={level.level_description}
          />
        </>
      ) : (
        <p>Select a Node to view the state</p>
      )}
    </>
  );
}

export default Graph;
