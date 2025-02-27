import { IVec3, LevelDescription, LevelState } from "../types";
import React, { DragEvent, JSX, ReactElement, useState } from "react";
import stephenSVG from "./stephen.svg";
import stephenGoalSVG from "./stephen_goal.svg";
import forkSVG from "./fork.svg";
import forkGoalSVG from "./fork_goal.svg";
import lowerCookedSausageIcon from "./sausage_lower_cooked.svg";
import lowerUnCookedSausageIcon from "./sausage_lower_raw.svg";
import upperCookedSausageIcon from "./sausage_upper_cooked.svg";
import upperUnCookedSausageIcon from "./sausage_upper_raw.svg";

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

  const forkStyle: React.CSSProperties = {};
  if (
    args.state?.player_dir &&
    IVec3.compare(args.state?.player_dir, [1, 0, 0])
  )
    forkStyle.transform = "rotate(0.25turn)";
  if (
    args.state?.player_dir &&
    IVec3.compare(args.state?.player_dir, [0, 1, 0])
  )
    forkStyle.transform = "rotate(0.5turn)";
  if (
    args.state?.player_dir &&
    IVec3.compare(args.state?.player_dir, [-1, 0, 0])
  )
    forkStyle.transform = "rotate(0.75turn)";

  const stephen = <img src={stephenSVG} className="icon" />;
  const fork: ReactElement<JSX.IntrinsicElements["img"]> = (
    <img src={forkSVG} className="icon" style={forkStyle} />
  );

  const goalStephen = <img src={stephenGoalSVG} className="icon" />;

  const goalForkStyle: React.CSSProperties = {};
  if (IVec3.compare(args.description.start_dir, [1, 0, 0]))
    goalForkStyle.transform = "rotate(0.25turn)";
  if (IVec3.compare(args.description.start_dir, [0, 1, 0]))
    goalForkStyle.transform = "rotate(0.5turn)";
  if (IVec3.compare(args.description.start_dir, [-1, 0, 0]))
    goalForkStyle.transform = "rotate(0.75turn)";

  const goalFork = (
    <img src={forkGoalSVG} className="icon" style={goalForkStyle} />
  );

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

      const currentSausage =
        args.state !== undefined
          ? LevelState.getSausageAt(args.state, [x, y, z])
          : LevelDescription.getSausageAt(args.description, [x, y, z]);

      const sausageStyle: React.CSSProperties = {};
      let lowerSausageIcon = lowerUnCookedSausageIcon;
      let upperSausageIcon = upperUnCookedSausageIcon;
      if (currentSausage) {
        if (currentSausage.orientation === "Vertical") {
          if (IVec3.compare(currentSausage.pos, [x, y, z])) {
            sausageStyle.transform = "rotate(0turn)";
          } else {
            sausageStyle.transform = "rotate(0.5turn)";
          }
        } else {
          if (IVec3.compare(currentSausage.pos, [x, y, z])) {
            sausageStyle.transform = "rotate(0.75turn)";
          } else {
            sausageStyle.transform = "rotate(0.25turn)";
          }
        }

        if (IVec3.compare(currentSausage.pos, [x, y, z])) {
          if (currentSausage.cooked[0][0])
            lowerSausageIcon = lowerCookedSausageIcon;
          if (currentSausage.cooked[1][0])
            upperSausageIcon = upperCookedSausageIcon;
        } else {
          if (currentSausage.cooked[0][1])
            lowerSausageIcon = lowerCookedSausageIcon;
          if (currentSausage.cooked[1][1])
            upperSausageIcon = upperCookedSausageIcon;
        }
      }

      const sausageIcons = (
        <>
          {<img src={lowerSausageIcon} className="icon" style={sausageStyle} />}
          {<img src={upperSausageIcon} className="icon" style={sausageStyle} />}
        </>
      );

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
          {args.state !== undefined
            ? LevelState.getSausageAt(args.state, [x, y, z])?.orientation[0]
            : LevelDescription.getSausageAt(args.description, [x, y, z])
                ?.orientation[0]}
          {IVec3.compare(args.description.start_pos, [x, y, z]) && goalStephen}
          {IVec3.compare(
            IVec3.add(args.description.start_pos, args.description.start_dir),
            [x, y, z],
          ) && goalFork}
          {args.state &&
            IVec3.compare(args.state.player_pos, [x, y, z]) &&
            stephen}
          {args.state &&
            IVec3.compare(
              IVec3.add(args.state.player_pos, args.state.player_dir),
              [x, y, z],
            ) &&
            fork}
          {currentSausage && sausageIcons}
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
