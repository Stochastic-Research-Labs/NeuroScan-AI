"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sampleBrainJourney } from "@/lib/brain-journey";

/** Procedural educational neuron, not patient data or a microscopy reconstruction. */
export function NeuronModel({ progress }: { progress: RefObject<{ value: number }> }) {
  const group = useRef<Group>(null);
  const tissue = useRef<MeshStandardMaterial>(null);
  const nucleus = useRef<MeshBasicMaterial>(null);
  const soma = useRef<MeshStandardMaterial>(null);
  const pulses = useRef<Group>(null);
  const { geometry, paths } = useMemo(() => {
    const paths: CatmullRomCurve3[] = [];
    const tubes: TubeGeometry[] = [];
    // Radial dendritic arbor with three-dimensional, tapered secondary branches.
    for (let i = 0; i < 7; i++) {
      const angle = 0.2 + i * 0.78;
      const direction = new Vector3(Math.cos(angle), Math.sin(angle), Math.sin(i * 2.4) * 0.45);
      const side = new Vector3(-Math.sin(angle), Math.cos(angle), 0.18);
      const mid = direction.clone().multiplyScalar(0.6).addScaledVector(side, Math.sin(i * 2) * 0.16);
      const end = direction.clone().multiplyScalar(1.1 + 0.18 * Math.sin(i * 3)).addScaledVector(side, Math.cos(i) * 0.2);
      const curve = new CatmullRomCurve3([direction.clone().multiplyScalar(0.12), mid, end]);
      paths.push(curve);
      tubes.push(new TubeGeometry(curve, 20, 0.022, 5, false));
      for (let j = -1; j <= 1; j++) {
        const tip = end.clone().addScaledVector(direction, 0.42).addScaledVector(side, j * 0.38);
        tip.z += j * 0.18;
        const fork = end.clone().lerp(tip, 0.55).addScaledVector(side, Math.sin(i + j) * 0.1);
        const branch = new CatmullRomCurve3([mid.clone().lerp(end, 0.65), end, fork, tip]);
        tubes.push(new TubeGeometry(branch, 16, 0.009, 4, false));
        for (const sign of [-1, 1]) {
          const twig = tip.clone().addScaledVector(direction, 0.23).addScaledVector(side, sign * 0.18);
          twig.z += sign * 0.1;
          const twigPath = new CatmullRomCurve3([fork, tip.clone().lerp(twig, 0.4), twig]);
          tubes.push(new TubeGeometry(twigPath, 8, 0.004, 4, false));
        }
      }
    }
    const axon = new CatmullRomCurve3([new Vector3(0, -0.1, 0), new Vector3(0.4, -0.55, 0.35), new Vector3(1.1, -0.9, 0.2), new Vector3(1.9, -1.3, -0.2)]);
    paths.push(axon);
    tubes.push(new TubeGeometry(axon, 32, 0.045, 6, false));
    const geometry = mergeGeometries(tubes, false)!;
    tubes.forEach((tube) => tube.dispose());
    return { geometry, paths };
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!group.current || !tissue.current || !nucleus.current || !soma.current) return;
    const state = sampleBrainJourney(progress.current.value);
    group.current.visible = state.neuronOpacity > 0.001;
    group.current.scale.setScalar(state.neuronScale);
    group.current.rotation.set(0.12, (state.progress - 0.4) * 1.3, -0.16);
    tissue.current.opacity = state.neuronOpacity;
    nucleus.current.opacity = state.neuronOpacity * 0.85;
    soma.current.opacity = state.neuronOpacity;
    pulses.current?.children.forEach((child, i) => {
      const t = ((state.progress * 5 + i / paths.length) % 1 + 1) % 1;
      paths[i].getPoint(t, child.position);
      ((child as Mesh).material as MeshBasicMaterial).opacity = state.neuronOpacity;
    });
  });

  return <group ref={group} visible={false}>
    <mesh geometry={geometry}><meshStandardMaterial ref={tissue} color="#82cddd" emissive="#156b80" emissiveIntensity={0.7} roughness={0.42} metalness={0.25} transparent opacity={0} /></mesh>
    <mesh scale={[1, 0.82, 0.85]}>
      <sphereGeometry args={[0.29, 24, 20]} />
      <meshStandardMaterial ref={soma} color="#c090d8" emissive="#652380" emissiveIntensity={0.45} roughness={0.38} transparent opacity={0} />
    </mesh>
    <mesh position={[0, 0, 0.23]}><sphereGeometry args={[0.11, 16, 12]} /><meshBasicMaterial ref={nucleus} color="#f0b8ff" transparent opacity={0} /></mesh>
    <group ref={pulses}>{paths.map((_, i) => <mesh key={i}>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial color="#fff2a8" transparent opacity={0} />
    </mesh>)}</group>
  </group>;
}
