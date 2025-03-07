import { LevelDescription } from "../types";

const simplestPossibleLevel =
  '{"start_pos":[2,2,1],"start_dir":[1,0,0],"ground":[[2,2,0],[3,2,0],[4,2,0],[4,1,0]],"grills":[[5,1,0],[5,2,0],[6,2,0],[6,1,0]],"sausages":[{"pos":[4,1,1],"cooked":[[0,0],[0,0]],"orientation":"Vertical"}]}';
const happyPool =
  '{"start_pos":[1,5,1],"start_dir":[0,1,0],"ground":[[2,1,0],[2,2,0],[1,2,0],[1,3,0],[1,4,0],[1,5,0],[3,1,0],[4,1,0],[5,1,0],[1,6,0],[2,6,0],[3,6,0],[4,6,0],[5,6,0],[5,5,0],[6,5,0],[6,4,0],[6,3,0],[6,2,0],[6,1,0]],"grills":[[4,3,0],[3,4,0]],"sausages":[{"pos":[3,1,1],"cooked":[[0,0],[0,0]],"orientation":"Horizontal"}]}';
const thePaddock =
  '{"start_pos":[5,4,1],"start_dir":[0,1,0],"ground":[[1,1,1],[2,1,1],[1,4,1],[2,4,1],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[7,1,1],[8,1,1],[9,1,1],[9,2,1],[9,3,1],[9,4,1],[8,4,1],[7,4,1],[8,2,0],[8,3,0],[6,1,0],[5,1,0],[4,1,0],[3,1,0],[3,2,0],[4,2,0],[5,2,0],[6,2,0],[6,3,0],[5,3,0],[4,3,0],[3,3,0],[3,4,0],[4,4,0],[5,4,0],[6,4,0],[1,2,0],[1,3,0],[1,5,0],[1,6,0],[2,6,0],[2,5,0],[3,5,0],[3,6,0],[4,6,0],[4,5,0],[5,5,0],[5,6,0],[6,6,0],[6,5,0],[7,5,0],[7,6,0],[8,6,0],[8,5,0]],"grills":[[2,2,0],[2,3,0],[7,2,0],[7,3,0]],"sausages":[{"pos":[4,2,1],"cooked":[[0,0],[0,0]],"orientation":"Horizontal"},{"pos":[4,3,1],"cooked":[[0,0],[0,0]],"orientation":"Horizontal"}]}';

function Presets(args: { setDescription: (desc: LevelDescription) => void }) {
  return (
    <select
      onInput={(e) => {
        if (e.currentTarget.value.length > 0)
          args.setDescription(JSON.parse(e.currentTarget.value));
      }}
    >
      <option value="">Load a Preset</option>
      <option value={simplestPossibleLevel}>Simplest Possible Level</option>
      <option value={happyPool}>Happy Pool</option>
      <option value={thePaddock}>The Paddock</option>
    </select>
  );
}

export default Presets;
