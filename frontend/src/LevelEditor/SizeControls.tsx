function SizeControls(args: {
  dimensions: [number, number, number];
  setDimensions: (arg: [number, number, number]) => void;
}) {
  return (
    <form>
      <label>
        Width
        <input
          type="number"
          onChange={(e) => {
            args.setDimensions([
              e.target.valueAsNumber,
              args.dimensions[1],
              args.dimensions[2],
            ]);
          }}
          defaultValue={args.dimensions[0]}
        />
      </label>
      <label>
        Height
        <input
          type="number"
          onChange={(e) => {
            args.setDimensions([
              args.dimensions[0],
              e.target.valueAsNumber,
              args.dimensions[2],
            ]);
          }}
          defaultValue={args.dimensions[1]}
        />
      </label>
      <label>
        Layers
        <input
          type="number"
          onChange={(e) => {
            args.setDimensions([
              args.dimensions[0],
              args.dimensions[1],
              e.target.valueAsNumber,
            ]);
          }}
          defaultValue={args.dimensions[2]}
        />
      </label>
    </form>
  );
}

export default SizeControls;
