import { LevelGraph, LevelState } from "./types";
import { Vector3 } from "three";

export interface Message {
  graph?: LevelGraph;
  pin?: number[];
  unpin?: number[];
  pause?: boolean;
}

export interface FrameEvent {
  id: number;
  position: Vector3;
}

interface Node {
  position: Vector3;
  velocity: Vector3;
  force: Vector3;
  neighbors: Node[];
  pinned: boolean;
}

let frame = 0;
let nodes: Map<number, Node> = new Map();
let edges: [number, number][] = [];
let paused: boolean = false;
let initialized: boolean = false;
let _prevTime: DOMHighResTimeStamp = performance.now();

let max_speed: number = 100;
let optimalLength: number = 10;
let damping: number = 0.01;
let springStiffness: number = 0.1;
let dispersionForceMultiplier: number = 1;
let dispersionForceFalloff: number = 10;

self.onmessage = (e: MessageEvent<Message>) => {
  let message = e.data;
  if (message.graph !== undefined && !initialized) {
    message.graph.states.forEach((state) => {
      let position = new Vector3();
      position.random();
      position.add(new Vector3(-0.5, -0.5, -0.5));
      nodes.set(state.id, {
        position,
        velocity: new Vector3(),
        force: new Vector3(0, 0, 0),
        neighbors: [],
        pinned: false,
      });
    });

    nodes.set(message.graph.initial_state.id, {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
      force: new Vector3(0, 0, 0),
      neighbors: [],
      pinned: true,
    });

    message.graph.edges.forEach((edge) => {
      if (edge.source === edge.target) return;

      let n1 = nodes.get(edge.source);
      let n2 = nodes.get(edge.target);
      if (n1 === undefined || n2 === undefined)
        throw new Error(
          "An id was provided in the edge list but not the list of nodes",
        );

      if (!n1.neighbors.includes(n2)) n1.neighbors.push(n2);
      if (!n2.neighbors.includes(n1)) n2.neighbors.push(n1);

      const new_edge = [edge.source, edge.target].sort() as [number, number];
      if (
        edges.find(
          (other) => other[0] === new_edge[0] && other[1] === new_edge[1],
        ) === undefined
      ) {
        edges.push(new_edge);
      }
    });

    requestAnimationFrame(getNextFrame);
  }
  if (message.pin !== undefined) {
    message.pin.forEach((n) => {
      let node = nodes.get(n);
      if (node !== undefined) {
        node.pinned = true;
      }
    });
  }
  if (message.unpin !== undefined) {
    message.unpin.forEach((n) => {
      let node = nodes.get(n);
      if (node !== undefined) {
        node.pinned = false;
      }
    });
  }
  if (message.pause !== undefined) {
    if (paused && !message.pause) {
      requestAnimationFrame(getNextFrame);
    }
    paused = message.pause;
  }
};

const getNextFrame = () => {
  performance.mark("PhysicsStart");
  let positionIndex = new Map<string, Node[]>();
  for (let node of nodes.values()) {
    let indexValue = JSON.stringify(
      node.position
        .clone()
        .multiplyScalar(1 / (dispersionForceFalloff * 2))
        .floor(),
    );
    let indexVoxel = positionIndex.get(indexValue);
    if (indexVoxel !== undefined) {
      indexVoxel.push(node);
    } else {
      positionIndex.set(indexValue, [node]);
    }
  }
  let getEffectedNodes = (pos: Vector3) => {
    let effectedChunksCords = [
      pos
        .clone()
        .multiplyScalar(1 / (dispersionForceFalloff * 2))
        .round(),
    ];
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: -1, y: 0, z: 0 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: 0, y: -1, z: 0 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: 0, y: 0, z: -1 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: -1, y: -1, z: 0 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: 0, y: -1, z: -1 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: -1, y: 0, z: -1 }),
    );
    effectedChunksCords.push(
      effectedChunksCords[0].clone().add({ x: -1, y: -1, z: -1 }),
    );

    let effectedNodes = [];
    for (let effectedChunkCord of effectedChunksCords) {
      let effectedChunk =
        positionIndex.get(JSON.stringify(effectedChunkCord)) ?? [];
      for (let node of effectedChunk) {
        if (
          new Vector3().subVectors(pos, node.position).length() <
          dispersionForceFalloff
        )
          effectedNodes.push(node);
      }
    }
    return effectedNodes;
  };

  edges.forEach((edge) => {
    let n1 = nodes.get(edge[0]);
    let n2 = nodes.get(edge[1]);
    if (n1 === undefined || n2 === undefined)
      throw new Error(
        "An id was provided in the edge list but not the list of nodes",
      );
    if (n1.pinned && n2.pinned) return;
    if (n2.pinned) [n1, n2] = [n2, n1];

    let d = new Vector3().subVectors(n2.position, n1.position);
    d.setLength(optimalLength - d.length());
    d.multiplyScalar(springStiffness);
    if (n1.pinned) {
      n2.force.add(d);
    } else {
      d.multiplyScalar(0.5);
      n2.force.add(d);
      d.multiplyScalar(-1);
      n1.force.add(d);
    }
  });

  for (const node of nodes.values()) {
    if (node.neighbors.length > 1) {
      let average_neighbors_position = new Vector3();
      node.neighbors.forEach((neighbor) => {
        average_neighbors_position.add(neighbor.position);
      });

      if (!node.pinned) {
        let force_vector = new Vector3();
        for (const node2 of getEffectedNodes(node.position)) {
          if (node === node2) continue;
          force_vector.subVectors(node.position, node2.position);
          let distance_sqr = force_vector.lengthSq();

          node.force.add(
            force_vector
              .normalize()
              .multiplyScalar(dispersionForceMultiplier * (1 / distance_sqr)),
          );
        }
      }
    }
  }

  let total = 0;

  for (const node of nodes.values()) {
    total += node.force.length();
    node.velocity.add(node.force);
    node.velocity.multiplyScalar(1 - damping).clampLength(0, max_speed);
    node.position.add(node.velocity);
    node.force.set(0, 0, 0);
  }

  console.log(
    `
total movement ${total}
average movement ${total / nodes.size}
`.trim(),
  );

  let message: FrameEvent[] = [];
  for (const [id, node] of nodes.entries()) {
    message.push({ id: id, position: node.position });
  }
  self.postMessage(message);
  frame += 1;

  if (!paused) {
    requestAnimationFrame(getNextFrame);
  }
  performance.mark("PhysicsEnd");
  performance.measure("PhysicsTime", "PhysicsStart", "PhysicsEnd");
};
