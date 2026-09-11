#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const worldDir = resolve(root, 'public/world');
const cacheDir = resolve(worldDir, 'cache');
const catalogPath = resolve(worldDir, 'catalog.json');
const overridesPath = resolve(worldDir, 'flag-overrides.json');

const UA = { 'User-Agent': 'CarSurvivorWorldBuild/1.0' };
const MAX_CATALOG_BYTES = 8 * 1024 * 1024;
const EARTH_RADIUS_KM = 6371;
const PATTERNS = new Set(['solid', 'horizontal', 'vertical', 'cross', 'saltire', 'canton', 'pale', 'fess']);

const KEEP_ADMIN1 = new Set(
  'US,CA,BR,IN,CN,AU,RU,MX,ID,AR,KZ,DZ,SA,IR,LY,MN,CD,SD,ID,TR,UA,FR,DE,PL,ES,IT,GB,JP,NG,ZA,CO,PE,CL,EG,PK,AF,ET'.split(
    ',',
  ),
);

const REGION_RU = {
  Africa: 'Африка',
  Americas: 'Америка',
  Asia: 'Азия',
  Europe: 'Европа',
  Oceania: 'Океания',
  Antarctic: 'Антарктика',
};

const SUBREGION_RU = {
  'Northern Africa': 'Северная Африка',
  'Middle Africa': 'Центральная Африка',
  'Western Africa': 'Западная Африка',
  'Eastern Africa': 'Восточная Африка',
  'Southern Africa': 'Южная Африка',
  Caribbean: 'Карибы',
  'Central America': 'Центральная Америка',
  'South America': 'Южная Америка',
  'North America': 'Северная Америка',
  'Northern Europe': 'Северная Европа',
  'Western Europe': 'Западная Европа',
  'Southern Europe': 'Южная Европа',
  'Eastern Europe': 'Восточная Европа',
  'Central Europe': 'Центральная Европа',
  'Southeast Europe': 'Юго-Восточная Европа',
  'Western Asia': 'Западная Азия',
  'Central Asia': 'Центральная Азия',
  'Eastern Asia': 'Восточная Азия',
  'South-Eastern Asia': 'Юго-Восточная Азия',
  'Southern Asia': 'Южная Азия',
  'Australia and New Zealand': 'Австралия и Новая Зеландия',
  Melanesia: 'Меланезия',
  Micronesia: 'Микронезия',
  Polynesia: 'Полинезия',
};

const SOURCES = {
  countries: {
    dest: resolve(cacheDir, 'ne_110m_admin_0_countries.geojson'),
    minBytes: 80_000,
    urls: [
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
    ],
  },
  admin50: {
    dest: resolve(cacheDir, 'ne_50m_admin_1_states_provinces.geojson'),
    minBytes: 200_000,
    urls: [
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson',
    ],
  },
  admin10: {
    dest: resolve(cacheDir, 'ne_10m_admin_1_states_provinces.geojson'),
    minBytes: 1_000_000,
    optional: true,
    urls: [
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson',
    ],
  },
  places: {
    dest: resolve(cacheDir, 'ne_110m_populated_places.geojson'),
    minBytes: 80_000,
    urls: [
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places.geojson',
    ],
  },
  rest: {
    dest: resolve(cacheDir, 'restcountries.json'),
    minBytes: 20_000,
    urls: [
      'https://restcountries.com/v3.1/all?fields=cca2,cca3,name,translations,capital,region,subregion,population,area,languages,borders,latlng,flag',
      'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
      'https://cdn.jsdelivr.net/npm/world-countries/countries.json',
    ],
  },
};

function cacheOk(path, minBytes) {
  return existsSync(path) && statSync(path).size >= minBytes;
}

function looksDeprecated(buf) {
  const head = buf.subarray(0, 400).toString('utf8');
  return head.includes('has been deprecated') || head.includes('"success": false');
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50 || looksDeprecated(buf)) throw new Error(`${url} rejected payload (${buf.length} B)`);
  return buf;
}

async function ensureSource(spec) {
  mkdirSync(cacheDir, { recursive: true });
  if (process.env.WORLD_REFRESH !== '1' && cacheOk(spec.dest, spec.minBytes)) {
    console.log(`cache ${spec.dest}`);
    return JSON.parse(readFileSync(spec.dest, 'utf8'));
  }
  let lastErr;
  for (const url of spec.urls) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        console.log(`${attempt ? 'retry' : 'get'} ${url}`);
        const buf = await fetchBuffer(url);
        if (buf.length < spec.minBytes) throw new Error(`${url} too small ${buf.length}`);
        writeFileSync(spec.dest, buf);
        return JSON.parse(buf.toString('utf8'));
      } catch (err) {
        lastErr = err;
        console.warn(String(err.message || err));
      }
    }
  }
  if (cacheOk(spec.dest, spec.minBytes)) {
    console.warn(`using cache after network fail: ${spec.dest}`);
    return JSON.parse(readFileSync(spec.dest, 'utf8'));
  }
  if (spec.optional) {
    console.warn(`optional source missing: ${spec.dest}`);
    return null;
  }
  throw lastErr ?? new Error(`failed ${spec.dest}`);
}

function restIso2(c) {
  return String(c.cca2 || c.codes?.alpha_2 || '')
    .trim()
    .toLowerCase();
}

function restIso3(c) {
  return String(c.cca3 || c.codes?.alpha_3 || '')
    .trim()
    .toUpperCase();
}

function restName(c) {
  return String(c.name?.common || c.names?.common || '').trim();
}

function restNameRu(c) {
  return String(c.translations?.rus?.common || '').trim();
}

function restCapital(c) {
  const cap = c.capital;
  if (Array.isArray(cap)) return String(cap[0] || '').trim();
  if (typeof cap === 'string') return cap.trim();
  if (Array.isArray(c.capitals) && c.capitals[0]?.name) return String(c.capitals[0].name).trim();
  return '';
}

function restArea(c) {
  if (typeof c.area === 'number') return c.area;
  if (typeof c.area?.kilometers === 'number') return c.area.kilometers;
  return 0;
}

function restLatLng(c) {
  const ll = c.latlng || c.latLng;
  if (Array.isArray(ll) && ll.length >= 2) return { lon: Number(ll[1]), lat: Number(ll[0]) };
  return null;
}

function indexRest(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.data?.objects) ? raw.data.objects : [];
  const byIso2 = new Map();
  const iso3to2 = new Map();
  for (const c of list) {
    const iso2 = restIso2(c);
    const iso3 = restIso3(c);
    if (iso2.length === 2) byIso2.set(iso2, c);
    if (iso3 && iso2.length === 2) iso3to2.set(iso3, iso2);
  }
  return { byIso2, iso3to2 };
}

function countryCode(props) {
  const a2 = String(props.ISO_A2 || '').toUpperCase();
  const eh = String(props.ISO_A2_EH || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(a2)) return a2.toLowerCase();
  if (/^[A-Z]{2}$/.test(eh)) return eh.toLowerCase();
  const a3 = String(props.ADM0_A3 || '').toLowerCase();
  return a3 || null;
}

function clamp(min, max, x) {
  return Math.min(max, Math.max(min, x));
}

function roundNum(n, digits = 3) {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

function roundPt(p, digits = 3) {
  return { lon: roundNum(p.lon, digits), lat: roundNum(p.lat, digits) };
}

function isClosed(ring) {
  if (ring.length < 2) return false;
  const a = ring[0];
  const b = ring[ring.length - 1];
  return a.lon === b.lon && a.lat === b.lat;
}

function distToSeg(p, a, b) {
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return Math.hypot(p.lon - a.lon, p.lat - a.lat);
  const t = Math.max(0, Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.lon - (a.lon + t * dx), p.lat - (a.lat + t * dy));
}

function simplifyDP(points, epsilon) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const a = points[start];
    const b = points[end];
    let maxD = 0;
    let idx = -1;
    for (let i = start + 1; i < end; i += 1) {
      const d = distToSeg(points[i], a, b);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon && idx >= 0) {
      keep[idx] = 1;
      stack.push([start, idx], [idx, end]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i += 1) if (keep[i]) out.push(points[i]);
  return out;
}

function downsample(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < points.length; i += step) sampled.push(points[i]);
  const last = points[points.length - 1];
  const first = points[0];
  if (sampled[0] !== first) sampled.unshift(first);
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function simplifyRing(ring, maxPoints, digits, { requireSix = true } = {}) {
  if (requireSix && ring.length < 6) return null;
  const pts = isClosed(ring) ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 3) return null;
  let epsilon = 0.03;
  let simplified = pts;
  for (let i = 0; i < 14 && simplified.length > maxPoints; i += 1) {
    simplified = simplifyDP(pts, epsilon);
    epsilon *= 1.55;
  }
  if (simplified.length > maxPoints) simplified = downsample(simplified, maxPoints);
  if (simplified.length < 3) return null;
  const rounded = [];
  for (const p of simplified) {
    const q = roundPt(p, digits);
    const prev = rounded[rounded.length - 1];
    if (prev && prev.lon === q.lon && prev.lat === q.lat) continue;
    rounded.push(q);
  }
  if (rounded.length < 3) return null;
  const first = rounded[0];
  const last = rounded[rounded.length - 1];
  if (first.lon !== last.lon || first.lat !== last.lat) rounded.push({ lon: first.lon, lat: first.lat });
  return rounded;
}

function toRing(coords) {
  const ring = [];
  for (const c of coords) {
    if (!c || c.length < 2) continue;
    const lon = Number(c[0]);
    const lat = Number(c[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const prev = ring[ring.length - 1];
    if (prev && prev.lon === lon && prev.lat === lat) continue;
    ring.push({ lon, lat });
  }
  return ring;
}

function polygonsFromGeom(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'GeometryCollection') return (geometry.geometries || []).flatMap(polygonsFromGeom);
  return [];
}

function ringAreaKm2(ring) {
  if (ring.length < 3) return 0;
  const pts = isClosed(ring) ? ring : [...ring, ring[0]];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    total +=
      ((b.lon - a.lon) * Math.PI) / 180 * (2 + Math.sin((a.lat * Math.PI) / 180) + Math.sin((b.lat * Math.PI) / 180));
  }
  return Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

function polygonAreaKm2(polygon) {
  const outer = polygon.rings[0];
  if (!outer) return 0;
  let area = ringAreaKm2(outer);
  for (let i = 1; i < polygon.rings.length; i += 1) area -= ringAreaKm2(polygon.rings[i]);
  return Math.max(0, area);
}

function geomAreaKm2(polygons) {
  return polygons.reduce((sum, p) => sum + polygonAreaKm2(p), 0);
}

function bboxOf(polygons) {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const p of polygons) {
    for (const ring of p.rings) {
      for (const pt of ring) {
        if (pt.lon < w) w = pt.lon;
        if (pt.lon > e) e = pt.lon;
        if (pt.lat < s) s = pt.lat;
        if (pt.lat > n) n = pt.lat;
      }
    }
  }
  if (!Number.isFinite(w)) return [0, 0, 0, 0];
  return [roundNum(w), roundNum(s), roundNum(e), roundNum(n)];
}

function centroidOf(polygons) {
  let best = null;
  let bestArea = -1;
  for (const p of polygons) {
    const outer = p.rings[0];
    if (!outer) continue;
    const area = ringAreaKm2(outer);
    if (area > bestArea) {
      bestArea = area;
      best = outer;
    }
  }
  if (!best) return { lon: 0, lat: 0 };
  const pts = isClosed(best) ? best.slice(0, -1) : best;
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.lon;
    y += p.lat;
  }
  return { lon: roundNum(x / pts.length), lat: roundNum(y / pts.length) };
}

function simplifyFeature(geometry, { maxPoints, maxPolygons, digits, keepTiny }) {
  const raw = polygonsFromGeom(geometry);
  const built = [];
  for (const coords of raw) {
    if (!coords?.length) continue;
    const rings = [];
    for (let i = 0; i < coords.length; i += 1) {
      const ring = toRing(coords[i]);
      const simple = simplifyRing(ring, i === 0 ? maxPoints : Math.min(32, maxPoints), digits, {
        requireSix: !keepTiny || i > 0,
      });
      if (!simple) continue;
      rings.push(simple);
    }
    if (!rings.length) continue;
    built.push({ rings, area: ringAreaKm2(rings[0]) });
  }
  built.sort((a, b) => b.area - a.area);
  const kept = [];
  const largest = built[0]?.area || 0;
  for (let i = 0; i < built.length; i += 1) {
    if (kept.length >= maxPolygons) break;
    const item = built[i];
    if (i > 0 && item.area < Math.max(largest * 0.008, 80) && kept.length >= 1) continue;
    kept.push({ rings: item.rings });
  }
  return kept;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const hit =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lon < ((b.lon - a.lon) * (point.lat - a.lat)) / (b.lat - a.lat + 1e-12) + a.lon;
    if (hit) inside = !inside;
  }
  return inside;
}

function pointInPolygons(point, polygons) {
  for (const polygon of polygons) {
    const outer = polygon.rings[0];
    if (!outer || !pointInRing(point, outer)) continue;
    let hole = false;
    for (let i = 1; i < polygon.rings.length; i += 1) {
      if (polygon.rings[i] && pointInRing(point, polygon.rings[i])) {
        hole = true;
        break;
      }
    }
    if (!hole) return true;
  }
  return false;
}

function bboxOverlap(a, b) {
  return a[2] >= b[0] && b[2] >= a[0] && a[3] >= b[1] && b[3] >= a[1];
}

function haversineKm(a, b) {
  const DEG = Math.PI / 180;
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = (b.lat - a.lat) * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hashFlag(iso2) {
  const h = fnv(iso2);
  const h2 = fnv(`${iso2}:b`);
  const count = 2 + (h % 2);
  const hue = h % 360;
  const hue2 = (hue + 38 + (h2 % 70)) % 360;
  const colors = [hslHex(hue, 68, 38), hslHex(hue2, 58, 52)];
  if (count === 3) colors.push(hslHex((hue + 180) % 360, 42, 78));
  const two = ['horizontal', 'vertical'];
  const three = ['fess', 'pale', 'canton', 'horizontal'];
  return { id: `flag:${iso2}`, pattern: count === 2 ? two[h2 % 2] : three[h2 % 4], colors };
}

function loadOverrides() {
  if (!existsSync(overridesPath)) return {};
  return JSON.parse(readFileSync(overridesPath, 'utf8'));
}

function flagFor(iso2, overrides) {
  const ov = overrides[iso2];
  if (ov && PATTERNS.has(ov.pattern) && Array.isArray(ov.colors) && ov.colors.length >= 2 && ov.colors.length <= 3) {
    return { id: `flag:${iso2}`, pattern: ov.pattern, colors: ov.colors.map((c) => String(c).toUpperCase()) };
  }
  return hashFlag(iso2);
}

function formatPop(n) {
  const x = Math.round(Number(n) || 0);
  if (x >= 1e9) {
    const v = x / 1e9;
    return `${v >= 10 ? Math.round(v) : String(v.toFixed(1)).replace('.', ',')} млрд`;
  }
  if (x >= 1e6) return `${Math.round(x / 1e6)} млн`;
  if (x >= 1e3) return `${Math.round(x / 1e3)} тыс.`;
  return String(x);
}

function formatArea(km2) {
  const x = Math.round(Number(km2) || 0);
  if (x >= 1e6) {
    const v = x / 1e6;
    return `${v >= 10 ? Math.round(v) : String(v.toFixed(1)).replace('.', ',')} млн км²`;
  }
  if (x >= 1000) return `${Math.round(x / 1000)} тыс. км²`;
  return `${x} км²`;
}

function buildFact(id, title, { region, subregion, capital, population, areaKm2, iso }) {
  const lines = [];
  const regionRu = REGION_RU[region] || '';
  const subRu = SUBREGION_RU[subregion] || '';
  if (regionRu) lines.push(subRu ? `${regionRu} · ${subRu}` : regionRu);
  else if (region) lines.push(region);
  if (capital) lines.push(`Столица: ${capital}`);
  if (population > 0) lines.push(`Население: ${formatPop(population)}`);
  if (areaKm2 > 0 && lines.length < 4) lines.push(`Площадь: ${formatArea(areaKm2)}`);
  if (lines.length < 2 && iso) lines.push(`Код: ${iso.toUpperCase()}`);
  return { id, title, lines: lines.slice(0, 4) };
}

function parentIso(region) {
  if (!region.parentId?.startsWith('country:')) return '';
  return region.parentId.slice('country:'.length).toUpperCase();
}

function shrinkGeoms(regions, { keepIso, maxPolys, dropHoles }) {
  for (const region of regions) {
    if (region.kind !== 'admin1' || !region.geom?.polygons) continue;
    if (keepIso.has(parentIso(region))) continue;
    region.geom.polygons = region.geom.polygons.slice(0, maxPolys);
    if (dropHoles) {
      for (const p of region.geom.polygons) p.rings = p.rings.slice(0, 1);
    }
  }
}

function catalogBytes(catalog) {
  return Buffer.byteLength(JSON.stringify(catalog), 'utf8');
}

function sampleMatch(regions, query) {
  const q = query.trim().toLowerCase();
  const rank = { city: 0, admin1: 1, country: 2 };
  let best = null;
  let bestR = 99;
  for (const region of regions) {
    const fields = [region.name, region.nameLocal, region.iso2, region.iso3166_2, region.id]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    if (!fields.some((f) => f === q)) continue;
    const r = rank[region.kind] ?? 9;
    if (r < bestR) {
      best = region;
      bestR = r;
    }
  }
  return best;
}

async function main() {
  mkdirSync(worldDir, { recursive: true });
  const overrides = loadOverrides();
  const countriesFc = await ensureSource(SOURCES.countries);
  const admin50 = await ensureSource(SOURCES.admin50);
  const admin10 = await ensureSource(SOURCES.admin10);
  const placesFc = await ensureSource(SOURCES.places);
  const restRaw = await ensureSource(SOURCES.rest);
  const rest = indexRest(restRaw);

  const geom50 = new Map();
  for (const f of admin50.features || []) {
    const k = f.properties?.iso_3166_2 || f.properties?.adm1_code;
    if (k) geom50.set(k, f.geometry);
  }
  const adminFeatures = (admin10?.features?.length ? admin10.features : admin50.features).map((f) => {
    const k = f.properties?.iso_3166_2 || f.properties?.adm1_code;
    const g = k && geom50.get(k);
    return g ? { ...f, geometry: g } : f;
  });

  const flags = [];
  const facts = [];
  const regions = [];
  const countryByIso = new Map();
  const countryByA3 = new Map();
  const usedIds = new Set();

  for (const feature of countriesFc.features || []) {
    const props = feature.properties || {};
    const iso = countryCode(props);
    if (!iso) continue;
    // Skip Antarctica (AQ): south-pole polygon wrecks globe painting and wrapping.
    if (iso === 'aq' || props.NAME === 'Antarctica' || props.ADM0_A3 === 'ATA') continue;
    const id = `country:${iso}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    const restC = rest.byIso2.get(iso);
    const polygons = simplifyFeature(feature.geometry, {
      maxPoints: 72,
      maxPolygons: 10,
      digits: 3,
      keepTiny: true,
    });
    if (!polygons.length) continue;
    const geomArea = geomAreaKm2(polygons);
    const areaKm2 = restArea(restC) || geomArea || 1;
    const ll = restLatLng(restC);
    const centroid =
      ll && Number.isFinite(ll.lon) && Number.isFinite(ll.lat)
        ? { lon: roundNum(ll.lon), lat: roundNum(ll.lat) }
        : Number.isFinite(props.LABEL_X) && Number.isFinite(props.LABEL_Y)
          ? { lon: roundNum(props.LABEL_X), lat: roundNum(props.LABEL_Y) }
          : centroidOf(polygons);
    const name = restName(restC) || props.NAME_EN || props.NAME || iso.toUpperCase();
    const nameLocal = restNameRu(restC) || props.NAME_RU || undefined;
    const flag = flagFor(iso, overrides);
    const factId = `fact:${iso}`;
    const pop = Number(restC?.population) || Number(props.POP_EST) || 0;
    const capitalEn = restCapital(restC);
    flags.push(flag);
    const region = {
      id,
      kind: 'country',
      name,
      parentId: null,
      iso2: iso.length === 2 ? iso.toUpperCase() : undefined,
      areaKm2: roundNum(areaKm2, 1),
      centroid,
      bbox: bboxOf(polygons),
      neighborIds: [],
      flagId: flag.id,
      factId,
      geom: { polygons },
      _a3: String(props.ADM0_A3 || '').toUpperCase(),
      _pop: pop,
      _capital: capitalEn,
      _region: restC?.region || props.REGION_UN || props.CONTINENT || '',
      _subregion: restC?.subregion || props.SUBREGION || '',
    };
    if (nameLocal) region.nameLocal = nameLocal;
    regions.push(region);
    countryByIso.set(iso, region);
    if (region._a3) countryByA3.set(region._a3, region);
  }

  const admin1 = [];
  for (const feature of adminFeatures) {
    const props = feature.properties || {};
    const iso = String(props.iso_a2 || '').toLowerCase();
    if (!iso || iso === '-99' || iso === 'aq') continue;
    const parent = countryByIso.get(iso);
    if (!parent) continue;
    const code = props.iso_3166_2 && String(props.iso_3166_2).length > 3 ? String(props.iso_3166_2) : String(props.adm1_code || '');
    if (!code) continue;
    let id = `admin1:${code}`;
    if (usedIds.has(id)) {
      const extra = String(props.name || props.name_en || 'x')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
      id = `admin1:${code}:${extra || 'x'}`;
    }
    if (usedIds.has(id)) continue;
    const polygons = simplifyFeature(feature.geometry, {
      maxPoints: 48,
      maxPolygons: 6,
      digits: 3,
      keepTiny: false,
    });
    if (!polygons.length) continue;
    usedIds.add(id);
    const areaKm2 = Number(props.area_sqkm) || geomAreaKm2(polygons) || 1;
    const centroid =
      Number.isFinite(props.longitude) && Number.isFinite(props.latitude)
        ? { lon: roundNum(props.longitude), lat: roundNum(props.latitude) }
        : centroidOf(polygons);
    const rec = {
      id,
      kind: 'admin1',
      name: props.name_en || props.name || code,
      parentId: parent.id,
      iso3166_2: props.iso_3166_2 ? String(props.iso_3166_2) : undefined,
      areaKm2: roundNum(areaKm2, 1),
      centroid,
      bbox: bboxOf(polygons),
      neighborIds: [],
      geom: { polygons },
      _adm1name: String(props.name || ''),
    };
    if (props.name_ru) rec.nameLocal = String(props.name_ru);
    admin1.push(rec);
  }

  const cities = [];
  for (const feature of placesFc.features || []) {
    const props = feature.properties || {};
    const scalerank = Number(props.SCALERANK);
    const featurecla = String(props.FEATURECLA || '');
    if (!(scalerank <= 5 || featurecla.includes('Admin-0 capital'))) continue;
    const neId = props.NE_ID ?? props.ne_id;
    if (neId == null) continue;
    const id = `city:ne:${neId}`;
    if (usedIds.has(id)) continue;
    const coords = feature.geometry?.coordinates;
    const lon = Number(Array.isArray(coords) ? coords[0] : props.LONGITUDE);
    const lat = Number(Array.isArray(coords) ? coords[1] : props.LATITUDE);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    let iso = String(props.ISO_A2 || '').toLowerCase();
    if (iso.length !== 2 || iso === '-99') {
      const parent = countryByA3.get(String(props.ADM0_A3 || '').toUpperCase());
      iso = parent?.id.slice('country:'.length) || '';
    }
    if (iso === 'aq') continue;
    const country = countryByIso.get(iso);
    if (!country) continue;
    const pop = Number(props.POP_MAX) || Number(props.POP_MIN) || 0;
    const radiusKm = roundNum(clamp(8, 28, 4 + Math.sqrt(Math.max(0, pop)) / 90), 2);
    const center = { lon: roundNum(lon), lat: roundNum(lat) };
    const dlat = radiusKm / 111.32;
    const dlon = radiusKm / (111.32 * Math.max(0.12, Math.cos((center.lat * Math.PI) / 180)));
    let parentId = country.id;
    const adm1name = String(props.ADM1NAME || '').toLowerCase();
    const inCountry = admin1.filter((a) => a.parentId === country.id);
    for (const a of inCountry) {
      const [w, s, e, n] = a.bbox;
      if (center.lon < w || center.lon > e || center.lat < s || center.lat > n) continue;
      if (pointInPolygons(center, a.geom.polygons)) {
        parentId = a.id;
        break;
      }
    }
    if (parentId === country.id && adm1name) {
      const named = inCountry.find((a) => a.name.toLowerCase() === adm1name || a._adm1name.toLowerCase() === adm1name);
      if (named) parentId = named.id;
    }
    usedIds.add(id);
    const rec = {
      id,
      kind: 'city',
      name: props.NAME_EN || props.NAMEASCII || props.NAME || id,
      parentId,
      areaKm2: roundNum(Math.PI * radiusKm * radiusKm, 1),
      centroid: center,
      bbox: [roundNum(center.lon - dlon), roundNum(center.lat - dlat), roundNum(center.lon + dlon), roundNum(center.lat + dlat)],
      neighborIds: [],
      geom: { circle: { center, radiusKm } },
    };
    if (props.NAME_RU) rec.nameLocal = String(props.NAME_RU);
    cities.push(rec);
  }

  const capitalRu = new Map();
  for (const city of cities) {
    const countryId = city.parentId.startsWith('country:')
      ? city.parentId
      : admin1.find((a) => a.id === city.parentId)?.parentId;
    if (countryId) capitalRu.set(`${countryId}:${city.name.toLowerCase()}`, city.nameLocal || city.name);
  }

  for (const country of regions) {
    const capitalEn = country._capital;
    const capital = (capitalEn && capitalRu.get(`${country.id}:${capitalEn.toLowerCase()}`)) || capitalEn;
    facts.push(
      buildFact(country.factId, country.nameLocal || country.name, {
        region: country._region,
        subregion: country._subregion,
        capital,
        population: country._pop,
        areaKm2: country.areaKm2,
        iso: country.iso2 || country.id.slice('country:'.length),
      }),
    );
  }

  for (const country of regions) {
    const restC = country.iso2 ? rest.byIso2.get(country.iso2.toLowerCase()) : null;
    const nids = new Set();
    for (const a3 of restC?.borders || []) {
      const iso2 = rest.iso3to2.get(String(a3).toUpperCase());
      const neighbor = (iso2 && countryByIso.get(iso2)) || countryByA3.get(String(a3).toUpperCase());
      if (neighbor && neighbor.id !== country.id) nids.add(neighbor.id);
    }
    country.neighborIds = [...nids].sort();
  }
  for (const country of regions) {
    for (const nid of country.neighborIds) {
      const other = countryByIso.get(nid.slice('country:'.length));
      if (other && !other.neighborIds.includes(country.id)) other.neighborIds.push(country.id);
    }
  }
  for (const country of regions) country.neighborIds.sort();

  const adminByParent = new Map();
  for (const a of admin1) {
    const list = adminByParent.get(a.parentId);
    if (list) list.push(a);
    else adminByParent.set(a.parentId, [a]);
  }
  for (const group of adminByParent.values()) {
    for (let i = 0; i < group.length; i += 1) {
      const nids = [];
      for (let j = 0; j < group.length; j += 1) {
        if (i === j) continue;
        if (bboxOverlap(group[i].bbox, group[j].bbox)) nids.push(group[j].id);
      }
      group[i].neighborIds = nids.sort();
    }
  }

  const cityByParent = new Map();
  for (const city of cities) {
    const list = cityByParent.get(city.parentId);
    if (list) list.push(city);
    else cityByParent.set(city.parentId, [city]);
  }
  for (const group of cityByParent.values()) {
    for (const city of group) {
      city.neighborIds = group
        .filter((other) => other.id !== city.id)
        .map((other) => ({ id: other.id, d: haversineKm(city.centroid, other.centroid) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
        .map((x) => x.id);
    }
  }

  const kindOrder = { country: 0, admin1: 1, city: 2 };
  const strip = (region) => {
    const out = { ...region };
    delete out._a3;
    delete out._pop;
    delete out._capital;
    delete out._region;
    delete out._subregion;
    delete out._adm1name;
    return out;
  };

  const rules = {
    paintPerSecondAt1km2: 1.6,
    areaExponent: 0.42,
    boostMultiplier: 2.6,
    boostSeconds: 2.2,
    yieldPerKm2PerSecond: 0.012,
    unlockCostPerSqrtKm2: 1.8,
    minUnlockCost: 10,
    originGrant: 200,
  };

  function assemble(adminList) {
    const all = [...regions, ...adminList, ...cities]
      .map(strip)
      .sort((a, b) => (kindOrder[a.kind] - kindOrder[b.kind]) || a.id.localeCompare(b.id));
    return {
      version: 1,
      planet: { id: 'earth', name: 'Earth', radiusKm: EARTH_RADIUS_KM },
      rules,
      regions: all,
      flags,
      facts,
    };
  }

  let catalog = assemble(admin1);
  let bytes = catalogBytes(catalog);
  console.log(`catalog ${bytes} B with ${admin1.length} admin1`);

  if (bytes > MAX_CATALOG_BYTES) {
    const kept = admin1.filter((a) => {
      const iso = parentIso(a);
      if (KEEP_ADMIN1.has(iso)) return true;
      const parent = countryByIso.get(iso.toLowerCase());
      return (parent?.areaKm2 || 0) > 50_000;
    });
    catalog = assemble(kept);
    bytes = catalogBytes(catalog);
    console.log(`dropped tiny-country admin1 → ${kept.length} admin1, ${bytes} B`);
    if (bytes > MAX_CATALOG_BYTES) {
      shrinkGeoms(kept, { keepIso: KEEP_ADMIN1, maxPolys: 2, dropHoles: true });
      catalog = assemble(kept);
      bytes = catalogBytes(catalog);
      console.log(`shrunk non-keep admin1 geoms → ${bytes} B`);
    }
    if (bytes > MAX_CATALOG_BYTES) {
      shrinkGeoms(kept, { keepIso: KEEP_ADMIN1, maxPolys: 1, dropHoles: true });
      catalog = assemble(kept);
      bytes = catalogBytes(catalog);
      console.log(`shrunk again → ${bytes} B`);
    }
  }

  writeFileSync(catalogPath, JSON.stringify(catalog));
  const counts = { country: 0, admin1: 0, city: 0 };
  for (const r of catalog.regions) counts[r.kind] = (counts[r.kind] || 0) + 1;
  console.log(`wrote ${catalogPath}`);
  console.log(`regions country=${counts.country} admin1=${counts.admin1} city=${counts.city} flags=${catalog.flags.length} facts=${catalog.facts.length}`);
  console.log(`size ${statSync(catalogPath).size} B`);
  for (const q of ['Warsaw', 'Москва', 'US-CA']) {
    const hit = sampleMatch(catalog.regions, q);
    console.log(`sample ${q} → ${hit ? `${hit.id} ${hit.name} ${hit.nameLocal || ''}`.trim() : 'none'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
