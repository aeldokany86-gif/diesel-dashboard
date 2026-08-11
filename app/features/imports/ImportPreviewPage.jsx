"use client";

import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { confirmImportBatch } from "../../services/importsService";

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error?.message === "string" && data.error.message.trim()) return data.error.message;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

const VALIDATION_ISSUE_TRANSLATION_KEYS = {
  // Projects
  EMPTY_PROJECT_CODE: "emptyProjectCode",
  EMPTY_PROJECT_NAME: "emptyProjectName",
  PROJECT_CODE_TOO_LONG: "projectCodeTooLong",
  PROJECT_NAME_TOO_LONG: "projectNameTooLong",
  LOCATION_TOO_LONG: "locationTooLong",
  DESCRIPTION_TOO_LONG: "descriptionTooLong",
  INVALID_PROJECT_STATUS: "invalidProjectStatus",
  INVALID_PROJECT_START_DATE: "invalidProjectStartDate",
  PROJECT_START_DATE_IN_FUTURE: "projectStartDateInFuture",
  INVALID_BASE_PRICE: "invalidBasePrice",
  INVALID_TRANSPORT_COST: "invalidTransportCost",
  INVALID_VAT_RATE: "invalidVatRate",
  DUPLICATE_PROJECT_CODE_IN_FILE: "duplicateProjectCodeInFile",
  PROJECT_CODE_ALREADY_EXISTS: "projectCodeAlreadyExists",
  PROJECT_CODE_PREVIOUSLY_USED: "projectCodePreviouslyUsed",

  // Employees
  EMPTY_EMPLOYEE_ID: "emptyEmployeeId",
  EMPTY_EMPLOYEE_NAME: "emptyEmployeeName",
  DUPLICATE_EMPLOYEE_ID_IN_FILE: "duplicateEmployeeIdInFile",
  EMPLOYEE_ID_ALREADY_EXISTS: "employeeIdAlreadyExists",
  EMPLOYEE_ID_PREVIOUSLY_USED: "employeeIdPreviouslyUsed",

  // Shared project assignment validation
  PROJECT_CODE_NOT_FOUND: "projectCodeNotFound",
  PROJECT_INACTIVE: "projectInactive",

  // Assets
  EMPTY_ASSET_ID: "emptyAssetId",
  EMPTY_ASSET_TYPE: "emptyAssetType",
  DUPLICATE_ASSET_ID_IN_FILE: "duplicateAssetIdInFile",
  ASSET_ID_ALREADY_EXISTS: "assetIdAlreadyExists",
  ASSET_ID_PREVIOUSLY_USED: "assetIdPreviouslyUsed",
  INVALID_FUEL_TANK_CAPACITY: "invalidFuelTankCapacity",
  NEGATIVE_FUEL_TANK_CAPACITY: "negativeFuelTankCapacity",
  INVALID_CURRENT_ODOMETER: "invalidCurrentOdometer",
  NEGATIVE_CURRENT_ODOMETER: "negativeCurrentOdometer",

  // Stations
  EMPTY_STATION_ID: "emptyStationId",
  DUPLICATE_STATION_ID_IN_FILE: "duplicateStationIdInFile",
  STATION_ID_ALREADY_EXISTS: "stationIdAlreadyExists",
  STATION_ID_PREVIOUSLY_USED: "stationIdPreviouslyUsed",
  INVALID_CAPACITY: "invalidCapacity",
  INVALID_OPENING_BALANCE: "invalidOpeningBalance",
  NEGATIVE_OPENING_BALANCE: "negativeOpeningBalance",
  INVALID_CURRENT_COUNTER: "invalidCurrentCounter",
  NEGATIVE_CURRENT_COUNTER: "negativeCurrentCounter",
};

function getTranslatedIssue(issue, t) {
  const code = String(issue?.code || "").trim();
  const translationKey = VALIDATION_ISSUE_TRANSLATION_KEYS[code];

  if (translationKey) {
    return t(`dataImport.validationIssues.${translationKey}`);
  }

  return issue?.message || code || t("dataImport.issue");
}

function ResultCell({ row, t }) {
  const errors = Array.isArray(row.errors) ? row.errors : [];
  const warnings = Array.isArray(row.warnings) ? row.warnings : [];

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <span className="font-bold text-emerald-700">
        {t("dataImport.valid")}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {errors.map((issue, index) => (
        <div key={`error-${issue.code || index}-${index}`} className="text-red-700">
          {getTranslatedIssue(issue, t)}
        </div>
      ))}
      {warnings.map((issue, index) => (
        <div key={`warning-${issue.code || index}-${index}`} className="text-amber-700">
          {getTranslatedIssue(issue, t)}
        </div>
      ))}
    </div>
  );
}

export default function ImportPreviewPage({
  preview,
  fileName = "",
  onBack,
  onConfirmSuccess,
}) {
  const { t } = useLanguage();
  const summary = preview?.summary || {};
  const rows = Array.isArray(preview?.rows) ? preview.rows : [];
  const importType = String(preview?.importType || "PROJECTS").toUpperCase();
  const isEmployees = importType === "EMPLOYEES";
  const isAssets = importType === "ASSETS";
  const isStations = importType === "STATIONS";

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const canConfirm = Boolean(summary.canConfirm) && !confirming;

  const previewTitle = isEmployees
    ? t("dataImport.previewReport.employeesTitle")
    : isAssets
      ? t("dataImport.previewReport.assetsTitle")
      : isStations
        ? t("dataImport.previewReport.stationsTitle")
        : t("dataImport.previewReport.title");

  const listTitle = isEmployees
    ? t("dataImport.previewReport.employeesList")
    : isAssets
      ? t("dataImport.previewReport.assetsList")
      : isStations
        ? t("dataImport.previewReport.stationsList")
        : t("dataImport.previewReport.projectsList");

  const confirmTitle = isEmployees
    ? t("dataImport.confirmImport.employeesTitle")
    : isAssets
      ? t("dataImport.confirmImport.assetsTitle")
      : isStations
        ? t("dataImport.confirmImport.stationsTitle")
        : t("dataImport.confirmImport.title");

  const confirmMessage = isEmployees
    ? t("dataImport.confirmImport.employeesMessage")
    : isAssets
      ? t("dataImport.confirmImport.assetsMessage")
      : isStations
        ? t("dataImport.confirmImport.stationsMessage")
        : t("dataImport.confirmImport.message");

  const successMessage = isEmployees
    ? t("dataImport.successDialog.employeesMessage")
    : isAssets
      ? t("dataImport.successDialog.assetsMessage")
      : isStations
        ? t("dataImport.successDialog.stationsMessage")
        : t("dataImport.successDialog.message");

  const formatEmployeeStatus = (value) =>
    String(value || "").toUpperCase() === "ON_DUTY"
      ? t("enumValues.employeeStatus.onDuty")
      : valueOrDash(value);

  const formatLinkedUserStatus = (value) =>
    String(value || "").toUpperCase() === "NOT_LINKED"
      ? t("enumValues.userStatus.notLinked")
      : valueOrDash(value);

  async function handleConfirmImport() {
    if (!preview?.batchId || !summary.canConfirm || confirming) return;

    setConfirming(true);
    setConfirmError("");

    try {
      const result = await confirmImportBatch(preview.batchId);

      if (result?.batch?.status !== "COMPLETED") {
        throw new Error(t("dataImport.messages.confirmUnexpectedResult"));
      }

      setShowConfirmPrompt(false);
      setShowSuccessDialog(true);
    } catch (error) {
      setShowConfirmPrompt(false);
      setConfirmError(
        getApiErrorMessage(error, t("dataImport.messages.confirmFailed")),
      );
    } finally {
      setConfirming(false);
    }
  }

  function handleSuccessOk() {
    setShowSuccessDialog(false);
    onConfirmSuccess?.();
  }

  return (
    <div className="min-h-screen bg-white p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5">
          <h1 className="text-2xl font-black">{previewTitle}</h1>
          <p className="mt-1 text-xs text-slate-600">
            {t("dataImport.previewReport.generatedAt")}:{" "}
            {new Date().toLocaleString()}
            {" | "}
            {t("dataImport.company")}:{" "}
            {preview?.company?.name || preview?.company?.code || "—"}
            {" | "}
            {t("dataImport.batchId")}: {preview?.batchId || "—"}
          </p>
          {fileName && (
            <p className="mt-1 text-xs text-slate-600">
              {t("dataImport.selectedFile")}: {fileName}
            </p>
          )}
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [t("dataImport.totalRows"), summary.totalRows ?? 0],
            [t("dataImport.validRows"), summary.validRows ?? 0],
            [t("dataImport.invalidRows"), summary.invalidRows ?? 0],
            [t("dataImport.warningRows"), summary.warningRows ?? 0],
            [
              t("dataImport.confirmStatus"),
              summary.canConfirm
                ? t("dataImport.readyToConfirm")
                : t("dataImport.notReadyToConfirm"),
            ],
          ].map(([label, value]) => (
            <div key={label} className="border border-slate-300 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-2 text-sm font-black text-slate-800">{listTitle}</div>

        {isEmployees ? (
          <div className="overflow-x-auto border border-slate-300">
            <table className="min-w-[1200px] w-full border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">#</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.employeeId")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.employeeName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.phone")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.email")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectCode")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.jobTitle")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.workStatus")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.userStatus")}</th>
                  <th className="border-b border-slate-300 px-2 py-2 text-start">{t("dataImport.result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const data = row.normalizedData || row.sourceData || {};
                  const computed = row.computedData || {};

                  return (
                    <tr key={row.rowId || row.id || row.rowNumber}>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{row.rowNumber}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.employeeId)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.employeeName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.phone)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.email)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectCode)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.projectName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.jobTitle)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{formatEmployeeStatus(computed.status || data.status)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{formatLinkedUserStatus(computed.linkedUserStatus)}</td>
                      <td className="border-b border-slate-200 px-2 py-2 align-top">
                        <ResultCell row={row} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : isAssets ? (
          <div className="overflow-x-auto border border-slate-300">
            <table className="min-w-[1200px] w-full border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">#</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.assetId")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.assetType")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.category")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.fuelTankCapacity")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectCode")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.currentOdometer")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.lifetimeOdometer")}</th>
                  <th className="border-b border-slate-300 px-2 py-2 text-start">{t("dataImport.result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const data = row.normalizedData || row.sourceData || {};
                  const computed = row.computedData || {};

                  return (
                    <tr key={row.rowId || row.id || row.rowNumber}>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{row.rowNumber}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.assetId)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.assetType)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.category)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.fuelTankCapacity)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectCode)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.projectName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.currentOdometer)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.currentLifetimeOdometer)}</td>
                      <td className="border-b border-slate-200 px-2 py-2 align-top">
                        <ResultCell row={row} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : isStations ? (
          <div className="overflow-x-auto border border-slate-300">
            <table className="min-w-[1250px] w-full border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">#</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.stationId")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.stationName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.stationType")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.capacity")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectCode")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.openingBalance")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.currentCounter")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.currentStock")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.lifetimeCounter")}</th>
                  <th className="border-b border-slate-300 px-2 py-2 text-start">{t("dataImport.result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const data = row.normalizedData || row.sourceData || {};
                  const computed = row.computedData || {};

                  return (
                    <tr key={row.rowId || row.id || row.rowNumber}>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{row.rowNumber}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.stationId)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.stationName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.stationType)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.capacity)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectCode)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.projectName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.openingBalance)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.currentCounter)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.currentStock)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(computed.currentLifetimeCounter)}</td>
                      <td className="border-b border-slate-200 px-2 py-2 align-top">
                        <ResultCell row={row} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-300">
            <table className="min-w-[1350px] w-full border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">#</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectCode")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectName")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.location")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.status")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.projectStartDate")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.basePrice")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.transportCost")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.vat")}</th>
                  <th className="border-b border-e border-slate-300 px-2 py-2 text-start">{t("dataImport.fields.operationalPrice")}</th>
                  <th className="border-b border-slate-300 px-2 py-2 text-start">{t("dataImport.result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const data = row.normalizedData || row.sourceData || {};
                  const computed = row.computedData || {};

                  return (
                    <tr key={row.rowId || row.id || row.rowNumber}>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{row.rowNumber}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectCode)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectName)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.location)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.status)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.projectStartDate)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.basePricePerLiter)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.transportCostPerLiter)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top">{valueOrDash(data.vatRate)}</td>
                      <td className="border-b border-e border-slate-200 px-2 py-2 align-top font-bold">{valueOrDash(computed.operationalPricePerLiter)}</td>
                      <td className="border-b border-slate-200 px-2 py-2 align-top">
                        <ResultCell row={row} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={`mt-5 border p-3 text-sm ${
            summary.canConfirm
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {summary.canConfirm
            ? t("dataImport.confirmReadyNotice")
            : t("dataImport.confirmBlockedNotice")}
        </div>

        {confirmError && (
          <div className="mt-3 border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {confirmError}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={confirming}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("dataImport.actions.backToImportCenter")}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmPrompt(true)}
            disabled={!canConfirm}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {confirming
              ? t("dataImport.actions.confirmingImport")
              : t("dataImport.actions.confirmImport")}
          </button>
        </div>
      </div>

      {showConfirmPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">{confirmTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmMessage}</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmPrompt(false)}
                disabled={confirming}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={confirming}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirming
                  ? t("dataImport.actions.confirmingImport")
                  : t("dataImport.actions.confirmImport")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessDialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
              ✓
            </div>
            <h2 className="mt-3 text-lg font-black text-slate-950">
              {t("dataImport.successDialog.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <button
              type="button"
              onClick={handleSuccessOk}
              className="mt-5 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
