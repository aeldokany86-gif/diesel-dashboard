"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [24.7136, 46.6753];
const DEFAULT_ZOOM = 6;

const markerIcon = L.divIcon({
  className: "fuel-operation-marker",
  html: `
    <span style="
      display:block;
      width:18px;
      height:18px;
      border-radius:9999px;
      background:#facc15;
      border:3px solid #0f172a;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    "></span>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

function MapViewport({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude])
    );

    if (points.length === 1) {
      map.setView(bounds.getCenter(), 16);
      return;
    }

    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 16,
    });
  }, [map, points]);

  return null;
}

function formatOperationTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMapDate(value) {
  if (!value) return "";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function FuelOperationsMap({
  points = [],
  mapDate = null,
  mode = "LATEST_BY_FUELER",
  onModeChange,
  loading = false,
}) {
  const validPoints = useMemo(
    () =>
      (Array.isArray(points) ? points : []).filter((point) => {
        const latitude = Number(point?.latitude);
        const longitude = Number(point?.longitude);

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        );
      }),
    [points]
  );

  const normalizedPoints = useMemo(
    () =>
      validPoints.map((point) => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      })),
    [validPoints]
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-700/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Fuel Operations Map
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {mapDate
              ? `Operation locations for ${formatMapDate(mapDate)}`
              : "Fuel operation locations"}
          </p>
        </div>

        <div className="inline-flex w-fit rounded-xl border border-slate-700 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => onModeChange?.("LATEST_BY_FUELER")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              mode === "LATEST_BY_FUELER"
                ? "bg-amber-400 text-slate-950"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Latest by Fueler
          </button>

          <button
            type="button"
            onClick={() => onModeChange?.("ALL_OPERATIONS")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              mode === "ALL_OPERATIONS"
                ? "bg-amber-400 text-slate-950"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Today&apos;s Operations
          </button>
        </div>
      </div>

      <div className="relative h-[420px] w-full bg-slate-950">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewport points={normalizedPoints} />

          {normalizedPoints.map((point, index) => (
            <Marker
              key={`${point.operationNo || "operation"}-${point.occurredAt || index}-${index}`}
              position={[point.latitude, point.longitude]}
              icon={markerIcon}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 180,
                    color: "#0f172a",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 8,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {point.operationNo || "—"}
                  </div>

                  <div style={{ display: "grid", gap: 5, fontSize: 12 }}>
                    <div>
                      <strong>Time:</strong> {formatOperationTime(point.occurredAt)}
                    </div>
                    <div>
                      <strong>Fueler:</strong> {point.fuelerName || "—"}
                    </div>
                    <div>
                      <strong>Asset:</strong> {point.assetIdentifier || "—"}
                    </div>
                    <div>
                      <strong>Station:</strong>{" "}
                      {point.stationIdentifier || "External Station"}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading ? (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
            <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-sm font-medium text-slate-200 shadow-xl">
              Loading operation locations...
            </div>
          </div>
        ) : null}

        {!loading && normalizedPoints.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center">
            <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-5 py-4 text-center shadow-xl">
              <div className="text-sm font-semibold text-slate-200">
                No operation locations
              </div>
              <div className="mt-1 text-xs text-slate-400">
                No GPS-enabled fuel operations were found for this map date.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
