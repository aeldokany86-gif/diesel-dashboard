"use client";

import React, { useState } from "react";
import { formatNotificationDate } from "../../lib/notificationHelpers";
import { buildAuditTimelineItems } from "../../lib/auditHelpers";

function exportAuditTimelineCSV(timelineItems = []) {
  const headers = [
    "Date",
    "Source",
    "Module",
    "Status",
    "Actor",
    "Role",
    "Entity Type",
    "Entity ID",
    "Risk",
    "Title",
    "Description",
    "Changed Fields",
  ];

  const rows = timelineItems.map((item) => [
    formatNotificationDate(item.createdAt),
    item.source,
    item.module,
    item.status,
    item.actorName,
    item.actorRole,
    item.entityType,
    item.entityId,
    item.riskLevel,
    item.title,
    item.description,
    (item.changedFields || [])
      .map((field) => `${field.label || field.field}: ${field.oldValue} -> ${field.newValue}`)
      .join(" | "),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `audit_timeline_${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditTimelinePage({
  approvals = [],
  activityLog = [],
  currentUser,
  hasPermission = () => false,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterModule, setFilterModule] = useState("All");
  const [filterRisk, setFilterRisk] = useState("All");
  const [search, setSearch] = useState("");

  const timelineItems = buildAuditTimelineItems({ approvals, activityLog, currentUser });

  const moduleOptions = ["All", ...new Set(timelineItems.map((item) => item.module).filter(Boolean))];
  const statusOptions = ["All", ...new Set(timelineItems.map((item) => item.status).filter(Boolean))];
  const riskOptions = ["All", ...new Set(timelineItems.map((item) => item.riskLevel).filter(Boolean))];

  const filteredTimeline = timelineItems.filter((item) => {
    const haystack = [
      item.title,
      item.description,
      item.module,
      item.status,
      item.actorName,
      item.actorRole,
      item.entityType,
      item.entityId,
      item.riskLevel,
      ...(item.changedFields || []).flatMap((field) => [field.label, field.oldValue, field.newValue]),
    ]
      .join(" ")
      .toLowerCase();

    if (filterStatus !== "All" && item.status !== filterStatus) return false;
    if (filterModule !== "All" && item.module !== filterModule) return false;
    if (filterRisk !== "All" && item.riskLevel !== filterRisk) return false;
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: timelineItems.length,
    pending: timelineItems.filter((item) => item.status === "Pending").length,
    approved: timelineItems.filter((item) => item.status === "Approved").length,
    rejected: timelineItems.filter((item) => item.status === "Rejected").length,
    high: timelineItems.filter((item) => item.riskLevel === "High").length,
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Pending") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    if (status === "Approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (status === "Rejected") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  };

  const getRiskBadgeClass = (risk) => {
    if (risk === "High") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="fleet-page-shell relative isolate w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">Enterprise Audit Timeline</h1>
            <p className="text-slate-400 text-sm">Trace actions, approvals, review decisions, risk, and field-level changes.</p>
          </div>

          <button
            onClick={() => exportAuditTimelineCSV(filteredTimeline)}
            disabled={!hasPermission("auditTimeline", "export") || filteredTimeline.length === 0}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            Export Timeline CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Total Events", value: counts.total },
            { label: "Pending", value: counts.pending },
            { label: "Approved", value: counts.approved },
            { label: "Rejected", value: counts.rejected },
            { label: "High Risk", value: counts.high },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl shadow-black/10">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl shadow-black/10 backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timeline..."
              className="bg-[#080d19] border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 py-2.5 rounded-xl outline-none"
            />

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {statusOptions.map((item) => <option key={item}>{item}</option>)}
            </select>

            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {moduleOptions.map((item) => <option key={item}>{item}</option>)}
            </select>

            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {riskOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          {filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No timeline events found.</div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredTimeline.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 ${item.status === "Rejected" ? "bg-red-400" : item.status === "Approved" ? "bg-emerald-400" : item.status === "Pending" ? "bg-amber-400" : "bg-blue-400"}`} />
                        <div className="w-px flex-1 bg-slate-700 mt-2" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
                          <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getRiskBadgeClass(item.riskLevel)}`}>{item.riskLevel}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-300">{item.module}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-100">{item.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {formatNotificationDate(item.createdAt)} · {item.actorName} · {item.actorRole}
                        </p>
                      </div>
                    </div>

                    <div className="xl:text-right min-w-[180px]">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.entityType}</p>
                      <p className="text-sm font-bold text-amber-300 break-words">{item.entityId}</p>
                      <button onClick={() => setSelectedEvent(item)} className="mt-2 text-xs text-blue-300 hover:text-yellow-400 transition-colors">
                        View details
                      </button>
                    </div>
                  </div>

                  {(item.changedFields || []).length > 0 && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 pl-6">
                      {item.changedFields.slice(0, 4).map((field, index) => (
                        <div key={`${item.id}-${field.field}-${index}`} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">{field.label || makeFieldLabel(field.field)}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-300 line-through break-all">{field.oldValue}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-300 font-bold break-all">{field.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">Timeline Event</p>
                <h2 className="text-xl font-black text-slate-100">{selectedEvent.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{formatNotificationDate(selectedEvent.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  ["Status", selectedEvent.status],
                  ["Module", selectedEvent.module],
                  ["Risk", selectedEvent.riskLevel],
                  ["Sensitivity", selectedEvent.sensitivity],
                  ["Actor", selectedEvent.actorName],
                  ["Role", selectedEvent.actorRole],
                  ["Entity Type", selectedEvent.entityType],
                  ["Entity ID", selectedEvent.entityId],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 break-words">{value || "-"}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">Description</p>
                <p className="text-sm text-slate-100 leading-6">{selectedEvent.description}</p>
              </div>

              {(selectedEvent.changedFields || []).length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-3">Changed Fields</p>
                  <div className="space-y-2">
                    {selectedEvent.changedFields.map((field, index) => (
                      <div key={`${field.field}-${index}`} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-bold text-slate-100">{field.label || makeFieldLabel(field.field)}</p>
                          {field.sensitive && <span className="text-[10px] bg-red-500/15 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5">Sensitive</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-red-300 mb-1">Old Value</p>
                            <p className="text-slate-100 break-words">{field.oldValue}</p>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300 mb-1">New Value</p>
                            <p className="text-slate-100 break-words">{field.newValue}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
