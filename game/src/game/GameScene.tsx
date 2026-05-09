import { Float, OrthographicCamera, Sparkles, useAnimations, useCursor, useFBX, useGLTF } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { INTERACTABLES, type InteractableDefinition, type Vec3 } from "./data";
import { useGameStore } from "./store";

interface GameSceneProps {
  currentTargetId: string | null;
  onArriveInteraction: (id: string) => void;
  interactionLocked: boolean;
  questIndex: number;
  inventoryCount: number;
  loanBalance: number;
}

const MODEL = {
  castleBlue: "/assets/kaykit/buildings/blue/building_castle_blue.fbx",
  tavernBlue: "/assets/kaykit/buildings/blue/building_tavern_blue.fbx",
  blacksmithBlue: "/assets/kaykit/buildings/blue/building_blacksmith_blue.fbx",
  wellBlue: "/assets/kaykit/buildings/blue/building_well_blue.fbx",
  towerBlue: "/assets/kaykit/buildings/blue/building_tower_B_blue.fbx",
  barracksGreen: "/assets/kaykit/buildings/green/building_barracks_green.fbx",
  blacksmithGreen: "/assets/kaykit/buildings/green/building_blacksmith_green.fbx",
  catapultGreen: "/assets/kaykit/buildings/green/building_tower_catapult_green.fbx",
  churchYellow: "/assets/kaykit/buildings/yellow/building_church_yellow.fbx",
  marketYellow: "/assets/kaykit/buildings/yellow/building_market_yellow.fbx",
  windmillYellow: "/assets/kaykit/buildings/yellow/building_windmill_yellow.fbx",
  bridge: "/assets/kaykit/buildings/neutral/building_bridge_A.fbx",
  ruined: "/assets/kaykit/buildings/neutral/building_destroyed.fbx",
  scaffolding: "/assets/kaykit/buildings/neutral/building_scaffolding.fbx",
  stoneFence: "/assets/kaykit/buildings/neutral/fence_stone_straight.fbx",
  woodFence: "/assets/kaykit/buildings/neutral/fence_wood_straight.fbx",
  treeA: "/assets/kaykit/decoration/nature/tree_single_A.fbx",
  treeB: "/assets/kaykit/decoration/nature/tree_single_B.fbx",
  hill: "/assets/kaykit/decoration/nature/hills_A.fbx",
  hillTrees: "/assets/kaykit/decoration/nature/hills_B_trees.fbx",
  mountain: "/assets/kaykit/decoration/nature/mountain_A_grass_trees.fbx",
  bigTreeCluster: "/assets/kaykit/decoration/nature/trees_A_large.fbx",
  treeACut: "/assets/kaykit/decoration/nature/tree_single_A_cut.fbx",
  treeBCut: "/assets/kaykit/decoration/nature/tree_single_B_cut.fbx",
  rockA: "/assets/kaykit/decoration/nature/rock_single_A.fbx",
  rockC: "/assets/kaykit/decoration/nature/rock_single_C.fbx",
  waterPlantA: "/assets/kaykit/decoration/nature/waterplant_A.fbx",
  waterPlantB: "/assets/kaykit/decoration/nature/waterplant_B.fbx",
  barrel: "/assets/kaykit/decoration/props/barrel.fbx",
  crate: "/assets/kaykit/decoration/props/crate_A_big.fbx",
  tent: "/assets/kaykit/decoration/props/tent.fbx",
  wheelbarrow: "/assets/kaykit/decoration/props/wheelbarrow.fbx",
  weaponrack: "/assets/kaykit/decoration/props/weaponrack.fbx",
  arrows: "/assets/kaykit/decoration/props/bucket_arrows.fbx",
  lumber: "/assets/kaykit/decoration/props/resource_lumber.fbx",
  stone: "/assets/kaykit/decoration/props/resource_stone.fbx",
  flagBlue: "/assets/kaykit/decoration/props/flag_blue.fbx",
  flagYellow: "/assets/kaykit/decoration/props/flag_yellow.fbx",
  flagGreen: "/assets/kaykit/decoration/props/flag_green.fbx",
  target: "/assets/kaykit/decoration/props/target.fbx",
  ladder: "/assets/kaykit/decoration/props/ladder.fbx",
} as const;

const CHARACTER = {
  mage: "/assets/kaykit-characters/characters/Mage.glb",
  knight: "/assets/kaykit-characters/characters/Knight.glb",
  rogue: "/assets/kaykit-characters/characters/Rogue.glb",
  rogueHooded: "/assets/kaykit-characters/characters/Rogue_Hooded.glb",
  barbarian: "/assets/kaykit-characters/characters/Barbarian.glb",
} as const;

const TREE_INSTANCES: Array<{ model: keyof typeof MODEL; position: Vec3; rotation?: Vec3; scale?: number }> = [
  { model: "bigTreeCluster", position: [-60, 0, -24], scale: 4.6 },
  { model: "treeA", position: [-58, 0, -8], scale: 3.8 },
  { model: "treeB", position: [-56, 0, 10], scale: 4 },
  { model: "bigTreeCluster", position: [-58, 0, 28], scale: 4.8 },
  { model: "treeB", position: [-39, 0, -16], scale: 3.8 },
  { model: "treeA", position: [-41, 0, -2], scale: 3.5 },
  { model: "bigTreeCluster", position: [-40, 0, 15], scale: 4.2 },
  { model: "bigTreeCluster", position: [-28, 0, -9], scale: 3.8 },
  { model: "treeA", position: [-24, 0, 8], scale: 3.6 },
  { model: "treeB", position: [-20, 0, 13], scale: 3.9 },
  { model: "treeA", position: [-15, 0, -12], scale: 3.4 },
  { model: "bigTreeCluster", position: [-7, 0, 11], scale: 3.8 },
  { model: "treeB", position: [-2, 0, -10], scale: 3.6 },
  { model: "treeA", position: [11, 0, 12], scale: 3.6 },
  { model: "treeB", position: [16, 0, -11], scale: 3.8 },
  { model: "bigTreeCluster", position: [22, 0, 12], scale: 3.7 },
  { model: "treeA", position: [28, 0, -10], scale: 3.4 },
  { model: "treeB", position: [33, 0, 8], scale: 3.8 },
  { model: "bigTreeCluster", position: [42, 0, -14], scale: 4.2 },
  { model: "treeA", position: [44, 0, 2], scale: 3.7 },
  { model: "treeB", position: [41, 0, 16], scale: 4 },
  { model: "bigTreeCluster", position: [58, 0, -24], scale: 4.6 },
  { model: "treeA", position: [57, 0, -6], scale: 3.8 },
  { model: "treeB", position: [59, 0, 12], scale: 4 },
  { model: "bigTreeCluster", position: [56, 0, 28], scale: 4.8 },
];

const ROAD_LIGHTS: Vec3[] = [
  [-17, 0.04, -1.5],
  [-9, 0.04, 1.2],
  [-1, 0.04, -1.2],
  [7, 0.08, 0],
  [15, 0.04, 1.3],
  [23, 0.04, -0.8],
];

const QUEST_TARGET_ORDER = [
  "vault_keeper",
  "frozen_vault",
  "archivist",
  "beacon_archive",
  "solstice_bridge",
  "anchor_shrine",
  "header_hall",
  "trie_keep",
  "sun_lender",
] as const;

export function GameScene({
  currentTargetId,
  onArriveInteraction,
  interactionLocked,
  questIndex,
  inventoryCount,
  loanBalance,
}: GameSceneProps) {
  const victory = loanBalance > 0 || currentTargetId === null;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      style={{ width: "100vw", height: "100vh", display: "block" }}
    >
      <color attach="background" args={["#08111b"]} />
      <fog attach="fog" args={["#08111b", 58, 110]} />
      <GameCamera />
      <ambientLight intensity={1.42} />
      <hemisphereLight intensity={1.05} groundColor="#23311f" color="#e7f1ff" />
      <directionalLight
        castShadow
        intensity={1.9}
        position={[6, 32, 16]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-56}
        shadow-camera-right={56}
        shadow-camera-top={56}
        shadow-camera-bottom={-56}
        shadow-bias={-0.00008}
      />
      <pointLight intensity={22} color="#a6e4ff" position={[-16, 6, 1]} distance={28} />
      <pointLight intensity={18} color="#ffcc77" position={[18, 5, 3]} distance={22} />
      <Ground onSelectTarget={interactionLocked ? undefined : (position) => useGameStore.getState().setMoveTarget(position)} />
      <WorldBackdrop questIndex={questIndex} victory={victory} />
      <Hero onArriveInteraction={onArriveInteraction} inventoryCount={inventoryCount} victory={victory} questIndex={questIndex} />
      {INTERACTABLES.map((interactable) => (
        <Landmark
          key={interactable.id}
          interactable={interactable}
          isObjective={interactable.id === currentTargetId}
          interactionLocked={interactionLocked}
          questIndex={questIndex}
          victory={victory}
        />
      ))}
      <Sparkles
        count={victory ? 120 : 44}
        scale={[86, 12, 48]}
        size={victory ? 3 : 2.2}
        speed={victory ? 0.45 : 0.18}
        color={victory ? "#ffe18f" : "#d6efff"}
        position={[5, 6, 0]}
      />
    </Canvas>
  );
}

function GameCamera() {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const target = useMemo(() => new THREE.Vector3(5, 0, 0), []);

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(target);
    }
  });

  return <OrthographicCamera ref={cameraRef} makeDefault position={[36, 40, 36]} zoom={29} near={0.1} far={220} />;
}

function Ground({ onSelectTarget }: { onSelectTarget?: (position: Vec3) => void }) {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!onSelectTarget) {
      return;
    }
    onSelectTarget([event.point.x, 0, event.point.z]);
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.02, 0]} receiveShadow onClick={handleClick}>
      <planeGeometry args={[180, 118]} />
      <meshStandardMaterial color="#08131d" />
    </mesh>
  );
}

function WorldBackdrop({ questIndex, victory }: { questIndex: number; victory: boolean }) {
  return (
    <group>
      <Terrain />
      <WinterAccents />
      <SummerAccents />
      <WinterSetDressing />
      <ZoneIdentity questIndex={questIndex} victory={victory} />
      <RoadNetwork questIndex={questIndex} victory={victory} />
      <River transferComplete={questIndex > 4 || victory} />
      <LargeScenery />
      <SemanticRouteDressing />
      {TREE_INSTANCES.map((tree, index) => (
        <KayKitAsset key={`tree-${index}`} model={tree.model} position={tree.position} rotation={tree.rotation} scale={tree.scale ?? 1} />
      ))}
      <CampFire position={[-21, 0, 2.8]} />
      <CampFire position={[28.3, 0, 2.1]} warm />
    </group>
  );
}

function Terrain() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-18, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 78]} />
        <meshStandardMaterial color="#edf7ff" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-18, 0.015, 0]} receiveShadow>
        <planeGeometry args={[46, 78]} />
        <meshStandardMaterial color="#f7fbff" transparent opacity={0.24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 78]} />
        <meshStandardMaterial color="#84c46f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0.015, 0]} receiveShadow>
        <planeGeometry args={[50, 78]} />
        <meshStandardMaterial color="#d3e79e" transparent opacity={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 78]} />
        <meshStandardMaterial color="#1b3040" roughness={0.95} />
      </mesh>
    </group>
  );
}

function WinterAccents() {
  return (
    <group>
      {[
        [-30, 0.25, 3],
        [-17, 0.25, -14],
        [-8, 0.25, 15],
      ].map((position, index) => (
        <group key={`ice-cluster-${index}`} position={position as Vec3}>
          <mesh position={[-0.35, 0.8, 0]} castShadow>
            <octahedronGeometry args={[0.52]} />
            <meshStandardMaterial color="#e8fbff" emissive="#a8e7ff" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.2, 1.1, -0.25]} castShadow>
            <octahedronGeometry args={[0.42]} />
            <meshStandardMaterial color="#f6fdff" emissive="#94ddff" emissiveIntensity={0.45} />
          </mesh>
          <mesh position={[0.45, 0.6, 0.2]} castShadow>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial color="#ddf7ff" emissive="#8fd8ff" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
      <Sparkles count={42} scale={[40, 8, 42]} size={2.7} speed={0.24} color="#eaf8ff" position={[-14, 5, 0]} />
    </group>
  );
}

function SummerAccents() {
  return (
    <group>
      <KayKitAsset model="flagYellow" position={[14.4, 0, -11.7]} scale={1.8} />
      <KayKitAsset model="flagGreen" position={[29.2, 0, 8.7]} scale={1.9} />
      <KayKitAsset model="barrel" position={[31.6, 0, -7.3]} scale={1.35} />
    </group>
  );
}

function WinterSetDressing() {
  return (
    <group>
      <KayKitAsset model="wellBlue" position={[-31, 0, -1]} rotation={[0, 0.15, 0]} scale={2.25} />
      <KayKitAsset model="rockA" position={[-27.5, 0, -7.5]} scale={2.2} tint="#d7e9f6" />
      <KayKitAsset model="rockC" position={[-23.5, 0, 12.2]} scale={2.1} tint="#dcecf8" />
      <KayKitAsset model="treeA" position={[-31.8, 0, 12.8]} scale={3.2} tint="#d9eefb" />
      <KayKitAsset model="treeB" position={[-11.5, 0, -16.4]} scale={3.25} tint="#d2e9f7" />
      <KayKitAsset model="treeACut" position={[-18.7, 0, 13.6]} scale={2.8} tint="#eaf5fb" />
      <KayKitAsset model="treeBCut" position={[-14.8, 0, 15.8]} scale={2.8} tint="#ecf7fd" />
      <KayKitAsset model="waterPlantA" position={[1.8, 0, 11.5]} scale={2.1} tint="#cbe7f5" />
      <KayKitAsset model="waterPlantB" position={[8.2, 0, -12.8]} scale={2.1} tint="#cbe7f5" />
    </group>
  );
}

function SemanticRouteDressing() {
  return (
    <group>
      <KayKitAsset model="woodFence" position={[-24.2, 0, 2.5]} rotation={[0, 0.88, 0]} scale={2.2} />
      <KayKitAsset model="woodFence" position={[-22.5, 0, 4.25]} rotation={[0, 0.88, 0]} scale={2.2} />
      <KayKitAsset model="weaponrack" position={[-8.1, 0, -11.2]} rotation={[0, -0.25, 0]} scale={1.85} />
      <KayKitAsset model="lumber" position={[-7.6, 0, -13.5]} scale={1.6} />
      <KayKitAsset model="stoneFence" position={[18.6, 0, 6.4]} rotation={[0, 1.1, 0]} scale={2.15} />
      <KayKitAsset model="stoneFence" position={[20.2, 0, 4.7]} rotation={[0, 1.1, 0]} scale={2.15} />
      <KayKitAsset model="crate" position={[28.7, 0, 2.5]} scale={1.5} />
      <KayKitAsset model="barrel" position={[30.2, 0, 1.2]} scale={1.35} />
      <KayKitAsset model="flagYellow" position={[31.7, 0, 4.3]} scale={1.9} />
    </group>
  );
}

function ZoneIdentity({ questIndex, victory }: { questIndex: number; victory: boolean }) {
  const baseUnlocked = questIndex >= 5 || victory;
  const ethActive = questIndex < 5 && !victory;

  return (
    <group>
      <ZoneMarker accent="#8fd8ff" position={[-26, 0, -19]} active={ethActive} icon="diamond" />
      <ZoneMarker accent="#ffd36d" position={[30, 0, -18]} active={baseUnlocked} icon="coin" />
      <Sparkles count={28} scale={[28, 8, 30]} size={2.4} speed={0.22} color="#bfe8ff" position={[-17, 5, 0]} />
      <Sparkles count={24} scale={[30, 8, 30]} size={2.6} speed={0.25} color="#ffe08a" position={[24, 5, 0]} />
    </group>
  );
}

function River({ transferComplete }: { transferComplete: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.02, 0]} receiveShadow>
        <planeGeometry args={[10.5, 78]} />
        <meshStandardMaterial color="#19496f" metalness={0.15} roughness={0.34} />
      </mesh>
      <KayKitAsset model="ruined" position={[0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={3.2} />
      <KayKitAsset model="ruined" position={[9.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={3.2} />
      <KayKitAsset model="scaffolding" position={[0.8, 0, 2.4]} rotation={[0, 0.1, 0]} scale={1.8} />
      <KayKitAsset model="scaffolding" position={[9.1, 0, -2.4]} rotation={[0, -0.25, 0]} scale={1.8} />
      <KayKitAsset model="ruined" position={[0.8, 0, 24]} rotation={[0, Math.PI / 2, 0]} scale={2.6} />
      <KayKitAsset model="ruined" position={[9.2, 0, -24]} rotation={[0, -Math.PI / 2, 0]} scale={2.6} />
      <KayKitAsset model="scaffolding" position={[1.5, 0, 28]} rotation={[0, 0.2, 0]} scale={1.5} />
      <KayKitAsset model="scaffolding" position={[8.4, 0, -28]} rotation={[0, -0.3, 0]} scale={1.5} />
      {transferComplete && <TransferBeam />}
    </group>
  );
}

function LargeScenery() {
  return (
    <group>
      <KayKitAsset model="mountain" position={[-48, 0, -26]} rotation={[0, 0.8, 0]} scale={12.4} />
      <KayKitAsset model="hillTrees" position={[-45, 0, 26]} rotation={[0, -0.6, 0]} scale={11.2} />
      <KayKitAsset model="hill" position={[49, 0, -24]} rotation={[0, -0.9, 0]} scale={10.8} />
      <KayKitAsset model="ruined" position={[46, 0, 24]} rotation={[0, 0.6, 0]} scale={7.8} />
      <KayKitAsset model="scaffolding" position={[-2.8, 0, 12]} rotation={[0, 0.4, 0]} scale={3.8} />
      <KayKitAsset model="ruined" position={[13.8, 0, -12]} rotation={[0, -0.4, 0]} scale={5.2} />
      <KayKitAsset model="hill" position={[-8, 0, 31]} rotation={[0, 0.25, 0]} scale={10.4} />
      <KayKitAsset model="mountain" position={[10, 0, 30]} rotation={[0, -0.2, 0]} scale={10.1} />
      <KayKitAsset model="mountain" position={[-56, 0, 6]} rotation={[0, 1.2, 0]} scale={11.2} />
      <KayKitAsset model="hillTrees" position={[57, 0, 8]} rotation={[0, -1.1, 0]} scale={10.5} />
      <KayKitAsset model="hill" position={[0, 0, -34]} rotation={[0, 0.05, 0]} scale={12.6} />
      <KayKitAsset model="hillTrees" position={[-24, 0, -33]} rotation={[0, -0.1, 0]} scale={9.6} />
      <KayKitAsset model="mountain" position={[31, 0, -34]} rotation={[0, 0.28, 0]} scale={9.8} />
      <KayKitAsset model="mountain" position={[-63, 0, -32]} rotation={[0, 0.5, 0]} scale={10.4} />
      <KayKitAsset model="mountain" position={[63, 0, 30]} rotation={[0, -0.6, 0]} scale={10.6} />
      <KayKitAsset model="hillTrees" position={[-64, 0, 30]} rotation={[0, -0.5, 0]} scale={10.1} />
      <KayKitAsset model="hillTrees" position={[64, 0, -30]} rotation={[0, 0.7, 0]} scale={10.1} />
    </group>
  );
}

function RoadNetwork({ questIndex, victory }: { questIndex: number; victory: boolean }) {
  return (
    <group>
      {ROAD_LIGHTS.map((position, index) => {
        const unlocked = victory || questIndex >= index;
        return (
          <group key={`road-light-${index}`} position={position}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <octahedronGeometry args={[0.24]} />
              <meshStandardMaterial
                color={unlocked ? "#ffe48a" : "#6c879b"}
                emissive={unlocked ? "#ffd66a" : "#60798e"}
                emissiveIntensity={unlocked ? 1.05 : 0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Hero({
  onArriveInteraction,
  inventoryCount,
  victory,
  questIndex,
}: {
  onArriveInteraction: (id: string) => void;
  inventoryCount: number;
  victory: boolean;
  questIndex: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const heroPosition = useGameStore((state) => state.heroPosition);
  const targetPosition = useGameStore((state) => state.targetPosition);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const target = state.targetPosition;
    const group = groupRef.current;

    if (!group) {
      return;
    }

    if (!target) {
      group.position.set(...state.heroPosition);
      return;
    }

    const current = new THREE.Vector3(...state.heroPosition);
    const destination = new THREE.Vector3(...target);
    const offset = destination.clone().sub(current);
    const distance = offset.length();

    if (distance < 0.2) {
      state.setHeroPosition([target[0], 0, target[2]]);
      state.clearMoveTarget();
      if (state.pendingInteractionId) {
        const interactionId = state.pendingInteractionId;
        state.clearPendingInteraction();
        onArriveInteraction(interactionId);
      }
      return;
    }

    const direction = offset.normalize();
    const next = current.add(direction.multiplyScalar(Math.min(distance, delta * 6.3)));
    state.setHeroPosition([next.x, 0, next.z]);
    group.lookAt(target[0], 0, target[2]);
  });

  return (
    <group ref={groupRef} position={heroPosition}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <octahedronGeometry args={[0.16]} />
        <meshStandardMaterial color="#f6e38d" emissive="#ffd86d" emissiveIntensity={0.65} />
      </mesh>
      <AnimatedCharacter
        character="mage"
        animation={targetPosition ? "Walking_A" : "Idle"}
        scale={1.8}
        position={[0, 0, 0]}
      />
      <HeroBanner questIndex={questIndex} victory={victory} />
      {Array.from({ length: inventoryCount }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(inventoryCount, 1);
        return (
          <Float key={`artifact-orb-${index}`} speed={1.4 + index * 0.2} floatIntensity={0.45}>
            <mesh position={[Math.cos(angle) * 1.2, 1.55 + index * 0.05, Math.sin(angle) * 1.2]} castShadow>
              <octahedronGeometry args={[0.2 + index * 0.015]} />
              <meshStandardMaterial color="#fff4c4" emissive={index % 2 === 0 ? "#8fd8ff" : "#ffd76d"} emissiveIntensity={1.1} />
            </mesh>
          </Float>
        );
      })}
      {victory && (
        <Float speed={2.8} floatIntensity={0.55}>
          <group position={[0, 3.1, 0]}>
            <mesh castShadow>
              <torusGeometry args={[0.46, 0.08, 10, 30]} />
              <meshStandardMaterial color="#ffe28a" emissive="#ffd96a" emissiveIntensity={1.3} />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <octahedronGeometry args={[0.2]} />
              <meshStandardMaterial color="#fff5b8" emissive="#fff0a2" emissiveIntensity={1.5} />
            </mesh>
          </group>
        </Float>
      )}
    </group>
  );
}

function HeroBanner({ questIndex, victory }: { questIndex: number; victory: boolean }) {
  const phase = victory ? "usdc" : questIndex >= 5 ? "base" : "eth";
  const poleColor = phase === "eth" ? "#8fd8ff" : phase === "base" ? "#ffd36d" : "#8de0a6";
  const clothColor = phase === "eth" ? "#356ea8" : phase === "base" ? "#8b5b1f" : "#2b7b52";

  return (
    <group position={[0.55, 2.15, -0.2]} rotation={[0, 0, 0.08]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.2, 8]} />
        <meshStandardMaterial color={poleColor} emissive={poleColor} emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0.48, 1.45, 0]} castShadow>
        <planeGeometry args={[0.95, 0.72]} />
        <meshStandardMaterial color={clothColor} emissive={clothColor} emissiveIntensity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <BannerEmblem phase={phase} />
    </group>
  );
}

function Landmark({
  interactable,
  isObjective,
  interactionLocked,
  questIndex,
  victory,
}: {
  interactable: InteractableDefinition;
  isObjective: boolean;
  interactionLocked: boolean;
  questIndex: number;
  victory: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !interactionLocked);

  const completed = isLandmarkComplete(interactable.id, questIndex) || victory;
  const unlocked = completed || isObjective || questIndex > 0;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (interactionLocked) {
      return;
    }
    useGameStore.getState().queueInteraction(interactable.id, interactable.position);
  };

  const markerOffset = interactable.markerOffset ?? [0, 0, 0];
  const markerX = markerOffset[0];
  const markerY = markerOffset[1];
  const markerZ = markerOffset[2];
  const [, ringOuter] = interactable.markerRings ?? [1.6, 2.05];
  const beaconHeight = interactable.beaconHeight ?? 5.1;
  const clickRadius = interactable.clickRadius ?? Math.max(ringOuter, 2);
  const highlightColor = "#ffd76d";
  const highlighted = hovered || isObjective || victory;

  return (
    <group position={interactable.position}>
      <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={handleClick}>
        <LandmarkMesh interactable={interactable} hovered={highlighted} completed={completed} highlightColor={highlightColor} />
        <mesh position={[markerX, 0.75 + markerY, markerZ]} visible={false}>
          <cylinderGeometry args={[clickRadius, clickRadius, 1.8, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {highlighted && (
        <>
          <Float speed={2.2} floatIntensity={0.65} rotationIntensity={0.08}>
            <mesh position={[markerX, beaconHeight + markerY, markerZ]}>
              <octahedronGeometry args={[0.28]} />
              <meshStandardMaterial color={highlightColor} emissive={highlightColor} emissiveIntensity={2} />
            </mesh>
          </Float>
          {isObjective && <ObjectiveBeacon accent={highlightColor} position={[markerX, 0.1 + markerY, markerZ]} height={beaconHeight} />}
        </>
      )}
      {unlocked && (
        <Sparkles
          count={8}
          scale={[2.4, 2.8, 2.4]}
          size={3}
          speed={0.5}
          color={highlighted ? highlightColor : interactable.accent}
          position={[markerX, 2.8 + markerY, markerZ]}
        />
      )}
    </group>
  );
}

function LandmarkMesh({
  interactable,
  hovered,
  completed,
  highlightColor,
}: {
  interactable: InteractableDefinition;
  hovered: boolean;
  completed: boolean;
  highlightColor: string;
}) {
  const glow = hovered ? 1.5 : 0.55;
  const accent = hovered ? highlightColor : interactable.accent;

  switch (interactable.type) {
    case "npc":
      return interactable.zone === "winter" ? (
        <group>
          {interactable.id === "vault_keeper" ? (
            <>
              <KayKitAsset model="tavernBlue" position={[0.1, 0, 0]} rotation={[0, -0.2, 0]} scale={2.3} accent={accent} glow={glow} />
              <KayKitAsset model="flagBlue" position={[-1.1, 0, -1.5]} scale={1.8} />
              <KayKitAsset model="barrel" position={[1.45, 0, 0.9]} scale={1.35} />
              <KayKitAsset model="crate" position={[-0.75, 0, 1.25]} scale={1.25} />
              <SpellOrb color={accent} intensity={glow} position={[0.2, 3.15, 0.15]} />
            </>
          ) : (
            <>
              <KayKitAsset model="blacksmithBlue" position={[0.15, 0, 0]} rotation={[0, 0.24, 0]} scale={2.2} accent={accent} glow={glow} />
              <KayKitAsset model="lumber" position={[-1.5, 0, 1]} scale={1.8} />
              <KayKitAsset model="stone" position={[1.55, 0, -0.85]} scale={1.75} />
              <KayKitAsset model="weaponrack" position={[-0.9, 0, -1.45]} rotation={[0, -0.35, 0]} scale={1.7} />
              <SpellOrb color={accent} intensity={glow} position={[0.35, 3.05, 0.2]} />
            </>
          )}
          {completed && interactable.id === "archivist" && <ScrollOrbit />}
        </group>
      ) : (
        <group>
          <KayKitAsset model="windmillYellow" position={[0.1, 0, -0.1]} rotation={[0, 0.18, 0]} scale={2.25} accent={accent} glow={glow} />
          <KayKitAsset model="flagYellow" position={[1.55, 0, -1.2]} scale={1.75} />
          <KayKitAsset model="barrel" position={[-1.05, 0, -0.55]} scale={1.2} />
          <KayKitAsset model="crate" position={[-0.15, 0, 1.1]} scale={1.15} />
          <SpellOrb color={accent} intensity={glow} position={[0, 3, 0.15]} />
        </group>
      );
    case "vault":
      return (
        <AnimatedLandmark motion="pulse">
          <KayKitAsset model="castleBlue" scale={2.6} accent={accent} glow={glow} />
          {completed && <LockSeal />}
        </AnimatedLandmark>
      );
    case "archive":
      return (
        <AnimatedLandmark motion="orbit">
          <KayKitAsset model="towerBlue" scale={3.5} accent={accent} glow={glow} />
          <SpellOrb color={accent} intensity={glow} position={[0, 3.8, 0]} />
          {completed && <SkyBeam color="#9eb2ff" height={7.6} />}
        </AnimatedLandmark>
      );
    case "gate":
      return <RelayRuin active={hovered} completed={completed} color={accent} />;
    case "shrine":
      return (
        <AnimatedLandmark motion="pulse">
          <KayKitAsset model="churchYellow" scale={3} accent={accent} glow={glow} />
          <SpellOrb color={accent} intensity={glow} position={[0, 3.6, 0]} />
          {completed && <SkyBeam color="#ffd36d" height={8.5} />}
        </AnimatedLandmark>
      );
    case "hall":
      return (
        <AnimatedLandmark motion="breathe">
          <KayKitAsset model="blacksmithGreen" scale={3.1} accent={accent} glow={glow} />
          {completed && <HeaderRunes color={accent} />}
        </AnimatedLandmark>
      );
    case "keep":
      return (
        <AnimatedLandmark motion="rock">
          <KayKitAsset model="catapultGreen" scale={3.3} accent={accent} glow={glow} />
          {completed && <TrieTotems color={accent} />}
        </AnimatedLandmark>
      );
    case "lender":
      return (
        <AnimatedLandmark motion="float">
          <KayKitAsset model="windmillYellow" scale={2.95} accent={accent} glow={glow} />
          <SpellOrb color={accent} intensity={glow} position={[0.25, 3.2, 0]} />
          {completed && <CoinBurst />}
        </AnimatedLandmark>
      );
  }
}

function AnimatedLandmark({
  motion,
  children,
}: {
  motion: "pulse" | "orbit" | "rock" | "float" | "breathe";
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) {
      return;
    }

    const t = clock.getElapsedTime();

    if (motion === "pulse") {
      const s = 1 + Math.sin(t * 2.2) * 0.03;
      group.scale.setScalar(s);
    }

    if (motion === "orbit") {
      group.rotation.y = Math.sin(t * 0.55) * 0.18;
    }

    if (motion === "rock") {
      group.rotation.z = Math.sin(t * 1.1) * 0.06;
      group.rotation.x = Math.cos(t * 0.9) * 0.03;
    }

    if (motion === "float") {
      group.position.y = Math.sin(t * 1.6) * 0.14;
    }

    if (motion === "breathe") {
      group.scale.y = 1 + Math.sin(t * 1.4) * 0.025;
    }
  });

  return <group ref={ref}>{children}</group>;
}

function LockSeal() {
  return (
    <group position={[0, 1.6, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <octahedronGeometry args={[0.26]} />
        <meshStandardMaterial color="#d7f7ff" emissive="#9cdfff" emissiveIntensity={0.95} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.24, 0.28, 0.24]} />
        <meshStandardMaterial color="#b7f1ff" emissive="#8fd8ff" emissiveIntensity={0.85} />
      </mesh>
    </group>
  );
}

function ScrollOrbit() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    group.rotation.y = clock.getElapsedTime() * 0.9;
  });

  return (
    <group ref={ref} position={[0, 2.4, 0]}>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, index) => (
        <mesh key={index} position={[Math.cos(angle) * 0.92, 0.12 + index * 0.08, Math.sin(angle) * 0.92]} rotation={[0, angle, 0]} castShadow>
          <boxGeometry args={[0.28, 0.42, 0.12]} />
          <meshStandardMaterial color="#fff1c1" emissive="#ffe28d" emissiveIntensity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function SkyBeam({ color, height }: { color: string; height: number }) {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.22, height, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function RelayRuin({ active, completed, color }: { active: boolean; completed: boolean; color: string }) {
  return (
    <group>
      <KayKitAsset model="ruined" position={[-1.6, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={2.1} />
      <KayKitAsset model="ruined" position={[1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={2.1} />
      <KayKitAsset model="scaffolding" position={[-1.8, 0, 1.3]} rotation={[0, 0.18, 0]} scale={1.55} />
      <KayKitAsset model="scaffolding" position={[1.8, 0, -1.3]} rotation={[0, -0.22, 0]} scale={1.55} />
      <SpellOrb color={color} intensity={active ? 1.4 : 0.6} position={[-1.15, 2.2, 0]} />
      <SpellOrb color={color} intensity={active ? 1.4 : 0.6} position={[1.15, 2.2, 0]} />
      {(completed || active) && <TransferBeam compact />}
    </group>
  );
}

function TransferBeam({ compact = false }: { compact?: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    group.rotation.z = Math.sin(clock.getElapsedTime() * 1.2) * 0.03;
  });

  const length = compact ? 2.6 : 8.2;
  const start = compact ? -1.25 : 0.8;
  const count = compact ? 5 : 9;

  return (
    <group ref={ref} position={[0, compact ? 2.35 : 1.9, 0]}>
      {Array.from({ length: count }).map((_, index) => {
        const x = start + (length / Math.max(1, count - 1)) * index;
        const y = Math.sin(index * 0.9) * (compact ? 0.25 : 0.45);
        return (
          <mesh key={index} position={[x, y, 0]} castShadow>
            <sphereGeometry args={[compact ? 0.1 : 0.12, 10, 10]} />
            <meshStandardMaterial color="#ffe89a" emissive="#ffd26a" emissiveIntensity={1.25} />
          </mesh>
        );
      })}
    </group>
  );
}

function HeaderRunes({ color }: { color: string }) {
  return (
    <group position={[0, 2.4, 0]}>
      {[-0.85, 0, 0.85].map((x, index) => (
        <mesh key={index} position={[x, 0, 1.15]} castShadow>
          <boxGeometry args={[0.16, 1.3, 0.16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function TrieTotems({ color }: { color: string }) {
  return (
    <group position={[0, 2.2, 0]}>
      {[-0.75, 0, 0.75].map((x, index) => (
        <mesh key={index} position={[x, index * 0.16, 0]} castShadow>
          <octahedronGeometry args={[0.22 + index * 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CoinBurst() {
  return (
    <group position={[0, 2.7, 0]}>
      {[-0.9, -0.45, 0, 0.45, 0.9].map((x, index) => (
        <Float key={index} speed={2.2 + index * 0.15} floatIntensity={0.38}>
          <mesh position={[x, 0.25 + index * 0.05, index % 2 === 0 ? 0.2 : -0.18]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 18]} />
            <meshStandardMaterial color="#ffe08a" emissive="#ffd56f" emissiveIntensity={1.1} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function SpellOrb({ color, intensity, position = [0, 0, 0] }: { color: string; intensity: number; position?: Vec3 }) {
  return (
    <Float speed={2.4} floatIntensity={0.5} rotationIntensity={0.12}>
      <mesh position={position} castShadow>
        <octahedronGeometry args={[0.22]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={Math.max(0.6, intensity * 1.1)} />
      </mesh>
    </Float>
  );
}

function BannerEmblem({ phase }: { phase: "eth" | "base" | "usdc" }) {
  if (phase === "eth") {
    return (
      <group position={[0.5, 1.43, 0.03]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <octahedronGeometry args={[0.16]} />
          <meshStandardMaterial color="#ecfbff" emissive="#8fd8ff" emissiveIntensity={1} />
        </mesh>
        <mesh position={[0, -0.18, 0]} castShadow>
          <octahedronGeometry args={[0.1]} />
          <meshStandardMaterial color="#d6f7ff" emissive="#8fd8ff" emissiveIntensity={0.8} />
        </mesh>
      </group>
    );
  }

  if (phase === "base") {
    return (
      <group position={[0.5, 1.43, 0.03]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.16, 0.04, 10, 20]} />
          <meshStandardMaterial color="#fff1b7" emissive="#ffd36d" emissiveIntensity={0.95} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0.5, 1.43, 0.03]}>
      {[-0.08, 0.08].map((x, index) => (
        <mesh key={index} position={[x, 0, index * 0.01]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
          <meshStandardMaterial color="#f6ffd7" emissive="#8de0a6" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ObjectiveBeacon({ accent, position, height }: { accent: string; position: Vec3; height: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.45, 0]}>
        <cylinderGeometry args={[0.18, 0.36, height * 0.9, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} transparent opacity={0.3} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <Float key={index} speed={2 + index * 0.25} floatIntensity={0.2} rotationIntensity={0}>
          <mesh position={[0, 1.8 + index * 1.05, 0]} rotation={[0, (Math.PI / 4) * index, 0]}>
            <coneGeometry args={[0.42 - index * 0.06, 0.72, 4]} />
            <meshStandardMaterial color="#fff4c6" emissive={accent} emissiveIntensity={1.1} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function ZoneMarker({ accent, position, active, icon }: { accent: string; position: Vec3; active: boolean; icon: "diamond" | "coin" }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[2.45, 2.8, 0.28, 6]} />
        <meshStandardMaterial color="#3a2a18" />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 2.15, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? 0.65 : 0.22} />
      </mesh>
      {icon === "diamond" ? (
        <group position={[0, 2.8, 0]}>
          <mesh castShadow>
            <octahedronGeometry args={[0.72]} />
            <meshStandardMaterial color="#dff4ff" emissive="#8fd8ff" emissiveIntensity={active ? 1.2 : 0.45} />
          </mesh>
          <mesh position={[0, -0.85, 0]} castShadow>
            <octahedronGeometry args={[0.46]} />
            <meshStandardMaterial color="#c3ecff" emissive="#7ecfff" emissiveIntensity={active ? 1.05 : 0.3} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 2.55, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.72, 0.14, 12, 28]} />
            <meshStandardMaterial color="#ffe08a" emissive="#ffd36d" emissiveIntensity={active ? 1.05 : 0.36} />
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[0.48, 0.48, 0.16, 24]} />
            <meshStandardMaterial color="#fff0b8" emissive="#ffe08a" emissiveIntensity={active ? 0.85 : 0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function AnimatedCharacter({
  character,
  animation,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  character: keyof typeof CHARACTER;
  animation: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(CHARACTER[character]);
  const scene = useMemo(() => {
    const clone = cloneSkinned(gltf.scene);
    clone.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, group);

  useEffect(() => {
    const preferred = actions[animation] ?? actions.Idle ?? actions.Unarmed_Idle ?? actions[names[0] ?? ""];
    if (!preferred) {
      return;
    }

    preferred.reset().fadeIn(0.2).play();

    return () => {
      preferred.fadeOut(0.18);
    };
  }, [actions, animation, names]);

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function CampFire({ position, warm = false }: { position: Vec3; warm?: boolean }) {
  return (
    <group position={position}>
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation, index) => (
        <mesh key={index} position={[0, 0.2, 0]} rotation={[0, rotation, 0.55]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.1, 6]} />
          <meshStandardMaterial color="#6d4627" />
        </mesh>
      ))}
      <Float speed={2.3} floatIntensity={0.35}>
        <mesh position={[0, 0.75, 0]}>
          <octahedronGeometry args={[0.28]} />
          <meshStandardMaterial color={warm ? "#ffb85c" : "#9ed8ff"} emissive={warm ? "#ffb85c" : "#9ed8ff"} emissiveIntensity={1.3} />
        </mesh>
      </Float>
    </group>
  );
}

function KayKitAsset({
  model,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  tint,
  accent,
  glow = 0,
}: {
  model: keyof typeof MODEL;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  tint?: string;
  accent?: string;
  glow?: number;
}) {
  const source = useFBX(MODEL[model]);

  const object = useMemo(() => {
    const clone = source.clone(true);

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const previous = Array.isArray(child.material) ? child.material[0] : child.material;
        const next = new THREE.MeshStandardMaterial({
          color: tint ?? (previous && "color" in previous ? previous.color : new THREE.Color("#ffffff")),
          map: previous && "map" in previous ? previous.map : null,
          roughness: 0.92,
          metalness: 0.04,
          flatShading: true,
        });

        if (accent) {
          next.emissive = new THREE.Color(accent);
          next.emissiveIntensity = glow * 0.2;
        }

        next.needsUpdate = true;
        child.material = next;
      }
    });

    return clone;
  }, [accent, glow, source, tint]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function isLandmarkComplete(interactionId: string, questIndex: number) {
  const index = QUEST_TARGET_ORDER.indexOf(interactionId as (typeof QUEST_TARGET_ORDER)[number]);
  return index !== -1 && questIndex > index;
}
