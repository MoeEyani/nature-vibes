"use client";

import { useMemo } from "react";
import type { SceneModel } from "../sceneModel";

/**
 * `planter:*`, `trellis:post` and `plant:*`.
 *
 * Planters are structure; plants are foliage placed onto whichever planter
 * hosts that habit. Climbing plants only appear where a trellis exists, which
 * is the visual counterpart of the trellis dependency rule.
 */
export function Planting({ model }: { model: SceneModel }) {
  const { planters, plants, width, length, height } = model;

  const hasTrellis = planters.some((planter) => planter.kind === "trellis");
  const hasEdge = planters.some((planter) => planter.kind === "edge");
  const hasHanging = planters.some((planter) => planter.kind === "hanging");

  const climbing = plants.filter((plant) => plant.habit === "climbing");
  const bedding = plants.filter((plant) => plant.habit === "planter");
  const hanging = plants.filter((plant) => plant.habit === "hanging");
  const aquatic = plants.filter((plant) => plant.habit === "aquatic");

  const cornerPositions = useMemo<[number, number][]>(() => {
    const x = length / 2 - 0.18;
    const z = width / 2 - 0.18;
    return [
      [x, z],
      [x, -z],
      [-x, z],
      [-x, -z],
    ];
  }, [length, width]);

  return (
    <group>
      {planters.map((planter, index) => {
        switch (planter.kind) {
          case "edge":
            return (
              <EdgePlanters
                key={`${planter.assetKey}-${index}`}
                planter={planter}
                width={width}
                length={length}
                foliage={bedding}
              />
            );
          case "corner":
            return (
              <group key={`${planter.assetKey}-${index}`}>
                {cornerPositions.map(([x, z], cornerIndex) => (
                  <group key={cornerIndex} position={[x, 0, z]}>
                    <mesh position={[0, planter.height / 2, 0]} castShadow receiveShadow>
                      <boxGeometry args={[planter.depth, planter.height, planter.depth]} />
                      <meshStandardMaterial color={planter.color} roughness={0.85} />
                    </mesh>
                    {bedding.length > 0 ? (
                      <Foliage
                        position={[0, planter.height + 0.16, 0]}
                        radius={planter.depth * 0.5}
                        color={bedding[cornerIndex % bedding.length].color}
                        bloom={bedding[cornerIndex % bedding.length].bloom}
                      />
                    ) : null}
                  </group>
                ))}
              </group>
            );
          case "hanging":
            return (
              <group key={`${planter.assetKey}-${index}`}>
                {cornerPositions.map(([x, z], hangIndex) => (
                  <group key={hangIndex} position={[x * 0.62, height - 0.55, z * 0.62]}>
                    <mesh position={[0, 0.3, 0]}>
                      <cylinderGeometry args={[0.006, 0.006, 0.6, 5]} />
                      <meshStandardMaterial color="#40464a" metalness={0.6} roughness={0.4} />
                    </mesh>
                    <mesh castShadow>
                      <cylinderGeometry args={[0.15, 0.11, planter.height, 12]} />
                      <meshStandardMaterial color={planter.color} roughness={0.85} />
                    </mesh>
                    {hanging.length > 0 ? (
                      <TrailingFoliage
                        color={hanging[hangIndex % hanging.length].color}
                        length={0.55}
                      />
                    ) : null}
                  </group>
                ))}
              </group>
            );
          case "trellis":
            return (
              <group key={`${planter.assetKey}-${index}`}>
                {cornerPositions.map(([x, z], trellisIndex) => (
                  <Trellis
                    key={trellisIndex}
                    position={[x, 0, z]}
                    height={Math.min(planter.height, height - 0.15)}
                    climbing={climbing[trellisIndex % Math.max(climbing.length, 1)]}
                    hasClimbing={climbing.length > 0}
                  />
                ))}
              </group>
            );
          case "aquatic":
            return model.aquarium ? (
              <group
                key={`${planter.assetKey}-${index}`}
                position={model.aquarium.origin}
              >
                {aquatic.length > 0
                  ? [-0.25, 0.25].map((offset, plantIndex) => (
                      <mesh
                        key={plantIndex}
                        position={[
                          offset * model.aquarium!.size.x,
                          model.aquarium!.size.y * 0.3,
                          0,
                        ]}
                      >
                        <coneGeometry args={[0.05, model.aquarium!.size.y * 0.5, 6]} />
                        <meshStandardMaterial
                          color={aquatic[plantIndex % aquatic.length].color}
                          roughness={0.8}
                        />
                      </mesh>
                    ))
                  : null}
              </group>
            ) : null;
          default:
            return null;
        }
      })}

      {/* Plants selected without a matching planter still show, low on the deck,
          so the customer can see that something is missing. */}
      {!hasEdge && !hasTrellis && !hasHanging && plants.length > 0 ? (
        <Foliage position={[0, 0.25, 0]} radius={0.35} color={plants[0].color} />
      ) : null}
    </group>
  );
}

function EdgePlanters({
  planter,
  width,
  length,
  foliage,
}: {
  planter: SceneModel["planters"][number];
  width: number;
  length: number;
  foliage: SceneModel["plants"];
}) {
  const runs: {
    position: [number, number, number];
    args: [number, number, number];
  }[] = [
    {
      position: [0, planter.height / 2, -width / 2 - planter.depth / 2],
      args: [length * 0.9, planter.height, planter.depth],
    },
    {
      position: [0, planter.height / 2, width / 2 + planter.depth / 2],
      args: [length * 0.9, planter.height, planter.depth],
    },
    {
      position: [length / 2 + planter.depth / 2, planter.height / 2, 0],
      args: [planter.depth, planter.height, width * 0.9],
    },
    {
      position: [-length / 2 - planter.depth / 2, planter.height / 2, 0],
      args: [planter.depth, planter.height, width * 0.9],
    },
  ];

  return (
    <group>
      {runs.map((run, index) => (
        <group key={index}>
          <mesh position={run.position} castShadow receiveShadow>
            <boxGeometry args={run.args} />
            <meshStandardMaterial color={planter.color} roughness={0.85} />
          </mesh>
          {foliage.length > 0
            ? [-0.28, 0, 0.28].map((t, clumpIndex) => {
                const alongX = run.args[0] > run.args[2];
                const span = alongX ? run.args[0] : run.args[2];
                return (
                  <Foliage
                    key={clumpIndex}
                    position={[
                      run.position[0] + (alongX ? t * span : 0),
                      planter.height + 0.14,
                      run.position[2] + (alongX ? 0 : t * span),
                    ]}
                    radius={0.2}
                    color={foliage[(index + clumpIndex) % foliage.length].color}
                    bloom={foliage[(index + clumpIndex) % foliage.length].bloom}
                  />
                );
              })
            : null}
        </group>
      ))}
    </group>
  );
}

function Trellis({
  position,
  height,
  climbing,
  hasClimbing,
}: {
  position: [number, number, number];
  height: number;
  climbing?: SceneModel["plants"][number];
  hasClimbing: boolean;
}) {
  const rungs = Math.max(4, Math.round(height / 0.35));

  return (
    <group position={position}>
      {[-0.12, 0.12].map((x, index) => (
        <mesh key={index} position={[x, height / 2, 0]} castShadow>
          <boxGeometry args={[0.02, height, 0.02]} />
          <meshStandardMaterial color="#5b4a38" roughness={0.9} />
        </mesh>
      ))}
      {Array.from({ length: rungs }, (_, index) => (
        <mesh
          key={index}
          position={[0, ((index + 1) / (rungs + 1)) * height, 0]}
          castShadow
        >
          <boxGeometry args={[0.26, 0.02, 0.02]} />
          <meshStandardMaterial color="#5b4a38" roughness={0.9} />
        </mesh>
      ))}

      {hasClimbing && climbing
        ? Array.from({ length: 10 }, (_, index) => {
            const t = (index + 1) / 11;
            const angle = t * Math.PI * 4;
            return (
              <group
                key={index}
                position={[Math.sin(angle) * 0.11, t * height, Math.cos(angle) * 0.06]}
              >
                <mesh>
                  <sphereGeometry args={[0.075, 7, 6]} />
                  <meshStandardMaterial color={climbing.color} roughness={0.9} />
                </mesh>
                {climbing.bloom && index % 3 === 0 ? (
                  <mesh position={[0.06, 0.03, 0.04]}>
                    <sphereGeometry args={[0.032, 6, 5]} />
                    <meshStandardMaterial color={climbing.bloom} roughness={0.8} />
                  </mesh>
                ) : null}
              </group>
            );
          })
        : null}
    </group>
  );
}

function Foliage({
  position,
  radius,
  color,
  bloom,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  bloom?: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[radius, 8, 7]} />
        <meshStandardMaterial color={color} roughness={0.95} flatShading />
      </mesh>
      {bloom ? (
        <mesh position={[radius * 0.5, radius * 0.4, radius * 0.3]}>
          <sphereGeometry args={[radius * 0.22, 6, 5]} />
          <meshStandardMaterial color={bloom} roughness={0.8} />
        </mesh>
      ) : null}
    </group>
  );
}

function TrailingFoliage({ color, length }: { color: string; length: number }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.16, 8, 7]} />
        <meshStandardMaterial color={color} roughness={0.95} flatShading />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.09, -length / 2, Math.sin(angle) * 0.09]}
          >
            <cylinderGeometry args={[0.022, 0.012, length, 6]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}
