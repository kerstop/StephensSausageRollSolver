import * as Three from "three/webgpu";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { LevelGraph, LevelState } from "./types";
import PhysicsWorker from "./physicsWorker?worker";
import * as PhysicsWorkerDefs from "./physicsWorker";
import TileGrid from "./LevelEditor/TileGrid";

interface Args {
  solution: LevelGraph;
}

const colors = {
  defaultColor: new Three.Color().setHex(0xb8afa2),
  selectedColor: new Three.Color().setHex(0xfff176),
  burntColor: new Three.Color().setHex(0xa80a01),
  lostColor: new Three.Color().setHex(0x013ea8),
  originColor: new Three.Color().setHex(0x62af54),
  solvedColor: new Three.Color().setHex(0x1aa801),
};

const getColor: (state: LevelState) => Three.Color = (state: LevelState) => {
  if (state.is_initial) return colors.originColor;
  if (state.status === "Lost") return colors.lostColor;
  if (state.status === "Solution") return colors.solvedColor;
  if (state.status === "Burnt") return colors.burntColor;
  return colors.defaultColor;
};

const mousePos = new Three.Vector2();

const renderer = new Three.WebGPURenderer();
renderer.setSize(600, 450);
renderer.setClearColor(new Three.Color(0xffffff));

renderer.domElement.onmousemove = (e) => {
  mousePos.x = (e.offsetX / renderer.domElement.width) * 2 - 1;
  mousePos.y = -(e.offsetY / renderer.domElement.height) * 2 + 1;
};

const camera = new Three.PerspectiveCamera(75, 4 / 3, 0.1, 1000);
camera.position.set(10, 10, 20).multiplyScalar(10);

let controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.8;
controls.enableDamping = true;
controls.screenSpacePanning = false;
controls.update();

const scene = new Three.Scene();
const sunLamp = new Three.DirectionalLight(0xffffff, 1);
sunLamp.position.set(1, 1, 1);
scene.add(sunLamp);

const ambientLamp = new Three.AmbientLight(0xffffff, 1);
scene.add(ambientLamp);

const sky = new Sky();
sky.scale.setScalar(45000);
const sunPosition = new Three.Vector3(1, 1, 1);
sky.material.uniforms.sunPosition.value = sunPosition;
scene.add(sky);

const raycast = new Three.Raycaster();

const animate = () => {
  controls.update();

  renderer.render(scene, camera);
};
renderer.setAnimationLoop(animate);

const physicsWorker = new PhysicsWorker();

export const MyGraph = ({ solution }: Args) => {
  const container = useRef<null | HTMLDivElement>(null);
  const [selectedLevelState, setSelectedLevelState] = useState<LevelState>(
    solution.initial_state,
  );

  const [pausePhysics, setPausePhysics] = useState(false);
  const [physicsFrame, setPhysicsFrame] = useState(0);

  useEffect(() => {
    physicsWorker.postMessage({
      graph: solution,
      pause: false,
    } as PhysicsWorkerDefs.Message);
  }, [solution]);

  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(
    null,
  );

  const [hashToIndex, indexToHash] = useMemo(() => {
    let hashToIndex = new Map<number, number>();
    let indexToHash = new Map<number, number>();
    solution.states.forEach((state, i) => {
      hashToIndex.set(state.id, i);
      indexToHash.set(i, state.id);
    });
    return [hashToIndex, indexToHash];
  }, [solution]);

  const meshes = useMemo(() => {
    const geometry = new Three.SphereGeometry();

    const material = new Three.MeshStandardMaterial({
      color: new Three.Color().setHex(0xffffff),
    });

    const meshes = new Three.InstancedMesh(
      geometry,
      material,
      solution.states.length,
    );

    meshes.userData["levelStates"] = [];
    solution.states.forEach((state, i) => {
      meshes.userData["levelStates"].push(state);
      meshes.setColorAt(i, getColor(state));
    });
    if (meshes.instanceColor !== null) meshes.instanceColor.needsUpdate = true;
    return meshes;
  }, [solution]);

  useEffect(() => {
    let points = [];

    let src_pos = new Three.Matrix4();
    let dst_pos = new Three.Matrix4();
    for (const edge of solution.edges) {
      const src_i = hashToIndex.get(edge.source);
      const dst_i = hashToIndex.get(edge.target);
      if (dst_i === undefined || src_i === undefined) continue;
      meshes.getMatrixAt(src_i, src_pos);
      meshes.getMatrixAt(dst_i, dst_pos);
      points.push(new Three.Vector3().setFromMatrixPosition(src_pos));
      points.push(new Three.Vector3().setFromMatrixPosition(dst_pos));
    }

    let lines = new Three.LineSegments(
      new Three.BufferGeometry().setFromPoints(points),
      new Three.LineBasicMaterial({ color: 0x000000 }),
    );
    scene.add(lines);
    return () => {
      scene.remove(lines);
    };
  }, [solution, meshes, physicsFrame]);

  useEffect(() => {
    scene.add(meshes);
    return () => {
      scene.remove(meshes);
    };
  }, [meshes]);

  useEffect(() => {
    container.current?.appendChild(renderer.domElement);
    return () => {
      container.current?.removeChild(renderer.domElement);
    };
  }, [container]);

  useEffect(() => {
    physicsWorker.onmessage = (e) => {
      const data = e.data as PhysicsWorkerDefs.FrameEvent[];
      data.forEach(({ id, position }) => {
        let nodeIndex = hashToIndex.get(id);
        if (nodeIndex !== undefined) {
          meshes.setMatrixAt(
            nodeIndex,
            new Three.Matrix4().makeTranslation(
              position.x,
              position.y,
              position.z,
            ),
          );
        }
      });
      meshes.instanceMatrix.needsUpdate = true;
      setPhysicsFrame((f) => f + 1);
    };
  }, [solution, meshes]);

  useEffect(() => {
    if (selectedNodeIndex !== null) {
      let m = new Three.Matrix4();
      meshes.getMatrixAt(selectedNodeIndex, m);
      controls.target = new Three.Vector3().setFromMatrixPosition(m);
      controls.cursor = new Three.Vector3();
      meshes.setColorAt(selectedNodeIndex, colors.selectedColor);
      if (meshes.instanceColor !== null)
        meshes.instanceColor.needsUpdate = true;

      setSelectedLevelState(
        meshes.userData["levelStates"][selectedNodeIndex] ?? null,
      );
    }
    return () => {
      if (selectedNodeIndex !== null) {
        meshes.setColorAt(
          selectedNodeIndex,
          getColor(meshes.userData["levelStates"][selectedNodeIndex]),
        );
        if (meshes.instanceColor !== null)
          meshes.instanceColor.needsUpdate = true;
      }
    };
  }, [selectedNodeIndex, meshes]);

  useEffect(() => {
    renderer.domElement.onmousedown = (e) => {
      if (e.button !== 0) return;

      raycast.setFromCamera(mousePos, camera);

      meshes.computeBoundingSphere();
      const intersection = raycast.intersectObject(meshes)[0]?.instanceId;
      if (intersection !== undefined) {
        setSelectedNodeIndex(intersection);
      }
    };
  }, [meshes]);
  return (
    <>
      <div ref={container}></div>
      <button
        type="button"
        defaultValue={""}
        className={`${pausePhysics ? "active" : null}`}
        onClick={() => {
          physicsWorker.postMessage({
            pause: !pausePhysics,
          } as PhysicsWorkerDefs.Message);
          setPausePhysics(!pausePhysics);
        }}
      >
        Pause Physics
      </button>
      {selectedNodeIndex !== null ? (
        <button
          onClick={() => {
            let nodeHash = indexToHash.get(selectedNodeIndex);
            if (nodeHash !== undefined) {
              physicsWorker.postMessage({
                togglePin: nodeHash,
              } as PhysicsWorkerDefs.Message);
            }
          }}
        >
          Pin
        </button>
      ) : (
        <button disabled>Pin</button>
      )}
      {selectedLevelState !== null && (
        <TileGrid
          description={solution.level_description}
          state={selectedLevelState}
          lenX={10}
          lenY={10}
          lenZ={3}
        />
      )}
    </>
  );
};
