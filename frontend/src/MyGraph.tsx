import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const MyGraph = () => {
  const container = useRef<null | HTMLDivElement>(null);
  const frame = useRef(0);

  const renderer = new THREE.WebGLRenderer();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  camera.position.z = 5;
  controls.update();

  renderer.setSize(400, 300);

  const animate = () => {
    sphere.position.y = Math.sin(frame.current * 0.02);

    controls.update();

    frame.current += 1;
    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(animate);

  useEffect(() => {
    container.current?.appendChild(renderer.domElement);
  }, []);
  return <div ref={container}></div>;
};
