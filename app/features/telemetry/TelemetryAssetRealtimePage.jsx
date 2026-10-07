"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLatestTelemetry } from "../../services/telemetryService";

const AUTO_REFRESH_MS = 15000;
const OFFLINE_TIMEOUT_MS = 10 * 60 * 1000;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const connectionStatus = (lastSeenAt) => {
  if (!lastSeenAt) return "NEVER CONNECTED";
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return "UNKNOWN";
  return Date.now() - seen <= OFFLINE_TIMEOUT_MS ? "ONLINE" : "OFFLINE";
};

const errorText = (error, fallback) => {
  const message = error?.response?.data?.message || error?.message || fallback;
  return Array.isArray(message) ? message.join(", ") : String(message);
};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const valueFrom = (parameters, aliases) => {
  for (const alias of aliases) {
    const row = parameters?.[alias];
    if (row && row.value !== undefined && row.value !== null) {
      return { code: alias, ...row };
    }
  }
  return null;
};

const numberValue = (row) => {
  if (!row) return null;
  const value = Number(row.numericValue ?? row.value);
  return Number.isFinite(value) ? value : null;
};

const formatNumber = (value, digits = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const gnssCoordinates = (row) => {
  const value = row?.value;
  if (!value || typeof value !== "object") return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng ?? value.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const googleMapsUrl = (coordinates) =>
  coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : null;

function MetricCard({ label, value, unit, note, tone = "default" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/70"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50/70"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <div className="text-3xl font-bold tracking-tight text-slate-950">{value}</div>
        {unit ? <div className="pb-1 text-sm font-semibold text-slate-500">{unit}</div> : null}
      </div>
      {note ? <div className="mt-2 truncate text-xs text-slate-500">{note}</div> : null}
    </div>
  );
}

export default function TelemetryAssetRealtimePage({ device, onBack }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(
    async (quiet = false) => {
      if (!device?.id) return;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        setLatest(await fetchLatestTelemetry(device.id));
      } catch (e) {
        setError(errorText(e, "Failed to load real-time telemetry."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [device?.id],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh || !device?.id) return undefined;
    const timer = window.setInterval(() => void load(true), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, device?.id, load]);

  const parameters = latest?.parameters || {};

  const speed = valueFrom(parameters, ["WHEEL_SPEED", "VEHICLE_SPEED", "GNSS_SPEED"]);
  const rpm = valueFrom(parameters, ["ENGINE_RPM"]);
  const temp = valueFrom(parameters, ["ENGINE_TEMPERATURE", "ENGINE_COOLANT_TEMPERATURE", "ENGINE_TEMP"]);
  const loadPct = valueFrom(parameters, ["ENGINE_LOAD"]);
  const hours = valueFrom(parameters, ["ENGINE_HOURS", "TOTAL_ENGINE_HOURS"]);
  const distance = valueFrom(parameters, ["TOTAL_DISTANCE", "ODOMETER", "GNSS_DISTANCE"]);
  const fuel = valueFrom(parameters, ["FUEL_LEVEL_PERCENT", "FUEL_LEVEL_GENERIC", "FUEL_LEVEL"]);
  const fuelRate = valueFrom(parameters, ["FUEL_RATE"]);
  const ignition = valueFrom(parameters, ["IGNITION", "ENGINE_WORKING", "CAN_ACTIVITY_PRESENT"]);
  const gnss = valueFrom(parameters, ["GNSS_POSITION", "GNSS", "POSITION"]);
  const coords = gnssCoordinates(gnss);

  const connection = connectionStatus(latest?.device?.lastSeenAt || device?.lastSeenAt);
  const speedValue = numberValue(speed);
  const rpmValue = numberValue(rpm);
  const tempValue = numberValue(temp);
  const loadValue = numberValue(loadPct);
  const hoursValue = numberValue(hours);
  const distanceValue = numberValue(distance);
  const fuelValue = numberValue(fuel);
  const fuelRateValue = numberValue(fuelRate);

  const engineOn = useMemo(() => {
    const ignitionValue = ignition?.value;
    if (typeof ignitionValue === "boolean") return ignitionValue;
    if (typeof ignitionValue === "number") return ignitionValue > 0;
    if (typeof ignitionValue === "string") {
      const normalized = ignitionValue.trim().toUpperCase();
      if (["TRUE", "ON", "RUNNING", "1"].includes(normalized)) return true;
      if (["FALSE", "OFF", "STOPPED", "0"].includes(normalized)) return false;
    }
    if (rpmValue !== null) return rpmValue > 0;
    return null;
  }, [ignition?.value, rpmValue]);

  const allReadings = useMemo(
    () =>
      Object.entries(parameters)
        .map(([parameterCode, item]) => ({ parameterCode, ...(item || {}) }))
        .sort((a, b) => normalizeCode(a.parameterCode).localeCompare(normalizeCode(b.parameterCode))),
    [parameters],
  );

  const latestReadingAt = latest?.latestReadingAt;
  const latestReceivedAt = latest?.latestReceivedAt;
  const asset = latest?.asset || device?.asset || {};

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              <span aria-hidden="true">←</span>
              Back to Telemetry
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-slate-950">
                  Asset {asset?.assetId || device?.asset?.assetId || "—"}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    connection === "ONLINE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {connection}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {[asset?.type, asset?.category].filter(Boolean).join(" · ") || "Telemetry asset"}
                {device?.vendor || device?.model
                  ? ` · ${[device.vendor, device.model].filter(Boolean).join(" ")}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-orange-500"
              />
              Auto refresh · 15s
            </label>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
              Real-time overview
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <div className="text-sm text-slate-400">Engine</div>
                <div className={`mt-1 text-3xl font-bold ${engineOn === true ? "text-emerald-400" : engineOn === false ? "text-slate-300" : "text-amber-300"}`}>
                  {engineOn === true ? "RUNNING" : engineOn === false ? "OFF" : "UNKNOWN"}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Current speed</div>
                <div className="mt-1 text-3xl font-bold">
                  {formatNumber(speedValue, 1)} <span className="text-base font-semibold text-slate-400">{speed?.unit || "km/h"}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Last data</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {formatDateTime(latestReadingAt || latestReceivedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Device</div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-slate-400">Hardware ID</div><div className="text-right font-semibold">{device?.hardwareId || "—"}</div>
              <div className="text-slate-400">Protocol</div><div className="text-right font-semibold">{device?.protocol || "—"}</div>
              <div className="text-slate-400">Transport</div><div className="text-right font-semibold">{device?.transport || "—"}</div>
              <div className="text-slate-400">Last seen</div><div className="text-right font-semibold">{formatDateTime(latest?.device?.lastSeenAt || device?.lastSeenAt)}</div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          Loading real-time telemetry...
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-950">Live operating data</h2>
              <p className="text-sm text-slate-500">Latest stored values from the active sensors on this asset.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Engine RPM" value={formatNumber(rpmValue, 0)} unit={rpm?.unit || "rpm"} note={rpm?.readingAt ? `Updated ${formatDateTime(rpm.readingAt)}` : ""} />
              <MetricCard label="Engine temperature" value={formatNumber(tempValue, 1)} unit={temp?.unit || "°C"} note={temp?.readingAt ? `Updated ${formatDateTime(temp.readingAt)}` : ""} tone={tempValue !== null && tempValue >= 100 ? "warn" : "default"} />
              <MetricCard label="Engine load" value={formatNumber(loadValue, 1)} unit={loadPct?.unit || "%"} note={loadPct?.readingAt ? `Updated ${formatDateTime(loadPct.readingAt)}` : ""} />
              <MetricCard label="Fuel rate" value={formatNumber(fuelRateValue, 2)} unit={fuelRate?.unit || "L/h"} note={fuelRate?.readingAt ? `Updated ${formatDateTime(fuelRate.readingAt)}` : ""} />
              <MetricCard label="Engine hours" value={formatNumber(hoursValue, 1)} unit={hours?.unit || "h"} note={hours?.readingAt ? `Updated ${formatDateTime(hours.readingAt)}` : ""} />
              <MetricCard label="Total distance" value={formatNumber(distanceValue, 1)} unit={distance?.unit || "km"} note={distance?.readingAt ? `Updated ${formatDateTime(distance.readingAt)}` : ""} />
              <MetricCard label="Fuel level" value={formatNumber(fuelValue, 1)} unit={fuel?.unit || "%"} note={fuel ? "Available sensor reading" : "Not configured"} />
              <MetricCard label="Active sensors" value={latest?.parameterCount ?? allReadings.length} note="Stored telemetry parameters" tone="good" />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Current location</h2>
                  <p className="mt-1 text-sm text-slate-500">Latest GNSS position received from the telemetry device.</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${coords ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  {coords ? "AVAILABLE" : "NO POSITION"}
                </span>
              </div>

              {coords ? (
                <div className="mt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">Latitude</div>
                      <div className="mt-1 font-mono text-sm font-bold text-slate-900">{coords.latitude}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">Longitude</div>
                      <div className="mt-1 font-mono text-sm font-bold text-slate-900">{coords.longitude}</div>
                    </div>
                  </div>
                  <a
                    href={googleMapsUrl(coords)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    Open current location in Google Maps
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No GNSS position is currently available for this asset.
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Telemetry detail</h2>
                  <p className="text-sm text-slate-500">Complete latest reading set for active sensors.</p>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Received {formatDateTime(latestReceivedAt)}
                </div>
              </div>

              <div className="max-h-[520px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Sensor ID</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Reading at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReadings.length ? (
                      allReadings.map((row) => {
                        const position = gnssCoordinates(row);
                        return (
                          <tr key={row.parameterCode} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{row.parameterCode}</div>
                              <div className="text-xs text-slate-500">{row.dataSource || "—"}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.vendorSensorId || "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                              {position ? (
                                <a href={googleMapsUrl(position)} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-orange-600 hover:underline">
                                  Open in Google Maps
                                </a>
                              ) : row.value == null ? (
                                "—"
                              ) : typeof row.value === "object" ? (
                                JSON.stringify(row.value)
                              ) : (
                                String(row.value)
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.unit || "—"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDateTime(row.readingAt)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          No telemetry readings available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
