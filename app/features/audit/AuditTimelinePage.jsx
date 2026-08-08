"use client";

import React, { useState } from "react";
import { formatNotificationDate } from "../../lib/notificationHelpers";
import { buildAuditTimelineItems } from "../../lib/auditHelpers";
import { useLanguage } from "../../context/LanguageContext";
import { resolveRecordMessage } from "../../lib/i18nMessageHelpers";

function makeFieldLabel(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function exportAuditTimelineCSV({
  timelineItems = [],
  t,
  language = "en",
  resolveField,
}) {
  const headers = [
    t("auditTimeline.csv.date"),
    t("auditTimeline.csv.source"),
    t("auditTimeline.csv.module"),
    t("auditTimeline.csv.status"),
    t("auditTimeline.csv.actor"),
    t("auditTimeline.csv.role"),
    t("auditTimeline.csv.entityType"),
    t("auditTimeline.csv.entityId"),
    t("auditTimeline.csv.risk"),
    t("auditTimeline.csv.title"),
    t("auditTimeline.csv.description"),
    t("auditTimeline.csv.changedFields"),
  ];

  const rows = timelineItems.map((item) => [
    formatNotificationDate(item.createdAt, language),
    resolveRecordMessage(t, item, "source", item.source || "-"),
    resolveRecordMessage(t, item, "module", item.module || "-"),
    resolveRecordMessage(t, item, "status", item.status || "-"),
    item.actorName || "-",
    resolveRecordMessage(t, item, "actorRole", item.actorRole || "-"),
    resolveRecordMessage(t, item, "entityType", item.entityType || "-"),
    item.entityId || "-",
    resolveRecordMessage(t, item, "riskLevel", item.riskLevel || "-"),
    resolveRecordMessage(t, item, "title", item.title || "-"),
    resolveRecordMessage(t, item, "description", item.description || "-"),
    (item.changedFields || [])
      .map((field) => {
        const label = resolveField(field);
        return `${label}: ${field.oldValue ?? "-"} -> ${field.newValue ?? "-"}`;
      })
      .join(" | "),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

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
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterModule, setFilterModule] = useState("All");
  const [filterRisk, setFilterRisk] = useState("All");
  const [search, setSearch] = useState("");

  const timelineItems = buildAuditTimelineItems({
    approvals,
    activityLog,
    currentUser,
  });

  const moduleOptions = [
    "All",
    ...new Set(timelineItems.map((item) => item.module).filter(Boolean)),
  ];

  const statusOptions = [
    "All",
    ...new Set(timelineItems.map((item) => item.status).filter(Boolean)),
  ];

  const riskOptions = [
    "All",
    ...new Set(timelineItems.map((item) => item.riskLevel).filter(Boolean)),
  ];

  const resolveEventField = (item, field, fallback = "") =>
    resolveRecordMessage(t, item, field, fallback);

  const getStatusLabel = (value) => {
    if (value === "All") return t("auditTimeline.filters.allStatuses");
    const item = timelineItems.find((entry) => entry.status === value);
    return item
      ? resolveEventField(item, "status", value)
      : value;
  };

  const getModuleLabel = (value) => {
    if (value === "All") return t("auditTimeline.filters.allModules");
    const item = timelineItems.find((entry) => entry.module === value);
    return item
      ? resolveEventField(item, "module", value)
      : value;
  };

  const getRiskLabel = (value) => {
    if (value === "All") return t("auditTimeline.filters.allRiskLevels");
    const item = timelineItems.find((entry) => entry.riskLevel === value);
    return item
      ? resolveEventField(item, "riskLevel", value)
      : value;
  };

  const getFieldLabel = (field) => {
    const raw = String(field?.field || "").trim().toUpperCase();

    const map = {
      ASSET_ID: "workflowMessages.fields.asset",
      SOURCE_STATION_ID: "workflowMessages.fields.sourceStation",
      DESTINATION_STATION_ID: "workflowMessages.fields.destinationStation",
      QUANTITY: "workflowMessages.fields.dieselQuantity",
      ODOMETER: "workflowMessages.fields.odometer",
      STATION_COUNTER: "workflowMessages.fields.stationCounter",
      NOTES: "workflowMessages.fields.notes",
      INVOICE_NUMBER: "workflowMessages.fields.invoiceNumber",
    };

    const key = map[raw];
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }

    return field?.label || makeFieldLabel(field?.field);
  };

  const filteredTimeline = timelineItems.filter((item) => {
    const translatedSearchValues = [
      resolveEventField(item, "title", item.title),
      resolveEventField(item, "description", item.description),
      resolveEventField(item, "module", item.module),
      resolveEventField(item, "status", item.status),
      item.actorName,
      resolveEventField(item, "actorRole", item.actorRole),
      resolveEventField(item, "entityType", item.entityType),
      item.entityId,
      resolveEventField(item, "riskLevel", item.riskLevel),
      ...(item.changedFields || []).flatMap((field) => [
        getFieldLabel(field),
        field.oldValue,
        field.newValue,
      ]),
    ];

    const rawSearchValues = [
      item.title,
      item.description,
      item.module,
      item.status,
      item.actorName,
      item.actorRole,
      item.entityType,
      item.entityId,
      item.riskLevel,
    ];

    const haystack = [...translatedSearchValues, ...rawSearchValues]
      .join(" ")
      .toLowerCase();

    if (filterStatus !== "All" && item.status !== filterStatus) return false;
    if (filterModule !== "All" && item.module !== filterModule) return false;
    if (filterRisk !== "All" && item.riskLevel !== filterRisk) return false;

    if (
      search.trim() &&
      !haystack.includes(search.trim().toLowerCase())
    ) {
      return false;
    }

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
    if (status === "Pending")
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";

    if (status === "Approved")
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

    if (status === "Rejected")
      return "bg-red-500/15 text-red-300 border-red-500/30";

    return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  };

  const getRiskBadgeClass = (risk) => {
    if (risk === "High")
      return "bg-red-500/15 text-red-300 border-red-500/30";

    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  const selectedDetails = selectedEvent
    ? [
        [
          t("auditTimeline.modal.status"),
          resolveEventField(
            selectedEvent,
            "status",
            selectedEvent.status,
          ),
        ],
        [
          t("auditTimeline.modal.module"),
          resolveEventField(
            selectedEvent,
            "module",
            selectedEvent.module,
          ),
        ],
        [
          t("auditTimeline.modal.risk"),
          resolveEventField(
            selectedEvent,
            "riskLevel",
            selectedEvent.riskLevel,
          ),
        ],
        [
          t("auditTimeline.modal.sensitivity"),
          resolveEventField(
            selectedEvent,
            "sensitivity",
            selectedEvent.sensitivity,
          ),
        ],
        [
          t("auditTimeline.modal.actor"),
          selectedEvent.actorName,
        ],
        [
          t("auditTimeline.modal.role"),
          resolveEventField(
            selectedEvent,
            "actorRole",
            selectedEvent.actorRole,
          ),
        ],
        [
          t("auditTimeline.modal.entityType"),
          resolveEventField(
            selectedEvent,
            "entityType",
            selectedEvent.entityType,
          ),
        ],
        [
          t("auditTimeline.modal.entityId"),
          selectedEvent.entityId,
        ],
      ]
    : [];

  return (
    <div
      className={`bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent] ${
        isRtl ? "text-right" : "text-left"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="fleet-page-shell relative isolate w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
              {t("auditTimeline.title")}
            </h1>
            <p className="text-slate-400 text-sm">
              {t("auditTimeline.subtitle")}
            </p>
          </div>

          <button
            onClick={() =>
              exportAuditTimelineCSV({
                timelineItems: filteredTimeline,
                t,
                language,
                resolveField: getFieldLabel,
              })
            }
            disabled={
              !hasPermission("auditTimeline", "export") ||
              filteredTimeline.length === 0
            }
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            {t("auditTimeline.actions.exportCsv")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          {[
            {
              label: t("auditTimeline.cards.totalEvents"),
              value: counts.total,
            },
            {
              label: t("auditTimeline.cards.pending"),
              value: counts.pending,
            },
            {
              label: t("auditTimeline.cards.approved"),
              value: counts.approved,
            },
            {
              label: t("auditTimeline.cards.rejected"),
              value: counts.rejected,
            },
            {
              label: t("auditTimeline.cards.highRisk"),
              value: counts.high,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl shadow-black/10"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <p className="text-2xl font-black text-slate-100 mt-1">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 mb-4 shadow-xl shadow-black/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("auditTimeline.filters.searchPlaceholder")}
              className={`bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 py-2.5 rounded-xl outline-none ${
                isRtl ? "text-right" : "text-left"
              }`}
            />

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className={`bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {getStatusLabel(item)}
                </option>
              ))}
            </select>

            <select
              value={filterModule}
              onChange={(event) => setFilterModule(event.target.value)}
              className={`bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {moduleOptions.map((item) => (
                <option key={item} value={item}>
                  {getModuleLabel(item)}
                </option>
              ))}
            </select>

            <select
              value={filterRisk}
              onChange={(event) => setFilterRisk(event.target.value)}
              className={`bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {riskOptions.map((item) => (
                <option key={item} value={item}>
                  {getRiskLabel(item)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          {filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {t("auditTimeline.empty")}
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full mt-1 ${
                            item.status === "Rejected"
                              ? "bg-red-400"
                              : item.status === "Approved"
                              ? "bg-emerald-400"
                              : item.status === "Pending"
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <div className="w-px flex-1 bg-slate-700 mt-2" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getStatusBadgeClass(
                              item.status,
                            )}`}
                          >
                            {resolveEventField(
                              item,
                              "status",
                              item.status,
                            )}
                          </span>

                          <span
                            className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getRiskBadgeClass(
                              item.riskLevel,
                            )}`}
                          >
                            {resolveEventField(
                              item,
                              "riskLevel",
                              item.riskLevel,
                            )}
                          </span>

                          <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-300">
                            {resolveEventField(
                              item,
                              "module",
                              item.module,
                            )}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-100">
                          {resolveEventField(
                            item,
                            "title",
                            item.title,
                          )}
                        </h3>

                        <p className="text-sm text-slate-400 mt-1">
                          {resolveEventField(
                            item,
                            "description",
                            item.description,
                          )}
                        </p>

                        <p className="text-xs text-slate-500 mt-2">
                          {formatNotificationDate(
                            item.createdAt,
                            language,
                          )}{" "}
                          · {item.actorName} ·{" "}
                          {resolveEventField(
                            item,
                            "actorRole",
                            item.actorRole,
                          )}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`min-w-[180px] ${
                        isRtl ? "xl:text-left" : "xl:text-right"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {resolveEventField(
                          item,
                          "entityType",
                          item.entityType,
                        )}
                      </p>

                      <p className="text-sm font-bold text-amber-300 break-words">
                        {item.entityId}
                      </p>

                      <button
                        onClick={() => setSelectedEvent(item)}
                        className="mt-2 text-xs text-blue-300 hover:text-yellow-400 transition-colors"
                      >
                        {t("auditTimeline.actions.viewDetails")}
                      </button>
                    </div>
                  </div>

                  {(item.changedFields || []).length > 0 && (
                    <div
                      className={`mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 ${
                        isRtl ? "pr-6" : "pl-6"
                      }`}
                    >
                      {item.changedFields
                        .slice(0, 4)
                        .map((field, index) => (
                          <div
                            key={`${item.id}-${field.field}-${index}`}
                            className="bg-slate-950 border border-slate-700 rounded-xl p-3"
                          >
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">
                              {getFieldLabel(field)}
                            </p>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-red-300 line-through break-all">
                                {field.oldValue}
                              </span>
                              <span className="text-slate-500">→</span>
                              <span className="text-emerald-300 font-bold break-all">
                                {field.newValue}
                              </span>
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
            <div className="p-5 border-b border-slate-700 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">
                  {t("auditTimeline.modal.timelineEvent")}
                </p>

                <h2 className="text-xl font-black text-slate-100">
                  {resolveEventField(
                    selectedEvent,
                    "title",
                    selectedEvent.title,
                  )}
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  {formatNotificationDate(
                    selectedEvent.createdAt,
                    language,
                  )}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
                aria-label={t("common.close")}
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {selectedDetails.map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-slate-900 border border-slate-700 rounded-2xl p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </p>
                    <p className="text-sm font-bold text-slate-100 mt-1 break-words">
                      {value || "-"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">
                  {t("auditTimeline.modal.description")}
                </p>
                <p className="text-sm text-slate-100 leading-6">
                  {resolveEventField(
                    selectedEvent,
                    "description",
                    selectedEvent.description,
                  )}
                </p>
              </div>

              {(selectedEvent.changedFields || []).length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-3">
                    {t("auditTimeline.modal.changedFields")}
                  </p>

                  <div className="space-y-2">
                    {selectedEvent.changedFields.map(
                      (field, index) => (
                        <div
                          key={`${field.field}-${index}`}
                          className="bg-slate-950 border border-slate-700 rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-bold text-slate-100">
                              {getFieldLabel(field)}
                            </p>

                            {field.sensitive && (
                              <span className="text-[10px] bg-red-500/15 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5">
                                {t(
                                  "auditTimeline.sensitivity.sensitive",
                                )}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-red-300 mb-1">
                                {t("auditTimeline.modal.oldValue")}
                              </p>
                              <p className="text-slate-100 break-words">
                                {field.oldValue}
                              </p>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300 mb-1">
                                {t("auditTimeline.modal.newValue")}
                              </p>
                              <p className="text-slate-100 break-words">
                                {field.newValue}
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
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
