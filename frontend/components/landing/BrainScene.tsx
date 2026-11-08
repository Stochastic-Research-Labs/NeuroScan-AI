"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PointsMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain } from "lucide-react";
import { getAnatomyCategory } from "@/lib/brain-model";
import { sampleBrainJourney } from "@/lib/brain-journey";
import { NeuronModel } from "./NeuronModel";

type SceneProps = { storyRef: RefObject<HTMLDivElement | null>; paused: boolean };

function SceneFallback() {
  return <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-text-muted"><Brain size={100} strokeWidth={0.8} className="text-primary" aria-hidden="true" /><p className="max-w-xs text-xs leading-6">3D illustration unavailable. You can still explore the workflow and open your workspace.</p></div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children; }
}

function BrainModel({ storyRef, paused }: SceneProps) {
  // GLB and Draco decoder are local. No external CDN fetch or patient data is involved.
  const { scene } = useGLTF("/models/brain.glb", "/draco/");
  const group = useRef<Group>(null);
  const solid = useRef<MeshPhysicalMaterial>(null);
  const wire = useRef<MeshBasicMaterial>(null);
  const dots = useRef<PointsMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  const progress = useRef({ value: 0 });

  const geometry = useMemo(() => {
    const pieces: BufferGeometry[] = [];
    scene.updateMatrixWorld(true);
    const hasAtlasCategories = scene.children.some((child) => child.userData.bx_cat);
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      // Keep external anatomy only. Merge into one draw call, instead of hundreds.
      // Multi-material glTF nodes become Groups; their mesh children inherit the
      // anatomy category from that parent rather than duplicating its extras.
      const category = getAnatomyCategory(object);
      if (hasAtlasCategories && !["cortex", "cerebellum", "brainstem"].includes(category ?? "")) return;
      const g = object.geometry.clone().applyMatrix4(object.matrixWorld);
      for (const name of Object.keys(g.attributes)) if (!["position", "normal"].includes(name)) g.deleteAttribute(name);
      if (!g.getAttribute("normal")) g.computeVertexNormals();
      pieces.push(g);
    });
    const merged = mergeGeometries(pieces, false);
    pieces.forEach((p) => p.dispose());
    if (!merged) throw new Error("Brain model contains incompatible geometry");
    merged.computeBoundingBox();
    const bounds = merged.boundingBox as Box3;
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    merged.translate(-center.x, -center.y, -center.z);
    const scale = 3.4 / Math.max(size.x, size.y, size.z);
    merged.scale(scale, scale, scale);
    return merged;
  }, [scene]);

  const points = useMemo(() => {
    const position = geometry.getAttribute("position");
    const step = Math.max(1, Math.ceil(position.count / 16000));
    const array: number[] = [];
    for (let i = 0; i < position.count; i += step) array.push(position.getX(i), position.getY(i), position.getZ(i));
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(array), 3));
    return g;
  }, [geometry]);

  useEffect(() => {
    if (!group.current || !solid.current || !wire.current || !dots.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const apply = () => {
      const p = progress.current.value;
      const journey = sampleBrainJourney(p);
      const g = group.current!;
      g.rotation.set(0.13 + p * 0.35, -0.5 + p * Math.PI * 1.05, -0.08 + p * 0.12);
      g.scale.setScalar(journey.brainScale);
      g.visible = journey.brainOpacity > 0.001;
      solid.current!.opacity = journey.solid;
      solid.current!.visible = solid.current!.opacity > 0;
      solid.current!.depthWrite = journey.solid > 0.95;
      wire.current!.opacity = journey.wire;
      dots.current!.opacity = journey.points;
      invalidate();
    };
    apply();
    if (paused) return;
    const tween = gsap.fromTo(progress.current, { value: 0 }, {
      value: 1, ease: "none", immediateRender: false, onUpdate: apply,
      scrollTrigger: { trigger: storyRef.current, start: "top 80px", end: "bottom bottom", scrub: 0.8, invalidateOnRefresh: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [invalidate, paused, storyRef]);

  useEffect(() => () => { geometry.dispose(); points.dispose(); }, [geometry, points]);

  return <><group ref={group}>
    <mesh geometry={geometry}><meshPhysicalMaterial ref={solid} color="#a9bfc8" roughness={0.55} metalness={0.18} clearcoat={0.2} transparent /></mesh>
    <mesh geometry={geometry} scale={1.001}><meshBasicMaterial ref={wire} color="#67e8f9" wireframe transparent opacity={0} depthWrite={false} /></mesh>
    <points geometry={points}><pointsMaterial ref={dots} color="#67e8f9" size={0.012} transparent opacity={0} depthWrite={false} sizeAttenuation /></points>
  </group><NeuronModel progress={progress} /></>;
}

export default function BrainScene(props: SceneProps) {
  return <SceneBoundary><div className="h-full w-full" role="img" aria-label="Scroll journey: whole brain, zoom into an illustrative 3D neuron, then back out to the brain in wireframe and points. Not a patient scan; neuron scale and signals are schematic.">
    <Canvas camera={{ position: [0, 0, 6.4], fov: 37 }} dpr={[1, 1.5]} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={<SceneFallback />}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#d5f6ff" />
      <directionalLight position={[-4, 1, -2]} intensity={3} color="#22d3ee" />
      <pointLight position={[3, -2, 1]} intensity={16} color="#e879f9" />
      <Suspense fallback={null}><BrainModel {...props} /></Suspense>
    </Canvas>
  </div></SceneBoundary>;
}
