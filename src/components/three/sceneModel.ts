import { getItem, meta } from "@shared/catalog";
import type { DesignConfiguration } from "@shared/configuration/schema";
import { derive } from "@shared/configuration/derive";

/**
 * The scene model: configuration → an asset-key description of what to draw.
 *
 * The 3D components consume this, never the configuration directly. Keys such
 * as `roof:pyramid` or `seat:perimeter` are the contract, so today's
 * procedural placeholder geometry can be swapped for real GLB/GLTF assets
 * without touching the configurator.
 */

export type Side = "north" | "south" | "east" | "west";

export type SceneModel = {
  /** Metres. The 3D layer works in metres; the domain works in millimetres. */
  width: number;
  length: number;
  height: number;

  frame: {
    assetKey: string;
    /** Colour resolved from material + finish. */
    color: string;
    metalness: number;
    roughness: number;
    postSize: number;
  };

  roof: {
    assetKey: string;
    color: string;
    peakHeight: number;
  } | null;

  seating: {
    assetKey: string;
    sides: Side[];
    inset: boolean;
    seatHeight: number;
    depth: number;
    hasCushion: boolean;
    cushionColor: string;
    hasBackrest: boolean;
  } | null;

  aquarium: {
    assetKey: string;
    position: "center" | "side" | "integrated";
    /** Metres. */
    size: { x: number; y: number; z: number };
    /** Where the tank sits, in scene coordinates. */
    origin: [number, number, number];
    /** Height of the stand under the tank, metres. */
    standHeight: number;
    fish: { color: string; count: number }[];
    lit: boolean;
  } | null;

  planters: {
    assetKey: string;
    kind: "edge" | "corner" | "hanging" | "trellis" | "aquatic";
    color: string;
    height: number;
    depth: number;
  }[];

  plants: {
    assetKey: string;
    habit: "climbing" | "hanging" | "planter" | "aquatic";
    color: string;
    bloom?: string;
  }[];

  lighting: {
    ambientStrip: boolean;
    aquariumLight: boolean;
    /** Environment tone drives the sky/ground colours and light intensity. */
    tone: "warm" | "daylight" | "dusk";
  };

  extras: {
    fan: boolean;
    privacyScreens: boolean;
    misting: boolean;
    waterFeature: boolean;
    storage: boolean;
  };
};

const FALLBACK_FRAME_COLOR = "#22262a";

export function buildSceneModel(config: DesignConfiguration): SceneModel {
  const derived = derive(config);

  const width = config.pavilion.widthMm / 1000;
  const length = config.pavilion.lengthMm / 1000;
  const height = config.pavilion.heightMm / 1000;

  const material = getItem(config.structure.materialId);
  const finish = getItem(config.structure.finishId);

  const frameColor =
    meta<string>(finish, "swatch") ??
    meta<string>(material, "baseColor") ??
    FALLBACK_FRAME_COLOR;

  const roofItem = getItem(config.roof.roofId);
  const layout = getItem(config.seating.layoutId);
  const style = getItem(config.seating.styleId);
  const fabric = getItem(config.seating.fabricId);

  const environment = getItem(config.environment);
  const tone = (meta<string>(environment, "tone") ?? "daylight") as
    | "warm"
    | "daylight"
    | "dusk";

  return {
    width,
    length,
    height,

    frame: {
      assetKey: "frame",
      color: frameColor,
      metalness: meta<number>(finish, "metalness") ?? meta<number>(material, "metalness") ?? 0.4,
      roughness: meta<number>(finish, "roughness") ?? meta<number>(material, "roughness") ?? 0.6,
      // Timber reads as a chunkier section than aluminium.
      postSize: material?.id === "MAT-TIMBER" ? 0.13 : 0.1,
    },

    roof: roofItem
      ? {
          assetKey: roofItem.assetKey ?? "roof:flat",
          // Timber-toned roofs on pergolas, frame-toned otherwise.
          color:
            roofItem.id === "ROOF-PERGOLA"
              ? (meta<string>(getItem("MAT-TIMBER"), "baseColor") ?? "#8b5e3c")
              : frameColor,
          peakHeight: (meta<number>(roofItem, "peakHeightMm") ?? 200) / 1000,
        }
      : null,

    seating:
      config.seating.enabled && layout
        ? {
            assetKey: layout.assetKey ?? "seat:perimeter",
            sides: (meta<Side[]>(layout, "sides") ?? []) as Side[],
            inset: meta<boolean>(layout, "inset") ?? false,
            seatHeight: (meta<number>(style, "seatHeightMm") ?? 450) / 1000,
            depth: (meta<number>(style, "depthMm") ?? 550) / 1000,
            hasCushion: meta<boolean>(style, "cushion") ?? false,
            cushionColor: meta<string>(fabric, "swatch") ?? "#ddd2ba",
            hasBackrest: meta<boolean>(style, "backrest") ?? false,
          }
        : null,

    aquarium: buildAquarium(config, width, length),

    planters: config.plants.planterIds.flatMap((id) => {
      const planter = getItem(id);
      if (!planter) return [];
      return [
        {
          assetKey: planter.assetKey ?? "planter:edge",
          kind: planterKind(planter.assetKey),
          color: "#6b4a30",
          height: (meta<number>(planter, "heightMm") ?? 400) / 1000,
          depth: (meta<number>(planter, "depthMm") ?? 350) / 1000,
        },
      ];
    }),

    plants: config.plants.plantIds.flatMap((id) => {
      const plant = getItem(id);
      if (!plant) return [];
      return [
        {
          assetKey: plant.assetKey ?? "plant:shrub",
          habit: (meta<string>(plant, "habit") ?? "planter") as
            | "climbing"
            | "hanging"
            | "planter"
            | "aquatic",
          color: meta<string>(plant, "color") ?? "#6b9450",
          bloom: meta<string>(plant, "bloom"),
        },
      ];
    }),

    lighting: {
      ambientStrip: config.addons.includes("ADD-LED-AMBIENT"),
      aquariumLight: config.addons.includes("ADD-AQUARIUM-LIGHT"),
      tone,
    },

    extras: {
      fan: config.addons.includes("ADD-FAN"),
      privacyScreens: config.addons.includes("ADD-PRIVACY"),
      misting: config.addons.includes("ADD-MISTING"),
      waterFeature: config.addons.includes("ADD-WATER-FEATURE"),
      storage: config.addons.includes("ADD-STORAGE"),
    },
  };

  function buildAquarium(
    cfg: DesignConfiguration,
    pavilionWidth: number,
    pavilionLength: number,
  ): SceneModel["aquarium"] {
    if (!cfg.aquarium.enabled || !cfg.aquarium.positionId) return null;

    const position = getItem(cfg.aquarium.positionId);
    const footprint = (meta<string>(position, "footprint") ?? "center") as
      | "center"
      | "side"
      | "integrated";

    // Fall back to the seed tank so the scene still shows something while the
    // customer is still entering dimensions.
    const x = (cfg.aquarium.lengthMm ?? 1200) / 1000;
    const y = (cfg.aquarium.heightMm ?? 600) / 1000;
    const z = (cfg.aquarium.widthMm ?? 500) / 1000;

    // Keep the tank inside the pavilion footprint whatever the customer types.
    const sizeX = Math.min(x, pavilionLength - 0.4);
    const sizeZ = Math.min(z, pavilionWidth - 0.4);

    const standHeight = footprint === "integrated" ? 0.42 : 0.55;
    const origin: [number, number, number] =
      footprint === "side"
        ? [0, standHeight, -(pavilionWidth / 2) + sizeZ / 2 + 0.25]
        : [0, standHeight, 0];

    return {
      assetKey: position?.assetKey ?? "aquarium:center",
      position: footprint,
      size: { x: sizeX, y, z: sizeZ },
      origin,
      standHeight,
      fish: cfg.aquarium.selectedSpeciesIds.flatMap((speciesId) => {
        const species = getItem(speciesId);
        if (!species) return [];
        return [
          {
            color: meta<string>(species, "color") ?? "#e08a4a",
            // Cap the demo shoal so a big selection stays readable.
            count: Math.min(meta<number>(species, "schoolSize") ?? 3, 6),
          },
        ];
      }),
      lit: cfg.addons.includes("ADD-AQUARIUM-LIGHT"),
    };
  }

  function planterKind(assetKey: string | undefined): SceneModel["planters"][number]["kind"] {
    if (assetKey === "planter:corner") return "corner";
    if (assetKey === "planter:hanging") return "hanging";
    if (assetKey === "trellis:post") return "trellis";
    if (assetKey === "planter:aquatic") return "aquatic";
    return "edge";
  }
}

export { derive };
