import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { LevelGraph, LevelState } from "./types";
import PhysicsWorker from "./physicsWorker?worker";
import * as PhysicsWorkerDefs from "./physicsWorker";
import data from "./tmp.json";

interface Args {
  solution: LevelGraph;
}

const colors = {
  defaultColor: new THREE.Color().setHex(0xb8afa2),
  selectedColor: new THREE.Color().setHex(0xfff176),
};

export const MyGraph = ({ solution }: Args) => {
  const container = useRef<null | HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState(new THREE.Vector2());
  const [renderer, setRenderer] = useState(new THREE.WebGLRenderer());
  useEffect(() => {
    renderer.setSize(800, 600);
    return () => {
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, [renderer]);

  useEffect(() => {
    renderer.domElement.onmousemove = (e) => {
      mousePos.x = (e.offsetX / renderer.domElement.width) * 2 - 1;
      mousePos.y = -(e.offsetY / renderer.domElement.height) * 2 + 1;
    };
  }, [renderer, mousePos]);

  const [scene, setScene] = useState(new THREE.Scene());
  useEffect(() => {
    const sunLamp = new THREE.DirectionalLight(0xffffff, 1);
    sunLamp.position.set(1, 1, 1);
    scene.add(sunLamp);

    const ambientLamp = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLamp);

    const sky = new Sky();
    sky.scale.setScalar(45000);
    const sunPosition = new THREE.Vector3(1, 1, 1);
    sky.material.uniforms.sunPosition.value = sunPosition;
    scene.add(sky);
  }, [scene]);

  const [camera, setCamera] = useState(
    new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000),
  );
  useEffect(() => {
    camera.position.set(10, 10, 20).multiplyScalar(10);
  }, [camera]);

  const [raycast, setRaycast] = useState(new THREE.Raycaster());

  const controls = useMemo(
    () => new OrbitControls(camera, renderer.domElement),
    [renderer],
  );
  useEffect(() => {
    controls.enableDamping = true;
    controls.update();
  }, [controls]);

  const [pausePhysics, setPausePhysics] = useState(false);
  const physicsWorker = useRef(new PhysicsWorker());
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

  useEffect(() => {
    physicsWorker.current = new PhysicsWorker();
    physicsWorker.current.postMessage({
      graph: solution,
      pause: false,
    } as PhysicsWorkerDefs.Message);
    return () => {
      physicsWorker.current.terminate();
    };
  }, [solution]);

  const meshes = useMemo(() => {
    const geometry = new THREE.SphereGeometry();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHex(0xffffff),
    });

    const meshes = new THREE.InstancedMesh(
      geometry,
      material,
      solution.states.length,
    );

    meshes.userData["levelStates"] = [];
    solution.states.forEach((state, i) => {
      meshes.userData["levelStates"].push(state);
      meshes.setColorAt(i, colors.defaultColor);
    });
    if (meshes.instanceColor !== null) meshes.instanceColor.needsUpdate = true;
    return meshes;
  }, [solution]);

  useEffect(() => {
    scene.add(meshes);
    return () => {
      scene.remove(meshes);
    };
  }, [meshes, scene]);

  useEffect(() => {
    const animate = () => {
      controls.update();

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);
  }, [renderer, scene, camera, controls]);

  useEffect(() => {
    container.current?.appendChild(renderer.domElement);
    return () => {
      container.current?.removeChild(renderer.domElement);
    };
  }, [container, renderer]);

  useEffect(() => {
    physicsWorker.current.onmessage = (e) => {
      const data = e.data as PhysicsWorkerDefs.FrameEvent[];
      data.forEach(({ id, position }) => {
        let nodeIndex = hashToIndex.get(id);
        Object.setPrototypeOf(position, THREE.Vector3.prototype);
        if (nodeIndex !== undefined) {
          meshes.setMatrixAt(
            nodeIndex,
            new THREE.Matrix4().makeTranslation(position),
          );
        }
      });
      meshes.instanceMatrix.needsUpdate = true;
    };
  }, [solution, meshes]);

  useEffect(() => {
    if (selectedNodeIndex !== null) {
      meshes.setColorAt(selectedNodeIndex, colors.selectedColor);
      if (meshes.instanceColor !== null)
        meshes.instanceColor.needsUpdate = true;
    }
    return () => {
      if (selectedNodeIndex !== null) {
        meshes.setColorAt(selectedNodeIndex, colors.defaultColor);
        if (meshes.instanceColor !== null)
          meshes.instanceColor.needsUpdate = true;
      }
    };
  }, [selectedNodeIndex, meshes]);

  useEffect(() => {
    renderer.domElement.onmousedown = (e) => {
      if (e.button !== 2) return;

      raycast.setFromCamera(mousePos, camera);

      meshes.computeBoundingSphere();
      const intersection = raycast.intersectObject(meshes)[0]?.instanceId;
      if (intersection !== undefined) {
        setSelectedNodeIndex(intersection);
      }
    };
  }, [renderer, raycast, meshes, camera, mousePos]);
  return (
    <>
      <div ref={container}></div>
      <button
        type="button"
        defaultValue={""}
        className={`${pausePhysics ? "active" : null}`}
        onClick={() => {
          physicsWorker.current.postMessage({
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
              let message: PhysicsWorkerDefs.Message = {
                togglePin: nodeHash,
              };
              physicsWorker.current.postMessage(message);
            }
          }}
        >
          Pin
        </button>
      ) : (
        <button disabled>Pin</button>
      )}
    </>
  );
};
