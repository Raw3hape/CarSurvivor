export type RegionKind = 'country' | 'admin1' | 'city' | 'district' | 'street';

export type LodLevel = 'country' | 'admin1' | 'city';

export type LonLat = {
  lon: number;
  lat: number;
};

export type Ring = LonLat[];

export type Polygon = {
  rings: Ring[];
};

export type CircleGeom = {
  circle: {
    center: LonLat;
    radiusKm: number;
  };
};

export type RegionGeom = { polygons: Polygon[] } | CircleGeom;

export type FlagPattern =
  | 'solid'
  | 'horizontal'
  | 'vertical'
  | 'cross'
  | 'saltire'
  | 'canton'
  | 'pale'
  | 'fess';

export type FlagVisual = {
  id: string;
  pattern: FlagPattern;
  colors: string[];
};

export type Fact = {
  id: string;
  title: string;
  lines: string[];
};

export type Region = {
  id: string;
  kind: RegionKind;
  name: string;
  nameLocal?: string;
  parentId: string | null;
  iso2?: string;
  iso3166_2?: string;
  areaKm2: number;
  centroid: LonLat;
  bbox: [number, number, number, number];
  neighborIds: string[];
  flagId?: string;
  factId?: string;
  geom: RegionGeom;
};

export type SimRules = {
  paintPerSecondAt1km2: number;
  areaExponent: number;
  boostMultiplier: number;
  boostSeconds: number;
  yieldPerKm2PerSecond: number;
  unlockCostPerSqrtKm2: number;
  minUnlockCost: number;
  originGrant: number;
};

export type WorldCatalog = {
  version: 1;
  planet: { id: string; name: string; radiusKm: number };
  rules: SimRules;
  regions: Region[];
  flags: FlagVisual[];
  facts: Fact[];
};

export function isCircleGeom(geom: RegionGeom): geom is CircleGeom {
  return 'circle' in geom;
}

export function isPolygonGeom(geom: RegionGeom): geom is { polygons: Polygon[] } {
  return 'polygons' in geom;
}
