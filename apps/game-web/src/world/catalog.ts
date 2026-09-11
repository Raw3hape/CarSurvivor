import type { Fact, FlagVisual, Region, WorldCatalog } from './types';

export type WorldIndex = {
  catalog: WorldCatalog;
  byId: Map<string, Region>;
  childrenOf: (parentId: string | null) => Region[];
  flagById: Map<string, FlagVisual>;
  factById: Map<string, Fact>;
  countries: Region[];
};

const EMPTY: Region[] = [];

export function indexWorld(catalog: WorldCatalog): WorldIndex {
  const byId = new Map<string, Region>();
  const children = new Map<string | null, Region[]>();
  const flagById = new Map<string, FlagVisual>();
  const factById = new Map<string, Fact>();

  for (const flag of catalog.flags) flagById.set(flag.id, flag);
  for (const fact of catalog.facts) factById.set(fact.id, fact);

  for (const region of catalog.regions) {
    byId.set(region.id, region);
    const list = children.get(region.parentId);
    if (list) list.push(region);
    else children.set(region.parentId, [region]);
  }

  const countries = catalog.regions.filter((region) => region.kind === 'country');

  return {
    catalog,
    byId,
    childrenOf: (parentId) => children.get(parentId) ?? EMPTY,
    flagById,
    factById,
    countries,
  };
}

export async function loadWorld(): Promise<WorldIndex> {
  const res = await fetch('/world/catalog.json');
  if (!res.ok) throw new Error(`world catalog HTTP ${res.status}`);
  const catalog = (await res.json()) as WorldCatalog;
  if (catalog.version !== 1) throw new Error(`world catalog version ${String(catalog.version)}`);
  return indexWorld(catalog);
}

function walkParent(index: WorldIndex, region: Region, read: (current: Region) => string | undefined): string | undefined {
  const seen = new Set<string>();
  let current: Region | undefined = region;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const id = read(current);
    if (id) return id;
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }
  return undefined;
}

export function regionFlag(index: WorldIndex, region: Region): FlagVisual | undefined {
  const id = walkParent(index, region, (current) => current.flagId);
  return id ? index.flagById.get(id) : undefined;
}

export function regionIso(index: WorldIndex, region: Region): string | undefined {
  const raw = walkParent(index, region, (current) => current.iso2);
  return raw ? raw.toLowerCase() : undefined;
}

export function regionFact(index: WorldIndex, region: Region): Fact | undefined {
  const id = walkParent(index, region, (current) => current.factId);
  return id ? index.factById.get(id) : undefined;
}
