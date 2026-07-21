"use client";

import React from "react";

import { isSameText } from "../../lib/helpers";
import { makeTenantEntityKey } from "../../lib/companyHelpers";

export default function OperationCorrectionModal({
  editCell,
  setEditCell,
  assets = [],
  stations = [],
  fuelers = [],
  externalStationHistory = [],
  onClose,
  onSave,
  getDisplayValue,
  getAssetDisplayCode,
  getStationDisplayCode,
  getFuelerDisplayName,
}) {
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
      ? "Equipment"
      : editCell.field === "diesel"
      ? "Diesel Quantity"
      : editCell.field === "odometer"
      ? "Odometer"
      : editCell.field === "station"
      ? editCell.isExternalDirectRefuel
        ? "External Station"
        : "Source Station"
      : "Operator";

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10010] p-3">
      <div className="bg-white text-black w-[min(560px,calc(100vw-2rem))] rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-5 border-b pb-3">
          <h2 className="text-xl sm:text-2xl font-bold">
            Request {correctionTitle} Correction
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600">Old Value</p>
          <p className="text-xl font-bold">
            {editCell.oldValueDisplay ||
              getDisplayValue?.(editCell.field, editCell.oldValue) ||
              "-"}
          </p>
        </div>

        <div className="mb-4">
          <label className="font-medium text-gray-700">New Value</label>

          {editCell.field === "equipment" ? (
            <select
              value={editCell.newValue}
              onChange={(event) =>
                setEditCell({
                  ...editCell,
                  newValue: event.target.value,
                })
              }
              className="border rounded-lg p-3 w-full mt-2"
            >
              <option value="">Select Equipment</option>
              {assets
                .filter(
                  (asset) =>
                    asset.status?.toLowerCase() !== "retired"
                )
                .map((asset) => (
                  <option
                    key={makeTenantEntityKey(asset)}
                    value={
                      asset.backendId ||
                      asset.assetBackendId ||
                      asset.id
                    }
                  >
                    {getAssetDisplayCode?.(asset.id)} -{" "}
                    {asset.type || "-"}
                  </option>
                ))}
            </select>
          ) : editCell.field === "station" &&
            editCell.isExternalDirectRefuel ? (
            <select
              value={editCell.newValue}
              onChange={(event) =>
                setEditCell({
                  ...editCell,
                  newValue: event.target.value,
                })
              }
              className="border rounded-lg p-3 w-full mt-2"
            >
              <option value="">Select External Station</option>
              {externalStationOptions.map((stationName) => (
                <option key={stationName} value={stationName}>
                  {stationName}
                </option>
              ))}
            </select>
          ) : editCell.field === "station" ? (
            <select
              value={editCell.newValue}
              onChange={(event) =>
                setEditCell({
                  ...editCell,
                  newValue: event.target.value,
                })
              }
              className="border rounded-lg p-3 w-full mt-2"
            >
              <option value="">Select Station</option>
              {stations
                .filter(
                  (station) =>
                    !isSameText(station.id, "External_Supply")
                )
                .map((station) => (
                  <option
                    key={makeTenantEntityKey(station)}
                    value={
                      station.backendId ||
                      station.stationBackendId ||
                      station.id
                    }
                  >
                    {getStationDisplayCode?.(station.id)} -{" "}
                    {station.status || "-"}
                  </option>
                ))}
            </select>
          ) : editCell.field === "fueler" ? (
            <select
              value={editCell.newValue}
              onChange={(event) =>
                setEditCell({
                  ...editCell,
                  newValue: event.target.value,
                })
              }
              className="border rounded-lg p-3 w-full mt-2"
            >
              <option value="">Select Operator</option>
              {fuelers
                .filter((fueler) => {
                  const status = String(
                    fueler.status || "On Duty"
                  )
                    .trim()
                    .toLowerCase();

                  return status === "on duty" || status === "active";
                })
                .map((fueler) => (
                  <option
                    key={makeTenantEntityKey(fueler)}
                    value={
                      fueler.backendId ||
                      fueler.employeeBackendId ||
                      fueler.employeeId ||
                      fueler.id
                    }
                  >
                    {getFuelerDisplayName?.(
                      fueler.backendId ||
                        fueler.employeeBackendId ||
                        fueler.employeeId ||
                        fueler.id
                    )} -{" "}
                    {fueler.role || "Operator"} -{" "}
                    {fueler.status || "On Duty"}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type="number"
              value={editCell.newValue}
              onChange={(event) =>
                setEditCell({
                  ...editCell,
                  newValue: event.target.value,
                })
              }
              className="border rounded-lg p-3 w-full mt-2"
              placeholder="Enter new value"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="font-medium text-gray-700">
            Edit Reason
          </label>
          <textarea
            value={editCell.reason}
            onChange={(event) =>
              setEditCell({
                ...editCell,
                reason: event.target.value,
              })
            }
            className="border rounded-lg p-3 w-full mt-2 h-24"
            placeholder="Enter correction reason..."
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
          <button
            onClick={onClose}
            className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
          >
            Save Correction
          </button>
        </div>
      </div>
    </div>
  );
}
