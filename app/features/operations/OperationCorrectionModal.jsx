"use client";

import React from "react";

import { isSameText } from "../../lib/helpers";
import { makeTenantEntityKey } from "../../lib/companyHelpers";
import { useLanguage } from "../../context/LanguageContext";

function formatContextDate(value, language = "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OperationCorrectionModal({
  editCell,
  setEditCell,
  assets = [],
  stations = [],
  destinationStations = [],
  fuelers = [],
  operationContext = null,
  contextLoading = false,
  contextError = "",
  externalStationHistory = [],
  onClose,
  onSave,
  getDisplayValue,
  getAssetDisplayCode,
  getStationDisplayCode,
  getFuelerDisplayName,
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  if (!editCell) return null;

  const externalStationOptions = Array.from(
    new Set(
      [
        editCell.isExternalDirectRefuel ? editCell.oldValue : "",
        ...externalStationHistory,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

  const correctionTitle =
    editCell.field === "equipment"
      ? t("operationCorrection.fields.equipment")
      : editCell.field === "diesel"
      ? t("operationCorrection.fields.dieselQuantity")
      : editCell.field === "odometer"
      ? t("operationCorrection.fields.odometer")
      : editCell.field === "stationCounter"
      ? t("operationCorrection.fields.stationCounter")
      : editCell.field === "station"
      ? editCell.isExternalDirectRefuel
        ? t("operationCorrection.fields.externalStation")
        : t("operationCorrection.fields.sourceStation")
      : t("operationCorrection.fields.operator");

  const projectName =
    operationContext?.projectNameAtOperation ||
    operationContext?.sourceProjectNameAtOperation ||
    operationContext?.destinationProjectNameAtOperation ||
    "-";

  const fieldNeedsHistoricalOptions =
    ["equipment", "station", "fueler"].includes(editCell.field) &&
    !(editCell.field === "station" && editCell.isExternalDirectRefuel);

  const optionState = (items, labelKey) => {
    if (!fieldNeedsHistoricalOptions) return null;
    if (contextLoading) {
      return (
        <p className="mt-2 text-sm text-slate-500">
          {t("operationCorrection.messages.loadingHistoricalOptions")}
        </p>
      );
    }
    if (contextError) {
      return <p className="mt-2 text-sm font-medium text-red-600">{contextError}</p>;
    }
    if (!items.length) {
      return (
        <p className="mt-2 text-sm text-amber-700">
          {t("operationCorrection.messages.noEligibleOptions", {
            item: t(labelKey),
          })}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10010] p-3" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`bg-white text-black w-[min(560px,calc(100vw-2rem))] rounded-2xl shadow-2xl overflow-hidden ${isRtl ? "text-right" : "text-left"}`}>
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-5 border-b pb-3">
            <h2 className="text-xl sm:text-2xl font-bold">
              {t("operationCorrection.requestTitle", { field: correctionTitle })}
            </h2>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black text-xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 text-white rounded-xl p-4 mb-4">
            <div>
              <p className="text-xs text-slate-400">{t("operationCorrection.context.historicalProject")}</p>
              <p className="font-bold">{projectName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("operationCorrection.context.operationDate")}</p>
              <p className="font-bold">
                {formatContextDate(operationContext?.operationDate, language)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("operationCorrection.context.operation")}</p>
              <p className="font-bold">
                {operationContext?.operationNo || editCell.operationBackendId || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("operationCorrection.context.operationType")}</p>
              <p className="font-bold">
                {operationContext?.operationType || editCell.operationType || "-"}
              </p>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600">{t("operationCorrection.oldValue")}</p>
            <p className="text-xl font-bold">
              {editCell.oldValueDisplay ||
                getDisplayValue?.(editCell.field, editCell.oldValue) ||
                "-"}
            </p>
          </div>

          <div className="mb-4">
            <label className="font-medium text-gray-700">{t("operationCorrection.newValue")}</label>

            {editCell.field === "equipment" ? (
              <>
                <select
                  value={editCell.newValue}
                  disabled={contextLoading || Boolean(contextError)}
                  onChange={(event) =>
                    setEditCell({ ...editCell, newValue: event.target.value })
                  }
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`border rounded-lg p-3 w-full mt-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${isRtl ? "text-right" : "text-left"}`}
                >
                  <option value="">{t("operationCorrection.placeholders.selectEquipment")}</option>
                  {assets.map((asset) => {
                    const backendId =
                      asset.backendId || asset.assetBackendId || asset.id;
                    const displayCode =
                      asset.assetId ||
                      getAssetDisplayCode?.(backendId) ||
                      getAssetDisplayCode?.(asset.id) ||
                      asset.id ||
                      "-";

                    return (
                      <option key={makeTenantEntityKey(asset)} value={backendId}>
                        {displayCode} - {asset.type || "-"}
                      </option>
                    );
                  })}
                </select>
                {optionState(assets, "operationCorrection.items.equipment")}
              </>
            ) : editCell.field === "station" &&
              editCell.isExternalDirectRefuel ? (
              <select
                value={editCell.newValue}
                onChange={(event) =>
                  setEditCell({ ...editCell, newValue: event.target.value })
                }
                dir={isRtl ? "rtl" : "ltr"}
                className={`border rounded-lg p-3 w-full mt-2 ${isRtl ? "text-right" : "text-left"}`}
              >
                <option value="">{t("operationCorrection.placeholders.selectExternalStation")}</option>
                {externalStationOptions.map((stationName) => (
                  <option key={stationName} value={stationName}>
                    {stationName}
                  </option>
                ))}
              </select>
            ) : editCell.field === "station" ? (
              <>
                <select
                  value={editCell.newValue}
                  disabled={contextLoading || Boolean(contextError)}
                  onChange={(event) =>
                    setEditCell({ ...editCell, newValue: event.target.value })
                  }
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`border rounded-lg p-3 w-full mt-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${isRtl ? "text-right" : "text-left"}`}
                >
                  <option value="">{t("operationCorrection.placeholders.selectStation")}</option>
                  {stations
                    .filter(
                      (station) =>
                        !isSameText(station.stationId || station.id, "External_Supply")
                    )
                    .map((station) => {
                      const backendId =
                        station.backendId || station.stationBackendId || station.id;
                      const displayCode =
                        station.stationId ||
                        station.code ||
                        getStationDisplayCode?.(backendId) ||
                        getStationDisplayCode?.(station.id) ||
                        station.name ||
                        station.id ||
                        "-";

                      return (
                        <option
                          key={makeTenantEntityKey(station)}
                          value={backendId}
                        >
                          {displayCode} - {station.status || "-"}
                        </option>
                      );
                    })}
                </select>
                {optionState(stations, "operationCorrection.items.stations")}
              </>
            ) : editCell.field === "fueler" ? (
              <>
                <select
                  value={editCell.newValue}
                  disabled={contextLoading || Boolean(contextError)}
                  onChange={(event) =>
                    setEditCell({ ...editCell, newValue: event.target.value })
                  }
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`border rounded-lg p-3 w-full mt-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${isRtl ? "text-right" : "text-left"}`}
                >
                  <option value="">{t("operationCorrection.placeholders.selectOperator")}</option>
                  {fuelers.map((fueler) => {
                    const backendId =
                      fueler.backendId ||
                      fueler.employeeBackendId ||
                      fueler.id;
                    const displayName =
                      fueler.fullName ||
                      fueler.name ||
                      getFuelerDisplayName?.(backendId) ||
                      fueler.employeeId ||
                      "-";

                    return (
                      <option key={makeTenantEntityKey(fueler)} value={backendId}>
                        {displayName} - {fueler.role || fueler.jobTitle || t("operationCorrection.defaults.operator")} - {fueler.status || t("operationCorrection.defaults.onDuty")}
                      </option>
                    );
                  })}
                </select>
                {optionState(fuelers, "operationCorrection.items.operators")}
              </>
            ) : (
              <input
                type="number"
                value={editCell.newValue}
                onChange={(event) =>
                  setEditCell({ ...editCell, newValue: event.target.value })
                }
                dir={isRtl ? "rtl" : "ltr"}
                className={`border rounded-lg p-3 w-full mt-2 ${isRtl ? "text-right" : "text-left"}`}
                placeholder={t("operationCorrection.placeholders.enterNewValue")}
              />
            )}
          </div>

          <div className="mb-5">
            <label className="font-medium text-gray-700">{t("operationCorrection.editReason")}</label>
            <textarea
              value={editCell.reason}
              onChange={(event) =>
                setEditCell({ ...editCell, reason: event.target.value })
              }
              dir={isRtl ? "rtl" : "ltr"}
              className={`border rounded-lg p-3 w-full mt-2 h-24 ${isRtl ? "text-right" : "text-left"}`}
              placeholder={t("operationCorrection.placeholders.enterReason")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
          <button
            onClick={onClose}
            className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={onSave}
            disabled={
              contextLoading ||
              (fieldNeedsHistoricalOptions && Boolean(contextError))
            }
            className="bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white px-3 lg:px-4 py-2 rounded-lg"
          >
            {contextLoading
              ? t("operationCorrection.loading")
              : t("operationCorrection.saveCorrection")}
          </button>
        </div>
      </div>
    </div>
  );
}
