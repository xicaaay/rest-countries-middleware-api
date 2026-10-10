import type { Country } from '../domain/country.js';

// Breadth-first search over the land-border graph: the first time BFS reaches
// the destination it has crossed the minimum number of borders.
// Returns the countries from origin to destination (inclusive), or null when
// either country is unknown or no land route exists.
export function findLandRoute(
  countries: readonly Country[],
  fromCode: string,
  toCode: string,
): Country[] | null {
  const byCode = new Map(countries.map((c) => [c.code, c]));
  if (!byCode.has(fromCode) || !byCode.has(toCode)) return null;
  if (fromCode === toCode) return [byCode.get(fromCode) as Country];

  const graph = buildBorderGraph(countries);

  // previous[x] = country we came from when first reaching x (also acts as "visited")
  const previous = new Map<string, string>();
  const queue: string[] = [fromCode];
  const visited = new Set<string>([fromCode]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as string;

    for (const next of graph.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      previous.set(next, current);

      if (next === toCode) return rebuildPath(previous, fromCode, toCode, byCode);
      queue.push(next);
    }
  }

  return null;
}

// Borders are physical, so they work both ways: if A lists B, B also neighbors A,
// even when the provider only records it on one side. Codes that aren't in the
// dataset are ignored. Neighbors are sorted so ties resolve deterministically.
function buildBorderGraph(countries: readonly Country[]): Map<string, string[]> {
  const known = new Set(countries.map((c) => c.code));
  const sets = new Map<string, Set<string>>();
  for (const code of known) sets.set(code, new Set());

  for (const country of countries) {
    for (const border of country.borders) {
      if (!known.has(border) || border === country.code) continue;
      sets.get(country.code)?.add(border);
      sets.get(border)?.add(country.code);
    }
  }

  const graph = new Map<string, string[]>();
  for (const [code, neighbors] of sets) graph.set(code, [...neighbors].sort());
  return graph;
}

// Walks the `previous` links backwards from destination to origin
function rebuildPath(
  previous: ReadonlyMap<string, string>,
  fromCode: string,
  toCode: string,
  byCode: ReadonlyMap<string, Country>,
): Country[] {
  const path: Country[] = [];
  let code: string | undefined = toCode;

  while (code !== undefined) {
    const country = byCode.get(code);
    if (country) path.push(country);
    code = code === fromCode ? undefined : previous.get(code);
  }

  return path.reverse();
}
