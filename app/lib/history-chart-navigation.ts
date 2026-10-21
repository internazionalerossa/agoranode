export type HistoryChartScale = "valore" | "indice";

export type HistoryChartState = {
  indicator: string;
  countries: string[];
  start: number;
  end: number;
  scale: HistoryChartScale;
};

export type HistoryChartDefinition = {
  id: string;
  period?: readonly number[];
  defaultCountries?: readonly string[];
};

export type HistoryChartNavigation = {
  indicators: readonly HistoryChartDefinition[];
  countryIds: ReadonlySet<string>;
  defaultIndicator: string;
  fallbackCountries: readonly string[];
  firstYear: number;
  lastYear: number;
};

export type HistoryChartShareResult =
  | "shared"
  | "copied"
  | "cancelled"
  | "unavailable";

type SharePayload = { title: string; text?: string; url: string };
type ShareNavigator = {
  share?: (payload: SharePayload) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export type HistoryChartImage = {
  title: string;
  unit: string;
  provider: string;
  sourceUrl: string;
  pageUrl: string;
  start: number;
  end: number;
  series: readonly {
    label: string;
    color: string;
    points: readonly (readonly [number, number])[];
  }[];
};

const GRAPH_PARAMETERS = ["indicatore", "paesi", "dal", "al", "scala"] as const;

function integer(value: string | null): number | null {
  if (value === null || !/^-?[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function periodFor(
  definition: HistoryChartDefinition,
  navigation: HistoryChartNavigation,
): [number, number] {
  const requestedEnd = definition.period?.[1];
  const end = Math.max(
    navigation.firstYear + 1,
    Math.min(
      navigation.lastYear,
      Number.isSafeInteger(requestedEnd) ? requestedEnd! : navigation.lastYear,
    ),
  );
  const requestedStart = definition.period?.[0];
  const start = Math.max(
    navigation.firstYear,
    Math.min(
      end - 1,
      Number.isSafeInteger(requestedStart) ? requestedStart! : navigation.firstYear,
    ),
  );
  return [start, end];
}

function validCountries(
  values: readonly string[],
  navigation: HistoryChartNavigation,
): string[] {
  return values
    .filter((id, index) => navigation.countryIds.has(id) && values.indexOf(id) === index)
    .slice(0, 4);
}

export function historyChartStateFromUrl(
  raw: string,
  navigation: HistoryChartNavigation,
): HistoryChartState {
  if (!navigation.indicators.length) throw new Error("At least one indicator is required");
  const url = new URL(raw, "https://site.invalid");
  const fallbackDefinition =
    navigation.indicators.find(({ id }) => id === navigation.defaultIndicator) ??
    navigation.indicators[0];
  const requestedIndicator = url.searchParams.get("indicatore");
  const definition =
    navigation.indicators.find(({ id }) => id === requestedIndicator) ?? fallbackDefinition;
  const [defaultStart, defaultEnd] = periodFor(definition, navigation);
  const requestedStart = integer(url.searchParams.get("dal"));
  const requestedEnd = integer(url.searchParams.get("al"));
  let start =
    requestedStart !== null &&
    requestedStart >= navigation.firstYear &&
    requestedStart < navigation.lastYear
      ? requestedStart
      : defaultStart;
  let end =
    requestedEnd !== null &&
    requestedEnd > navigation.firstYear &&
    requestedEnd <= navigation.lastYear
      ? requestedEnd
      : defaultEnd;
  if (start >= end) [start, end] = [defaultStart, defaultEnd];

  const requestedCountries = validCountries(
    (url.searchParams.get("paesi") ?? "").split(",").filter(Boolean),
    navigation,
  );
  const defaults = validCountries(
    definition.defaultCountries?.length
      ? definition.defaultCountries
      : navigation.fallbackCountries,
    navigation,
  );
  const countries = requestedCountries.length
    ? requestedCountries
    : defaults.length
      ? defaults
      : [...navigation.countryIds].slice(0, 4);

  return {
    indicator: definition.id,
    countries,
    start,
    end,
    scale: url.searchParams.get("scala") === "indice" ? "indice" : "valore",
  };
}

export function historyChartUrl(raw: string, state: HistoryChartState): string {
  const url = new URL(raw, "https://site.invalid");
  const retained = [...url.searchParams].filter(
    ([key]) => key !== "view" && key !== "percorso" && !GRAPH_PARAMETERS.includes(key as (typeof GRAPH_PARAMETERS)[number]),
  );
  url.search = "";
  for (const [key, value] of retained) url.searchParams.append(key, value);
  url.searchParams.set("view", "teoria");
  url.searchParams.set("percorso", "dati");
  url.searchParams.set("indicatore", state.indicator);
  url.searchParams.set("paesi", state.countries.join(","));
  url.searchParams.set("dal", String(state.start));
  url.searchParams.set("al", String(state.end));
  url.searchParams.set("scala", state.scale);
  url.hash = "world-history-title";
  return url.pathname + url.search + url.hash;
}

export async function copyHistoryChartUrl(
  navigatorLike: ShareNavigator,
  url: string,
): Promise<HistoryChartShareResult> {
  if (!navigatorLike.clipboard?.writeText) return "unavailable";
  try {
    await navigatorLike.clipboard.writeText(url);
    return "copied";
  } catch {
    return "unavailable";
  }
}

export async function shareHistoryChart(
  navigatorLike: ShareNavigator,
  payload: SharePayload,
): Promise<HistoryChartShareResult> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share(payload);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  return copyHistoryChartUrl(navigatorLike, payload.url);
}

function xml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function chunks(value: string, length = 128): string[] {
  const result: string[] = [];
  let rest = value;
  while (rest.length > length) {
    let boundary = rest.lastIndexOf(" ", length);
    if (boundary < Math.floor(length / 2)) boundary = length;
    result.push(rest.slice(0, boundary));
    rest = rest.slice(boundary).trimStart();
  }
  if (rest) result.push(rest);
  return result.length ? result : [""];
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mld`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
  if (absolute >= 10_000) return `${(value / 1_000).toFixed(1)} mila`;
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.[0-9])0$/, "$1");
}

export function historyChartImageSvg(image: HistoryChartImage): string {
  const width = 1600;
  const height = 1000;
  const left = 120;
  const right = 1510;
  const top = 190;
  const bottom = 670;
  const values = image.series.flatMap(({ points }) => points.map(([, value]) => value));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values) * 1.08;
  const span = Math.max(1, maximum - minimum);
  const x = (year: number) =>
    left + ((year - image.start) / Math.max(1, image.end - image.start)) * (right - left);
  const y = (value: number) => bottom - ((value - minimum) / span) * (bottom - top);
  const path = (points: readonly (readonly [number, number])[]) =>
    points
      .map(
        ([year, value], index) =>
          `${!index || year !== points[index - 1][0] + 1 ? "M" : "L"}${x(year).toFixed(2)},${y(value).toFixed(2)}`,
      )
      .join(" ");
  const grid = [0, 1, 2, 3]
    .map((step) => {
      const value = minimum + (span * step) / 3;
      const vertical = y(value);
      return `<line x1="${left}" x2="${right}" y1="${vertical}" y2="${vertical}" stroke="#6b625d" opacity=".24"/><text x="${left - 16}" y="${vertical + 6}" text-anchor="end" class="axis">${xml(compactNumber(value))}</text>`;
    })
    .join("");
  const years = [image.start, Math.round((image.start + image.end) / 2), image.end]
    .map(
      (year) =>
        `<text x="${x(year)}" y="${bottom + 42}" text-anchor="middle" class="axis">${year}</text>`,
    )
    .join("");
  const lines = image.series
    .map(
      ({ color, points }) =>
        `<path d="${path(points)}" fill="none" stroke="${xml(color)}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  const legend = image.series
    .map(
      ({ label, color }, index) =>
        `<g transform="translate(${120 + (index % 2) * 720} ${735 + Math.floor(index / 2) * 34})"><line x1="0" x2="34" y1="-6" y2="-6" stroke="${xml(color)}" stroke-width="7"/><text x="48" y="0" class="legend">${xml(label)}</text></g>`,
    )
    .join("");
  const metadata = [
    `Unità: ${image.unit} · Periodo: ${image.start}–${image.end}`,
    `Fonte: ${image.provider} · ${image.sourceUrl}`,
    `Confronto e dati: ${image.pageUrl}`,
  ].flatMap((line) => chunks(line));
  const metadataText = metadata
    .map(
      (line, index) =>
        `<text x="120" y="${840 + index * 25}" class="meta">${xml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f7f2ea"/>
  <text x="120" y="68" class="brand">PolisRossa · Dati e grafici</text>
  <text x="120" y="120" class="title">${xml(image.title)}</text>
  <text x="120" y="158" class="subtitle">${xml(image.unit)} · ${image.start}–${image.end}</text>
  ${grid}${years}${lines}${legend}${metadataText}
  <style>
    text{font-family:Arial,Helvetica,sans-serif;fill:#211d1a}.brand{font-size:22px;font-weight:700;fill:#a62626}.title{font-size:34px;font-weight:700}.subtitle{font-size:20px}.axis{font-size:17px}.legend{font-size:21px;font-weight:700}.meta{font-size:17px}
  </style>
</svg>`;
}
