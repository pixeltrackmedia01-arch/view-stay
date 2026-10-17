"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ExplorerRoom } from "@/lib/explorer-types";
import type { ViewKey } from "@/lib/catalog-types";

/** Sky / outlook tint seen through the window, by view type. */
const OUTLOOK: Record<ViewKey, [string, string]> = {
  SEA: ["#9ccbe6", "#2f7fa5"],
  LAKE: ["#b4d4e4", "#4f8aa0"],
  RIVER: ["#bcd8e2", "#5d8f86"],
  MOUNTAIN: ["#c5d9ea", "#6d7f8e"],
  VALLEY: ["#cfe1ea", "#6f9467"],
  GARDEN: ["#d6e9d3", "#4f8b4f"],
  CITY: ["#cbd8e2", "#7d8a96"],
  COURTYARD: ["#e9dcc4", "#b7905d"],
  POOL: ["#bfe3ec", "#3f9fb5"],
  NONE: ["#e6e6e2", "#b9b9b3"],
};

/**
 * Simplified interior volume generated from the room's stored size, bed type, window count and balcony.
 * It conveys proportions and orientation only; it is not a model of the actual furnishings.
 */
export default function RoomInterior({ room, reducedMotion }: { room: ExplorerRoom; reducedMotion: boolean }) {
  const area = Math.max(12, room.sizeSqm - (room.hasBalcony ? 4 : 0));
  const depth = Math.sqrt(area * 1.25);
  const width = area / depth;
  const h = 2.8;
  const twin = /twin/i.test(room.bedType);
  const king = /king/i.test(room.bedType);
  const bedW = twin ? 1 : king ? 1.9 : 1.6;
  const [sky, ground] = OUTLOOK[room.viewType];
  const winCount = Math.min(3, Math.max(1, room.windowCount));
  const winW = Math.min(width * 0.8, 1.4 * winCount);
  const wall = "#efe9df";

  return (
    <Canvas camera={{ position: [width * 0.9, 2.4, depth * 1.05], fov: 50 }} dpr={[1, 2]} frameloop="demand" shadows={false}>
      <color attach="background" args={["#f5f2ec"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 5, -4]} intensity={1.1} />
      <OrbitControls target={[0, 1, 0]} enablePan={false} minDistance={2} maxDistance={Math.max(width, depth) * 2.2} maxPolarAngle={Math.PI / 2.05} enableDamping={!reducedMotion} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#c9a882" />
      </mesh>
      {/* Back wall (window wall) at -z, split around the window */}
      <group position={[0, 0, -depth / 2]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[width, 0.9, 0.12]} />
          <meshStandardMaterial color={wall} />
        </mesh>
        <mesh position={[0, h - 0.25, 0]}>
          <boxGeometry args={[width, 0.5, 0.12]} />
          <meshStandardMaterial color={wall} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * (width + winW)) / 4, h / 2, 0]}>
            <boxGeometry args={[(width - winW) / 2, h, 0.12]} />
            <meshStandardMaterial color={wall} />
          </mesh>
        ))}
        {/* Outlook backdrop */}
        <mesh position={[0, h / 2, -(room.hasBalcony ? 2.4 : 0.6)]}>
          <planeGeometry args={[winW * 3, h * 1.6]} />
          <meshBasicMaterial color={sky} />
        </mesh>
        <mesh position={[0, 0.4, -(room.hasBalcony ? 2.3 : 0.55)]}>
          <planeGeometry args={[winW * 3, 1.2]} />
          <meshBasicMaterial color={ground} />
        </mesh>
        {room.hasBalcony && (
          <group position={[0, 0, -0.9]}>
            <mesh position={[0, -0.02, 0]}>
              <boxGeometry args={[winW + 0.6, 0.06, 1.6]} />
              <meshStandardMaterial color="#d8d1c4" />
            </mesh>
            <mesh position={[0, 0.5, -0.78]}>
              <boxGeometry args={[winW + 0.6, 1, 0.04]} />
              <meshStandardMaterial color="#8fb0bb" transparent opacity={0.45} />
            </mesh>
          </group>
        )}
      </group>
      {/* Side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2, h / 2, 0]}>
          <boxGeometry args={[0.12, h, depth]} />
          <meshStandardMaterial color={wall} />
        </mesh>
      ))}

      {/* Bed(s) against the right wall, headboard on the side wall */}
      {(twin ? [-0.65, 0.65] : [0]).map((dz) => (
        <group key={dz} position={[width / 2 - 1.05, 0, dz]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[2.1, 0.5, bedW]} />
            <meshStandardMaterial color="#f8f6f2" />
          </mesh>
          <mesh position={[0.95, 0.65, 0]}>
            <boxGeometry args={[0.1, 1.1, bedW + 0.1]} />
            <meshStandardMaterial color="#7a5c43" />
          </mesh>
          <mesh position={[-0.5, 0.52, 0]}>
            <boxGeometry args={[0.8, 0.06, bedW + 0.02]} />
            <meshStandardMaterial color="#315d68" />
          </mesh>
        </group>
      ))}
      {/* Seating */}
      <mesh position={[-width / 2 + 0.6, 0.35, -depth / 2 + 1.1]}>
        <boxGeometry args={[0.8, 0.7, 0.8]} />
        <meshStandardMaterial color="#e6a64b" />
      </mesh>
      {/* Desk */}
      <mesh position={[-width / 2 + 0.35, 0.75, depth / 4]}>
        <boxGeometry args={[0.6, 0.05, 1.2]} />
        <meshStandardMaterial color="#7a5c43" />
      </mesh>
    </Canvas>
  );
}
