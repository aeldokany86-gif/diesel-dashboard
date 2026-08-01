"use client";

import { useMemo, useState } from "react";
import ReportToolbar from "../components/ReportToolbar";
import { printReport } from "../utils/printReport";
import { exportReportToExcel } from "../utils/exportReportToExcel";
import {
  fetchEmployeeMasterReport,
  fetchEmployeeTransferReport,
} from "../../../services/employeesService";

const EMPTY_MASTER_FILTERS = {
  project: "all",
  status: "all",
  userLink: "all",
};

const EMPTY_TRANSFER_FILTERS = {
  dateFrom: "",
  dateTo: "",
  fromProject: "all",
  toProject: "all",
  employeeCode: "",
  status: "all",
};

const TRANSFER_STATUS_LABELS = {
  PENDING: "Pending",
  PARTIALLY_APPROVED: "Partially Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  MIXED: "Mixed Result",
};

const STATUS_LABELS = {
  ON_DUTY: "On Duty",
  VACATION: "On Vacation",
  RETIRED_RESIGNED: "Retired / Resigned",
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getCompanyId(currentCompany, currentUser) {
  return (
    currentCompany?.backendId ||
    currentCompany?.companyBackendId ||
    currentCompany?.databaseId ||
    currentCompany?.id ||
    currentUser?.companyId ||
    ""
  );
}

function getUserName(currentUser) {
  return (
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.email ||
    "Current User"
  );
}

function displayStatus(status) {
  return STATUS_LABELS[status] || String(status || "-").replaceAll("_", " ");
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function formatDate(value, includeTime = true) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return includeTime
    ? date.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
    : date.toLocaleDateString("en-GB");
}

function getProjectName(project) {
  return project?.name || project?.projectName || project?.code || "";
}

function getBatchKey(row) {
  return row.transferBatchId || `single-${row.id}`;
}

function formatTransferReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const parts = raw.split("-").filter(Boolean);
  const suffixSource = parts[parts.length - 1] || raw;
  const suffix = suffixSource.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();

  return suffix ? `ETR-${suffix}` : raw;
}

function getBatchStatus(items) {
  const statuses = [...new Set(items.map((item) => item.status).filter(Boolean))];
  if (statuses.length === 1) return statuses[0];
  if (statuses.includes("PENDING") || statuses.includes("PARTIALLY_APPROVED")) {
    return "PARTIALLY_APPROVED";
  }
  return "MIXED";
}

function getDecisionDate(items) {
  const dates = items
    .map((item) => item.rejectedAt || item.approvedAt || item.appliedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((value) => value.getTime()))).toISOString();
}

function groupTransferRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = getBatchKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      transferRef: items[0]?.transferBatchId || items[0]?.id || "-",
      requestedAt: items[0]?.requestedAt,
      fromProjectName: items[0]?.fromProjectName,
      toProjectName: items[0]?.toProjectName,
      requestedByName: items[0]?.requestedByName,
      status: getBatchStatus(items),
      decisionAt: getDecisionDate(items),
      items,
    }))
    .sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
}

function TransferStatusBadge({ status }) {
  const style =
    status === "APPROVED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "REJECTED"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
        : status === "PENDING"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-sky-500/30 bg-sky-500/10 text-sky-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${style}`}>
      {TRANSFER_STATUS_LABELS[status] || displayStatus(status)}
    </span>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "ON_DUTY"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "VACATION"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-rose-500/30 bg-rose-500/10 text-rose-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${style}`}>
      {displayStatus(status)}
    </span>
  );
}

function SummaryCard({ label, value, tone = "amber" }) {
  const tones = {
    amber: "text-amber-300",
    green: "text-emerald-300",
    blue: "text-sky-300",
    red: "text-rose-300",
    slate: "text-slate-200",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tones[tone] || tones.amber}`}>{value ?? 0}</p>
    </div>
  );
}

function EmployeeMasterReport({ selectedReport, currentUser, currentCompany, projects, onBack }) {
  const [draftFilters, setDraftFilters] = useState(EMPTY_MASTER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_MASTER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});

  const projectOptions = useMemo(() => {
    const fromRows = rows.map((row) => row.projectName).filter(Boolean);
    const fromProps = (projects || []).map((project) => project?.name || project?.projectName).filter(Boolean);
    return [...new Set([...fromProps, ...fromRows])].sort((a, b) => a.localeCompare(b));
  }, [projects, rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (appliedFilters.project !== "all" && normalize(row.projectName) !== normalize(appliedFilters.project)) {
        return false;
      }
      if (appliedFilters.status !== "all" && row.status !== appliedFilters.status) return false;
      if (appliedFilters.userLink === "linked" && !row.userLinked) return false;
      if (appliedFilters.userLink === "not-linked" && row.userLinked) return false;
      return true;
    });
  }, [rows, appliedFilters]);

  const visibleSummary = useMemo(() => ({
    total: filteredRows.length,
    onDuty: filteredRows.filter((row) => row.status === "ON_DUTY").length,
    onVacation: filteredRows.filter((row) => row.status === "VACATION").length,
    retiredResigned: filteredRows.filter((row) => row.status === "RETIRED_RESIGNED").length,
    linkedUsers: filteredRows.filter((row) => row.userLinked).length,
  }), [filteredRows]);

  const reportMeta = {
    title: selectedReport?.title || "Employee Master Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
  };

  const reportFilters = [
    { label: "Project", value: appliedFilters.project === "all" ? "All Projects" : appliedFilters.project },
    { label: "Status", value: appliedFilters.status === "all" ? "All Statuses" : displayStatus(appliedFilters.status) },
    { label: "User Link", value: appliedFilters.userLink === "all" ? "All Employees" : appliedFilters.userLink === "linked" ? "Linked" : "Not Linked" },
  ];

  async function generateReport() {
    setLoading(true);
    setError("");
    try {
      const companyId = getCompanyId(currentCompany, currentUser);
      const result = await fetchEmployeeMasterReport({ companyId });
      setRows(result.rows);
      setSummary(result.summary);
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Failed to generate employee report.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    printReport({
      ...reportMeta,
      filters: reportFilters,
      totals: [
        { label: "Employees", value: visibleSummary.total },
        { label: "On Duty", value: visibleSummary.onDuty },
        { label: "On Vacation", value: visibleSummary.onVacation },
        { label: "Linked Users", value: visibleSummary.linkedUsers },
      ],
      columns: ["Employee Code", "Employee Name", "Project", "Job Title", "Mobile", "Email", "Status", "User Linked", "User Role"],
      rows: filteredRows.map((row) => [
        displayValue(row.employeeCode), displayValue(row.employeeName), displayValue(row.projectName),
        displayValue(row.jobTitle), displayValue(row.phone), displayValue(row.email), displayStatus(row.status),
        row.userLinked ? "Yes" : "No", displayValue(row.linkedUserRole),
      ]),
      note: "Employee values are shown from the current company employee master data.",
    });
  }

  function handleExport() {
    exportReportToExcel({
      fileName: "Employee_Master_Report",
      sheetName: "Employee Master",
      ...reportMeta,
      filters: reportFilters,
      rows: filteredRows.map((row) => ({
        "Employee Code": displayValue(row.employeeCode),
        "Employee Name": displayValue(row.employeeName),
        Project: displayValue(row.projectName),
        "Job Title": displayValue(row.jobTitle),
        Mobile: displayValue(row.phone),
        Email: displayValue(row.email),
        Status: displayStatus(row.status),
        "User Linked": row.userLinked ? "Yes" : "No",
        "User Role": displayValue(row.linkedUserRole),
      })),
      totals: { "Employee Code": "Total", "Employee Name": visibleSummary.total },
    });
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-300">← Back to Reports</button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Team Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
            </div>
            <ReportToolbar onOpenFilters={() => setFiltersOpen(true)} onPrint={handlePrint} onExport={handleExport} disabled={!reportGenerated || !filteredRows.length} />
          </div>
        </section>

        {!reportGenerated ? (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
            <div className="text-4xl">👷</div>
            <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select employee report filters first</h2>
            <p className="mt-3 text-sm text-slate-400">Choose project, employment status and user-link status, then generate the report.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Total Employees" value={visibleSummary.total} />
              <SummaryCard label="On Duty" value={visibleSummary.onDuty} tone="green" />
              <SummaryCard label="On Vacation" value={visibleSummary.onVacation} tone="blue" />
              <SummaryCard label="Retired / Resigned" value={visibleSummary.retiredResigned} tone="red" />
              <SummaryCard label="Linked Users" value={visibleSummary.linkedUsers} tone="slate" />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div><h2 className="font-extrabold text-white">Employee Details</h2><p className="mt-1 text-xs text-slate-500">{filteredRows.length} of {summary.total ?? rows.length} employees</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full text-left text-sm">
                  <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-amber-300"><tr>
                    {["Employee Code", "Employee Name", "Project", "Job Title", "Mobile", "Email", "Status", "User Linked", "User Role"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRows.map((row, index) => <tr key={row.id || `${row.employeeCode}-${index}`} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-extrabold text-amber-300">{displayValue(row.employeeCode)}</td>
                      <td className="px-4 py-3 font-bold text-white">{displayValue(row.employeeName)}</td>
                      <td className="px-4 py-3">{displayValue(row.projectName)}</td>
                      <td className="px-4 py-3">{displayValue(row.jobTitle)}</td>
                      <td className="px-4 py-3">{displayValue(row.phone)}</td>
                      <td className="px-4 py-3">{displayValue(row.email)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3"><span className={row.userLinked ? "text-emerald-300" : "text-slate-500"}>{row.userLinked ? "Yes" : "No"}</span></td>
                      <td className="px-4 py-3">{displayValue(row.linkedUserRole)}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p><h2 className="mt-1 text-xl font-black text-white">Employee Master Filters</h2></div><button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white">×</button></div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Project</span><select value={draftFilters.project} onChange={(event) => setDraftFilters((value) => ({ ...value, project: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Projects</option>{projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Employment Status</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Statuses</option><option value="ON_DUTY">On Duty</option><option value="VACATION">On Vacation</option><option value="RETIRED_RESIGNED">Retired / Resigned</option></select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">User Account</span><select value={draftFilters.userLink} onChange={(event) => setDraftFilters((value) => ({ ...value, userLink: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Employees</option><option value="linked">Linked Users</option><option value="not-linked">Not Linked</option></select></label>
                {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div> : null}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 p-5">
                <button type="button" disabled={loading} onClick={() => setDraftFilters(EMPTY_MASTER_FILTERS)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300">Reset</button>
                <button type="button" disabled={loading} onClick={generateReport} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:cursor-wait disabled:opacity-60">{loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}</button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmployeeTransferReport({ selectedReport, currentUser, currentCompany, projects, onBack }) {
  const [draftFilters, setDraftFilters] = useState(EMPTY_TRANSFER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_TRANSFER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const projectOptions = useMemo(() => {
    const names = [
      ...(projects || []).map(getProjectName),
      ...rows.flatMap((row) => [row.fromProjectName, row.toProjectName]),
    ].filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [projects, rows]);

  const batches = useMemo(() => groupTransferRows(rows), [rows]);

  const filteredBatches = useMemo(() => {
    const fromDate = appliedFilters.dateFrom ? new Date(`${appliedFilters.dateFrom}T00:00:00`) : null;
    const toDate = appliedFilters.dateTo ? new Date(`${appliedFilters.dateTo}T23:59:59.999`) : null;
    const employeeNeedle = normalize(appliedFilters.employeeCode);

    return batches.filter((batch) => {
      const requestedAt = new Date(batch.requestedAt || 0);
      if (fromDate && requestedAt < fromDate) return false;
      if (toDate && requestedAt > toDate) return false;
      if (appliedFilters.fromProject !== "all" && normalize(batch.fromProjectName) !== normalize(appliedFilters.fromProject)) return false;
      if (appliedFilters.toProject !== "all" && normalize(batch.toProjectName) !== normalize(appliedFilters.toProject)) return false;
      if (appliedFilters.status !== "all") {
        const statusMatches = employeeNeedle
          ? batch.items.some(
              (item) =>
                normalize(item.employeeCode).includes(employeeNeedle) &&
                item.status === appliedFilters.status
            )
          : batch.status === appliedFilters.status;
        if (!statusMatches) return false;
      }
      if (employeeNeedle && !batch.items.some((item) => normalize(item.employeeCode).includes(employeeNeedle))) return false;
      return true;
    });
  }, [batches, appliedFilters]);

  const visibleEmployeeRows = useMemo(() => {
    const employeeNeedle = normalize(appliedFilters.employeeCode);

    return filteredBatches.flatMap((batch) =>
      batch.items
        .filter(
          (item) =>
            !employeeNeedle ||
            normalize(item.employeeCode).includes(employeeNeedle)
        )
        .map((item) => ({ ...item, transferRef: batch.transferRef }))
    );
  }, [filteredBatches, appliedFilters.employeeCode]);

  const visibleSummary = useMemo(() => ({
    batches: filteredBatches.length,
    employees: new Set(
      visibleEmployeeRows.map(
        (row) => row.employeeCode || row.employeeBackendId || row.id
      )
    ).size,
    transferRecords: visibleEmployeeRows.length,
    pending: visibleEmployeeRows.filter((row) => row.status === "PENDING" || row.status === "PARTIALLY_APPROVED").length,
    approved: visibleEmployeeRows.filter((row) => row.status === "APPROVED").length,
    rejected: visibleEmployeeRows.filter((row) => row.status === "REJECTED").length,
  }), [filteredBatches, visibleEmployeeRows]);

  const reportMeta = {
    title: selectedReport?.title || "Employee Transfer Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
  };

  const reportFilters = [
    { label: "Period", value: appliedFilters.dateFrom || appliedFilters.dateTo ? `${appliedFilters.dateFrom || "Beginning"} to ${appliedFilters.dateTo || "Today"}` : "All Dates" },
    { label: "From Project", value: appliedFilters.fromProject === "all" ? "All Projects" : appliedFilters.fromProject },
    { label: "To Project", value: appliedFilters.toProject === "all" ? "All Projects" : appliedFilters.toProject },
    { label: "Employee Code", value: appliedFilters.employeeCode || "All Employees" },
    { label: "Status", value: appliedFilters.status === "all" ? "All Statuses" : TRANSFER_STATUS_LABELS[appliedFilters.status] || appliedFilters.status },
  ];

  async function generateReport() {
    setLoading(true);
    setError("");
    try {
      const companyId = getCompanyId(currentCompany, currentUser);
      const result = await fetchEmployeeTransferReport({ companyId });
      setRows(result.rows);
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Failed to generate employee transfer report.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    printReport({
      ...reportMeta,
      filters: reportFilters,
      totals: [
        { label: "Transfer Requests", value: visibleSummary.batches },
        { label: "Unique Employees", value: visibleSummary.employees },
        { label: "Approved Transfers", value: visibleSummary.approved },
        { label: "Rejected Transfers", value: visibleSummary.rejected },
      ],
      columns: ["Transfer Ref", "Request Date", "Employee Code", "Employee Name", "From Project", "To Project", "Requested By", "Decision Date", "Status"],
      rows: visibleEmployeeRows.map((row) => [
        formatTransferReference(row.transferRef), formatDate(row.requestedAt), displayValue(row.employeeCode),
        displayValue(row.employeeName), displayValue(row.fromProjectName), displayValue(row.toProjectName),
        displayValue(row.requestedByName), formatDate(row.rejectedAt || row.approvedAt || row.appliedAt),
        TRANSFER_STATUS_LABELS[row.status] || displayStatus(row.status),
      ]),
      note: "Bulk transfers are grouped by Transfer Ref on screen and expanded by employee in this printout.",
    });
  }

  function handleExport() {
    exportReportToExcel({
      fileName: "Employee_Transfer_Report",
      sheetName: "Employee Transfers",
      ...reportMeta,
      filters: reportFilters,
      rows: visibleEmployeeRows.map((row) => ({
        "Transfer Ref": formatTransferReference(row.transferRef),
        "Request Date": formatDate(row.requestedAt),
        "Employee Code": displayValue(row.employeeCode),
        "Employee Name": displayValue(row.employeeName),
        "From Project": displayValue(row.fromProjectName),
        "To Project": displayValue(row.toProjectName),
        "Requested By": displayValue(row.requestedByName),
        "Decision Date": formatDate(row.rejectedAt || row.approvedAt || row.appliedAt),
        Status: TRANSFER_STATUS_LABELS[row.status] || displayStatus(row.status),
      })),
      totals: { "Transfer Ref": "Transfer Records", "Request Date": visibleSummary.transferRecords },
    });
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-300">← Back to Reports</button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Team Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
            </div>
            <ReportToolbar onOpenFilters={() => setFiltersOpen(true)} onPrint={handlePrint} onExport={handleExport} disabled={!reportGenerated || !visibleEmployeeRows.length} />
          </div>
        </section>

        {!reportGenerated ? (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
            <div className="text-4xl">🔁</div>
            <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select employee transfer filters first</h2>
            <p className="mt-3 text-sm text-slate-400">Choose the period, projects, employee code and status, then generate the report.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Transfer Requests" value={visibleSummary.batches} />
              <SummaryCard label="Unique Employees" value={visibleSummary.employees} tone="slate" />
              <SummaryCard label="Pending Transfers" value={visibleSummary.pending} tone="blue" />
              <SummaryCard label="Approved Transfers" value={visibleSummary.approved} tone="green" />
              <SummaryCard label="Rejected Transfers" value={visibleSummary.rejected} tone="red" />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-extrabold text-white">Employee Transfer History</h2><p className="mt-1 text-xs text-slate-500">{filteredBatches.length} transfer requests · {visibleSummary.transferRecords} employee transfer record(s) · {visibleSummary.employees} unique employee(s)</p></div>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full text-left text-sm">
                  <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-amber-300"><tr>
                    {["Transfer Ref", "Request Date", "From Project", "To Project", "Employees", "Requested By", "Decision Date", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredBatches.map((batch) => <tr key={batch.key} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3"><button type="button" onClick={() => setSelectedBatch(batch)} title={batch.transferRef} className="font-extrabold text-amber-300 underline decoration-dotted underline-offset-4 hover:text-amber-200">{formatTransferReference(batch.transferRef)}</button></td>
                      <td className="px-4 py-3">{formatDate(batch.requestedAt)}</td>
                      <td className="px-4 py-3">{displayValue(batch.fromProjectName)}</td>
                      <td className="px-4 py-3 font-bold text-white">{displayValue(batch.toProjectName)}</td>
                      <td className="px-4 py-3"><span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 font-extrabold">{batch.items.length}</span></td>
                      <td className="px-4 py-3">{displayValue(batch.requestedByName)}</td>
                      <td className="px-4 py-3">{formatDate(batch.decisionAt)}</td>
                      <td className="px-4 py-3"><TransferStatusBadge status={batch.status} /></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p><h2 className="mt-1 text-xl font-black text-white">Employee Transfer Filters</h2></div><button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white">×</button></div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-sm font-bold text-slate-300">Date From</span><input type="date" value={draftFilters.dateFrom} onChange={(event) => setDraftFilters((value) => ({ ...value, dateFrom: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><label><span className="mb-2 block text-sm font-bold text-slate-300">Date To</span><input type="date" value={draftFilters.dateTo} onChange={(event) => setDraftFilters((value) => ({ ...value, dateTo: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label></div>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">From Project</span><select value={draftFilters.fromProject} onChange={(event) => setDraftFilters((value) => ({ ...value, fromProject: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Projects</option>{projectOptions.map((project) => <option key={`from-${project}`} value={project}>{project}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">To Project</span><select value={draftFilters.toProject} onChange={(event) => setDraftFilters((value) => ({ ...value, toProject: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Projects</option>{projectOptions.map((project) => <option key={`to-${project}`} value={project}>{project}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Employee Code</span><input value={draftFilters.employeeCode} onChange={(event) => setDraftFilters((value) => ({ ...value, employeeCode: event.target.value }))} placeholder="All employees" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Status</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="all">All Statuses</option><option value="PENDING">Pending</option><option value="PARTIALLY_APPROVED">Partially Approved</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="MIXED">Mixed Result</option></select></label>
                {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div> : null}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 p-5"><button type="button" disabled={loading} onClick={() => setDraftFilters(EMPTY_TRANSFER_FILTERS)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300">Reset</button><button type="button" disabled={loading} onClick={generateReport} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:cursor-wait disabled:opacity-60">{loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}</button></div>
            </aside>
          </div>
        ) : null}

        {selectedBatch ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <button type="button" aria-label="Close batch details" onClick={() => setSelectedBatch(null)} className="absolute inset-0 h-full w-full" />
            <section className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-800 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Transfer Batch</p><h2 className="mt-1 text-xl font-black text-white">{formatTransferReference(selectedBatch.transferRef)}</h2><p className="mt-1 text-xs text-slate-500">Full reference: {selectedBatch.transferRef}</p><p className="mt-2 text-sm text-slate-400">{displayValue(selectedBatch.fromProjectName)} → {displayValue(selectedBatch.toProjectName)} · {selectedBatch.items.length} employee(s)</p></div><button type="button" onClick={() => setSelectedBatch(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300">Close</button></div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
                {selectedBatch.items.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-extrabold text-white">{displayValue(item.employeeCode)} · {displayValue(item.employeeName)}</p><p className="mt-1 text-xs text-slate-500">Requested by {displayValue(item.requestedByName)} on {formatDate(item.requestedAt)}</p></div><TransferStatusBadge status={item.status} /></div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {(item.approvals || []).map((approval) => <div key={approval.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{displayValue(approval.approvalStage)}</p><p className="mt-1 font-bold text-slate-200">{displayValue(approval.approverName)}</p><p className="mt-1 text-xs text-slate-400">{TRANSFER_STATUS_LABELS[approval.status] || displayStatus(approval.status)} · {formatDate(approval.reviewedAt)}</p>{approval.note ? <p className="mt-2 text-xs text-slate-400">{approval.note}</p> : null}</div>)}
                  </div>
                  {item.rejectionReason ? <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">Rejection reason: {item.rejectionReason}</div> : null}
                </article>)}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EmployeesReportsPage(props) {
  if (props.selectedReport?.id === "employee-master") {
    return <EmployeeMasterReport {...props} />;
  }

  if (props.selectedReport?.id === "employee-transfer") {
    return <EmployeeTransferReport {...props} />;
  }

  return null;
}
