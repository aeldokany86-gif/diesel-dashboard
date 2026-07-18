// FILE: app/features/companies/CompaniesPage.jsx
// Replace only the CompaniesPage component file with this content.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import StatusBadge from "../../components/feedback/StatusBadge";
import ModalPortal from "../../components/ui/ModalPortal";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  normalizeScopeValue,
  normalizeText,
  isSameText,
  formatNumber,
} from "../../lib/helpers";

import {
  COUNTRY_SETTINGS_OPTIONS,
  getCompanyCountrySettings,
  getCurrencyByCountry,
  getTimezoneByCountry,
  getCurrencyOptionsForCountry,
  normalizeCurrencyForCountry,
  normalizeCountryName,
  normalizeCompanyForState,
  isPlatformCompany,
  isPlatformContextValue,
  getPlatformCompanyId,
  companyMatches,
  isPlatformAdminUser,
  mergePlatformConsoleWithCompanies,
} from "../../lib/companyHelpers";

import {
  fetchCompanies,
  createCompanyRecord,
  updateCompanyRecord,
  updateCompanyStatus,
} from "../../services/companiesService";

const COMPANY_CONTEXT_STORAGE_KEY = "fleetfuelpro_company_context";

function notifyUser(showToastFn, type, message) {
  const safeType = type || "info";
  const safeMessage = String(message ?? "");

  if (typeof showToastFn === "function") {
    showToastFn(safeType, safeMessage);
    return;
  }

  // Avoid browser-native alert boxes so the UI remains consistent.
  if (safeType === "warning" || safeType === "error") {
    console.warn(safeMessage);
  } else {
    console.log(safeMessage);
  }
}

const NETWORK_OFFLINE_MESSAGE = "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE = "Connection to server is unavailable. Please try again.";

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkConnectionError(error) {
  if (isBrowserOffline()) return true;

  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    (!error?.response && Boolean(error?.request))
  );
}

function getFriendlyApiErrorMessage(error, fallbackMessage = BACKEND_UNAVAILABLE_MESSAGE) {
  if (isNetworkConnectionError(error)) return NETWORK_OFFLINE_MESSAGE;

  const backendMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (Array.isArray(backendMessage)) return backendMessage.join(" / ");
  if (backendMessage) return String(backendMessage);

  return fallbackMessage;
}

function canUseNetwork(showToastFn) {
  if (!isBrowserOffline()) return true;

  notifyUser(showToastFn, "warning", NETWORK_OFFLINE_MESSAGE);
  return false;
}

function logHandledApiIssue(label, error) {
  const safeLabel = String(label || "API request failed");
  const safeMessage = getFriendlyApiErrorMessage(error, BACKEND_UNAVAILABLE_MESSAGE);

  // Use warn instead of error for expected connection/backend failures so Next.js dev overlay does not block the UI.
  console.warn(`${safeLabel}: ${safeMessage}`);
}

function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

export default function CompaniesPage({ companies = [], setCompanies, currentUser, contextCompanyId = "", showToast }) {
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(COMPANY_CONTEXT_STORAGE_KEY) || "";
  });
  const [companyModalMode, setCompanyModalMode] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyConfirmModal, setCompanyConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmTone: "amber",
    onConfirm: null,
  });
  const settingsRef = useRef(null);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) || null;
  const selectedCompanyIsEditable = selectedCompany && !selectedCompany.isPlatformContext;
  const canManageCompanies = currentUser?.role === "PlatformAdmin";

  const emptyCompanyForm = {
    name: "",
    code: "",
    country: "Saudi Arabia",
    currency: "SAR",
    timezone: "Asia/Riyadh",
    language: "EN-AR",
  };

  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);

  useOutsideClick(settingsRef, () => setSettingsOpen(false));

  const companyScopeList = (() => {
    if (isPlatformAdminUser(currentUser)) {
      if (!contextCompanyId || isPlatformContextValue(contextCompanyId)) {
        return companies;
      }

      return companies.filter((company) => companyMatches(company.id, contextCompanyId));
    }

    if (currentUser?.companyId) {
      return companies.filter((company) => companyMatches(company.id, currentUser.companyId));
    }

    return [];
  })();

  const visibleCompanies = companyScopeList.filter((company) => {
    const q = normalizeScopeValue(search);
    if (!q) return true;

    return [
      company.id,
      company.name,
      company.code,
      company.country,
      company.city,
      company.currency,
      company.timezone,
      company.language,
      company.status,
    ]
      .filter(Boolean)
      .some((value) => normalizeScopeValue(value).includes(q));
  });

  const activeCompaniesCount = companyScopeList.filter((company) => company.isActive !== false).length;

  const refreshCompaniesFromBackend = async () => {
    try {
      const backendCompanies = await fetchCompanies();

      setCompanies(
        mergePlatformConsoleWithCompanies(backendCompanies)
          .map(normalizeCompanyForState)
          .filter((company) => company.id)
      );
    } catch (error) {
      logHandledApiIssue("Failed to refresh companies from backend", error);
      notifyUser(showToast, "warning", "Failed to refresh companies from backend.");
    }
  };

  const openAddCompanyModal = () => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can add companies.");
      return;
    }

    setCompanyForm(emptyCompanyForm);
    setCompanyModalMode("add");
    setSettingsOpen(false);
  };

  const openEditCompanyModal = (companyToEdit = selectedCompany) => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can edit companies.");
      return;
    }

    if (!companyToEdit || companyToEdit.isPlatformContext) {
      notifyUser(showToast, "warning", "Platform Console cannot be edited. Click a real customer company name.");
      return;
    }

    setSelectedCompanyId(companyToEdit.id);
    setCompanyForm({
      name: companyToEdit.name || "",
      code: companyToEdit.code || "",
      country: companyToEdit.country || "Saudi Arabia",
      currency: normalizeCurrencyForCountry(
        companyToEdit.country || "Saudi Arabia",
        companyToEdit.currency || getCurrencyByCountry(companyToEdit.country || "Saudi Arabia")
      ),
      timezone: companyToEdit.timezone || getTimezoneByCountry(companyToEdit.country || "Saudi Arabia"),
      language: companyToEdit.language || "EN-AR",
    });

    setCompanyModalMode("edit");
    setSettingsOpen(false);
  };

  const closeCompanyModal = () => {
    if (savingCompany) return;
    setCompanyModalMode(null);
  };

  const handleCompanyFormChange = (field, value) => {
    if (field === "country") {
      const defaultCurrency = getCurrencyByCountry(value);
      const defaultTimezone = getTimezoneByCountry(value);

      setCompanyForm((prev) => ({
        ...prev,
        country: value,
        currency: defaultCurrency,
        timezone: defaultTimezone,
      }));

      return;
    }

    setCompanyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCompany = async (event) => {
    event?.preventDefault?.();

    const payload = {
      name: companyForm.name.trim(),
      code: companyForm.code.trim(),
      country: companyForm.country.trim(),
      currency: normalizeCurrencyForCountry(companyForm.country, companyForm.currency.trim()),
      timezone: companyForm.timezone.trim() || getTimezoneByCountry(companyForm.country),
      language: companyForm.language.trim() || "EN-AR",
    };

    if (!payload.name || !payload.code) {
      notifyUser(showToast, "warning", "Company name and code are required.");
      return;
    }

    setSavingCompany(true);

    try {
      if (companyModalMode === "add") {
        const savedCompanyData = await createCompanyRecord(payload);
        const savedCompany = normalizeCompanyForState(savedCompanyData);

        setCompanies((prev) =>
          mergePlatformConsoleWithCompanies([
            ...prev.filter((company) => !company.isPlatformContext),
            savedCompany,
          ])
            .map(normalizeCompanyForState)
            .filter((company) => company.id)
        );

        setSelectedCompanyId(savedCompany.id);
        notifyUser(showToast, "success", "Company added successfully.");
      }

      if (companyModalMode === "edit" && selectedCompanyIsEditable) {
        const savedCompanyData = await updateCompanyRecord(
          selectedCompany.id,
          payload
        );
        const savedCompany = normalizeCompanyForState(savedCompanyData);

        setCompanies((prev) =>
          mergePlatformConsoleWithCompanies(
            prev
              .filter((company) => !company.isPlatformContext)
              .map((company) => (company.id === savedCompany.id ? savedCompany : company))
          )
            .map(normalizeCompanyForState)
            .filter((company) => company.id)
        );

        notifyUser(showToast, "success", "Company updated successfully.");
      }

      setCompanyModalMode(null);
      await refreshCompaniesFromBackend();
    } catch (error) {
      logHandledApiIssue("Failed to save company", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to save company."
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const executeCompanyStatusChange = async (company, nextIsActive) => {
    try {
      const updatedCompanyData = await updateCompanyStatus(
        company.id,
        nextIsActive
      );

      const updatedCompany = normalizeCompanyForState(updatedCompanyData);

      setCompanies((prev) =>
        mergePlatformConsoleWithCompanies(
          prev
            .filter((item) => !item.isPlatformContext)
            .map((item) => (item.id === updatedCompany.id ? updatedCompany : item))
        )
          .map(normalizeCompanyForState)
          .filter((item) => item.id)
      );

      notifyUser(
        showToast,
        "success",
        `Company ${nextIsActive ? "activated" : "deactivated"} successfully.`
      );
    } catch (error) {
      logHandledApiIssue("Failed to update company status", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to update company status."
      );
    }
  };

  const closeCompanyConfirmModal = () => {
    setCompanyConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      confirmTone: "amber",
      onConfirm: null,
    });
  };

  const handleToggleCompanyStatus = (company) => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can change company status.");
      return;
    }

    if (company?.isPlatformContext) {
      notifyUser(showToast, "warning", "Platform Console is a virtual context and cannot be activated or deactivated.");
      return;
    }

    const nextIsActive = company.isActive === false;
    const actionLabel = nextIsActive ? "activate" : "deactivate";
    const companyName = company.name || company.id;

    setCompanyConfirmModal({
      open: true,
      title: nextIsActive ? "Activate Company" : "Deactivate Company",
      message: `Are you sure you want to ${actionLabel} ${companyName}?`,
      confirmLabel: nextIsActive ? "Activate" : "Deactivate",
      confirmTone: nextIsActive ? "emerald" : "red",
      onConfirm: async () => {
        await executeCompanyStatusChange(company, nextIsActive);
      },
    });
  };

  const exportCompaniesCSV = () => {
    const headers = [
      "Company Name",
      "Code",
      "Country",
      "Currency",
      "Timezone",
      "Language",
      "Status",
    ];

    const rows = visibleCompanies.map((company) => [
      company.name || "",
      company.code || "",
      company.country || "",
      company.currency || "",
      company.timezone || "",
      company.language || "",
      company.isActive === false ? "Inactive" : "Active",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `fleet_fuel_pro_companies_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setSettingsOpen(false);
    notifyUser(showToast, "success", "Companies CSV exported successfully.");
  };

  const printCompanies = () => {
    setSettingsOpen(false);

    const headers = [
      "Company Name",
      "Code",
      "Country",
      "Currency",
      "Timezone",
      "Language",
      "Status",
    ];

    const rowsHtml = visibleCompanies
      .map((company) => {
        const status = company.isActive === false ? "Inactive" : "Active";

        return `
          <tr>
            <td>${company.name || "-"}</td>
            <td>${company.code || "-"}</td>
            <td>${company.country || "-"}</td>
            <td>${company.currency || "-"}</td>
            <td>${company.timezone || "-"}</td>
            <td>${company.language || "-"}</td>
            <td>${status}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=750");

    if (!printWindow) {
      notifyUser(showToast, "warning", "Popup blocked. Please allow popups to print the companies table.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Fleet Fuel PRO - Companies</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              padding: 24px;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 22px;
            }
            p {
              margin: 0 0 18px;
              color: #475569;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <h1>Fleet Fuel PRO - Companies</h1>
          <p>Printed on ${new Date().toLocaleString("en-GB")}</p>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="7">No companies found.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (currentUser?.role !== "PlatformAdmin") {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 font-bold">
          Companies console is available for Platform Admin only.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
              Platform Console
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Companies</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              Multi-company foundation for Fleet Fuel PRO. Company ID is a hidden system context used for data isolation; users do not enter it in operational screens.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-amber-300">{companies.length}</p>
              <p className="text-xs text-slate-500">Companies</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-emerald-300">
                {activeCompaniesCount}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-blue-300">
                {new Set(companies.map((company) => company.country).filter(Boolean)).size}
              </p>
              <p className="text-xs text-slate-500">Countries</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-cyan-300">
                {new Set(companies.map((company) => company.currency).filter(Boolean)).size}
              </p>
              <p className="text-xs text-slate-500">Currencies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, country, currency..."
            className="w-full sm:max-w-md rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
          />

          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-400 hover:text-amber-300 transition"
              title="Companies settings"
              aria-label="Companies settings"
            >
              <span className="flex flex-col gap-1" aria-hidden="true">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>

            {settingsOpen && (
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
                <button
                  type="button"
                  onClick={openAddCompanyModal}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">＋</span>
                  <span>Add Company</span>
                </button>
                <button
                  type="button"
                  onClick={exportCompaniesCSV}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">⇩</span>
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={printCompanies}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">⎙</span>
                  <span>Print Table</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          Click a real customer company name to open the edit screen. The internal database ID is hidden from the table and remains used only by the system APIs.
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-slate-300 sticky top-0">
              <tr>
                <th className="text-left p-3">Company Name</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Timezone</th>
                <th className="text-left p-3">Language</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((company) => {
                const isSelected = selectedCompanyId === company.id;
                const isActive = company.isActive !== false;

                return (
                  <tr
                    key={company.id}
                    className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                      isSelected ? "bg-amber-400/10" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-100">
                      {company.isPlatformContext ? (
                        <span title="Platform Console cannot be edited">{company.name || company.id}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditCompanyModal(company)}
                          className="font-black text-slate-100 cursor-pointer hover:text-amber-300 transition"
                          title="Click to edit this company"
                        >
                          {company.name || company.id}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{company.code || "-"}</td>
                    <td className="p-3 text-slate-300">{company.country || "-"}</td>
                    <td className="p-3 text-slate-300">{company.currency || "-"}</td>
                    <td className="p-3 text-slate-300">{company.timezone || "-"}</td>
                    <td className="p-3 text-slate-300">{company.language || "-"}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleCompanyStatus(company);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-black border transition ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
                        } ${company.isPlatformContext ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                        title={
                          company.isPlatformContext
                            ? "Platform Console cannot be changed"
                            : "Click to change company status"
                        }
                      >
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!visibleCompanies.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No companies found. Add companies from Settings using the backend Companies API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {companyConfirmModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
              <div className="border-b border-slate-800 px-6 pt-6 pb-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
                  Fleet Fuel PRO Confirmation
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {companyConfirmModal.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {companyConfirmModal.message}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 bg-slate-900/50 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCompanyConfirmModal}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = companyConfirmModal.onConfirm;
                    closeCompanyConfirmModal();

                    if (typeof action === "function") {
                      await action();
                    }
                  }}
                  className={`rounded-2xl border px-5 py-3 text-sm font-black transition cursor-pointer ${
                    companyConfirmModal.confirmTone === "red"
                      ? "border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      : companyConfirmModal.confirmTone === "emerald"
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                  }`}
                >
                  {companyConfirmModal.confirmLabel || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {companyModalMode && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <form
              onSubmit={handleSaveCompany}
              className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
                    Companies Management
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {companyModalMode === "add" ? "Add Company" : "Edit Company"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Company Name *</span>
                  <input
                    value={companyForm.name}
                    onChange={(e) => handleCompanyFormChange("name", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="ABC Contracting"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Company Code *</span>
                  <input
                    value={companyForm.code}
                    onChange={(e) => handleCompanyFormChange("code", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="ABC"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Country</span>
                  <select
                    value={companyForm.country}
                    onChange={(e) => handleCompanyFormChange("country", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    {COUNTRY_SETTINGS_OPTIONS.map((item) => (
                      <option key={item.country} value={item.country}>
                        {item.country}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Currency</span>
                  <select
                    value={companyForm.currency}
                    onChange={(e) => handleCompanyFormChange("currency", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    {getCurrencyOptionsForCountry(companyForm.country).map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Currency is limited to the selected country currency or USD only.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Timezone</span>
                  <select
                    value={companyForm.timezone}
                    onChange={(e) => handleCompanyFormChange("timezone", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    <option value={getTimezoneByCountry(companyForm.country)}>
                      {getTimezoneByCountry(companyForm.country)}
                    </option>
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Timezone is automatically selected based on the company country.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Language</span>
                  <input
                    value={companyForm.language}
                    onChange={(e) => handleCompanyFormChange("language", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="EN-AR"
                  />
                </label>

              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingCompany ? "Saving..." : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}


function ForcePasswordChangePage({
  theme = "dark",
  currentUser,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  loading,
  onSubmit,
  onLogout,
}) {
  return (
    <div
      data-theme={theme}
      className="theme-main-bg min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={theme === "dark" ? "/icons/fleet-fuel-pro-dark.png" : "/icons/fleet-fuel-pro-light.png"}
            alt="Fleet Fuel PRO"
            className="w-16 h-auto object-contain"
            draggable={false}
          />
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-bold">
              Password Security
            </p>
            <h1 className="text-2xl font-black text-white mt-1">Change Temporary Password</h1>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-6 mb-6">
          Your password was reset by an administrator. For security, you must create a new password before accessing Fleet Fuel PRO.
        </p>

        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{currentUser?.fullName || currentUser?.email || "User"}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Temporary Password</span>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword?.(e.target.value)}
              type="password"
              placeholder="Enter temporary password"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-400">New Password</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword?.(e.target.value)}
              type="password"
              placeholder="At least 8 characters"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-400">Confirm New Password</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword?.(e.target.value)}
              type="password"
              placeholder="Re-enter new password"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save New Password"}
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={loading}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:border-red-400 hover:text-red-300 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
