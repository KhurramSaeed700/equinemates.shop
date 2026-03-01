import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "exchange-rates.json");
const LIVE_ENDPOINT = "https://api.exchangerate.host/live";
const SOURCE_CURRENCY = "USD";

interface ExchangeRateHostResponse {
  success?: boolean;
  source?: string;
  timestamp?: number;
  quotes?: Record<string, number>;
  error?: {
    code?: number;
    type?: string;
    info?: string;
  };
}

export interface CurrencyRatesSnapshot {
  base: "PKR";
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
  expiresAt: string;
  stale: boolean;
  source: "live" | "cache";
  provider: "exchangerate.host";
}

interface CachedRateRecord {
  base: "PKR";
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
  expiresAt: string;
  provider: "exchangerate.host";
}

let memoryCache: CachedRateRecord | null = null;
let envFileKeyCache: string | null = null;

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseEnvFileValue(key: string, fileContent: string): string | null {
  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index <= 0) {
      continue;
    }

    const currentKey = trimmed.slice(0, index).trim();
    if (currentKey !== key) {
      continue;
    }

    const rawValue = trimmed.slice(index + 1).trim();
    const unquoted = rawValue.replace(/^["']|["']$/g, "");
    return unquoted || null;
  }

  return null;
}

async function getApiKeyFromEnvLocal(): Promise<string | null> {
  if (envFileKeyCache) {
    return envFileKeyCache;
  }

  try {
    const envFileContent = await readFile(path.join(process.cwd(), "env.local"), "utf8");
    const parsed = parseEnvFileValue("EXCHANGE_RATE_API_KEY", envFileContent);
    if (parsed) {
      envFileKeyCache = parsed;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function getExchangeRateApiKey(): Promise<string> {
  const fromProcessEnv = process.env.EXCHANGE_RATE_API_KEY?.trim();
  if (fromProcessEnv) {
    return fromProcessEnv;
  }

  const fromEnvLocal = await getApiKeyFromEnvLocal();
  if (fromEnvLocal) {
    return fromEnvLocal;
  }

  throw new Error(
    "EXCHANGE_RATE_API_KEY is missing. Set it in process env or env.local.",
  );
}

function isFresh(cache: CachedRateRecord): boolean {
  const expiresAtMs = Date.parse(cache.expiresAt);
  return Number.isFinite(expiresAtMs) && Date.now() < expiresAtMs;
}

async function readCacheFile(): Promise<CachedRateRecord | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as CachedRateRecord;

    if (
      parsed?.base !== "PKR" ||
      !parsed.rates ||
      !SUPPORTED_CURRENCIES.every((code) => isFinitePositive(parsed.rates[code])) ||
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeCacheFile(cache: CachedRateRecord) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache), "utf8");
  } catch (error) {
    console.error("Failed to persist exchange-rate cache:", error);
  }
}

function toSnapshot(cache: CachedRateRecord, stale: boolean, source: "live" | "cache") {
  return {
    base: cache.base,
    rates: cache.rates,
    updatedAt: cache.updatedAt,
    expiresAt: cache.expiresAt,
    stale,
    source,
    provider: cache.provider,
  } satisfies CurrencyRatesSnapshot;
}

async function fetchLiveRates(): Promise<CachedRateRecord> {
  const accessKey = await getExchangeRateApiKey();
  const currencies = Array.from(new Set(["PKR", ...SUPPORTED_CURRENCIES])).join(",");
  const url = new URL(LIVE_ENDPOINT);
  url.searchParams.set("access_key", accessKey);
  url.searchParams.set("source", SOURCE_CURRENCY);
  url.searchParams.set("currencies", currencies);
  url.searchParams.set("format", "1");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Exchange API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ExchangeRateHostResponse;
  if (!payload.success) {
    const info = payload.error?.info ?? payload.error?.type ?? "unknown API error";
    throw new Error(`Exchange API rejected request: ${info}`);
  }

  const usdToPkr = payload.quotes?.USDPKR;
  const usdToUsd = payload.quotes?.USDUSD ?? 1;
  const usdToEur = payload.quotes?.USDEUR;

  if (!isFinitePositive(usdToPkr) || !isFinitePositive(usdToUsd) || !isFinitePositive(usdToEur)) {
    throw new Error("Exchange API response is missing required USD quotes.");
  }

  const ratesFromPkr: Record<CurrencyCode, number> = {
    PKR: 1,
    USD: usdToUsd / usdToPkr,
    EUR: usdToEur / usdToPkr,
  };

  const updatedAt = new Date().toISOString();
  return {
    base: "PKR",
    rates: ratesFromPkr,
    updatedAt,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    provider: "exchangerate.host",
  };
}

export async function getCurrencyRates(): Promise<CurrencyRatesSnapshot> {
  if (memoryCache && isFresh(memoryCache)) {
    return toSnapshot(memoryCache, false, "cache");
  }

  if (!memoryCache) {
    memoryCache = await readCacheFile();
    if (memoryCache && isFresh(memoryCache)) {
      return toSnapshot(memoryCache, false, "cache");
    }
  }

  try {
    const liveRates = await fetchLiveRates();
    memoryCache = liveRates;
    await writeCacheFile(liveRates);
    return toSnapshot(liveRates, false, "live");
  } catch (error) {
    console.error("Live exchange-rate fetch failed:", error);

    if (memoryCache) {
      return toSnapshot(memoryCache, true, "cache");
    }

    const fileCache = await readCacheFile();
    if (fileCache) {
      memoryCache = fileCache;
      return toSnapshot(fileCache, true, "cache");
    }

    throw new Error("Unable to load exchange rates from API or cache.");
  }
}
