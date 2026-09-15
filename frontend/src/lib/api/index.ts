/** API client — berbicara ke FastAPI (dipakai utk Docker/browser). Ada SWR-cache kecil untuk role-switch balik. */
import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { PUBLIC_API_BASE_URL } from "$env/static/public";

/** Default 127.0.0.1 buat lokal dev; Docker/browser override ini ke localhost:8000 (exposed) via env build. */
export const API_BASE = PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const cache = new Map<string, { t: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const TTL = 60_000;

async function get<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < TTL) return hit.data as T;
  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;
  const req = fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
      const data = await res.json();
      cache.set(path, { t: Date.now(), data });
      inflight.delete(path);
      return data as T;
    })
    .catch((e) => {
      inflight.delete(path);
      throw e;
    });
  inflight.set(path, req as Promise<unknown>);
  return req;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Hub {
  name: string;
  region: string;
  capacityM: number;
  utilizationPct: number;
  outlets: number;
  code: string;
}
export interface FinRow {
  year: number;
  fulfilmentT: number;
  shippingT: number;
  netSalesT: number;
}
export interface DemandRow {
  month: string;
  totalM: number;
  ecommerceM: number;
}
export interface NetworkRow {
  item: string;
  v2020: number;
  v2023: number;
  value2020?: number;
  value2023?: number;
}
export interface KpiRow {
  kpi: string;
  baseline: string;
  target: string;
}
export interface RootCause {
  code: string;
  title: string;
  titleId: string;
  symptoms: string;
  solution: string;
  kpiBaseline: string;
  kpiTarget: string;
}

export interface InsightEntry {
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
}
export interface Insights {
  greeting: string;
  insights: InsightEntry[];
}

export interface ChatQa {
  role: string;
  question: string;
  answer: string;
  followups: string[];
}
export interface ChatResp {
  role: string;
  content: string;
  mode: string;
  suggestions: string[];
  quotaStatus: string;
}

export interface SidQuery {
  page: string;
  question: string;
  followups: string[];
  order: number;
}

export interface CodFactor {
  key: string;
  label: string;
  value: number;
  coef: number;
  contribution: number;
  direction: string;
}

export interface CodRiskPkg extends CodRiskResult {
  id: string;
  hub_util: number;
  value: number;
  hour: number;
  ambiguous: number;
  zone: number;
}

/** Hasil `score_package` untuk satu paket (tanpa id preset). */
export interface CodRiskResult {
  score: number;
  decision: string;
  cluster?: string;
  clusterLabel?: string;
  clusterAction?: string;
  pickupWaitMin?: number;
  factors?: CodFactor[];
  intercept?: number;
  logit?: number;
  model?: string;
  accuracy?: number | null;
  thresholds?: Record<string, number>;
}

export interface AddressCandidate {
  city: string;
  district: string;
  coordinate: string;
  score: number;
}
export interface AddressParseResult {
  query: string;
  candidates: AddressCandidate[];
  best: AddressCandidate | null;
  distanceKm: number | null;
  etaMin: number | null;
}

export interface TwinResult {
  totalCapexSavingT: number;
  eastUtilisationGain: number;
  onTimeImpactPct: number;
  regionalSponsorPct: number;
  directOpVolFreedM: number;
}
export interface CodImpact {
  currentTime: number;
  newTime: number;
  timeSaved: number;
  currentPerHour: number;
  newPerHour: number;
  capacityGainPct: number;
  packagesFreed: number;
}

export interface ForecastPoint {
  month: string;
  label: string;
  totalM: number;
  events: string[];
}
export interface ForecastResult {
  model: string;
  note: string;
  dataPoints: number;
  projection: ForecastPoint[];
  peak: { month: string; label: string; totalM: number };
  trough: { month: string; label: string; totalM: number };
  fluctuationPct: number;
  backtest?: { mapePct: number; method: string };
}
export interface DemandActualResult {
  year: number;
  rows: Array<DemandRow & { events: string[] }>;
}
export interface AddressDemoResult {
  street: string;
  locations: Array<{ city: string; district: string; coordinate: string }>;
}

/* ── Network Optimization Engine ─────────────────────────────────────────── */
export interface OptimizerMove {
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  quantityM: number;
  costIndex: number;
  sameRegion: boolean;
}
export interface OptimizerHubRow {
  name: string;
  code: string;
  region: string;
  beforePct: number;
  afterPct: number;
  deltaPct: number;
  movedInM: number;
  movedOutM: number;
}
export interface OptimizeResult {
  engine: string;
  note: string;
  thresholds: { critical: number; safeFloor: number; maxDivertFrac: number };
  summary: {
    totalMovedM: number;
    moves: number;
    overloadedBefore: number;
    overloadedAfter: number;
    eastAvgUtilBefore: number;
    eastAvgUtilAfter: number;
    unmetM: number;
  };
  moves: OptimizerMove[];
  hubs: OptimizerHubRow[];
}

/* ── COD Decision Intelligence ───────────────────────────────────────────── */
export interface CodIntelResult {
  engine: string;
  note: string;
  caseFigures: {
    nonCod: { packages: number; distanceKm: number; durationMin: number };
    cod: { packages: number; distanceKm: number; durationMin: number };
  };
  input: {
    codSharePct: number;
    interventions: string[];
    interventionCutPct: number;
    packagesPerShift: number;
  };
  split: { codPackages: number; nonCodPackages: number };
  baseline: { shiftDurationMin: number; waitPerCodPkgMin: number };
  optimized: { shiftDurationMin: number; waitPerCodPkgMin: number };
  impact: {
    minutesSavedPerShift: number;
    extraPackagesPerShift: number;
    extraCapacityPct: number;
    savedIdrPerShift: number;
    savedCo2GramPerShift: number;
    hoursSavedPer100Couriers: number;
  };
  interventionCatalog: Array<{ key: string; label: string; cutPct: number }>;
}

/* ── Metrik turunan & rekonsiliasi ───────────────────────────────────────── */
export interface RegionSummary {
  region: string;
  hubs: number;
  capacityM: number;
  avgUtilizationPct: number;
  outlets: number;
  usedVolumeM: number;
  sponsorCandidate: boolean;
}
export interface FinancialSummary {
  rows: Array<{
    year: number;
    fulfilmentT: number;
    shippingT: number;
    totalCostT: number;
    netSalesT: number;
    costToSalesPct: number;
  }>;
  growth: {
    fulfilmentPct: number;
    shippingPct: number;
    netSalesPct: number;
    costGrewFasterThanSales: boolean;
  };
}
export interface DemandSummary {
  months: number;
  totalM: number;
  ecommerceM: number;
  ecommerceSharePct: number;
  peak: { month: string; totalM: number };
  trough: { month: string; totalM: number };
  fluctuationPct: number;
  tiktokEcommerceShockPct: number | null;
  reconciliation: {
    totalM: { computed: number; document: number; delta: number };
    ecommerceM: { computed: number; document: number; delta: number };
    note: string;
  };
}
export interface FleetSummary {
  motorcycles: number;
  vans: number;
  trucks: number;
  lineHaul: number;
  totalArmada: number;
  evTarget: number;
  evSharePct: number;
  lastMileMotorPct: number;
}
export interface AuditCheck {
  id: string;
  label: string;
  ok: boolean;
  value: unknown;
  note?: string;
}
export interface AuditResult {
  regionSummary: RegionSummary[];
  financial: FinancialSummary;
  demand: DemandSummary;
  fleet: FleetSummary;
  checks: AuditCheck[];
}

export const api = {
  hubs: () => get<Hub[]>("/api/hubs"),
  regions: () => get<string[]>("/api/regions"),
  demand: () => get<DemandRow[]>("/api/demand"),
  financial: () => get<FinRow[]>("/api/financial"),
  network: () => get<NetworkRow[]>("/api/network"),
  addresses: () => get<{ street: string; city: string; district: string; coordinate: string }[]>("/api/addresses"),
  routes: () => get<{ type: string; packages: number; distanceKm: number; durationMin: number; productivity: number }[]>("/api/routes"),
  courierQuotes: () => get<{ city: string; quote: string }[]>("/api/courier-quotes"),
  fleet: () => get<Record<string, number>>("/api/fleet"),
  kpiTargets: () => get<KpiRow[]>("/api/kpi-targets"),
  rootCauses: () => get<RootCause[]>("/api/root-causes"),
  insights: (role: string) => get<Insights>(`/api/insights?role=${encodeURIComponent(role)}`),
  suggested: (page: string) => get<SidQuery[]>(`/api/suggested?page=${encodeURIComponent(page)}`),
  chat: (role: string, query: string) => post<ChatResp>("/api/chat", { role, query }),
  forecast: () => get<ForecastResult>("/ml/forecast"),
  demandActual: () => get<DemandActualResult>("/ml/demand-actual"),
  codRiskDemo: () => get<{ packages: CodRiskPkg[]; sim: CodImpact }>("/ml/cod-risk/demo"),
  codRisk: (pkg: { hub_util?: number; value?: number; hour?: number; ambiguous?: number; zone?: number }) =>
    post<CodRiskResult>("/ml/cod-risk", pkg),
  addressDemo: () => get<AddressDemoResult>("/ml/address-demo"),
  addressParse: (address: string) => post<AddressParseResult>("/ml/address-parse", { address }),
  digitalTwin: () => get<Record<string, TwinResult>>("/ml/sim/digital-twin"),
  codImpact: () => get<{ prob: number; result: CodImpact }>("/ml/sim/cod-impact"),
  optimizeLoadBalance: () => get<OptimizeResult>("/ml/optimize/load-balance"),
  codIntel: (body: { cod_share_pct?: number; interventions?: string[]; packages_per_shift?: number }) =>
    post<CodIntelResult>("/ml/cod-intel", body),
  codIntelScenarios: () => get<Record<string, CodIntelResult>>("/ml/cod-intel/scenarios"),
  metricRegions: () => get<RegionSummary[]>("/ml/metrics/regions"),
  metricFinancial: () => get<FinancialSummary>("/ml/metrics/financial"),
  metricDemand: () => get<DemandSummary>("/ml/metrics/demand"),
  metricFleet: () => get<FleetSummary>("/ml/metrics/fleet"),
  metricAudit: () => get<AuditResult>("/ml/metrics/audit")
};

export const online = writable(false);

let probing: Promise<void> | null = null;
/** Ping backend sekali per sesi-tab; update store `online` utk presence dot. */
export async function probeBackend(): Promise<void> {
  if (!browser) return;
  if (probing) return probing;
  probing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(1500) });
      online.set(res.ok);
    } catch {
      online.set(false);
    }
  })();
  return probing;
}