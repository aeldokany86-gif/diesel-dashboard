"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import ChartFrame from "../../components/charts/ChartFrame";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";
import ModalPortal from "../../components/ui/ModalPortal";
import { Fuel } from "../../components/icons/SidebarIcons";

import {
  formatNumber,
  getHeaderIndex,
  isSameText,
  normalizeScopeValue,
} from "../../lib/helpers";

import {
  mapFrontendOperationToBackendPayload,
  normalizeOperationAttachments,
  getPhotoLabel,
  getOperationTypeDisplay,
  getOperationTypeBadgeClass,
  getOperationTotalCostAtOperation,
  getAllowedTransactionTypesForUser,
  getOperationApprovalSuccessMessage,
  isAssetRefuelTransactionType,
  isExternalDirectRefuelTransactionType,
} from "../../lib/operationHelpers";

import {
  getUploadSignedUrl,
  createOperation,
} from "../../services/operationsService";

import {
  createOperationCorrection,
  fetchOperationCorrectionContext,
} from "../../services/operationCorrectionsService";
import OperationCorrectionModal from "./OperationCorrectionModal";
import AddOperationModal from "./AddOperationModal";
import useOperationsData from "./hooks/useOperationsData";
import { companyMatches } from "../../lib/companyHelpers";
import { useLanguage } from "../../context/LanguageContext";

const NETWORK_OFFLINE_MESSAGE =
  "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE =
  "Connection to server is unavailable. Please try again.";

function notifyUser(showToastFn, type, message) {
  const safeType = type || "info";
  const safeMessage = String(message ?? "");

  if (typeof showToastFn === "function") {
    showToastFn(safeType, safeMessage);
    return;
  }

  if (safeType === "warning" || safeType === "error") {
    console.warn(safeMessage);
  } else {
    console.log(safeMessage);
  }
}

function inferToastTypeFromMessage(message) {
  const normalized = String(message || "").toLowerCase();

  if (
    normalized.includes("success") ||
    normalized.includes("saved") ||
    normalized.includes("updated") ||
    normalized.includes("exported") ||
    normalized.includes("completed") ||
    normalized.includes("submitted") ||
    normalized.includes("added")
  ) {
    return "success";
  }

  return "warning";
}

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

function getFriendlyApiErrorMessage(
  error,
  fallbackMessage = BACKEND_UNAVAILABLE_MESSAGE
) {
  if (isNetworkConnectionError(error)) return NETWORK_OFFLINE_MESSAGE;

  const backendMessage =
    error?.response?.data?.message || error?.response?.data?.error;

  if (Array.isArray(backendMessage)) return backendMessage.join(" / ");
  if (backendMessage) return String(backendMessage);

  return fallbackMessage;
}

function canUseNetwork(showToastFn) {
  if (!isBrowserOffline()) return true;

  notifyUser(showToastFn, "warning", NETWORK_OFFLINE_MESSAGE);
  return false;
}



function isOfficerUser(user) {
  return user?.role === "Officer";
}

function getUserProjectScope(user) {
  if (!user || !Array.isArray(user.assignedProjects)) return [];
  return user.assignedProjects;
}

function userCanAccessAllProjects(user) {
  if (!user) return false;

  if (["PlatformAdmin", "Admin", "TopManagement"].includes(user.role)) {
    return true;
  }

  const scope = getUserProjectScope(user);
  return scope.includes("All") && !["Operator", "Supervisor"].includes(user.role);
}



function useOutsideClick(ref, handler) {
  useEffect(() => {
    function listener(event) {
      if (!ref.current || ref.current.contains(event.target)) return;

      handler(event);
    }

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default function OperationsPage({
  data,
  headers,
  setData,
  assets,
  stations,
  allStations = [],
  fuelers,
  literPrice = 2.33,
  getLiterPriceByDate,
  currency = "SAR",
  currentUser,
  activeProjectScopeLabel = "",
  activeProjectScopeValues = [],
  activeProjectId = "",
  hasPermission = () => false,
  trackActivity = () => {},
  projects = [],
  showToast,
  onOperationsWorkspaceRefresh,

  assetOdometerHistory,
  stationCounterResetHistory,}) {

  const {
    refreshOperations,
    operationsLoading,
    operationsError,
    operationsLoaded,
  } = useOperationsData({
    currentUser,
    setData,
  });

  const { language, t } = useLanguage();

  const getResetEffectiveTime = (resetRecord) => {
    if (!resetRecord) return 0;

    return (
      new Date(
        resetRecord.effectiveAt ||
          resetRecord.effectiveFrom ||
          resetRecord.effectiveDate ||
          resetRecord.createdAt
      ).getTime() || 0
    );
  };

  const getEntityLookupKeys = (entity, requestedId) =>
    [
      requestedId,
      entity?.id,
      entity?.assetId,
      entity?.assetBackendId,
      entity?.backendId,
      entity?.stationId,
      entity?.stationBackendId,
      entity?.code,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

  const resetMatchesEntity = (resetRecord, entity, requestedId) => {
    const resetKeys = [
      resetRecord?.assetId,
      resetRecord?.stationId,
      resetRecord?.entityId,
      resetRecord?.backendAssetId,
      resetRecord?.backendStationId,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    const entityKeys = getEntityLookupKeys(entity, requestedId);
    return resetKeys.some((key) => entityKeys.includes(key));
  };

  const getLatestResetRecordForEntity = (
    history = [],
    entity,
    entityId,
    companyId = ""
  ) => {
    const now = Date.now();

    return (history || [])
      .filter((item) => {
        const sameEntity = resetMatchesEntity(item, entity, entityId);
        const sameCompany =
          !companyId || !item.companyId || companyMatches(item.companyId, companyId);
        const isEffective = getResetEffectiveTime(item) <= now;

        return sameEntity && sameCompany && isEffective;
      })
      .sort((a, b) => getResetEffectiveTime(b) - getResetEffectiveTime(a))[0];
  };

  const getEffectiveLastAssetReading = (
    assetId,
    excludeOriginalIndex = null
  ) => {
    const asset = getAsset(assetId);
    const assetCompanyId = asset?.companyId || currentUser?.companyId || "";
    const latestReset = getLatestResetRecordForEntity(
      assetOdometerHistory,
      asset,
      assetId,
      assetCompanyId
    );
    const resetTime = getResetEffectiveTime(latestReset);
    const assetKeys = getEntityLookupKeys(asset, assetId);

    const typeIndexLocal = getHeaderIndex(headers, [
      "transaction_type",
      "Transaction type",
      "transaction type",
      "operation_type",
      "Operation type",
    ]);
    const destinationIndexLocal = getHeaderIndex(headers, [
      "destination_id",
      "Destination ID",
      "destination id",
      "destination",
      "equipment_no",
      "Equipment No",
      "asset_id",
      "Asset ID",
    ]);
    const odometerIndexLocal = getHeaderIndex(headers, [
      "odometer_at_fueling",
      "Odometer at fueling",
      "odometer at fueling",
      "odometer",
      "hour_meter",
      "Hour Meter",
    ]);
    const dateIndexLocal = getHeaderIndex(headers, [
      "transaction_datetime",
      "Transaction datetime",
      "transaction datetime",
      "date",
    ]);

    const latestOperation = data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row, originalIndex }) => {
        if (originalIndex === excludeOriginalIndex) return false;
        if (
          typeIndexLocal === -1 ||
          destinationIndexLocal === -1 ||
          odometerIndexLocal === -1
        ) {
          return false;
        }

        const rowTime =
          dateIndexLocal !== -1
            ? new Date(row[dateIndexLocal]).getTime() || 0
            : originalIndex;
        const destinationKey = normalizeScopeValue(row[destinationIndexLocal]);
        const reading = Number(row[odometerIndexLocal]);

        return (
          rowTime >= resetTime &&
          isAssetRefuelTransactionType(row[typeIndexLocal]) &&
          assetKeys.includes(destinationKey) &&
          Number.isFinite(reading)
        );
      })
      .sort((a, b) => {
        const da =
          dateIndexLocal !== -1
            ? new Date(a.row[dateIndexLocal]).getTime() || 0
            : a.originalIndex;
        const db =
          dateIndexLocal !== -1
            ? new Date(b.row[dateIndexLocal]).getTime() || 0
            : b.originalIndex;
        return db - da || b.originalIndex - a.originalIndex;
      })[0];

    if (latestOperation) {
      return Number(latestOperation.row[odometerIndexLocal]) || 0;
    }

    if (latestReset) {
      return (
        Number(
          latestReset.newOdometer ??
            latestReset.newOdometerAfterReset ??
            latestReset.newReading ??
            latestReset.resetReading ??
            latestReset.reading
        ) || 0
      );
    }

    return Number(asset?.currentOdometer ?? asset?.odometer ?? 0) || 0;
  };

  const getAssetLifetimeReading = (assetId, rawReading, operationDate) => {
    const asset = getAsset(assetId);
    const assetCompanyId = asset?.companyId || currentUser?.companyId || "";
    const operationTime = parseOperationDate(operationDate)?.getTime() || 0;

    const matchingResets = (assetOdometerHistory || [])
      .filter((resetRecord) => {
        const sameEntity = resetMatchesEntity(resetRecord, asset, assetId);
        const sameCompany =
          !assetCompanyId ||
          !resetRecord.companyId ||
          companyMatches(resetRecord.companyId, assetCompanyId);

        return (
          sameEntity &&
          sameCompany &&
          getResetEffectiveTime(resetRecord) <= operationTime
        );
      })
      .sort((a, b) => getResetEffectiveTime(a) - getResetEffectiveTime(b));

    const lifetimeOffset = matchingResets.reduce((sum, resetRecord) => {
      const oldReading = Number(
        resetRecord.oldOdometer ??
          resetRecord.oldOdometerBeforeReset ??
          resetRecord.historicalDistanceBase ??
          0
      );
      const newReading = Number(
        resetRecord.newOdometer ??
          resetRecord.newOdometerAfterReset ??
          resetRecord.newReading ??
          resetRecord.resetMeterStart ??
          0
      );

      if (!Number.isFinite(oldReading) || !Number.isFinite(newReading)) {
        return sum;
      }

      return sum + (oldReading - newReading);
    }, 0);

    return lifetimeOffset + (Number(rawReading) || 0);
  };

  const getStoredOperationLifetimeReading = (
    row,
    assetId,
    rawReading,
    operationDate
  ) => {
    const backendLifetime = Number(row?.__operation?.lifetimeOdometer);

    if (Number.isFinite(backendLifetime)) {
      return backendLifetime;
    }

    // Legacy fallback for operations created before lifetime snapshots existed.
    return getAssetLifetimeReading(assetId, rawReading, operationDate);
  };



  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [stationMeterPhoto, setStationMeterPhoto] = useState(null);
  const [assetPhoto, setAssetPhoto] = useState(null);
  const [assetMeterPhoto, setAssetMeterPhoto] = useState(null);
  const [invoicePhoto, setInvoicePhoto] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [selectedRefuelType, setSelectedRefuelType] = useState("ALL");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentTypeSearch, setEquipmentTypeSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [showEquipmentTypeDropdown, setShowEquipmentTypeDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Table export menus
  const [showEquipmentSummarySettings, setShowEquipmentSummarySettings] =
    useState(false);
  const [showEquipmentTypeSettings, setShowEquipmentTypeSettings] =
    useState(false);
  const [showDailyConsumptionSettings, setShowDailyConsumptionSettings] =
    useState(false);

  const dateFilterRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentTypeDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const equipmentSummarySettingsRef = useRef(null);
  const equipmentTypeSettingsRef = useRef(null);
  const dailyConsumptionSettingsRef = useRef(null);

  useOutsideClick(dateFilterRef, () => setShowDateFilter(false));
  useOutsideClick(equipmentDropdownRef, () => setShowEquipmentDropdown(false));
  useOutsideClick(equipmentTypeDropdownRef, () =>
    setShowEquipmentTypeDropdown(false)
  );
  useOutsideClick(projectDropdownRef, () => setShowProjectDropdown(false));
  useOutsideClick(equipmentSummarySettingsRef, () =>
    setShowEquipmentSummarySettings(false)
  );
  useOutsideClick(equipmentTypeSettingsRef, () =>
    setShowEquipmentTypeSettings(false)
  );
  useOutsideClick(dailyConsumptionSettingsRef, () =>
    setShowDailyConsumptionSettings(false)
  );

  // Operation review / edit
  const [selectedEquipmentHistory, setSelectedEquipmentHistory] = useState(null);
  const [operationPhotoViewer, setOperationPhotoViewer] = useState(null);
  const [operationPhotoViewerLoading, setOperationPhotoViewerLoading] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [editCell, setEditCell] = useState(null);
  const [correctionContextLoading, setCorrectionContextLoading] = useState(false);
  const [correctionContextError, setCorrectionContextError] = useState("");


  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);
  const sourceIndex = getHeaderIndex(headers, [
    "source_station",
    "Source station",
    "source station",
    "source_station_id",
    "station_id",
  ]);
  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);
  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const externalStationNameIndex = getHeaderIndex(headers, [
    "external_station_name",
    "External station name",
    "external station name",
    "externalStationName",
    "supplier",
    "supplier_name",
  ]);

  const buildExternalSourceHistory = (targetTransactionType) => {
    if (externalStationNameIndex === -1) return [];

    const seen = new Set();

    return data
      .filter((row) => {
        if (typeIndex === -1) return true;
        return isSameText(row[typeIndex], targetTransactionType);
      })
      .map((row) => String(row[externalStationNameIndex] || "").trim())
      .filter((name) => {
        if (!name) return false;
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  };

  const externalStationHistory = buildExternalSourceHistory("External_Direct_Refuel");
  const externalSupplierHistory = buildExternalSourceHistory("External_Supply");

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Operator ID",
    "fueler id",
    "fueler",
  ]);



  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "transaction id",
    "id",
  ]);

  const buildLookupCandidates = (...values) =>
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
      .map(normalizeScopeValue);

  const getAsset = (assetId) => {
    const candidates = buildLookupCandidates(assetId);
    if (!candidates.length) return null;

    return assets.find((asset) => {
      const assetCandidates = buildLookupCandidates(
        asset?.id,
        asset?.assetId,
        asset?.backendId,
        asset?.assetBackendId,
        asset?.equipmentNo,
        asset?.equipmentNumber,
        asset?.equipment_no,
        asset?.equipment_number
      );

      return assetCandidates.some((candidate) => candidates.includes(candidate));
    }) || null;
  };

  const getStation = (stationId) => {
    const candidates = buildLookupCandidates(stationId);
    if (!candidates.length) return null;

    return stations.find((station) => {
      const stationCandidates = buildLookupCandidates(
        station?.id,
        station?.stationId,
        station?.backendId,
        station?.stationBackendId,
        station?.stationCode,
        station?.code,
        station?.name
      );

      return stationCandidates.some((candidate) => candidates.includes(candidate));
    }) || null;
  };

  const getProject = (projectValue) => {
    const candidates = buildLookupCandidates(projectValue);
    if (!candidates.length) return null;

    return projects.find((project) => {
      const projectCandidates = buildLookupCandidates(
        project?.id,
        project?.backendId,
        project?.code,
        project?.name,
        project?.projectId,
        project?.projectName
      );

      return projectCandidates.some((candidate) => candidates.includes(candidate));
    }) || null;
  };

  const getAssetDisplayCode = (assetId) => {
    const asset = getAsset(assetId);
    return asset?.assetId || asset?.equipmentNo || asset?.equipmentNumber || asset?.id || assetId || "-";
  };

  const getStationDisplayCode = (stationId) => {
    const station = getStation(stationId);
    return station?.stationId || station?.code || station?.id || stationId || "-";
  };

  const getFuelerDisplayName = (fuelerId) => {
    const fueler = getFueler(fuelerId);
    return fueler?.name || fueler?.fullName || fueler?.employeeName || fueler?.id || fuelerId || "-";
  };

  const getOperationCorrectionDisplayValue = (field, value) => {
    if (field === "equipment") return getAssetDisplayCode(value);
    if (field === "station") return getStationDisplayCode(value);
    if (field === "fueler") return getFuelerDisplayName(value);
    return value === undefined || value === null || value === "" ? "-" : String(value);
  };

  const getOperationCorrectionFieldName = (field, editContext = null) => {
    if (field === "station" && editContext?.isExternalDirectRefuel) {
      return "EXTERNAL_STATION_NAME";
    }

    const map = {
      equipment: "ASSET",
      station: "SOURCE_STATION",
      diesel: "QUANTITY",
      odometer: "ODOMETER",
      fueler: "FUELER_ID",
    };

    return map[field] || field;
  };

  const getOperationCorrectionBackendId = (row = []) => {
    const backendOperationIdIndex = headers?.indexOf?.("backend_operation_id") ?? -1;
    return (
      row?.__operation?.id ||
      (backendOperationIdIndex !== -1 ? row?.[backendOperationIdIndex] : "") ||
      ""
    );
  };

  const getProjectDisplayName = (projectValue) => {
    const project = getProject(projectValue);
    return project?.name || project?.code || projectValue || "-";
  };

  const getProjectFuelPriceValue = (projectValue, transactionDate) => {
    const project = getProject(projectValue);
    const projectPrice = Number(project?.currentFuelPrice || 0);

    if (projectPrice > 0) return projectPrice;

    return getLiterPriceByDate
      ? getLiterPriceByDate(transactionDate)
      : literPrice;
  };

  const getFueler = (fuelerId) => {
    const candidates = buildLookupCandidates(fuelerId);
    if (!candidates.length) return null;

    return (
      fuelers.find((fueler) => {
        const fuelerCandidates = buildLookupCandidates(
          fueler?.id,
          fueler?.backendId,
          fueler?.employeeId,
          fueler?.employeeBackendId,
          fueler?.userId,
          fueler?.name,
          fueler?.fullName,
          fueler?.employeeName
        );

        return fuelerCandidates.some((candidate) =>
          candidates.includes(candidate)
        );
      }) || null
    );
  };

  const getAssetProject = (assetId) => {
    const asset = getAsset(assetId);
    return asset?.project || asset?.projectName || asset?.projectId || "-";
  };



  const closeForm = () => {
    setShowForm(false);
    setTransactionType("");
    setStationMeterPhoto(null);
    setAssetPhoto(null);
    setAssetMeterPhoto(null);
    setInvoicePhoto(null);
  };

  const saveNewOperation = async (operation) => {
    if (!canUseNetwork(showToast)) return;

    try {
      const selectedSourceStation = stations.find(
  (station) =>
    station.id === operation.sourceStation ||
    station.stationId === operation.sourceStation ||
    station.backendId === operation.sourceStation
);

const selectedDestinationStation = allStations.find(
  (station) =>
    station.id === operation.destinationId ||
    station.stationId === operation.destinationId ||
    station.backendId === operation.destinationId
);

const selectedAsset = assets.find(
  (asset) =>
    asset.id === operation.destinationId ||
    asset.assetId === operation.destinationId ||
    asset.backendId === operation.destinationId ||
    asset.assetBackendId === operation.destinationId
);

const payload = mapFrontendOperationToBackendPayload({
  ...operation,
  currentProjectId: operation.currentProjectId || activeProjectId || "",
  sourceStation:
    selectedSourceStation?.backendId ||
    selectedSourceStation?.id ||
    operation.sourceStation,
  destinationId:
    selectedAsset?.backendId ||
    selectedAsset?.assetBackendId ||
    selectedDestinationStation?.backendId ||
    selectedDestinationStation?.id ||
    operation.destinationId,
});

      const createdOperation = await createOperation(payload, currentUser);

      const backendMessage = getOperationApprovalSuccessMessage(
        createdOperation?.operationType || operation.transactionType,
        createdOperation?.status,
        t,
      ) || createdOperation?.message || t("operations.messages.operationSaved");
      const backendStatus = String(createdOperation?.status || "").toUpperCase();
      const toastType = backendStatus === "COMPLETED" ? "success" : "warning";

      // The backend has confirmed that the operation was saved.
      // Close the form immediately and refresh the operations list in the background.
      closeForm();
      showToast?.(toastType, backendMessage);

      trackActivity(
        "Add Operation",
        "operations",
        `${operation.transactionType} ${createdOperation?.operationNo || createdOperation?.operationId || operation.operationId} saved through backend.`
      );

      if (typeof onOperationsWorkspaceRefresh === "function") {
        void onOperationsWorkspaceRefresh();
      } else {
        void refreshOperations({ silent: true });
      }
    } catch (error) {
      showToast?.(
        "warning",
        getFriendlyApiErrorMessage(error, t("operations.messages.operationSaveFailed"))
      );
    }
  };



  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const printTable = (tableId, title = t("operations.export.tableReport")) => {
    const tableElement = document.getElementById(tableId);

    if (!tableElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #111;
            }

            h2 {
              margin-bottom: 20px;
              font-size: 22px;
            }

            .report-meta {
              margin-bottom: 18px;
              font-size: 12px;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th, td {
              border: 1px solid #ccc;
              padding: 8px 10px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background: #fafafa;
            }

            @media print {
              body {
                padding: 15px;
              }
            }
          </style>
        </head>

        <body>
          <h2>${title}</h2>
          <div class="report-meta">
            ${t("operations.export.generatedAt")}: ${new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-GB")}
          </div>

          ${tableElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportEquipmentSummaryCSV = () => {
    exportRowsToCSV(
      "equipment_consumption_summary",
      [
        "#",
        "Equipment No.",
        "Equipment Type",
        "Last Odometer",
        "Fuel Consumption",
        "Total Cost",
        "Distance",
        "Efficiency",
      ],
      equipmentSummary.map((item, i) => [
        i + 1,
        item.equipmentNo,
        item.equipmentType,
        item.lastOdometer,
        item.fuelConsumption,
        item.totalCost,
        item.distance,
        item.efficiency,
      ])
    );

    setShowEquipmentSummarySettings(false);
  };

  const exportEquipmentTypeSummaryCSV = () => {
    exportRowsToCSV(
      "consumption_by_equipment_type",
      ["#", "Equipment Type", "Qty Liters", "Total Cost"],
      equipmentTypeConsumptionSummary.map((item, i) => [
        i + 1,
        item.equipmentType,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowEquipmentTypeSettings(false);
  };

  const exportDailyConsumptionCSV = () => {
    exportRowsToCSV(
      "daily_consumption",
      ["#", "Date", "Qty Liters", "Total Cost"],
      dailyConsumptionSummary.map((item, i) => [
        i + 1,
        item.dateKey,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowDailyConsumptionSettings(false);
  };

  const formatDateKey = (year, monthIndex, day) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };

  const parseOperationDate = (rawDate) => {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatDisplayDate = (rawDate) => {
    const d = parseOperationDate(rawDate);
    if (!d) return rawDate || "-";

    return d.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMonthName = (monthIndex) => {
    return new Date(2026, monthIndex, 1).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
      month: "short",
    }).toUpperCase();
  };

  const getDaysInMonth = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const moveMonth = (calendar, direction) => {
    if (calendar === "start") {
      let newMonth = startMonth + direction;
      let newYear = startYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setStartMonth(newMonth);
      setStartYear(newYear);
    }

    if (calendar === "end") {
      let newMonth = endMonth + direction;
      let newYear = endYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setEndMonth(newMonth);
      setEndYear(newYear);
    }
  };

  const renderCalendarDays = (year, monthIndex, selectedDate, onSelect) => {
    const days = getDaysInMonth(year, monthIndex);
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {t("operations.calendar.weekdays").split(",").map((day, i) => (
          <div key={i} className="text-[11px] text-gray-400 py-1">
            {day}
          </div>
        ))}

        {blanks.map((blank) => (
          <div key={`blank-${blank}`} />
        ))}

        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const dateKey = formatDateKey(year, monthIndex, day);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={day}
              onClick={() => onSelect(dateKey)}
              className={`w-8 h-8 rounded-full text-sm transition ${
                isSelected
                  ? "bg-yellow-500 text-black font-bold"
                  : "hover:bg-gray-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };



  const workingData = data.map((row, originalIndex) => ({
    row,
    originalIndex,
  }));

  const directRefuelData = workingData.filter(
    (item) => isAssetRefuelTransactionType(item.row[typeIndex])
  );

  const dateFilteredData = directRefuelData.filter((item) => {
    const rawDate = item.row[dateIndex];
    const operationDate = parseOperationDate(rawDate);

    if (!operationDate) return false;

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);

      if (operationDate < from) return false;
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      if (operationDate > to) return false;
    }

    return true;
  });

  const refuelTypeFilteredData = dateFilteredData.filter((item) => {
    const operationTypeValue =
      typeIndex !== -1
        ? item.row[typeIndex]
        : item.row?.__operation?.type || "";

    if (selectedRefuelType === "DIRECT") {
      return !isExternalDirectRefuelTransactionType(operationTypeValue);
    }

    if (selectedRefuelType === "EXTERNAL") {
      return isExternalDirectRefuelTransactionType(operationTypeValue);
    }

    return true;
  });

  const getOperationProjectName = (item) => {
    const row = item?.row || [];
    const operation = row?.__operation || {};

    const snapshotName =
      operation.projectNameAtOperation ||
      operation.projectSnapshotName ||
      "";

    if (snapshotName) return snapshotName;

    const snapshotId =
      operation.projectIdAtOperation ||
      operation.projectSnapshotId ||
      "";

    if (snapshotId) return getProjectDisplayName(snapshotId);

    // Legacy fallback only for rows created before the project snapshot migration.
    const rawProject = getAssetProject(row[destinationIndex]);
    return getProjectDisplayName(rawProject);
  };

  const getOperationLiterPrice = (item) => {
    const row = item?.row || [];
    const rawProject = getAssetProject(row[destinationIndex]);
    return getProjectFuelPriceValue(rawProject, row[dateIndex]);
  };

  const getOperationTotalCost = (item) => {
    const storedCost = getOperationTotalCostAtOperation(item);

    if (storedCost > 0) {
      return storedCost;
    }

    const diesel = parseFloat(item?.row?.[dieselIndex]) || 0;
    return diesel * getOperationLiterPrice(item);
  };

  const equipmentTypeOptions = [
    ...new Set(
      refuelTypeFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const project = getOperationProjectName(item);

          if (
            selectedProject.length > 0 &&
            !selectedProject.includes(project)
          ) {
            return false;
          }

          return true;
        })
        .map((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          return asset?.type;
        })
        .filter(Boolean)
    ),
  ];

  const equipmentOptions = [
    ...new Set(
      refuelTypeFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          const equipmentType = asset?.type || "";

          if (
            selectedEquipmentType.length > 0 &&
            !selectedEquipmentType.includes(equipmentType)
          ) {
            return false;
          }

          const project = getOperationProjectName(item);

          if (
            selectedProject.length > 0 &&
            !selectedProject.includes(project)
          ) {
            return false;
          }

          return true;
        })
        .map((item) => item.row[destinationIndex])
        .filter(Boolean)
    ),
  ];

  const projectOptions = [
    ...new Set(
      refuelTypeFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          const equipmentType = asset?.type || "";

          if (
            selectedEquipmentType.length > 0 &&
            !selectedEquipmentType.includes(equipmentType)
          ) {
            return false;
          }

          if (
            selectedEquipment.length > 0 &&
            !selectedEquipment.includes(equipmentNo)
          ) {
            return false;
          }

          return true;
        })
        .map((item) =>
          getOperationProjectName(item)
        )
        .filter((project) => project && project !== "-")
    ),
  ];

  const visibleEquipmentOptions = equipmentOptions.filter((equipment) =>
    equipment.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const visibleEquipmentTypeOptions = equipmentTypeOptions.filter((type) =>
    type.toLowerCase().includes(equipmentTypeSearch.toLowerCase())
  );

  const visibleProjectOptions = projectOptions.filter((project) =>
    project.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const toggleEquipmentSelection = (equipment) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((item) => item !== equipment)
        : [...prev, equipment]
    );
  };

  const toggleEquipmentTypeSelection = (type) => {
    setSelectedEquipmentType((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    );

    setSelectedEquipment([]);
  };

  const toggleProjectSelection = (project) => {
    setSelectedProject((prev) =>
      prev.includes(project)
        ? prev.filter((item) => item !== project)
        : [...prev, project]
    );
  };

  const getEquipmentFilterLabel = () => {
    if (selectedEquipment.length === 0) return t("operations.filters.allEquipment");
    if (selectedEquipment.length === 1) return selectedEquipment[0];
    return t("operations.filters.equipmentSelected", { count: selectedEquipment.length });
  };

  const getEquipmentTypeFilterLabel = () => {
    if (selectedEquipmentType.length === 0) return t("operations.filters.allEquipmentTypes");
    if (selectedEquipmentType.length === 1) return selectedEquipmentType[0];
    return t("operations.filters.typesSelected", { count: selectedEquipmentType.length });
  };

  const getProjectFilterLabel = () => {
    if (selectedProject.length === 0) return t("operations.filters.allProjects");
    if (selectedProject.length === 1) return selectedProject[0];
    return t("operations.filters.projectsSelected", { count: selectedProject.length });
  };

  const filteredDirectRefuelData = refuelTypeFilteredData.filter((item) => {
    const equipmentNo = item.row[destinationIndex];
    const asset = getAsset(equipmentNo);
    const equipmentType = asset?.type || "";

    if (
      selectedEquipment.length > 0 &&
      !selectedEquipment.includes(equipmentNo)
    )
      return false;

    if (
      selectedEquipmentType.length > 0 &&
      !selectedEquipmentType.includes(equipmentType)
    )
      return false;

    const project = getOperationProjectName(item);

    if (
      selectedProject.length > 0 &&
      !selectedProject.includes(project)
    )
      return false;

    return true;
  });

  const totalDiesel = filteredDirectRefuelData.reduce((sum, item) => {
    return sum + (parseFloat(item.row[dieselIndex]) || 0);
  }, 0);

  const totalCost = filteredDirectRefuelData.reduce((sum, item) => {
    return sum + getOperationTotalCost(item);
  }, 0);

  const dailyConsumptionByDate = filteredDirectRefuelData.reduce(
    (acc, item) => {
      const operationDate = parseOperationDate(item.row[dateIndex]);

      if (!operationDate) return acc;

      const dateKey = operationDate.toISOString().split("T")[0];
      const diesel = parseFloat(item.row[dieselIndex]) || 0;

      acc[dateKey] = (acc[dateKey] || 0) + diesel;
      return acc;
    },
    {}
  );

  const dailyData = (() => {
    const operationDates = Object.keys(dailyConsumptionByDate).sort();

    if (operationDates.length === 0) return [];

    // Use the selected date-filter boundaries when available. Otherwise,
    // fill every calendar day between the first and last operation dates.
    const firstDateKey = fromDate || operationDates[0];
    const lastDateKey = toDate || operationDates[operationDates.length - 1];

    const startDate = new Date(`${firstDateKey}T00:00:00.000Z`);
    const endDate = new Date(`${lastDateKey}T00:00:00.000Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return operationDates.map((date) => ({
        date,
        value: dailyConsumptionByDate[date] || 0,
      }));
    }

    const result = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const dateKey = cursor.toISOString().split("T")[0];

      result.push({
        date: dateKey,
        value: dailyConsumptionByDate[dateKey] || 0,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  })();

  const dailyConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const operationDate = parseOperationDate(item.row[dateIndex]);
      const dateKey = operationDate
        ? operationDate.toISOString().split("T")[0]
        : "No Date";

      const diesel = parseFloat(item.row[dieselIndex]) || 0;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[dateKey].qtyLiters += diesel;
      acc[dateKey].totalCost += getOperationTotalCost(item);

      return acc;
    }, {})
  ).sort((a, b) => {
    if (a.dateKey === "No Date") return 1;
    if (b.dateKey === "No Date") return -1;
    return new Date(b.dateKey) - new Date(a.dateKey);
  });

  const equipmentTypeConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];
      const asset = getAsset(equipmentNo);
      const equipmentType = asset?.type || "Unknown";

      const diesel = parseFloat(row[dieselIndex]) || 0;

      if (!acc[equipmentType]) {
        acc[equipmentType] = {
          equipmentType,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[equipmentType].qtyLiters += diesel;
      acc[equipmentType].totalCost += getOperationTotalCost(item);

      return acc;
    }, {})
  ).sort((a, b) => b.qtyLiters - a.qtyLiters);

  const equipmentSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];

      if (!equipmentNo) return acc;

      const asset = getAsset(equipmentNo);
      const assetDisplayCode = getAssetDisplayCode(equipmentNo);
      const operationProject = getOperationProjectName(item);
      const diesel = parseFloat(row[dieselIndex]) || 0;
      const odometer = parseFloat(row[odometerIndex]) || 0;
      const operationDate = dateIndex !== -1 ? row[dateIndex] : null;
      const lifetimeOdometer = getStoredOperationLifetimeReading(
        row,
        equipmentNo,
        odometer,
        operationDate
      );
      const equipmentKey = normalizeScopeValue(
        asset?.backendId || asset?.assetBackendId || asset?.id || equipmentNo
      );

      if (!acc[equipmentKey]) {
        acc[equipmentKey] = {
          equipmentNo: assetDisplayCode,
          equipmentBackendId: equipmentNo,
          project: operationProject,
          projectsSet: new Set(),
          equipmentType: asset?.type || "-",
          fuelConsumption: 0,
          totalCost: 0,
          firstLifetimeOdometer: lifetimeOdometer,
          lastLifetimeOdometer: lifetimeOdometer,
          lastOdometer: odometer,
          lastOperationTime: parseOperationDate(operationDate)?.getTime() || 0,
        };
      }

      if (operationProject && operationProject !== "-") {
        acc[equipmentKey].projectsSet.add(operationProject);
      }

      acc[equipmentKey].fuelConsumption += diesel;
      acc[equipmentKey].totalCost += getOperationTotalCost(item);

      if (lifetimeOdometer < acc[equipmentKey].firstLifetimeOdometer) {
        acc[equipmentKey].firstLifetimeOdometer = lifetimeOdometer;
      }

      if (lifetimeOdometer > acc[equipmentKey].lastLifetimeOdometer) {
        acc[equipmentKey].lastLifetimeOdometer = lifetimeOdometer;
      }

      const operationTime = parseOperationDate(operationDate)?.getTime() || 0;
      if (operationTime >= acc[equipmentKey].lastOperationTime) {
        acc[equipmentKey].lastOperationTime = operationTime;
        acc[equipmentKey].lastOdometer = odometer;
      }

      return acc;
    }, {})
  ).map((item) => {
    const distance = Math.max(
      0,
      item.lastLifetimeOdometer - item.firstLifetimeOdometer
    );

    const efficiency =
      distance > 0 ? (item.fuelConsumption / distance).toFixed(2) : "-";

    return {
      ...item,
      project: item.projectsSet?.size
        ? Array.from(item.projectsSet).join(", ")
        : item.project,
      distance,
      efficiency,
      totalCost: item.totalCost,
    };
  });

  const topEquipmentConsumptionChartData = equipmentSummary
    .slice()
    .sort((a, b) => b.fuelConsumption - a.fuelConsumption)
    .slice(0, 10)
    .map((item) => ({
      equipmentNo: item.equipmentNo,
      qtyLiters: Number(item.fuelConsumption) || 0,
    }));

  const equipmentTypeRatioChartData = equipmentTypeConsumptionSummary.map(
    (item) => ({
      name: item.equipmentType,
      value: Number(item.qtyLiters) || 0,
    })
  );

  const equipmentTypeRatioTotal = equipmentTypeRatioChartData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  const chartColors = [
    "#60a5fa",
    "#f59e0b",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#facc15",
    "#22d3ee",
    "#fb7185",
    "#818cf8",
    "#c084fc",
    "#94a3b8",
    "#f97316",
  ];

  const getEquipmentHistory = (equipmentNo) => {
    return filteredDirectRefuelData
      .filter((item) => {
        const rowEquipment = item.row[destinationIndex];
        return (
          rowEquipment === equipmentNo ||
          getAssetDisplayCode(rowEquipment) === equipmentNo
        );
      })
      .sort((a, b) => {
        const da = parseOperationDate(a.row[dateIndex])?.getTime() || 0;
        const db = parseOperationDate(b.row[dateIndex])?.getTime() || 0;
        return db - da;
      });
  };

  const getOperationAttachmentsFromRow = (row) => {
    const directAttachments = normalizeOperationAttachments(
      row?.__attachments ||
        row?.__operation?.attachments ||
        row?.__operation?.requiredPhotos ||
        row?.__operation?.photos
    );

    if (directAttachments.length) return directAttachments;

    const backendOperationIdIndexSafe = headers?.indexOf?.("backend_operation_id") ?? -1;
    const operationNoIndexSafe = operationIdIndex !== -1 ? operationIdIndex : headers?.indexOf?.("operation_id") ?? -1;

    const backendOperationId =
      backendOperationIdIndexSafe !== -1 ? row?.[backendOperationIdIndexSafe] : row?.__operation?.id || "";

    const operationNo =
      operationNoIndexSafe !== -1
        ? row?.[operationNoIndexSafe]
        : row?.__operation?.operationNo || row?.__operation?.id || "";

    const matchedBackendRow = (data || []).find((candidateRow) => {
      const candidateBackendId =
        backendOperationIdIndexSafe !== -1
          ? candidateRow?.[backendOperationIdIndexSafe]
          : candidateRow?.__operation?.id || "";

      const candidateOperationNo =
        operationNoIndexSafe !== -1
          ? candidateRow?.[operationNoIndexSafe]
          : candidateRow?.__operation?.operationNo || candidateRow?.__operation?.id || "";

      return (
        (backendOperationId && String(candidateBackendId) === String(backendOperationId)) ||
        (operationNo && String(candidateOperationNo) === String(operationNo))
      );
    });

    return normalizeOperationAttachments(
      matchedBackendRow?.__attachments ||
        matchedBackendRow?.__operation?.attachments ||
        matchedBackendRow?.__operation?.requiredPhotos ||
        matchedBackendRow?.__operation?.photos
    );
  };

  const openOperationPhotoViewer = async (row) => {
    const attachments = getOperationAttachmentsFromRow(row);
    const operationNo =
      operationIdIndex !== -1
        ? row?.[operationIdIndex]
        : row?.__operation?.operationNo || row?.__operation?.id || "Operation";

    if (!attachments.length) {
      showToast?.("warning", "No photos attached to this operation.");
      return;
    }

    setOperationPhotoViewer({
      operationNo,
      photos: attachments.map((attachment) => ({ ...attachment, signedUrl: "" })),
    });
    setOperationPhotoViewerLoading(true);

    try {
      const photos = await Promise.all(
        attachments.map(async (attachment) => ({
          ...attachment,
          signedUrl: await getUploadSignedUrl(attachment.path, currentUser),
        }))
      );

      setOperationPhotoViewer({ operationNo, photos });
    } catch (error) {
      showToast?.("warning", getFriendlyApiErrorMessage(error, "Failed to load operation photos."));
    } finally {
      setOperationPhotoViewerLoading(false);
    }
  };

  const getLastOdometerForEquipment = (
    equipmentNo,
    excludeOriginalIndex = null
  ) => getEffectiveLastAssetReading(equipmentNo, excludeOriginalIndex);

  const getLastStationCounter = (stationId) => {
    if (!stationId || odometerIndex === -1 || dateIndex === -1) return 0;

    const readings = workingData
      .filter((item) => {
        const row = item.row;
        const sourceStation = sourceIndex !== -1 ? row[sourceIndex] : "";
        const destination = destinationIndex !== -1 ? row[destinationIndex] : "";

        return (
          isSameText(sourceStation, stationId) ||
          isSameText(destination, stationId)
        );
      })
      .map((item) => ({
        date: parseOperationDate(item.row[dateIndex]),
        reading: parseFloat(item.row[odometerIndex]) || 0,
      }))
      .filter((item) => item.date && item.reading > 0)
      .sort((a, b) => b.date - a.date);

    return readings[0]?.reading || 0;
  };

  const openCellEdit = async (item, field) => {
    if (!hasPermission("operations", "edit")) return;

    const row = item.row;
    const operationType =
      row?.__operation?.type ||
      (typeIndex !== -1 ? row[typeIndex] : "");
    const isExternalDirectRefuel =
      isExternalDirectRefuelTransactionType(operationType);

    const externalStationValue =
      row?.__operation?.externalStationName ||
      (externalStationNameIndex !== -1
        ? row[externalStationNameIndex]
        : "");

    const currentValue =
      field === "equipment"
        ? row[destinationIndex]
        : field === "diesel"
        ? row[dieselIndex]
        : field === "odometer"
        ? row[odometerIndex]
        : field === "station"
        ? isExternalDirectRefuel
          ? externalStationValue
          : row[sourceIndex]
        : field === "fueler"
        ? row[fuelerIndex]
        : "";

    const operationBackendId = getOperationCorrectionBackendId(row);

    const baseEditCell = {
      originalIndex: item.originalIndex,
      row,
      field,
      operationType,
      operationBackendId,
      isExternalDirectRefuel,
      oldValue: currentValue || "",
      oldValueDisplay:
        field === "station" && isExternalDirectRefuel
          ? currentValue || "-"
          : getOperationCorrectionDisplayValue(field, currentValue),
      newValue: currentValue || "",
      reason: "",
      operationContext: null,
      allowedAssets: [],
      allowedSourceStations: [],
      allowedDestinationStations: [],
      allowedFuelers: [],
    };

    setEditCell(baseEditCell);
    setCorrectionContextError("");

    if (!operationBackendId) {
      setCorrectionContextError(
        "Backend operation id was not found for this row."
      );
      return;
    }

    if (!canUseNetwork(showToast)) {
      setCorrectionContextError(NETWORK_OFFLINE_MESSAGE);
      return;
    }

    setCorrectionContextLoading(true);

    try {
      const contextResponse = await fetchOperationCorrectionContext(
        operationBackendId,
        currentUser
      );

      setEditCell((current) => {
        if (!current || current.operationBackendId !== operationBackendId) {
          return current;
        }

        const allowedAssets = Array.isArray(contextResponse?.allowedAssets)
          ? contextResponse.allowedAssets
          : [];
        const allowedSourceStations = Array.isArray(
          contextResponse?.allowedSourceStations
        )
          ? contextResponse.allowedSourceStations
          : [];
        const allowedDestinationStations = Array.isArray(
          contextResponse?.allowedDestinationStations
        )
          ? contextResponse.allowedDestinationStations
          : [];
        const allowedFuelers = Array.isArray(contextResponse?.allowedFuelers)
          ? contextResponse.allowedFuelers
          : [];

        const optionsForCurrentField =
          current.field === "equipment"
            ? allowedAssets
            : current.field === "station" && !current.isExternalDirectRefuel
            ? allowedSourceStations
            : current.field === "fueler"
            ? allowedFuelers
            : [];

        const oldValueCandidates = buildLookupCandidates(
          current.oldValue,
          current.field === "equipment" ? row?.__operation?.assetId : null,
          current.field === "station" ? row?.__operation?.sourceStationId : null,
          current.field === "fueler" ? row?.__operation?.requestedByUserId : null
        );

        const matchingCurrentOption = optionsForCurrentField.find((option) => {
          const optionCandidates = buildLookupCandidates(
            option?.id,
            option?.backendId,
            option?.assetId,
            option?.stationId,
            option?.employeeId,
            option?.employeeBackendId,
            option?.linkedUserId
          );

          return optionCandidates.some((candidate) =>
            oldValueCandidates.includes(candidate)
          );
        });

        const normalizedCurrentValue = matchingCurrentOption
          ? matchingCurrentOption.backendId ||
            matchingCurrentOption.employeeBackendId ||
            matchingCurrentOption.id
          : current.newValue;

        return {
          ...current,
          newValue: normalizedCurrentValue,
          operationContext: contextResponse?.operationContext || null,
          allowedAssets,
          allowedSourceStations,
          allowedDestinationStations,
          allowedFuelers,
        };
      });
    } catch (error) {
      console.warn("Correction context load failed:", error);
      setCorrectionContextError(
        getFriendlyApiErrorMessage(
          error,
          "Failed to load the historical correction options."
        )
      );
    } finally {
      setCorrectionContextLoading(false);
    }
  };

  const closeEditCell = () => {
    setEditCell(null);
    setCorrectionContextLoading(false);
    setCorrectionContextError("");
  };

  const findCorrectionOption = (items = [], value) => {
    const candidates = buildLookupCandidates(value);
    if (!candidates.length) return null;

    return (items || []).find((item) => {
      const itemCandidates = buildLookupCandidates(
        item?.id,
        item?.backendId,
        item?.assetId,
        item?.assetBackendId,
        item?.stationId,
        item?.stationBackendId,
        item?.employeeId,
        item?.employeeBackendId,
        item?.linkedUserId,
        item?.name,
        item?.fullName
      );

      return itemCandidates.some((candidate) => candidates.includes(candidate));
    }) || null;
  };

  const saveCellEdit = async () => {
    if (!editCell) return;

    if (!editCell.reason.trim()) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter edit reason."), "Please enter edit reason.");
      return;
    }


    if (!String(editCell.newValue).trim()) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter a new value."), "Please enter a new value.");
      return;
    }

    const row = editCell.row;
    const field = editCell.field;

    const fieldNeedsHistoricalOptions = ["equipment", "station", "fueler"].includes(field) &&
      !(field === "station" && editCell.isExternalDirectRefuel);

    if (fieldNeedsHistoricalOptions && correctionContextLoading) {
      notifyUser(showToast, "warning", "Historical correction options are still loading.");
      return;
    }

    if (fieldNeedsHistoricalOptions && correctionContextError) {
      notifyUser(showToast, "warning", correctionContextError);
      return;
    }

    let fieldLabel = "";

    if (field === "equipment") {
      const newEquipment = editCell.newValue;
      const asset = findCorrectionOption(
        editCell.allowedAssets,
        newEquipment
      );

      if (!asset) {
        notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select a valid equipment."), "Please select a valid equipment.");
        return;
      }

      fieldLabel = t("operations.table.equipment");
    }

    if (field === "diesel") {
      const qty = Number(editCell.newValue);

      if (!qty || qty <= 0) {
        notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Diesel quantity must be greater than 0."), "Diesel quantity must be greater than 0.");
        return;
      }

      fieldLabel = "Diesel Quantity";
    }

    if (field === "odometer") {
      const newOdometer = Number(editCell.newValue);

      if (!newOdometer || newOdometer <= 0) {
        notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter a valid odometer."), "Please enter a valid odometer.");
        return;
      }

      fieldLabel = "Odometer";
    }

    if (field === "station") {
      if (editCell.isExternalDirectRefuel) {
        const externalStationName = String(editCell.newValue || "").trim();

        if (!externalStationName) {
          notifyUser(
            typeof showToast !== "undefined" ? showToast : null,
            "warning",
            "Please select a valid external station."
          );
          return;
        }

        fieldLabel = "External Station";
      } else {
        const newStation = editCell.newValue;
        const station = findCorrectionOption(
          editCell.allowedSourceStations,
          newStation
        );

        if (!station) {
          notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select a valid station."), "Please select a valid station.");
          return;
        }

        // The backend context already confirms that this station was valid
        // in the historical project at the operation date. Do not reject it
        // because of a later status change or soft deletion.
        fieldLabel = "Source Station";
      }
    }

    if (field === "fueler") {
      const selectedFueler = findCorrectionOption(
        editCell.allowedFuelers,
        editCell.newValue
      );

      if (!selectedFueler) {
        notifyUser(
          typeof showToast !== "undefined" ? showToast : null,
          "warning",
          "Please select a valid operator."
        );
        return;
      }

      const normalizedFuelerStatus = String(
        selectedFueler.status || "On Duty"
      )
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

      if (!["onduty", "active"].includes(normalizedFuelerStatus)) {
        notifyUser(
          typeof showToast !== "undefined" ? showToast : null,
          "warning",
          "Selected operator must be active or on duty."
        );
        return;
      }

      fieldLabel = "Operator";
    }

    const operationBackendId = getOperationCorrectionBackendId(row);

    if (!operationBackendId) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, "warning", "Backend operation id was not found for this row.");
      return;
    }

    const fieldName = getOperationCorrectionFieldName(field, editCell);

    try {
      const correctionPayload = {
        operationId: operationBackendId,
        fieldName,
        newValue: field === "diesel" || field === "odometer" ? Number(editCell.newValue) : editCell.newValue,
        reason: editCell.reason,
      };

      const responseBody = await createOperationCorrection(
        correctionPayload,
        currentUser
      );

      setAuditLog((prev) => [
        ...prev,
        {
          operationId:
            operationIdIndex !== -1 ? row[operationIdIndex] : editCell.originalIndex + 1,
          rowIndex: editCell.originalIndex,
          field: fieldLabel,
          oldValue: editCell.oldValueDisplay || getOperationCorrectionDisplayValue(field, editCell.oldValue),
          newValue: getOperationCorrectionDisplayValue(field, editCell.newValue),
          reason: editCell.reason,
          editedBy: currentUser?.fullName || currentUser?.name || "System",
          editedAt: new Date().toISOString(),
          status: "Pending Approval",
        },
      ]);

      trackActivity(
        "Request Operation Correction",
        "operations",
        `${fieldLabel} correction requested from ${editCell.oldValueDisplay || getOperationCorrectionDisplayValue(field, editCell.oldValue)} to ${getOperationCorrectionDisplayValue(field, editCell.newValue)}.`
      );

      closeEditCell();
      showToast?.(
        "success",
        responseBody?.message ||
          t("operations.messages.correctionPending")
      );

      if (typeof onOperationsWorkspaceRefresh === "function") {
        void onOperationsWorkspaceRefresh();
      } else {
        void refreshOperations({ silent: true });
      }
    } catch (error) {
      console.warn("Correction submit failed:", error);
      showToast?.(
        "warning",
        getFriendlyApiErrorMessage(error, "Failed to submit correction request.")
      );
    }
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="fleet-page-shell relative isolate w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">{t("operations.title")}</h1>
          <p className="text-slate-400 text-sm">{t("operations.subtitle")}</p>
          {isOfficerUser(currentUser) && (
            <p className="mt-2 inline-flex rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs text-blue-300 font-semibold">
              Officer access: Operations page is read-only.
            </p>
          )}
        </div>

        {getAllowedTransactionTypesForUser(currentUser).length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            {t("operations.addOperation")}
          </button>
        )}
      </div>

      <div className="relative z-[80] bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl shadow-black/10 backdrop-blur">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:flex-nowrap gap-3 items-center">
          <div ref={dateFilterRef} className="relative z-[90] lg:flex-1 lg:min-w-0">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 flex justify-between items-center text-[12px] lg:text-sm"
            >
              <span>
                {fromDate || toDate
                  ? `${fromDate || t("operations.filters.start")} → ${toDate || t("operations.filters.end")}`
                  : t("operations.filters.selectDateRange")}
              </span>
              <span>▾</span>
            </button>

            {showDateFilter && (
              <div className={`absolute mt-3 bg-white text-slate-950 border border-slate-200 rounded-2xl z-[9999] w-[min(650px,calc(100vw-2rem))] shadow-2xl overflow-hidden ${
                language === "ar" ? "right-0 left-auto" : "left-0 right-auto"
              }`}>
                <div className="bg-slate-800 text-white p-3 flex justify-end border-b border-slate-700">
                  <button className="border border-gray-500 px-3 lg:px-4 py-2 rounded-lg text-sm">
                    Auto date range ▾
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 p-3 sm:p-5">
                  <div>
                    <p className="text-sm font-semibold mb-3">{t("operations.filters.startDate")}</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("start", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(startMonth)} {startYear}
                      </span>
                      <button onClick={() => moveMonth("start", 1)}>›</button>
                    </div>

                    {renderCalendarDays(startYear, startMonth, fromDate, setFromDate)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">{t("operations.filters.endDate")}</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("end", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(endMonth)} {endYear}
                      </span>
                      <button onClick={() => moveMonth("end", 1)}>›</button>
                    </div>

                    {renderCalendarDays(endYear, endMonth, toDate, setToDate)}
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t">
                  <button
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg text-sm"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={equipmentDropdownRef} className="relative z-[90] lg:flex-1 lg:min-w-0">
            <button
              onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              dir={language === "ar" ? "rtl" : "ltr"}
              className={`bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-[12px] lg:text-sm ${
                language === "ar" ? "text-right" : "text-left"
              }`}
            >
              {getEquipmentFilterLabel()} ▾
            </button>

            {showEquipmentDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  placeholder={t("operations.filters.searchEquipment")}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                />

                <button
                  onClick={() => {
                    setSelectedEquipment([]);
                    setEquipmentSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Equipment Selection
                </button>

                <div className="max-h-[380px] overflow-auto">
                  {visibleEquipmentOptions.map((equipment) => (
                    <button
                      key={equipment}
                      onClick={() => toggleEquipmentSelection(equipment)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipment.includes(equipment)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipment.includes(equipment) ? "✓" : ""}
                      </span>

                      <span>{equipment}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentDropdown(false);
                    setEquipmentSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div ref={equipmentTypeDropdownRef} className="relative z-[90] lg:flex-1 lg:min-w-0">
            <button
              onClick={() =>
                setShowEquipmentTypeDropdown(!showEquipmentTypeDropdown)
              }
              dir={language === "ar" ? "rtl" : "ltr"}
              className={`bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-[12px] lg:text-sm ${
                language === "ar" ? "text-right" : "text-left"
              }`}
            >
              {getEquipmentTypeFilterLabel()} ▾
            </button>

            {showEquipmentTypeDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={equipmentTypeSearch}
                  onChange={(e) => setEquipmentTypeSearch(e.target.value)}
                  placeholder={t("operations.filters.searchType")}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                />

                <button
                  onClick={() => {
                    setSelectedEquipmentType([]);
                    setSelectedEquipment([]);
                    setEquipmentTypeSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Type Selection
                </button>

                <div className="max-h-[380px] overflow-auto">
                  {visibleEquipmentTypeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleEquipmentTypeSelection(type)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipmentType.includes(type)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipmentType.includes(type) ? "✓" : ""}
                      </span>

                      <span>{type}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentTypeDropdown(false);
                    setEquipmentTypeSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div ref={projectDropdownRef} className="relative z-[90] lg:flex-1 lg:min-w-0">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              dir={language === "ar" ? "rtl" : "ltr"}
              className={`bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-[12px] lg:text-sm ${
                language === "ar" ? "text-right" : "text-left"
              }`}
            >
              {getProjectFilterLabel()} ▾
            </button>

            {showProjectDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder={t("operations.filters.searchProject")}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                />

                <button
                  onClick={() => {
                    setSelectedProject([]);
                    setProjectSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Project Selection
                </button>

                <div className="max-h-[380px] overflow-auto">
                  {visibleProjectOptions.map((project) => (
                    <button
                      key={project}
                      onClick={() => toggleProjectSelection(project)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedProject.includes(project)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedProject.includes(project) ? "✓" : ""}
                      </span>

                      <span>{project}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    setProjectSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <select
            value={selectedRefuelType}
            onChange={(event) => setSelectedRefuelType(event.target.value)}
            aria-label="Refuel operation type"
            className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full lg:flex-1 lg:min-w-0 shadow-inner transition-all duration-200 text-[12px] lg:text-sm outline-none"
          >
            <option value="ALL">{t("operations.filters.allRefuelTypes")}</option>
            <option value="DIRECT">{t("operations.filters.directRefuel")}</option>
            <option value="EXTERNAL">{t("operations.filters.externalDirectRefuel")}</option>
          </select>

          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setSelectedEquipment([]);
              setSelectedEquipmentType([]);
              setSelectedProject([]);
              setSelectedRefuelType("ALL");
              setEquipmentSearch("");
              setEquipmentTypeSearch("");
              setProjectSearch("");
            }}
            className="w-full lg:w-auto lg:flex-none whitespace-nowrap bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/35 px-3 lg:px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
          >
            {t("operations.filters.reset")}
          </button>
        </div>
      </div>

      <div className="relative z-0 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
        <Card title={t("operations.cards.totalQuantity")} value={formatNumber(totalDiesel)} />

        <Card
          title={t("operations.cards.totalCost", { currency })}
          value={formatNumber(totalCost)}
        />

        <Card
          title={t("operations.cards.refuelOperations")}
          value={formatNumber(filteredDirectRefuelData.length)}
        />

        <Card
          title={t("operations.cards.activeEquipment")}
          value={formatNumber(equipmentSummary.length)}
        />
      </div>

      <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden mb-4 border border-slate-700/80">
        <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
          <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
            {t("operations.sections.equipmentConsumptionSummary")}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-400">
              {t("operations.sections.recordCount", { count: equipmentSummary.length })}
            </span>

            <div ref={equipmentSummarySettingsRef} className="relative">
              <button
                onClick={() =>
                  setShowEquipmentSummarySettings(
                    !showEquipmentSummarySettings
                  )
                }
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                ☰
              </button>

              {showEquipmentSummarySettings && (
                <div className={`absolute mt-2 w-44 max-w-[calc(100vw-2rem)] bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden ${
                    language === "ar" ? "left-0 right-auto" : "right-0 left-auto"
                  }`}>
                  <button
                    onClick={exportEquipmentSummaryCSV}
                    dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                  >
                    {t("common.exportCsv")}
                  </button>

                  <button
                    onClick={() => {
                      printTable(
                        "equipment-summary-table",
                        t("operations.sections.equipmentConsumptionSummary")
                      );
                      setShowEquipmentSummarySettings(false);
                    }}
                    dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700 ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                  >
                    {t("common.print")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-0 w-full max-h-[360px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
          <table
              id="equipment-summary-table"
              className="min-w-[880px] lg:min-w-[1000px] xl:min-w-[1080px] 2xl:min-w-[1220px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
            >
            <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
              <tr>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >#</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.equipmentNo")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.equipmentType")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.lastOdometer")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.fuelConsumption")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.totalCost")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.distance")}</Th>
                <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.efficiency")}</Th>
              </tr>
            </thead>

            <tbody>
              {equipmentSummary.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/70 transition-colors duration-150">
                  <Td>{i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedEquipmentHistory(item)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {item.equipmentNo}
                    </button>
                  </Td>

                  <Td>{item.equipmentType}</Td>
                  <Td>{formatNumber(item.lastOdometer)}</Td>
                  <Td>{formatNumber(item.fuelConsumption)}</Td>
                  <Td>
                    {formatNumber(item.totalCost)} {currency}
                  </Td>
                  <Td>{formatNumber(item.distance)}</Td>
                  <Td>{item.efficiency}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fleet-chart-grid grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80">
          <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
            <div>
              <h2 className="fleet-chart-title text-base font-extrabold text-amber-300">
                {t("operations.sections.consumedByEquipmentType")}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {t("operations.sections.equipmentTypeDescription")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {t("operations.sections.typeCount", { count: equipmentTypeConsumptionSummary.length })}
              </span>

              <div ref={equipmentTypeSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowEquipmentTypeSettings(!showEquipmentTypeSettings)
                  }
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ☰
                </button>

                {showEquipmentTypeSettings && (
                  <div className={`absolute mt-2 w-44 max-w-[calc(100vw-2rem)] bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden ${
                    language === "ar" ? "left-0 right-auto" : "right-0 left-auto"
                  }`}>
                    <button
                      onClick={exportEquipmentTypeSummaryCSV}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                    >
                      {t("common.exportCsv")}
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "equipment-type-table",
                          t("operations.sections.consumedByEquipmentType")
                        );
                        setShowEquipmentTypeSettings(false);
                      }}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700 ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                    >
                      {t("common.print")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-0 w-full max-h-[320px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
            <table
                id="equipment-type-table"
                className="min-w-[560px] lg:min-w-[620px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
              >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                <tr>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >#</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.equipmentType")}</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.qtyLiters")}</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.totalCost")}</Th>
                </tr>
              </thead>

              <tbody>
                {equipmentTypeConsumptionSummary.map((item, i) => (
                  <tr key={item.equipmentType} className="hover:bg-slate-800/70 transition-colors duration-150">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.equipmentType}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80">
          <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
            <div>
              <h2 className="fleet-chart-title text-base font-extrabold text-amber-300">
                {t("operations.sections.dailyConsumption")}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {t("operations.sections.dailyDescription")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {t("operations.sections.dayCount", { count: dailyConsumptionSummary.length })}
              </span>

              <div ref={dailyConsumptionSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowDailyConsumptionSettings(
                      !showDailyConsumptionSettings
                    )
                  }
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ☰
                </button>

                {showDailyConsumptionSettings && (
                  <div className={`absolute mt-2 w-44 max-w-[calc(100vw-2rem)] bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden ${
                    language === "ar" ? "left-0 right-auto" : "right-0 left-auto"
                  }`}>
                    <button
                      onClick={exportDailyConsumptionCSV}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                    >
                      {t("common.exportCsv")}
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "daily-consumption-table",
                          t("operations.sections.dailyConsumption")
                        );
                        setShowDailyConsumptionSettings(false);
                      }}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    className={`block w-full cursor-pointer px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700 ${
                      language === "ar" ? "text-right" : "text-left"
                    }`}
                    >
                      {t("common.print")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-0 w-full max-h-[320px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
            <table
                id="daily-consumption-table"
                className="min-w-[560px] lg:min-w-[620px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
              >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                <tr>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >#</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.date")}</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.qtyLiters")}</Th>
                  <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.totalCost")}</Th>
                </tr>
              </thead>

              <tbody>
                {dailyConsumptionSummary.map((item, i) => (
                  <tr key={item.dateKey} className="hover:bg-slate-800/70 transition-colors duration-150">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.dateKey}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fleet-chart-card relative z-0 bg-slate-900/80 p-3 sm:p-4 rounded-2xl mb-4 border border-slate-700/80 shadow-xl shadow-black/10 overflow-visible">
        <h3 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
          {t("operations.charts.consumedOverTime")}
        </h3>

        <div className="h-[260px] sm:h-[300px] xl:h-[340px]">
          <ChartFrame height={260}>
          <AreaChart
  data={dailyData}
  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
>
  <defs>
    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.03} />
    </linearGradient>
  </defs>

  <XAxis
    dataKey="date"
    stroke="#ccc"
    tick={{ fontSize: 11 }}
    minTickGap={24}
  />

  <YAxis stroke="#ccc" />

  <Tooltip />

  <Area
    type="monotone"
    dataKey="value"
    stroke="#60a5fa"
    strokeWidth={2}
    fill="url(#colorQty)"
    dot={{ r: 3 }}
    activeDot={{ r: 5 }}
  />
</AreaChart>
          </ChartFrame>
        </div>
      </div>

      <div className="fleet-chart-grid grid grid-cols-1 xl:grid-cols-2 gap-4 2xl:gap-5 mb-5">
        <div className="fleet-chart-card relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-visible border border-slate-700/80 p-3 lg:p-4">
          <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
            {t("operations.charts.consumedPerEquipment")}
          </h2>

          <div className="h-[300px] sm:h-[340px] xl:h-[360px]">
            <ChartFrame height={260}>
              <BarChart data={topEquipmentConsumptionChartData}>
              <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
            </BarChart>
            </ChartFrame>
          </div>
        </div>

        <div className="fleet-chart-card relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-visible border border-slate-700/80 p-3 lg:p-4">
          <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
            {t("operations.charts.consumedRatioPerAssetType")}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <div className="h-[220px] sm:h-[240px] xl:h-[260px] flex items-center justify-center">
              <ChartFrame height={240}>
                <PieChart>
                  <Pie
                    data={equipmentTypeRatioChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={2}
                    labelLine={false}
                    label={false}
                  >
                    {equipmentTypeRatioChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value, name) => {
                      const percentage =
                        equipmentTypeRatioTotal > 0
                          ? ((Number(value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                          : "0.0";

                      return [`${percentage}%`, name];
                    }}
                  />
                </PieChart>
              </ChartFrame>
            </div>

            <div className="border-t border-slate-700/80 pt-3">
              <div className="max-h-[120px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-x-4 gap-y-1">
                {equipmentTypeRatioChartData.map((item, index) => {
                  const percentage =
                    equipmentTypeRatioTotal > 0
                      ? ((Number(item.value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-slate-700/30 min-w-0"
                      title={`${item.name} - ${percentage}%`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{
                            backgroundColor: chartColors[index % chartColors.length],
                          }}
                        />

                        <span className="truncate text-gray-200">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-yellow-300 shrink-0 font-semibold">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEquipmentHistory && (
        <ModalPortal>
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className="fleet-portal-modal-backdrop fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3"
          >
            <div className="fleet-portal-modal-panel bg-slate-950 text-white w-[min(1150px,calc(100vw-2rem))] max-h-[88vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                  {t("operations.history.title")}
                </h2>
                <p className="text-gray-400 mt-1">
                  {t("operations.history.equipment")}: {" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedEquipmentHistory.equipmentNo}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedEquipmentHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="max-h-[66vh] overflow-x-scroll overflow-y-auto [scrollbar-gutter:stable_both-edges] overscroll-contain">
              <table className="min-w-[1160px] lg:min-w-[1280px] xl:min-w-[1420px] 2xl:min-w-[1500px] w-full border-separate border-spacing-0 text-[11px] sm:text-xs lg:text-sm">
                <thead className="relative z-30 shadow-sm">
                  <tr>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >#</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.date")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.operationId")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.type")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.project")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.sourceExternal")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.fueler")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.table.equipment")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.liters")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.cost")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.odometer")}</Th>
                    <Th
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={`sticky top-0 z-40 bg-slate-800 align-middle ${
                    language === "ar" ? "text-right" : "text-left"
                  }`}
                >{t("operations.history.photos")}</Th>
                  </tr>
                </thead>

                <tbody>
                  {getEquipmentHistory(selectedEquipmentHistory.equipmentNo).map(
                    (item, i) => {
                      const row = item.row;
                      const operationTypeValue = typeIndex !== -1 ? row[typeIndex] : row?.__operation?.type || "";
                      const isExternalDirectRefuelRow = isExternalDirectRefuelTransactionType(operationTypeValue);
                      const externalSourceName =
                        externalStationNameIndex !== -1
                          ? row[externalStationNameIndex]
                          : row?.__operation?.externalStationName || "";
                      const sourceDisplayValue = isExternalDirectRefuelRow
                        ? externalSourceName || "External Station"
                        : getStationDisplayCode(row[sourceIndex]);

                      return (
                        <tr
                          key={item.originalIndex}
                          className={`hover:bg-slate-800/70 transition-colors duration-150 ${
                            isExternalDirectRefuelRow ? "bg-purple-950/20" : ""
                          }`}
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex]
                              : item.originalIndex + 1}
                          </Td>

                          <Td>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${getOperationTypeBadgeClass(
                                operationTypeValue
                              )}`}
                            >
                              {getOperationTypeDisplay(operationTypeValue, t)}
                            </span>
                          </Td>

                          <Td>
                            {getOperationProjectName(item)}
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "station")}
                              className={`font-semibold cursor-pointer ${
                                isExternalDirectRefuelRow
                                  ? "text-purple-200 hover:text-yellow-300"
                                  : "text-blue-300 hover:text-yellow-400"
                              }`}
                              title={isExternalDirectRefuelRow ? t("operations.history.externalFuelStation") : t("operations.history.sourceStation")}
                            >
                              {sourceDisplayValue || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "fueler")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[fuelerIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "equipment")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {getAssetDisplayCode(row[destinationIndex])}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "diesel")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[dieselIndex])}
                            </button>
                          </Td>

                          <Td>
                            {formatNumber(getOperationTotalCost(item))} {currency}
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "odometer")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[odometerIndex])}
                            </button>
                          </Td>

                          <Td>
                            {getOperationAttachmentsFromRow(row).length ? (
                              <button
                                onClick={() => openOperationPhotoViewer(row)}
                                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] transition"
                              >
                                📷 View
                              </button>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </Td>
                        </tr>
                      );
                    }
                  )}

                  {getEquipmentHistory(selectedEquipmentHistory.equipmentNo).length === 0 && (
                    <tr>
                      <Td colSpan={12}>
                        No operations match the selected refuel type.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>

              {auditLog.length > 0 && (
                <div className="mt-6 bg-gray-950 border border-gray-700 rounded-2xl p-4">
                  <h3 className="text-yellow-400 font-semibold mb-3">
                    {t("operations.audit.title")}
                  </h3>

                  <div className="max-h-44 overflow-auto">
                    {auditLog
                      .slice()
                      .reverse()
                      .map((log, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-300 border-b border-gray-800 py-2"
                        >
                          <span className="text-blue-300">
                            Operation {log.operationId}
                          </span>{" "}
                          | {log.field}:{" "}
                          <span className="text-red-300">{log.oldValue}</span>{" "}
                          →{" "}
                          <span className="text-green-300">{log.newValue}</span>{" "}
                          | Reason: {log.reason} | By: {log.editedBy}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {operationPhotoViewer && (
        <ModalPortal>
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className="fleet-portal-modal-backdrop fixed inset-0 z-[10020] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
          >
          <div className="fleet-portal-modal-panel bg-slate-950 text-white w-full max-w-[min(980px,calc(100vw-2rem))] max-h-[92vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-yellow-400 italic underline">
                  {t("operations.photos.title")}
                </h2>
                <p className="text-gray-400 mt-1">
                  {t("operations.photos.operation")}: <span className="text-blue-300 font-semibold">{operationPhotoViewer.operationNo}</span>
                </p>
              </div>

              <button
                onClick={() => setOperationPhotoViewer(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-auto max-h-[75vh]">
              {operationPhotoViewerLoading ? (
                <div className="text-center text-slate-300 py-10">{t("operations.photos.loading")}</div>
              ) : operationPhotoViewer.photos?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {operationPhotoViewer.photos.map((photo, index) => (
                    <div
                      key={`${photo.path}-${index}`}
                      className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-slate-700 text-sm font-bold text-amber-300">
                        {getPhotoLabel(photo.type || photo.photoType)}
                      </div>

                      {photo.signedUrl ? (
                        <a href={photo.signedUrl} target="_blank" rel="noreferrer">
                          <img
                            src={photo.signedUrl}
                            alt={getPhotoLabel(photo.type || photo.photoType)}
                            className="w-full h-64 object-contain bg-black"
                          />
                        </a>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-red-300 bg-black/40">
                          Photo could not be loaded
                        </div>
                      )}

                      <div className="p-3 text-[11px] text-slate-400 break-all">
                        {photo.path}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-10">{t("operations.photos.none")}</div>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <OperationCorrectionModal
        editCell={editCell}
        setEditCell={setEditCell}
        assets={editCell?.allowedAssets || []}
        stations={editCell?.allowedSourceStations || []}
        destinationStations={editCell?.allowedDestinationStations || []}
        fuelers={editCell?.allowedFuelers || []}
        operationContext={editCell?.operationContext || null}
        contextLoading={correctionContextLoading}
        contextError={correctionContextError}
        externalStationHistory={externalStationHistory}
        onClose={closeEditCell}
        onSave={saveCellEdit}
        getDisplayValue={getOperationCorrectionDisplayValue}
        getAssetDisplayCode={getAssetDisplayCode}
        getStationDisplayCode={getStationDisplayCode}
        getFuelerDisplayName={getFuelerDisplayName}
      />

      {showForm && (
        <AddOperationModal
          closeForm={closeForm}
          fuelers={fuelers}
          stations={stations}
          allStations={allStations}
          assets={assets}
          projects={projects}
          currentUser={currentUser}
          activeProjectScopeLabel={activeProjectScopeLabel}
          activeProjectScopeValues={activeProjectScopeValues}
          activeProjectId={activeProjectId}
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          stationMeterPhoto={stationMeterPhoto}
          setStationMeterPhoto={setStationMeterPhoto}
          assetPhoto={assetPhoto}
          setAssetPhoto={setAssetPhoto}
          assetMeterPhoto={assetMeterPhoto}
          setAssetMeterPhoto={setAssetMeterPhoto}
          invoicePhoto={invoicePhoto}
          setInvoicePhoto={setInvoicePhoto}
          getLastOdometerForEquipment={getLastOdometerForEquipment}
          getLastStationCounter={getLastStationCounter}
          externalStationHistory={externalStationHistory}
          externalSupplierHistory={externalSupplierHistory}
          onSaveOperation={saveNewOperation}
          showToast={showToast}
        />
      )}
      </div>
    </div>
  );
}

