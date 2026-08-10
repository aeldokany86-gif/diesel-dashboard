"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  isPlatformAdminUser,
  isPlatformCompany,
  isPlatformContextValue,
} from "../../lib/companyHelpers";
import {
  downloadProjectsImportTemplate,
  fetchDataImportAccess,
  fetchProjectsImportPreview,
  uploadProjectsImport,
  validateProjectsImportBatch,
} from "../../services/importsService";
import ImportPreviewPage from "./ImportPreviewPage";

function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error?.message === "string" && data.error.message.trim()) return data.error.message;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export default function DataImportCenterPage({
  currentUser,
  companies = [],
  contextCompanyId = "",
  showToast,
  onProjectsImported,
}) {
  const { t } = useLanguage();
  const projectsFileInputRef = useRef(null);
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
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [projectsBatch, setProjectsBatch] = useState(null);
  const [projectsFileName, setProjectsFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [workflowError, setWorkflowError] = useState("");

  const targetCompanyId = isPlatformUser ? selectedCompanyId : "";
  const targetCompany = access?.company || null;
  const isBusy = Boolean(busyAction);

  const currentLanguage =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("dir") === "rtl"
      ? "ar"
      : "en";

  function resetProjectsWorkflow() {
    setProjectsBatch(null);
    setProjectsFileName("");
    setPreview(null);
    setWorkflowError("");
    if (projectsFileInputRef.current) {
      projectsFileInputRef.current.value = "";
    }
  }

  function handleProjectsImportConfirmed() {
    // Return the user to the clean Import Center immediately.
    resetProjectsWorkflow();

    // Refresh the shared projects state in the parent so Projects / Sites and
    // every other project consumer sees the imported projects without reload.
    Promise.resolve(onProjectsImported?.()).catch((error) => {
      console.warn("Failed to refresh projects after import.", error);
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      if (isPlatformUser && !selectedCompanyId) {
        setAccess(null);
        setAccessError("");
        resetProjectsWorkflow();
        return;
      }

      setLoadingAccess(true);
      setAccessError("");
      resetProjectsWorkflow();

      try {
        const result = await fetchDataImportAccess(
          isPlatformUser ? selectedCompanyId : "",
        );
        if (!cancelled) setAccess(result);
      } catch (error) {
        if (cancelled) return;
        setAccess(null);
        const message = getApiErrorMessage(
          error,
          t("dataImport.messages.accessCheckFailed"),
        );
        setAccessError(message);
        showToast?.("warning", message);
      } finally {
        if (!cancelled) setLoadingAccess(false);
      }
    }

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, [isPlatformUser, selectedCompanyId, currentUser?.id]);

  async function handleDownloadProjectsTemplate() {
    if (!targetCompany) return;
    setBusyAction("projects-download");
    setWorkflowError("");

    try {
      const blob = await downloadProjectsImportTemplate(
        targetCompanyId,
        currentLanguage,
      );
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        currentLanguage === "ar"
          ? "Projects-Import-Template-Arabic.xlsx"
          : "Projects-Import-Template-English.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast?.("success", t("dataImport.messages.templateDownloaded"));
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        t("dataImport.messages.templateDownloadFailed"),
      );
      setWorkflowError(message);
      showToast?.("error", message);
    } finally {
      setBusyAction("");
    }
  }

  function openProjectsFilePicker() {
    if (!targetCompany || isBusy) return;
    projectsFileInputRef.current?.click();
  }

  async function handleProjectsFileSelected(event) {
    const file = event.target.files?.[0] || null;
    if (!file || !targetCompany) return;

    setBusyAction("projects-upload");
    setWorkflowError("");
    setProjectsBatch(null);
    setPreview(null);
    setProjectsFileName(file.name);

    try {
      const result = await uploadProjectsImport(file, targetCompanyId);
      setProjectsBatch(result?.batch || null);
      showToast?.("success", t("dataImport.messages.uploadSucceeded"));
    } catch (error) {
      setProjectsFileName("");
      if (projectsFileInputRef.current) {
        projectsFileInputRef.current.value = "";
      }
      const message = getApiErrorMessage(
        error,
        t("dataImport.messages.uploadFailed"),
      );
      setWorkflowError(message);
      showToast?.("error", message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleValidateProjects() {
    const batchId = projectsBatch?.id;
    if (!batchId) return;

    setBusyAction("projects-validate");
    setWorkflowError("");

    try {
      await validateProjectsImportBatch(batchId);
      const result = await fetchProjectsImportPreview(batchId);
      setPreview(result);

      if ((result?.summary?.invalidRows || 0) > 0) {
        showToast?.(
          "warning",
          t("dataImport.messages.validationCompletedWithErrors").replace(
            "{{count}}",
            String(result.summary.invalidRows),
          ),
        );
      } else {
        showToast?.("success", t("dataImport.messages.validationPassed"));
      }
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        t("dataImport.messages.validationFailed"),
      );
      setWorkflowError(message);
      showToast?.("error", message);
    } finally {
      setBusyAction("");
    }
  }

  if (preview) {
    return (
      <ImportPreviewPage
        preview={preview}
        fileName={projectsFileName}
        onBack={() => setPreview(null)}
        onConfirmSuccess={handleProjectsImportConfirmed}
      />
    );
  }

  const moduleRows = [
    { key: "projects", label: t("dataImport.modules.projects"), ready: true },
    { key: "employees", label: t("dataImport.modules.employees"), ready: false },
    { key: "assets", label: t("dataImport.modules.assets"), ready: false },
    { key: "stations", label: t("dataImport.modules.stations"), ready: false },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
            {t("dataImport.eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            {t("dataImport.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {t("dataImport.simpleSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          {isPlatformUser ? (
            <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
              <label className="text-sm font-black text-slate-300">
                {t("dataImport.targetCompanyTitle")}
              </label>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">{t("dataImport.selectCompany")}</option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name || company.code || company.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-black text-slate-400">
                {t("dataImport.targetCompanyTitle")}:
              </span>
              <span className="font-black text-white">
                {targetCompany?.name || currentUser?.companyId || "—"}
              </span>
            </div>
          )}

          {loadingAccess && (
            <p className="mt-3 text-xs text-slate-500">
              {t("dataImport.checkingAccess")}
            </p>
          )}

          {accessError && !loadingAccess && (
            <p className="mt-3 text-sm text-red-300">{accessError}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-base font-black text-white">
              {t("dataImport.importTypesTitle")}
            </h2>
          </div>

          <div className="divide-y divide-slate-800">
            {moduleRows.map((module) => {
              const isProjects = module.key === "projects";
              const canUseProjects = isProjects && Boolean(targetCompany);
              const uploaded = isProjects && Boolean(projectsBatch?.id);

              return (
                <div
                  key={module.key}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(210px,1fr)_repeat(3,minmax(150px,190px))] lg:items-center"
                >
                  <div>
                    <p className="text-base font-black text-slate-100">
                      {module.label}
                    </p>
                    {isProjects && projectsFileName && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {t("dataImport.selectedFile")}: {projectsFileName}
                      </p>
                    )}
                    {!module.ready && (
                      <p className="mt-1 text-xs text-slate-600">
                        {t("dataImport.modules.comingLater")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={canUseProjects ? handleDownloadProjectsTemplate : undefined}
                    disabled={!canUseProjects || isBusy}
                    className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-black text-amber-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/40 disabled:text-slate-600"
                  >
                    {busyAction === "projects-download"
                      ? t("dataImport.actions.downloading")
                      : t("dataImport.actions.downloadTemplate")}
                  </button>

                  <button
                    type="button"
                    onClick={canUseProjects ? openProjectsFilePicker : undefined}
                    disabled={!canUseProjects || isBusy}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/40 disabled:text-slate-600"
                  >
                    {busyAction === "projects-upload"
                      ? t("dataImport.actions.uploading")
                      : uploaded
                        ? t("dataImport.actions.replaceExcel")
                        : t("dataImport.actions.uploadFile")}
                  </button>

                  <button
                    type="button"
                    onClick={uploaded ? handleValidateProjects : undefined}
                    disabled={!uploaded || isBusy}
                    className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-sm font-black text-sky-200 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/40 disabled:text-slate-600"
                  >
                    {busyAction === "projects-validate"
                      ? t("dataImport.actions.validating")
                      : t("dataImport.actions.validatePreview")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {projectsBatch?.id && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
            <span className="font-black text-slate-300">
              {t("dataImport.batchId")}:
            </span>{" "}
            {projectsBatch.id}
            <span className="mx-2 text-slate-700">•</span>
            <span className="font-black text-slate-300">
              {t("dataImport.totalRows")}:
            </span>{" "}
            {projectsBatch.totalRows}
          </div>
        )}

        {workflowError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {workflowError}
          </div>
        )}

        <input
          ref={projectsFileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleProjectsFileSelected}
          className="hidden"
        />
      </div>
    </div>
  );
}
