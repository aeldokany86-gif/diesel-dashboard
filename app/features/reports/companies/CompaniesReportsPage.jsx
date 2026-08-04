"use client";

import { useEffect, useMemo, useState } from "react";
import ReportToolbar from "../components/ReportToolbar";
import { printReport } from "../utils/printReport";
import { exportReportToExcel } from "../utils/exportReportToExcel";
import {
  fetchCompanies,
  fetchCompaniesMasterReport,
} from "../../../services/companiesService";

const EMPTY_FILTERS = {
  companyId: "all",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

function getCompanyId(company) {
  return company?.backendId || company?.companyId || company?._id || company?.id || "";
}

function getCompanyName(company) {
  return company?.name || company?.companyName || company?.code || company?.companyCode || "-";
}

function getUserName(user) {
  return user?.fullName || user?.name || user?.username || user?.email || "Platform User";
}

function formatNumber(value, maximumFractionDigits = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits,
  });
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

function formatDateFilter(value) {
  if (!value) return "All dates";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function formatStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "-";

  return normalized
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPlatformUser(user) {
  const values = [
    user?.role,
    user?.roleName,
    user?.role?.name,
    user?.userRole,
    user?.type,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ""),
    );

  return values.some((value) =>
    ["platformadmin", "platformuser"].includes(value),
  );
}

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

export default function CompaniesReportsPage({
  selectedReport,
  currentUser,
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const allowed = isPlatformUser(currentUser);

  useEffect(() => {
    let active = true;

    const loadCompanies = async () => {
      if (!allowed) return;

      setCompaniesLoading(true);

      try {
        const result = await fetchCompanies();

        if (active) {
          setCompanies(
            result.filter(
              (company) =>
                getCompanyId(company) &&
                !company?.isPlatformContext,
            ),
          );
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              "Failed to load companies.",
          );
        }
      } finally {
        if (active) setCompaniesLoading(false);
      }
    };

    loadCompanies();

    return () => {
      active = false;
    };
  }, [allowed]);

  useEffect(() => {
    setRows([]);
    setSummary({});
    setError("");
    setHasGenerated(false);
    setFilters(EMPTY_FILTERS);
    setFiltersOpen(true);
  }, [selectedReport?.id]);

  const selectedCompany = useMemo(
    () =>
      companies.find(
        (company) => getCompanyId(company) === filters.companyId,
      ) || null,
    [companies, filters.companyId],
  );

  const filterSummary = useMemo(
    () => [
      {
        label: "Company",
        value:
          filters.companyId === "all"
            ? "All Companies"
            : getCompanyName(selectedCompany),
      },
      {
        label: "Status",
        value:
          filters.status === "all"
            ? "All Statuses"
            : formatStatus(filters.status),
      },
      {
        label: "Created From",
        value: formatDateFilter(filters.createdFrom),
      },
      {
        label: "Created To",
        value: formatDateFilter(filters.createdTo),
      },
    ],
    [filters, selectedCompany],
  );

  const columns = [
    "Company Code",
    "Company Name",
    "Status",
    "Country",
    "Currency",
    "Subscription Plan",
    "Created Date",
    "Projects",
    "Users",
    "Employees",
    "Assets",
    "Stations",
    "Fuel Operations",
    "Fuel Consumed (L)",
  ];

  const tableRows = rows.map((row) => [
    row.companyCode || "-",
    row.companyName || "-",
    formatStatus(row.status),
    row.country || "-",
    row.currency || "-",
    row.subscriptionPlan || "-",
    formatDateTime(row.createdAt),
    formatNumber(row.projectsCount, 0),
    formatNumber(row.usersCount, 0),
    formatNumber(row.employeesCount, 0),
    formatNumber(row.assetsCount, 0),
    formatNumber(row.stationsCount, 0),
    formatNumber(row.fuelOperationsCount, 0),
    formatNumber(row.totalFuelConsumed),
  ]);

  const reportMeta = {
    title: selectedReport?.title || "Companies Master Report",
    companyName: "Fleet Fuel PRO Platform",
    generatedBy: getUserName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    if (!allowed) {
      setError("Companies reports are available for Platform User only.");
      return;
    }

    if (
      filters.createdFrom &&
      filters.createdTo &&
      filters.createdFrom > filters.createdTo
    ) {
      setError("Created From cannot be later than Created To.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await fetchCompaniesMasterReport({
        companyId: filters.companyId === "all" ? "" : filters.companyId,
        status: filters.status === "all" ? "" : filters.status,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
      });

      setRows(result.rows);
      setSummary(result.summary);
      setHasGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to generate companies report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Companies", value: summary.totalCompanies || 0 },
        { label: "Active", value: summary.activeCompanies || 0 },
        { label: "Inactive", value: summary.inactiveCompanies || 0 },
        { label: "Projects", value: summary.totalProjects || 0 },
        {
          label: "Fuel Consumed",
          value: `${formatNumber(summary.totalFuelConsumed)} L`,
        },
      ],
      columns,
      rows: tableRows,
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Companies_Master_Report",
      sheetName: "Companies Master",
      ...reportMeta,
      rows: rows.map((row) => ({
        "Company Code": row.companyCode || "",
        "Company Name": row.companyName || "",
        Status: formatStatus(row.status),
        Country: row.country || "",
        Currency: row.currency || "",
        "Subscription Plan": row.subscriptionPlan || "",
        "Created Date": formatDateTime(row.createdAt),
        Projects: row.projectsCount,
        Users: row.usersCount,
        Employees: row.employeesCount,
        Assets: row.assetsCount,
        Stations: row.stationsCount,
        "Fuel Operations": row.fuelOperationsCount,
        "Fuel Consumed (L)": row.totalFuelConsumed,
      })),
    });
  };

  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white"
          >
            ← Back to Reports
          </button>
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 font-bold text-rose-200">
            Companies reports are available for Platform User only.
          </div>
        </div>
      </div>
    );
  }

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
                Platform Reports
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
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Stat
                label="Total Companies"
                value={summary.totalCompanies || 0}
                tone="text-amber-300"
              />
              <Stat
                label="Active"
                value={summary.activeCompanies || 0}
                tone="text-emerald-300"
              />
              <Stat
                label="Inactive"
                value={summary.inactiveCompanies || 0}
                tone="text-rose-300"
              />
              <Stat
                label="Total Projects"
                value={summary.totalProjects || 0}
                tone="text-sky-300"
              />
              <Stat
                label="Fuel Consumed"
                value={`${formatNumber(summary.totalFuelConsumed)} L`}
                tone="text-cyan-300"
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {filterSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                <div>
                  <h2 className="font-black text-white">Companies Register</h2>
                  <p className="text-xs text-slate-400">
                    {loading
                      ? "Loading..."
                      : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1550px] w-full text-left text-xs">
                  <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-amber-300">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="whitespace-nowrap px-3 py-3"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tableRows.length ? (
                      tableRows.map((row, index) => (
                        <tr
                          key={rows[index]?.companyId || index}
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
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No companies match the selected filters.
                        </td>
                      </tr>
                    )}
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
              Choose the company, status and creation period, then generate the
              report. No report data is loaded before confirmation.
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
                Company
                <select
                  value={filters.companyId}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      companyId: event.target.value,
                    }))
                  }
                  disabled={companiesLoading}
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white disabled:opacity-50"
                >
                  <option value="all">
                    {companiesLoading ? "Loading Companies..." : "All Companies"}
                  </option>
                  {companies.map((company) => (
                    <option
                      key={getCompanyId(company)}
                      value={getCompanyId(company)}
                    >
                      {company.code || company.companyCode || "-"} —{" "}
                      {getCompanyName(company)}
                    </option>
                  ))}
                </select>
              </label>

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
                Created From
                <input
                  type="date"
                  value={filters.createdFrom}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      createdFrom: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                />
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Created To
                <input
                  type="date"
                  value={filters.createdTo}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      createdTo: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-700 p-5">
              <button
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setError("");
                }}
                className="rounded-xl border border-slate-600 px-4 py-3 font-bold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={loadReport}
                disabled={loading || companiesLoading}
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
