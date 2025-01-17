import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { LevelGraph, LevelState } from "./types";
import PhysicsWorker from "./physicsWorker?worker";
import * as PhysicsWorkerDefs from "./physicsWorker";
import data from "./tmp.json";

interface Args {
  solution?: LevelGraph;
}

export const MyGraph = ({ solution }: Args) => {
  if (solution === undefined) {
    solution = data as LevelGraph;
  }

  const [pausePhysics, setPausePhysics] = useState(false);
  const physicsWorker = useRef(new PhysicsWorker());
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

  const container = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(800, 600);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000);
    camera.position.set(10, 10, 20).multiplyScalar(10);

    const sunLamp = new THREE.DirectionalLight(0xffffff, 1);
    sunLamp.position.set(1, 1, 1);
    scene.add(sunLamp);

    const ambientLamp = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLamp);

    const sky = new Sky();
    sky.scale.setScalar(45000);
    const sunPosition = new THREE.Vector3(1, 1, 1);
    sky.material.uniforms.sunPosition.value = sunPosition;
    scene.add(sky);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.update();

    const geometry = new THREE.SphereGeometry();

    const material = new THREE.MeshStandardMaterial({ color: 0xb8afa2 });

    const meshes = new Map<number, THREE.Mesh>();
    solution.states.forEach((state) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData["levelState"] = state;
      scene.add(mesh);
      meshes.set(state.id, mesh);
    });

    physicsWorker.current.onmessage = (e) => {
      const data = e.data as PhysicsWorkerDefs.FrameEvent[];
      data.forEach(({ id, position }) => {
        let mesh = meshes.get(id);
        if (mesh !== undefined) {
          mesh.position.copy(position);
        }
      });
    };

    const animate = () => {
      controls.update();

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    container.current?.appendChild(renderer.domElement);
    return () => {
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, [solution]);

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
    </>
  );
};
