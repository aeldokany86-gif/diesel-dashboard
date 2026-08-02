"use client";

import { useEffect, useMemo, useState } from "react";
import ReportToolbar from "../components/ReportToolbar";
import { printReport } from "../utils/printReport";
import { exportReportToExcel } from "../utils/exportReportToExcel";
import {
  fetchProjectsFuelPriceHistoryReport,
  fetchProjectsMasterReport,
} from "../../../services/projectsService";

const money = (value, currency = "SAR") =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 3 })} ${currency}`;
const number = (value) =>
  Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const dateTime = (value) =>
  value ? new Date(value).toLocaleString("en-GB") : "-";
const projectId = (project) =>
  project?.id || project?.projectId || project?._id || "";
const companyId = (company) =>
  company?.id || company?.companyId || company?._id || "";
const userName = (user) =>
  user?.fullName || user?.name || user?.email || "Unknown User";

function Stat({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/45 p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

export default function ProjectsReportsPage({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  onBack,
}) {
  const isMaster = selectedReport?.id === "projects-master";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    projectId: "all",
    status: "all",
    location: "all",
    managerId: "all",
    dateFrom: "",
    dateTo: "",
  });
  const currency = currentCompany?.currency || rows[0]?.currency || "SAR";

  const loadReport = async (nextFilters = filters) => {
    const selectedCompanyId = companyId(currentCompany);
    if (!selectedCompanyId) {
      setError("Company ID is required to generate this report.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const common = {
        companyId: selectedCompanyId,
        projectId: nextFilters.projectId === "all" ? "" : nextFilters.projectId,
      };
      const result = isMaster
        ? await fetchProjectsMasterReport({
            ...common,
            status: nextFilters.status === "all" ? "" : nextFilters.status,
          })
        : await fetchProjectsFuelPriceHistoryReport({
            ...common,
            dateFrom: nextFilters.dateFrom,
            dateTo: nextFilters.dateTo,
          });
      const reportRows = isMaster
        ? result.rows.filter(
            (row) =>
              (nextFilters.location === "all" ||
                (row.location || "") === nextFilters.location) &&
              (nextFilters.managerId === "all" ||
                (row.managerId || "") === nextFilters.managerId),
          )
        : result.rows;
      setRows(reportRows);
      setSummary(
        isMaster
          ? {
              ...result.summary,
              totalProjects: reportRows.length,
              activeProjects: reportRows.filter(
                (row) => row.status === "ACTIVE",
              ).length,
              inactiveProjects: reportRows.filter(
                (row) => row.status === "INACTIVE",
              ).length,
              consumedQuantity: reportRows.reduce(
                (total, row) => total + Number(row.consumedQuantity || 0),
                0,
              ),
              totalCost: reportRows.reduce(
                (total, row) => total + Number(row.totalCost || 0),
                0,
              ),
            }
          : result.summary,
      );
      setHasGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to generate report.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRows([]);
    setSummary({});
    setError("");
    setHasGenerated(false);
    setFilters({
      projectId: "all",
      status: "all",
      location: "all",
      managerId: "all",
      dateFrom: "",
      dateTo: "",
    });
    setFiltersOpen(true);
  }, [selectedReport?.id, currentCompany?.id, currentCompany?.companyId]);

  const filterText = useMemo(() => {
    const selectedProject = projects.find(
      (project) => projectId(project) === filters.projectId,
    );
    const values = [
      `Project: ${filters.projectId === "all" ? "All Projects" : selectedProject?.name || selectedProject?.code || "Selected Project"}`,
    ];
    if (isMaster)
      values.push(
        `Status: ${filters.status === "all" ? "All Statuses" : filters.status}`,
      );
    if (isMaster) {
      const selectedManager = projects.find(
        (project) =>
          (project.managerId || project.projectManager?.id) ===
          filters.managerId,
      );
      values.push(
        `Location: ${filters.location === "all" ? "All Locations" : filters.location}`,
      );
      values.push(
        `Manager: ${filters.managerId === "all" ? "All Managers" : selectedManager?.managerName || selectedManager?.projectManager?.fullName || "Selected Manager"}`,
      );
    }
    if (!isMaster) {
      values.push(`From: ${filters.dateFrom || "All dates"}`);
      values.push(`To: ${filters.dateTo || "All dates"}`);
    }
    return values;
  }, [filters, projects, isMaster]);

  const locations = useMemo(
    () =>
      [
        ...new Set(projects.map((project) => project.location).filter(Boolean)),
      ].sort(),
    [projects],
  );
  const managers = useMemo(() => {
    const values = new Map();
    projects.forEach((project) => {
      const id = project.managerId || project.projectManager?.id;
      const name =
        project.managerName ||
        project.projectManager?.fullName ||
        project.projectManager?.name;
      if (id && name) values.set(id, name);
    });
    return [...values.entries()].map(([id, name]) => ({ id, name }));
  }, [projects]);

  const masterColumns = [
    "Project ID",
    "Project",
    "Status",
    "Manager",
    "Location",
    "Assets",
    "Stations",
    "Employees",
    "Fuel Operations",
    "Consumed Qty",
    "Total Cost",
    "Base / L",
    "Delivery / L",
    "Operational / L",
    "VAT",
    "Incl. VAT / L",
    "Effective From",
  ];
  const historyColumns = [
    "Project ID",
    "Project",
    "Effective From",
    "Base / L",
    "Delivery / L",
    "Operational / L",
    "VAT",
    "VAT / L",
    "Incl. VAT / L",
    "Priced Operations",
    "Changed By",
    "Reason",
  ];
  const tableRows = isMaster
    ? rows.map((row) => [
        row.projectCode,
        row.projectName,
        row.status,
        row.managerName || "-",
        row.location || "-",
        row.assetsCount,
        row.stationsCount,
        row.employeesCount,
        row.refuelOperationsCount,
        `${number(row.consumedQuantity)} L`,
        money(row.totalCost, row.currency),
        money(row.basePricePerLiter, row.currency),
        money(row.transportCostPerLiter, row.currency),
        money(row.operationalPricePerLiter, row.currency),
        row.vatRate == null ? "-" : `${number(row.vatRate)}%`,
        money(row.grossPricePerLiter, row.currency),
        dateTime(row.priceEffectiveFrom),
      ])
    : rows.map((row) => [
        row.projectCode,
        row.projectName,
        dateTime(row.effectiveFrom),
        money(row.basePricePerLiter, row.currency),
        money(row.transportCostPerLiter, row.currency),
        money(row.operationalPricePerLiter, row.currency),
        row.vatRate == null ? "-" : `${number(row.vatRate)}%`,
        money(row.vatAmountPerLiter, row.currency),
        money(row.grossPricePerLiter, row.currency),
        row.pricedOperationsCount,
        row.changedByName || "System",
        row.reason || "-",
      ]);

  const reportMeta = {
    title: selectedReport?.title,
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: userName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterText,
  };

  const handlePrint = () =>
    printReport({
      ...reportMeta,
      columns: isMaster ? masterColumns : historyColumns,
      rows: tableRows,
    });

  const handleExport = () =>
    exportReportToExcel({
      fileName: isMaster
        ? "Projects_Master_Report"
        : "Project_Fuel_Price_History",
      sheetName: isMaster ? "Projects Master" : "Price History",
      ...reportMeta,
      rows: rows.map((row) =>
        isMaster
          ? {
              "Project ID": row.projectCode,
              Project: row.projectName,
              Status: row.status,
              Manager: row.managerName || "",
              Location: row.location || "",
              Assets: row.assetsCount,
              Stations: row.stationsCount,
              Employees: row.employeesCount,
              "Fuel Operations": row.refuelOperationsCount,
              "Consumed Quantity": row.consumedQuantity,
              [`Total Cost (${row.currency || currency})`]: row.totalCost,
              "Base Price / L": row.basePricePerLiter,
              "Delivery / L": row.transportCostPerLiter,
              "Operational Price / L": row.operationalPricePerLiter,
              "VAT %": row.vatRate,
              "Price incl. VAT / L": row.grossPricePerLiter,
              "Effective From": dateTime(row.priceEffectiveFrom),
            }
          : {
              "Project ID": row.projectCode,
              Project: row.projectName,
              "Effective From": dateTime(row.effectiveFrom),
              "Base Price / L": row.basePricePerLiter,
              "Delivery / L": row.transportCostPerLiter,
              "Operational Price / L": row.operationalPricePerLiter,
              "VAT %": row.vatRate,
              "VAT / L": row.vatAmountPerLiter,
              "Price incl. VAT / L": row.grossPricePerLiter,
              "Priced Operations": row.pricedOperationsCount,
              "Changed By": row.changedByName || "System",
              Reason: row.reason || "",
            },
      ),
    });

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="mb-4 rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white"
              >
                ← Back to Reports
              </button>
              <div className="text-xs font-black uppercase tracking-[.2em] text-amber-400">
                Projects Reports
              </div>
              <h1 className="mt-1 text-2xl font-black text-white">
                {selectedReport?.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {selectedReport?.description}
              </p>
            </div>
            <ReportToolbar
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              disabled={loading || !rows.length}
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : null}

        {hasGenerated ? (
          <>
            {isMaster ? (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Stat
                  label="Total Projects"
                  value={summary.totalProjects || 0}
                  tone="text-amber-300"
                />
                <Stat
                  label="Active"
                  value={summary.activeProjects || 0}
                  tone="text-emerald-300"
                />
                <Stat
                  label="Inactive"
                  value={summary.inactiveProjects || 0}
                  tone="text-rose-300"
                />
                <Stat
                  label="Consumed Quantity"
                  value={`${number(summary.consumedQuantity)} L`}
                  tone="text-sky-300"
                />
                <Stat
                  label={`Total Cost (${currency})`}
                  value={number(summary.totalCost)}
                  tone="text-emerald-300"
                />
              </section>
            ) : (
              <section className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Price Changes"
                  value={summary.priceChanges || 0}
                  tone="text-amber-300"
                />
                <Stat
                  label="Affected Projects"
                  value={summary.affectedProjects || 0}
                  tone="text-sky-300"
                />
                <Stat
                  label="Priced Operations"
                  value={summary.pricedOperations || 0}
                  tone="text-emerald-300"
                />
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                <div>
                  <h2 className="font-black text-white">
                    {isMaster ? "Projects Register" : "Fuel Price Changes"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {loading
                      ? "Loading..."
                      : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full text-left text-xs">
                  <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-amber-300">
                    <tr>
                      {(isMaster ? masterColumns : historyColumns).map(
                        (column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap px-3 py-3"
                          >
                            {column}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tableRows.map((row, index) => (
                      <tr
                        key={
                          rows[index]?.priceHistoryId ||
                          rows[index]?.projectId ||
                          index
                        }
                        className="hover:bg-slate-800/60"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="whitespace-nowrap px-3 py-3 text-slate-200"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <div className="text-lg font-black text-white">
              Select report filters first
            </div>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Choose the required filters, then generate the report. No report
              data is loaded before confirmation.
            </p>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950"
            >
              Set Report Filters
            </button>
          </section>
        )}
      </div>

      {filtersOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setFiltersOpen(false)}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-slate-700 bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-700 p-5">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Report Filters
                </div>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selectedReport?.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2"
              >
                ×
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {error ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
              <label className="block text-sm font-bold text-slate-300">
                Project
                <select
                  value={filters.projectId}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      projectId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={projectId(project)} value={projectId(project)}>
                      {project.code || project.projectCode} —{" "}
                      {project.name || project.projectName}
                    </option>
                  ))}
                </select>
              </label>
              {isMaster ? (
                <>
                  <label className="block text-sm font-bold text-slate-300">
                    Status
                    <select
                      value={filters.status}
                      onChange={(event) =>
                        setFilters((value) => ({
                          ...value,
                          status: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-300">
                    Location
                    <select
                      value={filters.location}
                      onChange={(event) =>
                        setFilters((value) => ({
                          ...value,
                          location: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                    >
                      <option value="all">All Locations</option>
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-300">
                    Project Manager
                    <select
                      value={filters.managerId}
                      onChange={(event) =>
                        setFilters((value) => ({
                          ...value,
                          managerId: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                    >
                      <option value="all">All Project Managers</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-sm font-bold text-slate-300">
                    Date From
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) =>
                        setFilters((value) => ({
                          ...value,
                          dateFrom: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-300">
                    Date To
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) =>
                        setFilters((value) => ({
                          ...value,
                          dateTo: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                    />
                  </label>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-700 p-5">
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    projectId: "all",
                    status: "all",
                    location: "all",
                    managerId: "all",
                    dateFrom: "",
                    dateTo: "",
                  })
                }
                className="rounded-xl border border-slate-600 px-4 py-3 font-bold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => loadReport()}
                disabled={loading}
                className="rounded-xl bg-amber-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
