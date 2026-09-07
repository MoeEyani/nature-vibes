/**
 * Catalog model.
 *
 * Everything the customer can select in the configurator is a CatalogItem.
 * UI components never hard-code options; they read them from the catalog so
 * that real product data can replace the seed data without touching the UI.
 */

export type CatalogCategory =
  | "environment"
  | "pavilion"
  | "shape"
  | "sizePreset"
  | "material"
  | "finish"
  | "roof"
  | "seatingLayout"
  | "seatingStyle"
  | "fabric"
  | "aquariumPosition"
  | "aquariumShape"
  | "species"
  | "plant"
  | "planter"
  | "addon";

/** `future`/`disabled` items render in the UI but cannot be selected. */
export type ItemStatus = "active" | "future" | "disabled";

export type PriceStatus = "placeholder" | "confirmed";

export type Price = {
  amount: number;
  currency: "SAR";
  /**
   * Every seed price is `placeholder`. The UI must say "Estimated" for as long
   * as any line item in the breakdown is a placeholder.
   */
  status: PriceStatus;
};

/** How a line item's quantity is derived from the configuration. */
export type PricingMode =
  | "flat" // one unit, regardless of size
  | "perSquareMetre" // multiplied by pavilion footprint in m²
  | "perLinearMetre" // multiplied by a rule-supplied run length
  | "perUnit"; // multiplied by an explicit quantity (e.g. planters)

export type CatalogItem = {
  id: string;
  sku?: string;
  category: CatalogCategory;
  name: string;
  status: ItemStatus;
  /** Shown on the option card. */
  description?: string;
  /** Shown when a `future`/`disabled` option is clicked. */
  unavailableReason?: string;
  price?: Price;
  pricingMode?: PricingMode;
  compatibleWith?: string[];
  incompatibleWith?: string[];
  requires?: string[];
  tags?: string[];
  /**
   * Stable key the 3D layer maps to geometry. Keeps the configurator
   * decoupled from any particular GLB/GLTF asset.
   */
  assetKey?: string;
  /** Free-form seed metadata (dimensions, demo species traits, swatches…). */
  meta?: Record<string, unknown>;
};

export type CatalogIndex = Record<string, CatalogItem>;
