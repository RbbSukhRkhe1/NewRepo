import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const ACCENT = new THREE.Color('#00f0ff');
const SKIN = '#3d4f63';
const SKIN_DARK = '#2a3544';

function handMaterial(tip: boolean) {
  return (
    <meshStandardMaterial
      color={tip ? '#556a7a' : SKIN}
      roughness={0.78}
      metalness={0.14}
      emissive={tip ? ACCENT : new THREE.Color('#061018')}
      emissiveIntensity={tip ? 0.85 : 0.07}
      side={THREE.DoubleSide}
    />
  );
}

/** One side of the composition: palm + fingers extending along +X (toward world center). */
function HandSculpt() {
  return (
    <group>
      {/* Forearm */}
      <RoundedBox position={[-0.44, -0.12, 0]} args={[0.88, 0.12, 0.12]} radius={0.04} smoothness={4}>
        <meshStandardMaterial
          color={SKIN_DARK}
          roughness={0.85}
          metalness={0.1}
          emissive="#040810"
          emissiveIntensity={0.06}
          side={THREE.DoubleSide}
        />
      </RoundedBox>
      {/* Palm */}
      <RoundedBox position={[0.06, 0.02, 0]} args={[0.26, 0.36, 0.1]} radius={0.032} smoothness={4}>
        {handMaterial(false)}
      </RoundedBox>
      {/* Index — longest, toward gap */}
      <RoundedBox position={[0.24, 0.14, 0]} args={[0.2, 0.058, 0.058]} radius={0.022} rotation={[0, 0, -0.06]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.42, 0.17, 0]} args={[0.17, 0.05, 0.05]} radius={0.018} rotation={[0, 0, -0.02]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.57, 0.18, 0]} args={[0.13, 0.044, 0.044]} radius={0.016}>
        {handMaterial(true)}
      </RoundedBox>
      {/* Middle */}
      <RoundedBox position={[0.22, 0.24, 0]} args={[0.22, 0.058, 0.058]} radius={0.022} rotation={[0, 0, -0.05]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.4, 0.28, 0]} args={[0.16, 0.048, 0.048]} radius={0.017} rotation={[0, 0, -0.02]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.54, 0.3, 0]} args={[0.12, 0.042, 0.042]} radius={0.014}>
        {handMaterial(true)}
      </RoundedBox>
      {/* Ring */}
      <RoundedBox position={[0.18, 0.1, 0]} args={[0.18, 0.052, 0.052]} radius={0.02} rotation={[0, 0, -0.04]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.34, 0.11, 0]} args={[0.14, 0.045, 0.045]} radius={0.016}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.46, 0.11, 0]} args={[0.1, 0.04, 0.04]} radius={0.012}>
        {handMaterial(false)}
      </RoundedBox>
      {/* Pinky */}
      <RoundedBox position={[0.14, -0.02, 0]} args={[0.14, 0.046, 0.046]} radius={0.018} rotation={[0, 0, -0.02]}>
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox position={[0.26, -0.02, 0]} args={[0.1, 0.04, 0.04]} radius={0.014}>
        {handMaterial(false)}
      </RoundedBox>
      {/* Thumb — sweeps toward center */}
      <RoundedBox
        position={[0, -0.12, 0.04]}
        args={[0.14, 0.05, 0.06]}
        radius={0.02}
        rotation={[0.35, 0, 0.65]}
      >
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox
        position={[0.12, -0.2, 0.1]}
        args={[0.16, 0.045, 0.05]}
        radius={0.018}
        rotation={[0.25, 0.15, 0.5]}
      >
        {handMaterial(false)}
      </RoundedBox>
      <RoundedBox
        position={[0.24, -0.26, 0.14]}
        args={[0.12, 0.04, 0.045]}
        radius={0.014}
        rotation={[0.15, 0.2, 0.35]}
      >
        {handMaterial(true)}
      </RoundedBox>
    </group>
  );
}

const FLOW_COUNT = 140;

function EthFlowParticles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(
    () => Float32Array.from({ length: FLOW_COUNT }, () => Math.random()),
    []
  );
  const lanes = useMemo(
    () => Float32Array.from({ length: FLOW_COUNT }, (_, i) => (i % 7) - 3),
    []
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 10), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < FLOW_COUNT; i++) {
      const p = ((t * 0.11 + phases[i]) % 1 + 1) % 1;
      const x = THREE.MathUtils.lerp(-0.42, 0.42, p);
      const arc = Math.sin(p * Math.PI) * 0.14;
      const y = arc + lanes[i] * 0.028 + Math.sin(t * 2 + i) * 0.012;
      const z = lanes[i] * 0.045;
      dummy.position.set(x, y, z);
      const pulse = Math.sin(p * Math.PI);
      const sc = 0.018 + pulse * 0.022;
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, FLOW_COUNT]} frustumCulled={false} />;
}

function GapEnergy() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const s = 0.08 + Math.sin(state.clock.elapsedTime * 2.2) * 0.035;
    m.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={[0, 0.06, 0.02]}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshStandardMaterial
        color={ACCENT}
        emissive={ACCENT}
        emissiveIntensity={1.8}
        transparent
        opacity={0.45}
        toneMapped={false}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#030508']} />
      <fog attach="fog" args={['#030508', 4.5, 11]} />

      <ambientLight intensity={0.18} />
      <directionalLight position={[-4, 6, 4]} intensity={0.55} color="#b8c8e8" />
      <directionalLight position={[4, 4, 2]} intensity={0.35} color="#406080" />
      <pointLight position={[0, 0.2, 0.6]} intensity={1.4} color={ACCENT} distance={2.8} decay={2} />

      {/* Left: giver */}
      <group position={[-1.14, -0.02, 0]} rotation={[0.1, 0.38, -0.06]}>
        <HandSculpt />
      </group>
      {/* Right: receiver (mirrored sculpt) */}
      <group position={[1.14, -0.02, 0]} rotation={[0.1, -0.38, 0.06]}>
        <group scale={[-1, 1, 1]}>
          <HandSculpt />
        </group>
      </group>

      <EthFlowParticles />
      <GapEnergy />
    </>
  );
}

export function CreationHandsThree() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(74vh,680px)] w-full">
      <Canvas
        className="h-full w-full"
        dpr={[1, 2]}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0.15, 5.2], fov: 38, near: 0.1, far: 40 }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      {/* Fade into page background */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#06080f] to-transparent"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
