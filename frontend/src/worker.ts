import { solve } from "solver";
import { LevelDescription } from "./types";

self.onmessage = (e: MessageEvent<LevelDescription>) => {
  const solution = JSON.parse(solve(e.data));
  self.postMessage(solution);
};
