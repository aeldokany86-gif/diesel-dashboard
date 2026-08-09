"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  isPlatformAdminUser,
  isPlatformCompany,
  isPlatformContextValue,
} from "../../lib/companyHelpers";
import { fetchDataImportAccess } from "../../services/importsService";

export default function DataImportCenterPage({
  currentUser,
  companies = [],
  contextCompanyId = "",
  showToast,
}) {
  const { t } = useLanguage();
  const isPlatformUser = isPlatformAdminUser(currentUser);
  const availableCompanies = useMemo(
    () =>
      companies
        .filter((company) => company?.id && !isPlatformCompany(company))
        .sort((a, b) =>
          String(a.name || a.code || a.id).localeCompare(
            String(b.name || b.code || b.id),
          ),
        ),
    [companies],
  );

  const initialCompanyId =
    isPlatformUser &&
    contextCompanyId &&
    !isPlatformContextValue(contextCompanyId)
      ? contextCompanyId
      : "";

  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      if (isPlatformUser && !selectedCompanyId) {
        setAccess(null);
        setErrorMessage("");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const result = await fetchDataImportAccess(
          isPlatformUser ? selectedCompanyId : "",
        );
        if (!cancelled) setAccess(result);
      } catch (error) {
        if (cancelled) return;
        setAccess(null);
        const message =
          error?.response?.data?.message ||
          t("dataImport.messages.accessCheckFailed");
        setErrorMessage(message);
        showToast?.("warning", message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, [isPlatformUser, selectedCompanyId, currentUser?.id]);

  const targetCompany = access?.company || null;

  return (
    <div className="min-h-screen p-4 sm:p-6 text-slate-100 space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
          {t("dataImport.eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          {t("dataImport.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {t("dataImport.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <h2 className="text-lg font-black text-white">
            {t("dataImport.targetCompanyTitle")}
          </h2>

          {isPlatformUser ? (
            <label className="mt-4 block">
              <span className="text-xs font-bold text-slate-400">
                {t("dataImport.company")}
              </span>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">{t("dataImport.selectCompany")}</option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name || company.code || company.id}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t("dataImport.platformCompanyHelp")}
              </p>
            </label>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4">
              <p className="text-xs font-bold text-slate-500">
                {t("dataImport.company")}
              </p>
              <p className="mt-1 text-base font-black text-slate-100">
                {targetCompany?.name || currentUser?.companyId || "—"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {t("dataImport.adminCompanyHelp")}
              </p>
            </div>
          )}

          {loading && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
              {t("dataImport.checkingAccess")}
            </div>
          )}

          {errorMessage && !loading && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {targetCompany && !loading && (
            <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-300">
                    {t("dataImport.readyForCompany")}
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {targetCompany.name || targetCompany.code || targetCompany.id}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                  {t("dataImport.accessReady")}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <h2 className="text-lg font-black text-white">
            {t("dataImport.foundationTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {t("dataImport.foundationDescription")}
          </p>
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {t("dataImport.uploadComingLater")}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["projects", t("dataImport.modules.projects")],
          ["employees", t("dataImport.modules.employees")],
          ["assets", t("dataImport.modules.assets")],
          ["stations", t("dataImport.modules.stations")],
        ].map(([key, label]) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <p className="font-black text-slate-100">{label}</p>
            <p className="mt-2 text-xs text-slate-500">
              {t("dataImport.modules.foundationReady")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
