import { IVec3, LevelDescription, LevelState } from "../types";
import { DragEvent, useState } from "react";

const TileGrid = (args: {
  description: LevelDescription;
  state?: LevelState;
  lenX: number;
  lenY: number;
  lenZ: number;
  onClick?: (x: number, y: number, z: number) => void;
  onDrop?: (e: DragEvent, x: number, y: number, z: number) => void;
}) => {
  const [z, setZ] = useState<number>(1);

  const groundTiles = new Set(
    args.description.ground.map((v) => JSON.stringify(v)),
  );
  const grillTiles = new Set(
    args.description.grills.map((v) => JSON.stringify(v)),
  );

  const layersControls = [];
  for (let i = 0; i < args.lenZ; i++) {
    layersControls.push(
      <button
        key={i}
        className={`layer-control ${z === i ? "active" : null}`}
        onClick={() => {
          setZ(i);
        }}
      >
        {i === 0 ? "W" : i}
      </button>,
    );
  }

  const tiles = [];
  for (let y = 0; y < args.lenY; y++) {
    const row = [];
    for (let x = 0; x < args.lenX; x++) {
      let tileType;
      if (groundTiles.has(JSON.stringify([x, y, z]))) tileType = "dirt";
      else if (grillTiles.has(JSON.stringify([x, y, z]))) tileType = "dirt";
      else if (groundTiles.has(JSON.stringify([x, y, z - 1])))
        tileType = "grass";
      else if (grillTiles.has(JSON.stringify([x, y, z - 1])))
        tileType = "grill";
      else {
        if (z > 1) tileType = "air";
        else tileType = "water";
      }
      row.push(
        <div
          key={x}
          className={`tile ${tileType} `}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            if (args.onDrop) args.onDrop(e, x, y, z);
          }}
          onClick={() => {
            if (args.onClick) args.onClick(x, y, z);
          }}
        >
          {
            LevelDescription.getSausageAt(args.description, [x, y, z])
              ?.orientation[0]
          }
          {IVec3.compare(args.description.start_pos, [x, y, z]) ? "P" : ""}
          {IVec3.compare(
            IVec3.add(args.description.start_pos, args.description.start_dir),
            [x, y, z],
          )
            ? "F"
            : ""}
        </div>,
      );
    }
    tiles.push(row);
  }

  return (
    <>
      <div>{layersControls}</div>
      <div className="tilegrid">
        {tiles.map((row, y) => {
          return (
            <div className="row" key={y}>
              {row.map((tile) => {
                return tile;
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default TileGrid;
