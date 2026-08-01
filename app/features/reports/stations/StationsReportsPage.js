"use client";

import { useMemo, useState } from "react";
import ReportToolbar from "../components/ReportToolbar";
import { printReport } from "../utils/printReport";
import { exportReportToExcel } from "../utils/exportReportToExcel";
import {
  fetchStationCounterMeterHistory,
  fetchStationTransferReport,
  fetchStations,
} from "../../../services/stationsService";

const COUNTER_HISTORY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  projectId: "all",
  stationId: "all",
  eventType: "ALL",
};

const COUNTER_HISTORY_HEADERS = [
  "Date",
  "Event Type",
  "Reference",
  "Station",
  "Project",
  "Operation Type",
  "Counter Before",
  "Counter After",
  "Lifetime Counter",
  "Cycle",
  "Performed By",
  "Notes",
];

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatLabel(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReportDate(value) {
  if (!value) return "All dates";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function formatNumber(value, maximumFractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
}

function getUserDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email ||
    "Current User"
  );
}

function getProjectBackendId(project) {
  return (
    project?.backendId ||
    project?.projectBackendId ||
    project?.databaseId ||
    project?.id ||
    ""
  );
}

function getProjectLabel(project) {
  return (
    project?.name ||
    project?.projectName ||
    project?.code ||
    project?.projectCode ||
    project?.id ||
    "-"
  );
}

function getStationBackendId(station) {
  return (
    station?.backendId ||
    station?.stationBackendId ||
    station?.databaseId ||
    station?.id ||
    ""
  );
}

function getStationLabel(station) {
  const stationCode = station?.stationId || station?.code || station?.id || "-";
  const stationName = station?.name || station?.stationName || "";

  return stationName && stationName !== stationCode
    ? `${stationCode} - ${stationName}`
    : stationCode;
}

function getStationProjectId(station) {
  return (
    station?.projectId ||
    station?.projectBackendId ||
    station?.project?.id ||
    (typeof station?.project === "string" ? station.project : "") ||
    ""
  );
}

function getPerformedByName(performedBy) {
  if (!performedBy) return "-";
  if (typeof performedBy === "string") return performedBy;

  return (
    performedBy?.fullName ||
    performedBy?.name ||
    performedBy?.username ||
    performedBy?.email ||
    "-"
  );
}

function getEventCycle(event) {
  return event?.counterCycleAfter ?? event?.counterCycleBefore ?? "-";
}

function CounterHistoryDetailsModal({ row, onClose }) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close event details" onClick={onClose} className="absolute inset-0 h-full w-full" />

      <section className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Counter Event Details</p>
            <h2 className="mt-1 text-xl font-black text-white">{row.reference}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-400 transition hover:text-white">Close</button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Date", formatDateTime(row.eventDate)],
              ["Event Type", formatLabel(row.eventType)],
              ["Reference", row.reference],
              ["Station", row.station],
              ["Project", row.project],
              ["Operation Type", formatLabel(row.operationType)],
              ["Counter Before", formatNumber(row.counterBefore)],
              ["Counter After", formatNumber(row.counterAfter)],
              ["Lifetime Counter", formatNumber(row.lifetimeAfter)],
              ["Counter Cycle", String(row.cycle)],
              ["Performed By", row.performedBy],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-extrabold text-slate-200">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes / Correction Reason</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{row.notes || "No notes recorded."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StationCounterMeterHistoryReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  stations = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(COUNTER_HISTORY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(COUNTER_HISTORY_FILTERS);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const availableStations = useMemo(() => {
    if (draftFilters.projectId === "all") return stations;

    return stations.filter(
      (station) =>
        normalizeValue(getStationProjectId(station)) ===
        normalizeValue(draftFilters.projectId)
    );
  }, [stations, draftFilters.projectId]);

  const rows = useMemo(
    () =>
      (events || []).map((event, index) => {
        const station = event?.station || {};
        const project = station?.project || event?.project || {};

        return {
          ...event,
          key: event?.eventId || event?.id || `counter-event-${index}`,
          eventDate: event?.eventDate || event?.createdAt,
          reference: event?.referenceNo || event?.operationNo || event?.eventId || "-",
          station: getStationLabel(station),
          project: getProjectLabel(project),
          performedBy: getPerformedByName(event?.performedBy),
          cycle: getEventCycle(event),
          operationType: event?.operationType || "-",
          operationStatus: event?.operationStatus || (event?.eventType === "RESET" ? "COMPLETED" : "-"),
          hasIssue: Boolean(event?.hasIssue),
          diagnostics: Array.isArray(event?.diagnostics) ? event.diagnostics : [],
        };
      }),
    [events]
  );

  const totals = useMemo(
    () => ({
      events: rows.length,
      operations: rows.filter((row) => row.eventType === "OPERATION").length,
      corrections: rows.filter((row) => row.eventType === "CORRECTION").length,
      resets: rows.filter((row) => row.eventType === "RESET").length,
    }),
    [rows]
  );

  const filterSummary = useMemo(() => {
    const selectedProject = projects.find(
      (project) =>
        normalizeValue(getProjectBackendId(project)) ===
        normalizeValue(appliedFilters.projectId)
    );
    const selectedStation = stations.find(
      (station) =>
        normalizeValue(getStationBackendId(station)) ===
        normalizeValue(appliedFilters.stationId)
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(appliedFilters.dateTo)}`
            : "All dates",
      },
      {
        label: "Project",
        value:
          appliedFilters.projectId === "all"
            ? "All Projects"
            : getProjectLabel(selectedProject),
      },
      {
        label: "Station",
        value:
          appliedFilters.stationId === "all"
            ? "All Stations"
            : getStationLabel(selectedStation),
      },
      {
        label: "Event Type",
        value:
          appliedFilters.eventType === "ALL"
            ? "Operations, Corrections & Resets"
            : formatLabel(appliedFilters.eventType),
      },
    ];
  }, [appliedFilters, projects, stations]);

  const reportMeta = {
    title: selectedReport?.title || "Station Counter Meter History Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId =
        currentCompany?.backendId ||
        currentCompany?.companyBackendId ||
        currentCompany?.id ||
        currentUser?.companyId ||
        "";

      const result = await fetchStationCounterMeterHistory({
        companyId,
        projectId:
          draftFilters.projectId === "all" ? "" : draftFilters.projectId,
        stationId:
          draftFilters.stationId === "all" ? "" : draftFilters.stationId,
        dateFrom: draftFilters.dateFrom,
        dateTo: draftFilters.dateTo,
        eventType: draftFilters.eventType,
      });

      setAppliedFilters(draftFilters);
      setEvents(Array.isArray(result) ? result : []);
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load station counter meter history."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Events", value: totals.events },
        { label: "Operations", value: totals.operations },
        { label: "Corrections", value: totals.corrections },
        { label: "Counter Resets", value: totals.resets },
      ],
      columns: COUNTER_HISTORY_HEADERS,
      rows: rows.map((row) => [
        formatDateTime(row.eventDate),
        formatLabel(row.eventType),
        row.reference,
        row.station,
        row.project,
        formatLabel(row.operationType),
        formatNumber(row.counterBefore),
        formatNumber(row.counterAfter),
        formatNumber(row.lifetimeAfter),
        row.cycle,
        row.performedBy,
        row.notes || "-",
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Station_Counter_Meter_History_Report",
      sheetName: "Counter Meter History",
      ...reportMeta,
      rows: rows.map((row) => ({
        Date: formatDateTime(row.eventDate),
        "Event Type": formatLabel(row.eventType),
        Reference: row.reference,
        Station: row.station,
        Project: row.project,
        "Operation Type": formatLabel(row.operationType),
        "Counter Before": row.counterBefore,
        "Counter After": row.counterAfter,
        "Lifetime Counter": row.lifetimeAfter,
        Cycle: row.cycle,
        "Performed By": row.performedBy,
        Notes: row.notes || "",
      })),
      totals: {
        Date: "Totals",
        "Event Type": `${totals.events} events`,
        Reference: `${totals.operations} operations`,
        Station: `${totals.corrections} corrections`,
        Project: `${totals.resets} resets`,
      },
    });
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => {
      const next = { ...previous, [field]: value };

      if (field === "projectId") {
        next.stationId = "all";
      }

      return next;
    });
  };

  const handleReset = () => {
    setDraftFilters(COUNTER_HISTORY_FILTERS);
    setAppliedFilters(COUNTER_HISTORY_FILTERS);
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300">
                <span aria-hidden="true">←</span>
                Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Stations Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
            </div>

            <ReportToolbar
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              disabled={!reportGenerated || !rows.length}
            />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">{error}</section>
        ) : null}

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">⛽</div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select counter history filters first</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Choose the period, project, station and event type, then generate the chronological counter history.</p>
              <button type="button" onClick={() => setFiltersOpen(true)} className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">Set Report Filters</button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {filterSummary.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total Events", totals.events],
                ["Operations", totals.operations],
                ["Corrections", totals.corrections],
                ["Counter Resets", totals.resets],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">Station Counter Meter History</h2>
                  <p className="mt-1 text-xs text-slate-500">{rows.length} event{rows.length === 1 ? "" : "s"} found</p>
                </div>
                <p className="text-xs font-bold text-amber-300">Click any row to view event details and notes</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1650px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {COUNTER_HISTORY_HEADERS.map((header) => (
                        <th
                          key={header}
                          className={`whitespace-nowrap border-b border-slate-800 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 ${
                            header === "Stock At Transfer (L)"
                              ? "text-center"
                              : "text-left"
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr key={row.key} onClick={() => setSelectedRow(row)} className="cursor-pointer border-b border-slate-800/70 transition hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDateTime(row.eventDate)}</td>
                          <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${row.eventType === "RESET" ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : row.eventType === "CORRECTION" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-sky-500/30 bg-sky-500/10 text-sky-300"}`}>{formatLabel(row.eventType)}</span></td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-amber-300">{row.reference}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">{row.station}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.project}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatLabel(row.operationType)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-300">{formatNumber(row.counterBefore)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">{formatNumber(row.counterAfter)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-emerald-300">{formatNumber(row.lifetimeAfter)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-center font-extrabold text-violet-300">{row.cycle}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.performedBy}</td>
                          <td className="max-w-[320px] truncate px-3 py-3 text-slate-400">{row.notes || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={COUNTER_HISTORY_HEADERS.length} className="px-6 py-12 text-center text-slate-500">No counter history events match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p>
                  <h2 className="mt-1 text-xl font-black text-white">Counter History Filters</h2>
                </div>
                <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white">×</button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date From</span><input type="date" value={draftFilters.dateFrom} onChange={(event) => handleFilterChange("dateFrom", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date To</span><input type="date" value={draftFilters.dateTo} onChange={(event) => handleFilterChange("dateTo", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                </div>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Project</span><select value={draftFilters.projectId} onChange={(event) => handleFilterChange("projectId", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Projects</option>{projects.map((project) => <option key={getProjectBackendId(project) || getProjectLabel(project)} value={getProjectBackendId(project)}>{getProjectLabel(project)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Station</span><select value={draftFilters.stationId} onChange={(event) => handleFilterChange("stationId", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Stations</option>{availableStations.map((station) => <option key={getStationBackendId(station) || getStationLabel(station)} value={getStationBackendId(station)}>{getStationLabel(station)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Event Type</span><select value={draftFilters.eventType} onChange={(event) => handleFilterChange("eventType", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="ALL">Operations, Corrections & Resets</option><option value="OPERATION">Operations Only</option><option value="CORRECTION">Corrections Only</option><option value="RESET">Counter Resets Only</option></select></label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button type="button" onClick={handleReset} disabled={loading} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50">Reset</button>
                <button type="button" onClick={loadReport} disabled={loading} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}</button>
              </div>
            </aside>
          </div>
        ) : null}

        <CounterHistoryDetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      </div>
    </div>
  );
}



const STATION_MASTER_FILTERS = {
  projectId: "all",
  status: "all",
  type: "all",
  search: "",
};

const STATION_MASTER_HEADERS = [
  "Station ID",
  "Station Name",
  "Project",
  "Type",
  "Status",
  "Capacity (L)",
  "Current Stock (L)",
  "Current Counter",
  "Lifetime Counter",
  "Counter Cycle",
];

function getStationProjectLabel(station, projects = []) {
  if (station?.project && typeof station.project === "object") {
    return getProjectLabel(station.project);
  }

  const rawProject =
    station?.projectName ||
    station?.projectCode ||
    station?.projectId ||
    station?.projectBackendId ||
    "";

  if (!rawProject) return "Unassigned";

  const normalized = normalizeValue(rawProject);
  const matched = projects.find((project) =>
    [
      project?.id,
      project?.backendId,
      project?.projectBackendId,
      project?.name,
      project?.projectName,
      project?.code,
      project?.projectCode,
    ]
      .filter(Boolean)
      .map(normalizeValue)
      .includes(normalized)
  );

  return matched ? getProjectLabel(matched) : String(rawProject);
}

function getStationStatus(station) {
  if (station?.deletedAt) return "DELETED";
  return station?.status || station?.stationStatus || "ACTIVE";
}

function getStationNumber(station, aliases = []) {
  const sources = [
    station,
    station?.backendStation,
    station?.rawStation,
    station?.data,
    station?._raw,
  ].filter(Boolean);

  for (const source of sources) {
    for (const alias of aliases) {
      const value = Number(source?.[alias]);
      if (Number.isFinite(value)) return value;
    }
  }

  return 0;
}

function StationMasterReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState(STATION_MASTER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(STATION_MASTER_FILTERS);

  const rows = useMemo(
    () =>
      (stations || []).map((station, index) => ({
        key: getStationBackendId(station) || `station-${index}`,
        stationId: station?.stationId || station?.code || station?.id || "-",
        stationName: station?.name || station?.stationName || "-",
        projectId: getStationProjectId(station),
        project: getStationProjectLabel(station, projects),
        type: station?.type || station?.stationType || "-",
        status: getStationStatus(station),
        capacity: getStationNumber(station, ["capacity", "tankCapacity", "stationCapacity"]),
        currentStock: getStationNumber(station, ["currentStock", "currentBalance", "stockBalance", "balance"]),
        currentCounter: getStationNumber(station, ["currentCounter", "counter", "currentCounterValue"]),
        lifetimeCounter: getStationNumber(station, ["currentLifetimeCounter", "lifetimeCounter", "totalLifetimeCounter"]),
        counterCycle: getStationNumber(station, ["currentCounterCycle", "counterCycle", "meterCycle"]) || 1,
      })),
    [stations, projects]
  );

  const typeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.type).filter((value) => value && value !== "-"))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const search = normalizeValue(appliedFilters.search);

    return rows.filter((row) => {
      if (
        appliedFilters.projectId !== "all" &&
        normalizeValue(row.projectId) !== normalizeValue(appliedFilters.projectId)
      ) return false;

      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      ) return false;

      if (
        appliedFilters.type !== "all" &&
        normalizeValue(row.type) !== normalizeValue(appliedFilters.type)
      ) return false;

      if (
        search &&
        ![row.stationId, row.stationName, row.project, row.type, row.status]
          .some((value) => normalizeValue(value).includes(search))
      ) return false;

      return true;
    });
  }, [rows, appliedFilters]);

  const totals = useMemo(
    () => ({
      stations: filteredRows.length,
      active: filteredRows.filter((row) => normalizeValue(row.status) === "active").length,
      inactive: filteredRows.filter((row) => normalizeValue(row.status) === "inactive").length,
      deleted: filteredRows.filter((row) => normalizeValue(row.status) === "deleted").length,
      totalCapacity: filteredRows.reduce((sum, row) => sum + row.capacity, 0),
      currentStock: filteredRows.reduce((sum, row) => sum + row.currentStock, 0),
    }),
    [filteredRows]
  );

  const selectedProject = projects.find(
    (project) =>
      normalizeValue(getProjectBackendId(project)) ===
      normalizeValue(appliedFilters.projectId)
  );

  const filterSummary = [
    {
      label: "Project",
      value: appliedFilters.projectId === "all" ? "All Projects" : getProjectLabel(selectedProject),
    },
    {
      label: "Status",
      value: appliedFilters.status === "all" ? "All Statuses" : formatLabel(appliedFilters.status),
    },
    {
      label: "Station Type",
      value: appliedFilters.type === "all" ? "All Types" : appliedFilters.type,
    },
    {
      label: "Search",
      value: appliedFilters.search || "No search text",
    },
  ];

  const reportMeta = {
    title: selectedReport?.title || "Station Master Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Stations", value: totals.stations },
        { label: "Active Stations", value: totals.active },
        { label: "Inactive Stations", value: totals.inactive },
        { label: "Deleted Stations", value: totals.deleted },
        { label: "Total Capacity (L)", value: formatNumber(totals.totalCapacity) },
        { label: "Current Stock (L)", value: formatNumber(totals.currentStock) },
      ],
      columns: STATION_MASTER_HEADERS,
      rows: filteredRows.map((row) => [
        row.stationId,
        row.stationName,
        row.project,
        row.type,
        formatLabel(row.status),
        formatNumber(row.capacity),
        formatNumber(row.currentStock),
        formatNumber(row.currentCounter),
        formatNumber(row.lifetimeCounter),
        formatNumber(row.counterCycle, 0),
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Station_Master_Report",
      sheetName: "Station Master",
      ...reportMeta,
      rows: filteredRows.map((row) => ({
        "Station ID": row.stationId,
        "Station Name": row.stationName,
        Project: row.project,
        Type: row.type,
        Status: formatLabel(row.status),
        "Capacity (L)": row.capacity,
        "Current Stock (L)": row.currentStock,
        "Current Counter": row.currentCounter,
        "Lifetime Counter": row.lifetimeCounter,
        "Counter Cycle": row.counterCycle,
      })),
      totals: {
        "Station ID": "Totals",
        "Station Name": `${totals.stations} stations`,
        "Capacity (L)": totals.totalCapacity,
        "Current Stock (L)": totals.currentStock,
      },
    });
  };

  const applyFilters = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId =
        currentCompany?.backendId ||
        currentCompany?.companyBackendId ||
        currentCompany?.id ||
        currentUser?.companyId ||
        "";

      const result = await fetchStations({
        companyId,
        includeDeleted: true,
      });

      setStations(Array.isArray(result) ? result : []);
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load station master data."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setDraftFilters(STATION_MASTER_FILTERS);
    setAppliedFilters(STATION_MASTER_FILTERS);
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300">
                <span aria-hidden="true">←</span> Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Stations Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
            </div>
            <ReportToolbar
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              disabled={!reportGenerated || !filteredRows.length}
            />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </section>
        ) : null}

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">⛽</div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select station master filters first</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Choose the project, status, station type or search text, then generate the station register.</p>
              <button type="button" onClick={() => setFiltersOpen(true)} className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">Set Report Filters</button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {filterSummary.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ["Total Stations", totals.stations],
                ["Active Stations", totals.active],
                ["Inactive Stations", totals.inactive],
                ["Deleted Stations", totals.deleted],
                ["Total Capacity (L)", formatNumber(totals.totalCapacity)],
                ["Current Stock (L)", formatNumber(totals.currentStock)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">Station Master Data</h2>
                  <p className="mt-1 text-xs text-slate-500">{filteredRows.length} station{filteredRows.length === 1 ? "" : "s"} found</p>
                </div>
                <p className="text-xs font-bold text-amber-300">Current station data</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1450px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>{STATION_MASTER_HEADERS.map((header) => <th key={header} className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredRows.length ? filteredRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-800/70 transition hover:bg-slate-800/30">
                        <td className="whitespace-nowrap px-3 py-3 font-extrabold text-amber-300">{row.stationId}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-bold text-white">{row.stationName}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.project}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.type}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-300">{formatLabel(row.status)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-emerald-300">{formatNumber(row.capacity)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-sky-300">{formatNumber(row.currentStock)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">{formatNumber(row.currentCounter)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-amber-300">{formatNumber(row.lifetimeCounter)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-center font-extrabold text-violet-300">{formatNumber(row.counterCycle, 0)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={STATION_MASTER_HEADERS.length} className="px-6 py-12 text-center text-slate-500">No stations match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p><h2 className="mt-1 text-xl font-black text-white">Station Master Filters</h2></div>
                <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white">×</button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Project</span><select value={draftFilters.projectId} onChange={(event) => setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Projects</option>{projects.map((project) => <option key={getProjectBackendId(project) || getProjectLabel(project)} value={getProjectBackendId(project)}>{getProjectLabel(project)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Status</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((previous) => ({ ...previous, status: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DELETED">Deleted</option></select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Station Type</span><select value={draftFilters.type} onChange={(event) => setDraftFilters((previous) => ({ ...previous, type: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Types</option>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Search</span><input type="text" value={draftFilters.search} onChange={(event) => setDraftFilters((previous) => ({ ...previous, search: event.target.value }))} placeholder="Station ID or name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white">Reset</button>
                <button type="button" onClick={applyFilters} disabled={loading} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}</button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}


const TRANSFER_REPORT_FILTERS = {
  dateFrom: "",
  dateTo: "",
  fromProjectId: "all",
  toProjectId: "all",
  stationId: "all",
  status: "ALL",
};

const TRANSFER_REPORT_HEADERS = [
  "Request Date",
  "Station ID",
  "Station Name",
  "From Project",
  "To Project",
  "Stock At Transfer (L)",
  "Transfer Date",
  "Requested By",
  "Approved By",
  "Status",
];

function getTransferUserName(user) {
  if (!user) return "-";
  if (typeof user === "string") return user;

  return (
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email ||
    "-"
  );
}

function getApprovedByNames(approvedBy) {
  if (!Array.isArray(approvedBy) || !approvedBy.length) return "-";

  return approvedBy
    .map(getTransferUserName)
    .filter((name) => name && name !== "-")
    .join(", ") || "-";
}

function getTransferStatusClasses(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "REJECTED") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "PARTIALLY_APPROVED") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function StationTransferReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  stations = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(TRANSFER_REPORT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(TRANSFER_REPORT_FILTERS);
  const [reportRows, setReportRows] = useState([]);
  const [summary, setSummary] = useState({
    totalTransfers: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rows = useMemo(
    () =>
      (reportRows || []).map((row, index) => ({
        ...row,
        key: row?.transferRef || row?.id || `station-transfer-${index}`,
        transferRef: row?.transferRef || row?.id || "-",
        requestDate: row?.requestDate || row?.createdAt,
        stationId:
          row?.station?.stationId ||
          row?.station?.code ||
          row?.stationId ||
          "-",
        stationName:
          row?.station?.name ||
          row?.station?.stationName ||
          "-",
        fromProject: getProjectLabel(row?.fromProject),
        toProject: getProjectLabel(row?.toProject),
        stockAtTransfer: Number(row?.stockAtTransfer || 0),
        transferDate: row?.transferDate || row?.appliedAt || row?.approvedAt || null,
        requestedBy: getTransferUserName(row?.requestedBy),
        approvedBy: getApprovedByNames(row?.approvedBy),
        status: row?.status || "PENDING",
      })),
    [reportRows]
  );

  const selectedFromProject = projects.find(
    (project) =>
      normalizeValue(getProjectBackendId(project)) ===
      normalizeValue(appliedFilters.fromProjectId)
  );

  const selectedToProject = projects.find(
    (project) =>
      normalizeValue(getProjectBackendId(project)) ===
      normalizeValue(appliedFilters.toProjectId)
  );

  const selectedStation = stations.find(
    (station) =>
      normalizeValue(getStationBackendId(station)) ===
      normalizeValue(appliedFilters.stationId)
  );

  const filterSummary = useMemo(
    () => [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(
                appliedFilters.dateTo
              )}`
            : "All dates",
      },
      {
        label: "From Project",
        value:
          appliedFilters.fromProjectId === "all"
            ? "All Source Projects"
            : getProjectLabel(selectedFromProject),
      },
      {
        label: "To Project",
        value:
          appliedFilters.toProjectId === "all"
            ? "All Destination Projects"
            : getProjectLabel(selectedToProject),
      },
      {
        label: "Station",
        value:
          appliedFilters.stationId === "all"
            ? "All Stations"
            : getStationLabel(selectedStation),
      },
      {
        label: "Status",
        value:
          appliedFilters.status === "ALL"
            ? "All Statuses"
            : formatLabel(appliedFilters.status),
      },
    ],
    [
      appliedFilters,
      selectedFromProject,
      selectedToProject,
      selectedStation,
    ]
  );

  const reportMeta = {
    title: selectedReport?.title || "Station Transfer Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId =
        currentCompany?.backendId ||
        currentCompany?.companyBackendId ||
        currentCompany?.id ||
        currentUser?.companyId ||
        "";

      const result = await fetchStationTransferReport({
        companyId,
        fromProjectId:
          draftFilters.fromProjectId === "all"
            ? ""
            : draftFilters.fromProjectId,
        toProjectId:
          draftFilters.toProjectId === "all"
            ? ""
            : draftFilters.toProjectId,
        stationId:
          draftFilters.stationId === "all" ? "" : draftFilters.stationId,
        status: draftFilters.status,
        dateFrom: draftFilters.dateFrom,
        dateTo: draftFilters.dateTo,
      });

      setAppliedFilters(draftFilters);
      setReportRows(Array.isArray(result?.rows) ? result.rows : []);
      setSummary({
        totalTransfers: Number(result?.summary?.totalTransfers || 0),
        pending: Number(result?.summary?.pending || 0),
        approved: Number(result?.summary?.approved || 0),
        rejected: Number(result?.summary?.rejected || 0),
      });
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load station transfer report."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Transfers", value: summary.totalTransfers },
        { label: "Pending", value: summary.pending },
        { label: "Approved", value: summary.approved },
        { label: "Rejected", value: summary.rejected },
      ],
      columns: TRANSFER_REPORT_HEADERS,
      rows: rows.map((row) => [
        formatDateTime(row.requestDate),
        row.stationId,
        row.stationName,
        row.fromProject,
        row.toProject,
        formatNumber(row.stockAtTransfer),
        formatDateTime(row.transferDate),
        row.requestedBy,
        row.approvedBy,
        formatLabel(row.status),
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Station_Transfer_Report",
      sheetName: "Station Transfers",
      ...reportMeta,
      rows: rows.map((row) => ({
        "Request Date": formatDateTime(row.requestDate),
        "Station ID": row.stationId,
        "Station Name": row.stationName,
        "From Project": row.fromProject,
        "To Project": row.toProject,
        "Stock At Transfer (L)": row.stockAtTransfer,
        "Transfer Date": formatDateTime(row.transferDate),
        "Requested By": row.requestedBy,
        "Approved By": row.approvedBy,
        Status: formatLabel(row.status),
      })),
      totals: {
        "Request Date": `${summary.totalTransfers} transfers`,
        "Station ID": `${summary.pending} pending`,
        "Station Name": `${summary.approved} approved`,
        "From Project": `${summary.rejected} rejected`,
      },
    });
  };

  const resetFilters = () => {
    setDraftFilters(TRANSFER_REPORT_FILTERS);
    setAppliedFilters(TRANSFER_REPORT_FILTERS);
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300">
                <span aria-hidden="true">←</span>
                Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Stations Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
            </div>

            <ReportToolbar
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              disabled={!reportGenerated || !rows.length}
            />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">{error}</section>
        ) : null}

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">🚚</div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select transfer report filters first</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Choose the period, source project, destination project, station and status, then generate the report.</p>
              <button type="button" onClick={() => setFiltersOpen(true)} className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">Set Report Filters</button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {filterSummary.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total Transfers", summary.totalTransfers],
                ["Pending", summary.pending],
                ["Approved", summary.approved],
                ["Rejected", summary.rejected],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">Station Transfer History</h2>
                  <p className="mt-1 text-xs text-slate-500">{rows.length} transfer record{rows.length === 1 ? "" : "s"} found</p>
                </div>
                <p className="text-xs font-bold text-amber-300">Stock is preserved at the time the transfer request was created</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1900px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {TRANSFER_REPORT_HEADERS.map((header) => (
                        <th key={header} className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr key={row.key} className="border-b border-slate-800/70 transition hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDateTime(row.requestDate)}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">{row.stationId}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.stationName}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.fromProject}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.toProject}</td>
                          <td className="min-w-[150px] whitespace-nowrap px-3 py-3 text-center font-extrabold tabular-nums text-slate-200">
                            {formatNumber(row.stockAtTransfer)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDateTime(row.transferDate)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.requestedBy}</td>
                          <td className="max-w-[280px] px-3 py-3 text-slate-300">{row.approvedBy}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${getTransferStatusClasses(row.status)}`}>
                              {formatLabel(row.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={TRANSFER_REPORT_HEADERS.length} className="px-6 py-12 text-center text-slate-500">No station transfers match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p>
                  <h2 className="mt-1 text-xl font-black text-white">Station Transfer Filters</h2>
                </div>
                <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white">×</button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date From</span><input type="date" value={draftFilters.dateFrom} onChange={(event) => setDraftFilters((previous) => ({ ...previous, dateFrom: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date To</span><input type="date" value={draftFilters.dateTo} onChange={(event) => setDraftFilters((previous) => ({ ...previous, dateTo: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                </div>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">From Project</span><select value={draftFilters.fromProjectId} onChange={(event) => setDraftFilters((previous) => ({ ...previous, fromProjectId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Source Projects</option>{projects.map((project) => <option key={`from-${getProjectBackendId(project) || getProjectLabel(project)}`} value={getProjectBackendId(project)}>{getProjectLabel(project)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">To Project</span><select value={draftFilters.toProjectId} onChange={(event) => setDraftFilters((previous) => ({ ...previous, toProjectId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Destination Projects</option>{projects.map((project) => <option key={`to-${getProjectBackendId(project) || getProjectLabel(project)}`} value={getProjectBackendId(project)}>{getProjectLabel(project)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Station</span><select value={draftFilters.stationId} onChange={(event) => setDraftFilters((previous) => ({ ...previous, stationId: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Stations</option>{stations.map((station) => <option key={getStationBackendId(station) || getStationLabel(station)} value={getStationBackendId(station)}>{getStationLabel(station)}</option>)}</select></label>

                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Status</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((previous) => ({ ...previous, status: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="ALL">All Statuses</option><option value="PENDING">Pending</option><option value="PARTIALLY_APPROVED">Partially Approved</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white">Reset</button>
                <button type="button" onClick={loadReport} disabled={loading} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}</button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function StationsReportsPage(props) {
  if (props?.selectedReport?.id === "station-counter-meter-history") {
    return <StationCounterMeterHistoryReport {...props} />;
  }

  if (props?.selectedReport?.id === "station-master") {
    return <StationMasterReport {...props} />;
  }

  if (props?.selectedReport?.id === "station-transfer") {
    return <StationTransferReport {...props} />;
  }

  return null;
}
