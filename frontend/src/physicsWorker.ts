import { LevelGraph, LevelState } from "./types";
import { Vector3, Vector3Like } from "three";

console.log("init");

export interface Message {
  graph?: LevelGraph;
  togglePin: number;
  pause?: boolean;
  grabNode?: number;
  releaseNode?: number;
  drag?: Vector3Like;
}

export interface FrameEvent {
  id: number;
  position: Vector3Like;
}

interface Node {
  position: Vector3;
  velocity: Vector3;
  force: Vector3;
  neighbors: Node[];
  pinned: boolean;
}

let frame: number = 0;
let nodes: Map<number, Node> = new Map();
let edges: [number, number][] = [];
let paused: boolean = false;

let max_speed: number = 100;
let optimalLength: number = 10;
let damping: number = 0.01;
let springStiffness: number = 0.1;
let dispersionForceMultiplier: number = 1;
let dispersionForceFalloff: number = 50;

class PositionIndex {
  index = new Map<string, Node[]>();

  update(nodes: Map<number, Node>): void {
    this.index.clear();

    for (let node of nodes.values()) {
      let indexValue = JSON.stringify(
        node.position
          .clone()
          .multiplyScalar(1 / (dispersionForceFalloff * 2))
          .floor(),
      );
      let indexVoxel = this.index.get(indexValue);
      if (indexVoxel !== undefined) {
        indexVoxel.push(node);
      } else {
        this.index.set(indexValue, [node]);
      }
    }
  }

  getEffectedNodes(pos: Vector3): Node[] {
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
        this.index.get(JSON.stringify(effectedChunkCord)) ?? [];
      for (let node of effectedChunk) {
        if (
          new Vector3().subVectors(pos, node.position).length() <
          dispersionForceFalloff
        )
          effectedNodes.push(node);
      }
    }
    return effectedNodes;
  }
}

self.onmessage = (e: MessageEvent<Message>) => {
  let message = e.data;
  if (message.graph !== undefined) {
    frame = 0;
    nodes = new Map();
    edges = [];
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
  if (message.togglePin !== undefined) {
    let node = nodes.get(message.togglePin);
    if (node !== undefined) {
      node.pinned = !node.pinned;
      node.velocity.set(0, 0, 0);
    }
  }
  if (message.pause !== undefined) {
    if (paused && !message.pause) {
      requestAnimationFrame(getNextFrame);
    }
    paused = message.pause;
  }
};

let positionIndex = new PositionIndex();
const getNextFrame = () => {
  performance.mark("PhysicsStart");

  positionIndex.update(nodes);

  const scratch = new Vector3();

  edges.forEach((edge) => {
    let n1 = nodes.get(edge[0]);
    let n2 = nodes.get(edge[1]);
    if (n1 === undefined || n2 === undefined)
      throw new Error(
        "An id was provided in the edge list but not the list of nodes",
      );
    if (n1.pinned && n2.pinned) return;
    if (n2.pinned) [n1, n2] = [n2, n1];

    scratch.subVectors(n2.position, n1.position);
    scratch.setLength(optimalLength - scratch.length());
    scratch.multiplyScalar(springStiffness);
    if (n1.pinned) {
      n2.force.add(scratch);
    } else {
      scratch.multiplyScalar(0.5);
      n2.force.add(scratch);
      scratch.multiplyScalar(-1);
      n1.force.add(scratch);
    }
  });

  for (const node of nodes.values()) {
    if (!node.pinned) {
      for (const node2 of positionIndex.getEffectedNodes(node.position)) {
        if (node === node2) continue;
        scratch.subVectors(node.position, node2.position);
        let distance_sqr = scratch.lengthSq();

        node.force.add(
          scratch
            .normalize()
            .multiplyScalar(dispersionForceMultiplier * (1 / distance_sqr)),
        );
      }
    }
  }

  for (const node of nodes.values()) {
    node.velocity.add(node.force);
    node.velocity.multiplyScalar(1 - damping).clampLength(0, max_speed);
    node.position.add(node.velocity);
    node.force.set(0, 0, 0);
  }

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
