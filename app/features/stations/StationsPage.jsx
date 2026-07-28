"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import ChartFrame from "../../components/charts/ChartFrame";
import StatusBadge from "../../components/feedback/StatusBadge";
import Field from "../../components/forms/Field";
import ModalPortal from "../../components/ui/ModalPortal";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  normalizeScopeValue,
  filterActiveProjects,
  mapFrontendStationStatusForBackend,
  mapBackendStationForState,
  getDuplicateIdError,
  isSameText,
  getHeaderIndex,
  formatNumber,
} from "../../lib/helpers";

import {
  isPlatformContextValue,
  getItemCompanyId,
  companyMatches,
  makeTenantEntityKey,
  tenantEntityMatches,
  filterDuplicateTenantEntities,
} from "../../lib/companyHelpers";

import {
  fetchStations,
  createStationRecord,
  updateStationRecord,
  deleteStationRecord,
  createStationTransfer,
  zeroStationBalance,
  resetStationCounter,
} from "../../services/stationsService";

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

  if (
    normalized.includes("not allowed") ||
    normalized.includes("cannot") ||
    normalized.includes("invalid") ||
    normalized.includes("failed") ||
    normalized.includes("error")
  ) {
    return "warning";
  }

  return "warning";
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

function isOfficerUser(user) {
  return user?.role === "Officer";
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

function useSmartDropdownPosition(ref, isOpen, menuWidth = 260) {
  const [menuAlign, setMenuAlign] = useState("left");

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const updateMenuPosition = () => {
      const element = ref?.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const safePadding = 16;
      const viewportWidth = window.innerWidth || 0;

      const spaceIfOpenRight = viewportWidth - rect.left - safePadding;
      const spaceIfOpenLeft = rect.right - safePadding;

      if (spaceIfOpenRight >= menuWidth) {
        setMenuAlign("left");
      } else if (spaceIfOpenLeft >= menuWidth) {
        setMenuAlign("right");
      } else {
        setMenuAlign("right");
      }
    };

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [ref, isOpen, menuWidth]);

  return menuAlign;
}

function getSmartDropdownClass(menuAlign, widthClass = "w-64") {
  return `absolute ${menuAlign === "right" ? "right-0" : "left-0"} mt-3 ${widthClass} max-w-[calc(100vw-1.5rem)]`;
}

export default function StationsPage({
  stations,
  setStations = () => {},
  projects = [],
  transferProjects = projects,
  data,
  headers,
  showToast,
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
  onStationTransferCreated = () => {},
  externalStockAdjustments = [],

  stationCounterResetHistory,
  setStationCounterResetHistory,}) {
  const FlowmeterCounterDisplay = ({ value }) => {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    const digits = String(safeValue).padStart(7, "0").slice(-7).split("");

    return (
      <div className="w-full flex items-center gap-2">
        {digits.map((digit, index) => (
          <span
            key={`${digit}-${index}`}
            className="w-7 h-9 flex items-center justify-center rounded-md border border-slate-600/80 bg-slate-950 text-amber-300 font-mono text-lg font-black shadow-inner shadow-black/80 tabular-nums"
            style={{
              textShadow:
                "0 0 4px rgba(251,191,36,0.75), 0 0 8px rgba(245,158,11,0.35)",
            }}
          >
            {digit}
          </span>
        ))}
      </div>
    );
  };

  const [counterResetStation, setCounterResetStation] = useState(null);
  const [stationCounterResetValue, setStationCounterResetValue] = useState("");
  const [stationCounterResetDate, setStationCounterResetDate] = useState("");
  const [stationCounterResetReason, setStationCounterResetReason] = useState("");
  const [stationCounterResetLoading, setStationCounterResetLoading] = useState(false);

  const getLatestStationResetRecord = (stationId, companyId = "") => {
    return (stationCounterResetHistory || [])
      .filter((item) => {
        const sameStation = isSameText(item.stationId || item.entityId, stationId);
        const sameCompany = !companyId || !item.companyId || companyMatches(item.companyId, companyId);
        return sameStation && sameCompany;
      })
      .sort((a, b) => {
        const da = new Date(a.effectiveFrom || a.createdAt).getTime() || 0;
        const db = new Date(b.effectiveFrom || b.createdAt).getTime() || 0;
        return db - da;
      })[0];
  };

  const getEffectiveStationCounter = (station) => {
    const backendCounter =
      station?.currentCounter ??
      station?.current_counter ??
      station?.counter;

    if (backendCounter !== undefined && backendCounter !== null && backendCounter !== "") {
      const parsedBackendCounter = Number(backendCounter);
      if (Number.isFinite(parsedBackendCounter)) {
        return parsedBackendCounter;
      }
    }

    const latestReset = getLatestStationResetRecord(
      station.id,
      station.companyId || currentUser?.companyId || ""
    );
    const latestOperationEntry = stationCurrentCounterMap?.get?.(
      normalizeScopeValue(station.id)
    );
    const latestOperationTime = latestOperationEntry?.operationTime || 0;
    const latestResetTime = latestReset
      ? new Date(latestReset.effectiveFrom || latestReset.createdAt).getTime() || 0
      : 0;

    if (latestReset && latestResetTime > latestOperationTime) {
      return (
        Number(
          latestReset.newReading ??
            latestReset.resetReading ??
            latestReset.reading
        ) || 0
      );
    }

    return (
      latestOperationEntry?.value ??
      Number(station.openingCounter) ??
      0
    );
  };

  const getStationLifetimeCounter = (station) => {
    const value =
      station?.currentLifetimeCounter ??
      station?.current_lifetime_counter ??
      station?.lifetimeCounter ??
      station?.lifetime_counter ??
      0;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };



  const getTotalPumpedLitersFromOperations = (station) => {
    if (dieselIndex === -1 || typeIndex === -1 || sourceIndex === -1) {
      return 0;
    }

    return (data || []).reduce((sum, row) => {
      const type = row?.[typeIndex];
      const source = row?.[sourceIndex];
      const quantity = Number(row?.[dieselIndex]);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      const isOutboundOperation =
        (isSameText(type, "Direct_Refuel") ||
          isSameText(type, "Internal_Transfer") ||
          isSameText(type, "External_Transfer")) &&
        isSameText(source, station.id);

      return isOutboundOperation ? sum + quantity : sum;
    }, 0);
  };


  const saveStationCounterReset = async ({
    station,
    newReading,
    effectiveFrom,
    reason,
  }) => {
    if (!station || stationCounterResetLoading) return false;

    const backendId =
      station?.backendId ||
      station?.stationBackendId ||
      station?.databaseId ||
      station?.prismaId ||
      "";

    if (!backendId) {
      notifyUser(
        showToast,
        "warning",
        "This station is not linked to backend yet. Refresh and try again."
      );
      return false;
    }

    const parsedNewReading = Number(newReading);
    if (!Number.isFinite(parsedNewReading) || parsedNewReading < 0) {
      notifyUser(
        showToast,
        "warning",
        "New counter reading must be a valid zero or positive number."
      );
      return false;
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      notifyUser(showToast, "warning", "Please enter reset reason.");
      return false;
    }

    if (!canUseNetwork(showToast)) return false;

    const oldReading = Number(
      station.currentCounter ?? getEffectiveStationCounter(station) ?? 0
    );

    setStationCounterResetLoading(true);

    try {
      const result = await resetStationCounter(backendId, {
        newCounter: parsedNewReading,
        reason: cleanReason,
        effectiveAt: effectiveFrom || new Date().toISOString(),
        createdByUserId: currentUser?.id || undefined,
      });

      if (result?.station) {
        const mappedStation = mapBackendStationForState(result.station);

        setStations((previous) =>
          (previous || []).map((item) =>
            normalizeScopeValue(
              item?.backendId ||
                item?.stationBackendId ||
                item?.databaseId ||
                item?.prismaId
            ) === normalizeScopeValue(backendId) ||
            tenantEntityMatches(item, station.id, station.companyId)
              ? { ...item, ...mappedStation }
              : item
          )
        );
      }

      if (
        result?.resetRecord &&
        typeof setStationCounterResetHistory === "function"
      ) {
        const resetRecord = result.resetRecord;

        setStationCounterResetHistory((previous) => [
          {
            ...resetRecord,
            stationId: station.id,
            entityId: station.id,
            companyId:
              resetRecord.companyId ||
              station.companyId ||
              currentUser?.companyId ||
              "",
            oldReading: resetRecord.oldCounter,
            newReading: resetRecord.newCounter,
            effectiveFrom:
              resetRecord.effectiveAt ||
              resetRecord.createdAt ||
              effectiveFrom,
            createdBy:
              resetRecord.createdBy?.fullName ||
              resetRecord.createdBy?.name ||
              currentUser?.fullName ||
              currentUser?.name ||
              "System",
            source: "station_counter_reset_backend",
          },
          ...(previous || []),
        ]);
      }

      trackActivity?.(
        "Reset Station Counter",
        "stations",
        `${station.id} counter reset from ${formatNumber(oldReading)} to ${formatNumber(parsedNewReading)}.`
      );

      notifyUser(
        showToast,
        "success",
        "Station counter reset completed successfully."
      );

      return true;
    } catch (error) {
      notifyUser(
        showToast,
        "warning",
        getFriendlyApiErrorMessage(
          error,
          "Failed to reset station counter."
        )
      );
      return false;
    } finally {
      setStationCounterResetLoading(false);
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const stationSettingsRef = useRef(null);
  const stationSettingsMenuAlign = useSmartDropdownPosition(stationSettingsRef, showSettings, 256);

  useOutsideClick(stationSettingsRef, () => {
    setShowSettings(false);
    setShowExportMenu(false);
  });

  const [selectedStation, setSelectedStation] = useState(null);
  const [zeroBalanceReason, setZeroBalanceReason] = useState("Daily reconciliation after station emptying");
  const [selectedStationHistory, setSelectedStationHistory] = useState(null);
  const [editingProjectStation, setEditingProjectStation] = useState(null);
  const [stationTransferStockConfirmation, setStationTransferStockConfirmation] = useState(null);
  const [newStationProject, setNewStationProject] = useState("");
  const [newStationOpeningCounter, setNewStationOpeningCounter] = useState("0");
  const [showConfirm, setShowConfirm] = useState(false);
  const [localAdjustments, setLocalAdjustments] = useState([]);
  const [localStationStatusUpdates, setLocalStationStatusUpdates] = useState({});
  const [localStations, setLocalStations] = useState([]);
  const [stationSaveLoading, setStationSaveLoading] = useState(false);
  const [newStation, setNewStation] = useState({
    id: "",
    type: "Main",
    project: "",
    capacity: "",
    openingBalance: "",
    status: "Active",
  });


  const [statusEditStation, setStatusEditStation] = useState(null);
  const [newStationStatus, setNewStationStatus] = useState("");
  const [capacityEditStation, setCapacityEditStation] = useState(null);
  const [capacityDraftValue, setCapacityDraftValue] = useState("");
  const [capacitySaveLoading, setCapacitySaveLoading] = useState(false);
  const [stationDeleteLoading, setStationDeleteLoading] = useState(false);

  const [showStockCountAdjustment, setShowStockCountAdjustment] = useState(false);
  const [stockCountStation, setStockCountStation] = useState(null);
  const [actualStockQty, setActualStockQty] = useState("");
  const [stockCountReason, setStockCountReason] = useState("");

  const [deleteTargetStation, setDeleteTargetStation] = useState(null);
  const [stationDeleteReason, setStationDeleteReason] = useState("");
  const [showStationDeleteConfirm, setShowStationDeleteConfirm] = useState(false);




  const stationIdDuplicateError = getDuplicateIdError(
    newStation.id,
    [...stations, ...localStations],
    "Station ID"
  );

  const resetNewStation = () => {
    setNewStation({
      id: "",
      type: "Main",
      project: "",
      capacity: "",
      openingBalance: "",
      status: "Active",
    });
    setNewStationOpeningCounter("0");
  };

  const closeAddStation = () => {
    setShowForm(false);
    resetNewStation();
  };

  const saveNewStation = async () => {
    if (currentUser?.role !== "Admin") {
      showToast?.("warning", "Only Admin can add stations.");
      return;
    }

    if (stationSaveLoading) return;

    const stationId = newStation.id.trim();

    if (!stationId) {
      showToast?.("warning", "Please enter Station ID.");
      return;
    }

    if (stationIdDuplicateError) {
      showToast?.("warning", stationIdDuplicateError);
      return;
    }

    const selectedProjectValue = newStation.project || "";
    const projectLookupList = [
      ...(Array.isArray(projects) ? projects : []),
      ...(Array.isArray(transferProjects) ? transferProjects : []),
    ];
    const matchedProject = projectLookupList.find((project) =>
      normalizeScopeValue(project.id) === normalizeScopeValue(selectedProjectValue) ||
      normalizeScopeValue(project.backendId) === normalizeScopeValue(selectedProjectValue) ||
      normalizeScopeValue(project.projectBackendId) === normalizeScopeValue(selectedProjectValue) ||
      normalizeScopeValue(project.databaseId) === normalizeScopeValue(selectedProjectValue) ||
      normalizeScopeValue(project.name) === normalizeScopeValue(selectedProjectValue) ||
      normalizeScopeValue(project.code) === normalizeScopeValue(selectedProjectValue)
    );

    if (selectedProjectValue && !matchedProject) {
      showToast?.("warning", "Selected project was not found in backend projects list.");
      return;
    }

    const matchedProjectBackendId =
      matchedProject?.backendId ||
      matchedProject?.projectBackendId ||
      matchedProject?.databaseId ||
      matchedProject?.prismaId ||
      matchedProject?.originalId ||
      matchedProject?.id ||
      "";

    const stationCompanyId =
      matchedProject?.companyId ||
      (!isPlatformContextValue(currentUser?.companyId) ? currentUser?.companyId : "") ||
      (!isPlatformContextValue(currentCompanyId) ? currentCompanyId : "") ||
      (!isPlatformContextValue(selectedCompanyId) ? selectedCompanyId : "") ||
      "";

    if (!stationCompanyId || isPlatformContextValue(stationCompanyId)) {
      showToast?.("warning", "Please select a company before adding a station.");
      return;
    }

    const capacity = Number(newStation.capacity || 0);
    const openingBalance = Number(newStation.openingBalance || 0);
    const openingCounter = Number(newStationOpeningCounter || 0);

    if (!Number.isFinite(capacity) || capacity < 0) {
      showToast?.("warning", "Capacity must be a valid zero or positive number.");
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      showToast?.("warning", "Opening balance must be a valid zero or positive number.");
      return;
    }

    if (!Number.isFinite(openingCounter) || openingCounter < 0) {
      showToast?.("warning", "Opening counter must be a valid zero or positive number.");
      return;
    }

    const cleanStation = {
      id: stationId,
      stationId,
      name: stationId,
      type: newStation.type || "Main",
      project: matchedProject?.name || selectedProjectValue || "-",
      projectId: matchedProjectBackendId,
      capacity,
      openingBalance,
      currentStock: openingBalance,
      currentCounter: openingCounter,
      openingCounter,
      counter: openingCounter,
      status: newStation.status || "Active",
      companyId: stationCompanyId,
    };

    if (isOfficerUser(currentUser)) {
      submitApprovalRequest?.({
        type: "master_data_change",
        module: "stations",
        title: `New station ${cleanStation.id}`,
        details: `Officer requested new station ${cleanStation.id}`,
        payload: { entity: "station", action: "add", values: cleanStation },
      });
      closeAddStation();
      return;
    }

    if (!canUseNetwork(showToast)) return;

    setStationSaveLoading(true);

    let createdStation = null;

    // Important: this try/catch is for the backend create request only.
    // Any UI refresh/activity error after a successful POST must not turn the save into a false failure.
    try {
      const createdStationData = await createStationRecord({
        companyId: stationCompanyId,
        stationId: cleanStation.stationId,
        name: cleanStation.name,
        type: cleanStation.type,
        capacity: cleanStation.capacity,
        openingBalance: cleanStation.openingBalance,
        currentCounter: cleanStation.currentCounter,
        projectId: cleanStation.projectId || undefined,
        status: mapFrontendStationStatusForBackend(cleanStation.status),
        createdById: currentUser?.id || undefined,
      });

      createdStation = mapBackendStationForState(createdStationData);
    } catch (error) {
      const backendMessage = getFriendlyApiErrorMessage(error, "Failed to add station.");

      showToast?.("warning", backendMessage);
      setStationSaveLoading(false);
      return;
    }

    showToast?.("success", "Station added successfully.");
    closeAddStation();

    try {
      const backendStations = await fetchStations({
        companyId: stationCompanyId,
      });
      const mappedStations = backendStations.map(mapBackendStationForState);

      setStations((prev) => {
        const otherCompanies = prev.filter(
          (station) => !companyMatches(getItemCompanyId(station), stationCompanyId)
        );
        return filterDuplicateTenantEntities([...mappedStations, ...otherCompanies]);
      });
    } catch (refreshError) {
      console.warn("Station was created, but stations refresh failed. Applying local fallback.", refreshError);

      if (createdStation) {
        setStations((prev) => [
          createdStation,
          ...prev.filter((station) =>
            !tenantEntityMatches(
              station,
              createdStation.id,
              createdStation.companyId || stationCompanyId
            ) &&
            normalizeScopeValue(station.backendId || station.stationBackendId) !==
              normalizeScopeValue(createdStation.backendId || createdStation.stationBackendId)
          ),
        ]);
      }
    }

    try {
      trackActivity?.(
        "Add Station",
        "stations",
        `${createdStation?.id || cleanStation.id} added from backend.`
      );
    } catch (activityError) {
      console.warn("Station was created, but activity tracking failed.", activityError);
    }

    setStationSaveLoading(false);
  };


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
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const stationCounterIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "station_counter",
    "Station Counter",
    "station counter",
    "source_station_counter",
    "Source Station Counter",
    "source station counter",
    "station_meter",
    "Station Meter",
    "station meter",
    "source_station_meter",
    "Source Station Meter",
    "source station meter",
    "meter_counter",
    "Meter Counter",
    "counter",
  ]);

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

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "-";

    const d = new Date(rawDate);

    if (Number.isNaN(d.getTime())) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStationOperations = (stationId) => {
    return data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter((item) => {
        const row = item.row;
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const destination = row[destinationIndex];

        return (
          (isSameText(type, "Direct_Refuel") &&
            isSameText(source, stationId)) ||
          (isSameText(type, "Internal_Transfer") &&
            (isSameText(source, stationId) ||
              isSameText(destination, stationId))) ||
          (isSameText(type, "External_Supply") &&
            isSameText(destination, stationId))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.row[dateIndex]).getTime() || 0;
        const dateB = new Date(b.row[dateIndex]).getTime() || 0;
        return dateB - dateA;
      });
  };

  const getStationOperationDirection = (row, stationId) => {
    const type = row[typeIndex];
    const source = row[sourceIndex];
    const destination = row[destinationIndex];

    if (isSameText(type, "Direct_Refuel") && isSameText(source, stationId)) {
      return "Out";
    }

    if (isSameText(type, "Internal_Transfer") && isSameText(source, stationId)) {
      return "Out";
    }

    if (
      isSameText(type, "Internal_Transfer") &&
      isSameText(destination, stationId)
    ) {
      return "In";
    }

    if (isSameText(type, "External_Supply") && isSameText(destination, stationId)) {
      return "In";
    }

    return "-";
  };

  const getCurrentStationProject = (station) => station?.project || "-";

  const getCurrentStationStatus = (station) => {
    return localStationStatusUpdates[station.id]?.status || station.status || "Active";
  };

  const getStationBackendId = (station) =>
    station?.backendId || station?.stationBackendId || station?.databaseId || station?.prismaId || "";

  const canCurrentUserCreateStationTransfer = () =>
    currentUser?.status === "Active" && ["Officer", "Manager"].includes(currentUser?.role);

  const canCurrentUserRequestZeroBalance = () =>
    currentUser?.status === "Active" && ["Officer", "Manager"].includes(currentUser?.role);

  const resolveStationProjectId = (projectValue) => {
    const normalized = normalizeScopeValue(projectValue);
    const matchedProject = (transferProjects || projects || []).find((project) => {
      return (
        normalizeScopeValue(project.id) === normalized ||
        normalizeScopeValue(project.backendId) === normalized ||
        normalizeScopeValue(project.name) === normalized ||
        normalizeScopeValue(project.code) === normalized
      );
    });

    return matchedProject?.backendId || matchedProject?.id || projectValue || "";
  };

  const closeStationProjectTransferModal = () => {
    setEditingProjectStation(null);
    setStationTransferStockConfirmation(null);
    setNewStationProject("");
  };

  const createStationProjectTransferRequest = async ({
    station,
    backendId,
    toProjectId,
    currentStock,
    transferWithStockConfirmed,
  }) => {
    const stockSnapshotNote = transferWithStockConfirmed
      ? `Station transfer requested with current stock balance of ${formatNumber(currentStock)} L.`
      : "Station transfer requested with zero stock balance.";

    try {
      const createdTransfer = await createStationTransfer(backendId, {
        toProjectId,
        requestedByUserId: currentUser?.id || "",
        stockAtRequest: currentStock,
        transferWithStockConfirmed,
        stockSnapshotNote,
      });

      onStationTransferCreated?.(createdTransfer);

      trackActivity?.(
        "Request Station Transfer",
        "stations",
        `${station.id} transfer requested from ${station.project || "-"} to ${newStationProject}. ${stockSnapshotNote}`
      );

      showToast?.(
        "warning",
        "Station transfer request submitted for project manager approval."
      );
      closeStationProjectTransferModal();
      return true;
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit station transfer request.";

      showToast?.(
        "warning",
        Array.isArray(backendMessage)
          ? backendMessage.join(" / ")
          : backendMessage
      );
      return false;
    }
  };

  const submitStationProjectTransferRequest = async () => {
    if (!editingProjectStation) return;

    if (!canCurrentUserCreateStationTransfer()) {
      closeStationProjectTransferModal();
      return;
    }

    if (!newStationProject) {
      showToast?.("warning", "Please select a new project.");
      return;
    }


    const backendId = getStationBackendId(editingProjectStation);
    const toProjectId = resolveStationProjectId(newStationProject);

    if (!backendId) {
      showToast?.(
        "warning",
        "This station is not linked to backend yet. Refresh and try again."
      );
      closeStationProjectTransferModal();
      return;
    }

    if (!toProjectId) {
      showToast?.("warning", "Please select a valid project.");
      return;
    }

    const currentStock = Number(editingProjectStation.currentStock);

    if (!Number.isFinite(currentStock)) {
      showToast?.(
        "warning",
        "Station stock could not be verified. Refresh the page and try again."
      );
      return;
    }

    const transferWithStock = Math.abs(currentStock) > 0.000001;

    if (transferWithStock) {
      setStationTransferStockConfirmation({
        station: editingProjectStation,
        backendId,
        toProjectId,
        currentStock,
      });
      return;
    }

    await createStationProjectTransferRequest({
      station: editingProjectStation,
      backendId,
      toProjectId,
      currentStock,
      transferWithStockConfirmed: false,
    });
  };

  const confirmStationTransferWithStock = async () => {
    if (!stationTransferStockConfirmation) return;

    const {
      station,
      backendId,
      toProjectId,
      currentStock,
    } = stationTransferStockConfirmation;

    const created = await createStationProjectTransferRequest({
      station,
      backendId,
      toProjectId,
      currentStock,
      transferWithStockConfirmed: true,
    });

    if (created) {
      setStationTransferStockConfirmation(null);
    }
  };



  const openStatusChange = (station) => {
    if (!hasPermission("stations", "edit")) {
      showToast?.("warning", "Read-only access: you cannot change station status.");
      return;
    }

    const currentStatus = getCurrentStationStatus(station);
    const nextStatus = isSameText(currentStatus, "Active") ? "Inactive" : "Active";

    setStatusEditStation(station);
    setNewStationStatus(nextStatus);
  };

  const confirmStationStatusChange = async () => {
    if (!statusEditStation) return;

    if (!newStationStatus) {
      showToast?.("warning", "Please select station status.");
      return;
    }

    const backendId = getStationBackendId(statusEditStation);
    if (!backendId) {
      showToast?.("warning", "This station is not linked to backend yet. Refresh and try again.");
      return;
    }

    const oldStatus = getCurrentStationStatus(statusEditStation);

    try {
      const updatedStationData = await updateStationRecord(backendId, {
        status: mapFrontendStationStatusForBackend(newStationStatus),
      });

      const updatedStation = mapBackendStationForState(updatedStationData);

      setStations((prev) =>
        prev.map((station) =>
          normalizeScopeValue(getStationBackendId(station)) === normalizeScopeValue(backendId) ||
          tenantEntityMatches(station, statusEditStation.id, statusEditStation.companyId)
            ? { ...station, ...updatedStation }
            : station
        )
      );

      setLocalStationStatusUpdates((prev) => {
        const next = { ...prev };
        delete next[statusEditStation.id];
        return next;
      });

      trackActivity?.(
        "Station Status Change",
        "stations",
        `${statusEditStation.id} status changed from ${oldStatus || "-"} to ${newStationStatus}.`
      );

      setStatusEditStation(null);
      setNewStationStatus("");

      showToast?.("success", "Station status updated successfully.");
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update station status.";

      showToast?.(
        "warning",
        Array.isArray(backendMessage) ? backendMessage.join(" / ") : backendMessage
      );
    }
  };

  const startCapacityInlineEdit = (station) => {
    if (!hasPermission("stations", "edit")) {
      showToast?.("warning", "Read-only access: you cannot edit station capacity.");
      return;
    }

    setCapacityEditStation(station);
    setCapacityDraftValue(String(station.capacity ?? 0));
  };

  const cancelCapacityInlineEdit = () => {
    if (capacitySaveLoading) return;
    setCapacityEditStation(null);
    setCapacityDraftValue("");
  };

  const saveCapacityInlineEdit = async () => {
    if (!capacityEditStation || capacitySaveLoading) return;

    const nextCapacity = Number(capacityDraftValue);
    const oldCapacity = Number(capacityEditStation.capacity || 0);

    if (capacityDraftValue === "" || !Number.isFinite(nextCapacity) || nextCapacity < 0) {
      showToast?.("warning", "Capacity must be a valid zero or positive number.");
      return;
    }

    if (nextCapacity === oldCapacity) {
      cancelCapacityInlineEdit();
      return;
    }

    if (isOfficerUser(currentUser)) {
      submitApprovalRequest?.({
        type: "master_data_change",
        module: "stations",
        title: `Station ${capacityEditStation.id} capacity change`,
        details: `Officer requested station capacity change from ${formatNumber(oldCapacity)} L to ${formatNumber(nextCapacity)} L.`,
        payload: {
          entity: "station",
          id: capacityEditStation.id,
          backendId: getStationBackendId(capacityEditStation),
          field: "capacity",
          oldValue: oldCapacity,
          newValue: nextCapacity,
          project: capacityEditStation.project,
          changedFields: [
            {
              field: "capacity",
              label: "Station Capacity",
              oldValue: `${formatNumber(oldCapacity)} L`,
              newValue: `${formatNumber(nextCapacity)} L`,
              sensitive: true,
            },
          ],
        },
      });

      setCapacityEditStation(null);
      setCapacityDraftValue("");
      showToast?.("warning", "Station capacity change sent for manager approval.");
      return;
    }

    const confirmed = window.confirm(
      `Update station ${capacityEditStation.id} capacity from ${formatNumber(oldCapacity)} L to ${formatNumber(nextCapacity)} L?`
    );

    if (!confirmed) return;

    const backendId = getStationBackendId(capacityEditStation);
    if (!backendId) {
      showToast?.("warning", "This station is not linked to backend yet. Refresh and try again.");
      return;
    }

    setCapacitySaveLoading(true);

    try {
      const updatedStationData = await updateStationRecord(backendId, {
        capacity: nextCapacity,
      });

      const updatedStation = mapBackendStationForState(updatedStationData);

      setStations((prev) =>
        prev.map((station) =>
          normalizeScopeValue(getStationBackendId(station)) === normalizeScopeValue(backendId) ||
          tenantEntityMatches(station, capacityEditStation.id, capacityEditStation.companyId)
            ? { ...station, ...updatedStation }
            : station
        )
      );

      trackActivity?.(
        "Station Capacity Change",
        "stations",
        `${capacityEditStation.id} capacity changed from ${formatNumber(oldCapacity)} L to ${formatNumber(nextCapacity)} L.`
      );

      setCapacityEditStation(null);
      setCapacityDraftValue("");
      showToast?.("success", "Station capacity updated successfully.");
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update station capacity.";

      showToast?.(
        "warning",
        Array.isArray(backendMessage) ? backendMessage.join(" / ") : backendMessage
      );
    } finally {
      setCapacitySaveLoading(false);
    }
  };


  const proceedStationDeleteConfirm = () => {
    if (!deleteTargetStation) return;

    const currentStock = Number(deleteTargetStation.currentStock);

    if (!Number.isFinite(currentStock)) {
      showToast?.(
        "warning",
        "Station stock could not be verified. Refresh the page and try again."
      );
      return;
    }

    if (Math.abs(currentStock) > 0.000001) {
      showToast?.(
        "warning",
        `Cannot delete station ${deleteTargetStation.id} because its current stock is ${formatNumber(currentStock)} L. Adjust the balance to zero before deletion.`
      );
      return;
    }

    if (!stationDeleteReason) {
      showToast
        ? showToast("warning", "Please enter deletion reason.")
        : notifyUser(
            typeof showToast !== "undefined" ? showToast : null,
            inferToastTypeFromMessage("Please enter deletion reason."),
            "Please enter deletion reason."
          );
      return;
    }

    setShowStationDeleteConfirm(true);
  };

  const proceedStationDeletePassword = () => {
    setShowStationDeleteConfirm(false);
    confirmStationDeleteRequest();
  };

  const confirmStationDeleteRequest = async () => {
    if (!deleteTargetStation || stationDeleteLoading) return;

    if (!hasPermission("stations", "delete")) {
      showToast?.("warning", "Read-only access: you cannot delete stations.");
      return;
    }

    const currentStock = Number(deleteTargetStation.currentStock);

    if (!Number.isFinite(currentStock)) {
      showToast?.(
        "warning",
        "Station stock could not be verified. Refresh the page and try again."
      );
      return;
    }

    if (Math.abs(currentStock) > 0.000001) {
      showToast?.(
        "warning",
        `Cannot delete station ${deleteTargetStation.id} because its current stock is ${formatNumber(currentStock)} L. Adjust the balance to zero before deletion.`
      );
      return;
    }

    const backendId = getStationBackendId(deleteTargetStation);
    if (!backendId) {
      showToast?.("warning", "This station is not linked to backend yet. Refresh and try again.");
      return;
    }

    setStationDeleteLoading(true);

    try {
      await deleteStationRecord(backendId);

      setStations((prev) =>
        prev.filter((station) =>
          !(
            normalizeScopeValue(getStationBackendId(station)) === normalizeScopeValue(backendId) ||
            tenantEntityMatches(station, deleteTargetStation.id, deleteTargetStation.companyId)
          )
        )
      );

      trackActivity?.(
        "Delete Station",
        "stations",
        `${deleteTargetStation.id} was soft deleted.${stationDeleteReason ? ` Reason: ${stationDeleteReason}` : ""}`
      );

      setDeleteTargetStation(null);
      setStationDeleteReason("");
      setShowStationDeleteConfirm(false);

      showToast?.("success", "Station soft deleted successfully.");
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to delete station.";

      showToast?.(
        "warning",
        Array.isArray(backendMessage) ? backendMessage.join(" / ") : backendMessage
      );
    } finally {
      setStationDeleteLoading(false);
    }
  };


  const stationCurrentCounterMap = useMemo(() => {
    const map = new Map();

    if (stationCounterIndex === -1) return map;

    const putReading = (stationId, counterValue, operationTime, originalIndex) => {
      if (!stationId || Number.isNaN(counterValue)) return;

      const key = normalizeScopeValue(stationId);
      const previous = map.get(key);

      if (
        !previous ||
        operationTime > previous.operationTime ||
        (operationTime === previous.operationTime &&
          originalIndex > previous.originalIndex)
      ) {
        map.set(key, {
          value: counterValue,
          operationTime,
          originalIndex,
        });
      }
    };

    data.forEach((row, originalIndex) => {
      const type = row[typeIndex];
      const destination = destinationIndex !== -1 ? row[destinationIndex] : "";
      const counterValue = parseFloat(row[stationCounterIndex]);

      if (Number.isNaN(counterValue)) return;

      // Direct_Refuel uses odometer_at_fueling for equipment odometer, not station counter.
      if (isSameText(type, "Direct_Refuel")) return;

      const operationTime =
        dateIndex !== -1
          ? new Date(row[dateIndex]).getTime() || 0
          : originalIndex;

      // Station counter reading in odometer_at_fueling belongs to destination_id
      // for Internal_Transfer, External_Transfer, and External_Supply.
      if (
        isSameText(type, "Internal_Transfer") ||
        isSameText(type, "External_Transfer") ||
        isSameText(type, "External_Supply")
      ) {
        putReading(destination, counterValue, operationTime, originalIndex);
      }
    });

    return map;
  }, [
    data,
    typeIndex,
    destinationIndex,
    dateIndex,
    stationCounterIndex,
  ]);


  const calculateStationBalance = (station) => {
    // Backend stations use database currentStock as the source of truth.
    // Operations are backend-only; station stock is updated by NestJS/Supabase operations logic.
    if (station?.source === "Backend" || station?.backendId || station?.stationBackendId) {
      return Number(station.currentStock) || 0;
    }

    // Legacy/local fallback only. This path is kept for unsaved local rows, not for backend stations.
    let currentStock = station.openingBalance || 0;

    data.forEach((row) => {
      const type = row[typeIndex];
      const source = row[sourceIndex];
      const destination = row[destinationIndex];
      const qty = parseFloat(row[dieselIndex]) || 0;

      if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(destination, station.id)) currentStock += qty;
      if (isSameText(type, "External_Transfer") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "External_Transfer") && isSameText(destination, station.id)) currentStock += qty;
      if (isSameText(type, "External_Supply") && isSameText(destination, station.id)) currentStock += qty;
    });

    [...externalStockAdjustments, ...localAdjustments].forEach((adj) => {
      const sameStation =
        isSameText(adj.stationId, station.id) ||
        isSameText(adj.backendStationId, station.backendId || station.stationBackendId);

      if (sameStation) {
        currentStock += Number(adj.adjustmentQty) || 0;
      }
    });

    return currentStock;
  };

  const realStations = [...stations, ...localStations].filter(
    (station) => !isSameText(station.id, "External_Supply")
  );

  const stationsWithBalance = realStations.map((station) => {
    const currentStock = calculateStationBalance(station);
    const currentCounter = getEffectiveStationCounter(station);
    const lifetimeCounter = getStationLifetimeCounter(station);
    const totalPumpedFromOperations =
      getTotalPumpedLitersFromOperations(station);
    const percentage =
      station.capacity > 0
        ? Math.max(0, Math.min(100, (currentStock / station.capacity) * 100))
        : 0;

    return {
      ...station,
      project: getCurrentStationProject(station),
      originalProject: station.project,
      status: getCurrentStationStatus(station),
      currentCounter,
      lifetimeCounter,
      totalPumpedFromOperations,
      currentStock,
      percentage,
    };
  });

  const transferProjectOptions =
    transferProjects.length > 0
      ? filterActiveProjects(transferProjects).map((project) => project.name || project.id).filter(Boolean)
      : [];

  const filteredStations = stationsWithBalance.filter((station) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const searchableText = [
      station.id,
      station.stationId,
      station.name,
      station.type,
      station.project,
      station.originalProject,
      station.status,
      station.capacity,
      station.currentStock,
      station.currentCounter,
      station.lifetimeCounter,
      station.totalPumpedFromOperations,
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });

  const stationConsumptionChartData = filteredStations
    .map((station) => {
      const totalConsumed = data.reduce((sum, row) => {
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const qty = parseFloat(row[dieselIndex]) || 0;

        if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) {
          return sum + qty;
        }

        return sum;
      }, 0);

      return {
        stationId: station.id,
        qtyLiters: totalConsumed,
      };
    })
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const openInventoryAdjustment = () => {
    if (!canCurrentUserRequestZeroBalance()) {
      return;
    }

    setShowSettings(false);
    setShowExportMenu(false);
    setSelectedStation(null);
    setZeroBalanceReason("Daily reconciliation after station emptying");
    setShowConfirm(true);
  };

  const openStockCountAdjustment = () => {
    if (currentUser?.role !== "Manager") {
      showToast?.("warning", "Inventory adjustment can only be requested by Project Manager.");
      return;
    }

    setShowSettings(false);
    setShowExportMenu(false);
    setStockCountStation(null);
    setActualStockQty("");
    setStockCountReason("");
    setShowStockCountAdjustment(true);
  };

  const confirmStockCountAdjustment = () => {
    if (currentUser?.role !== "Manager") {
      showToast?.("warning", "Inventory adjustment can only be requested by Project Manager.");
      return;
    }

    if (!stockCountStation) {
      showToast?.("warning", "Please select a station first.");
      return;
    }

    const actualQty = Number(actualStockQty);

    if (actualStockQty === "" || Number.isNaN(actualQty) || actualQty < 0) {
      showToast?.("warning", "Please enter a valid actual stock quantity.");
      return;
    }

    const reason = String(stockCountReason || "").trim();

    if (!reason) {
      showToast?.("warning", "Please enter the inventory adjustment reason.");
      return;
    }

    const systemQty = Number(stockCountStation.currentStock) || 0;
    const adjustmentQty = actualQty - systemQty;
    const backendId = getStationBackendId(stockCountStation);

    const approvalRequest = submitApprovalRequest?.({
      type: "station_stock_count_adjustment",
      module: "stations",
      title: `Inventory Adjustment - ${stockCountStation.id}`,
      details: `${currentUser?.fullName || currentUser?.name || "Manager"} requested inventory adjustment for station ${stockCountStation.id}.`,
      payload: {
        entity: "station",
        id: stockCountStation.id,
        backendStationId: backendId,
        stationBackendId: backendId,
        action: "stock_count_adjustment",
        stationId: stockCountStation.id,
        field: "currentStock",
        oldValue: systemQty,
        newValue: actualQty,
        adjustmentQty,
        reason,
        project: stockCountStation.projectId || stockCountStation.project,
        projectId: stockCountStation.projectId || "",
        projectName: stockCountStation.projectName || stockCountStation.project || "",
        approvalRouteStrategy: "admin",
        changedFields: [
          {
            field: "currentStock",
            label: "Inventory Adjustment",
            oldValue: `${systemQty} L`,
            newValue: `${actualQty} L`,
            sensitive: true,
          },
          {
            field: "adjustmentQty",
            label: "Adjustment Quantity",
            oldValue: "-",
            newValue: `${adjustmentQty} L`,
            sensitive: true,
          },
          {
            field: "reason",
            label: "Reason",
            oldValue: "-",
            newValue: reason,
            sensitive: true,
          },
        ],
      },
    });

    if (!approvalRequest) {
      return;
    }

    setShowStockCountAdjustment(false);
    setStockCountStation(null);
    setActualStockQty("");
    setStockCountReason("");
    showToast?.("warning", "Inventory adjustment request sent for Admin approval.");
  };

  const proceedToPassword = () => {
    if (!selectedStation) {
      showToast
        ? showToast("warning", "Please select a station first.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select a station first."), "Please select a station first.");
      return;
    }

    setShowConfirm(false);
    confirmZeroBalance();
  };

  const confirmZeroBalance = async () => {
    if (!selectedStation) {
      showToast?.("warning", "Please select a station first.");
      return;
    }

    if (!canCurrentUserRequestZeroBalance()) {
      setShowConfirm(false);
      setSelectedStation(null);
      setZeroBalanceReason("Daily reconciliation after station emptying");
      return;
    }

    const currentStock = Number(selectedStation.currentStock) || 0;

    if (currentStock <= 0) {
      showToast?.("warning", "Current station stock is already zero.");
      return;
    }

    const adjustmentQty = -currentStock;
    const reason =
      zeroBalanceReason?.trim() || "Daily reconciliation after station emptying";
    const backendId = getStationBackendId(selectedStation);

    if (currentUser?.role === "Officer") {
      const approvalRequest = submitApprovalRequest?.({
        type: "station_zero_balance_adjustment",
        module: "stations",
        title: `Zero Balance Adjustment - ${selectedStation.id}`,
        details: `${currentUser?.fullName || currentUser?.name || "Officer"} requested zero balance adjustment for station ${selectedStation.id}.`,
        payload: {
          entity: "station",
          id: selectedStation.id,
          backendStationId: backendId,
          stationBackendId: backendId,
          action: "zero_balance_adjustment",
          stationId: selectedStation.id,
          field: "currentStock",
          oldValue: currentStock,
          newValue: 0,
          reason,
          project: selectedStation.projectId || selectedStation.project,
          projectId: selectedStation.projectId || "",
          projectName: selectedStation.projectName || selectedStation.project || "",
          approvalRouteStrategy: "project_manager",
          changedFields: [
            {
              field: "currentStock",
              label: "Zero Balance",
              oldValue: `${currentStock} L`,
              newValue: "0 L",
              sensitive: true,
            },
          ],
        },
      });

      if (!approvalRequest) {
        return;
      }

      setShowConfirm(false);
      setSelectedStation(null);
      setZeroBalanceReason("Daily reconciliation after station emptying");
      showToast?.("warning", "Zero balance adjustment sent for project manager approval.");
      return;
    }

    if (!backendId) {
      showToast?.("warning", "This station is not linked to backend yet. Refresh and try again.");
      return;
    }

    try {
      const zeroBalanceResult = await zeroStationBalance(backendId, {
        reason,
        createdByUserId: currentUser?.id || undefined,
      });

      if (zeroBalanceResult?.station) {
        const mappedStation = mapBackendStationForState(zeroBalanceResult.station);
        setStations((prev) =>
          (prev || []).map((station) =>
            normalizeScopeValue(station.backendId || station.stationBackendId) ===
              normalizeScopeValue(mappedStation.backendId || mappedStation.stationBackendId) ||
            tenantEntityMatches(station, mappedStation.id, mappedStation.companyId)
              ? { ...station, ...mappedStation }
              : station
          )
        );
      }

      setLocalAdjustments((prev) => [
        ...prev,
        {
          stationId: selectedStation.id,
          backendStationId: backendId,
          adjustmentQty,
          systemQty: currentStock,
          actualQty: 0,
          reason,
          adjustmentType: "ZERO_BALANCE_ADJUSTMENT",
          createdBy: currentUser?.fullName || currentUser?.name || "Manager",
          createdAt: new Date().toISOString(),
          source: "manager_zero_balance",
        },
      ]);

      trackActivity?.(
        "Zero Balance Adjustment",
        "stations",
        `${selectedStation.id} balance zeroed. Adjustment: ${formatNumber(adjustmentQty)} L.`
      );

      setShowConfirm(false);
      setSelectedStation(null);
      setZeroBalanceReason("Daily reconciliation after station emptying");
      showToast?.("success", "Zero balance adjustment completed successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to apply zero balance adjustment.";
      showToast?.("warning", message);
    }
  };


  const exportStationsToCSV = () => {
    const csvHeaders = [
      "Station ID",
      "Project",
      "Capacity",
      "Current Stock",
      "Tank Level",
      "Status",
    ];

    const csvRows = filteredStations.map((station) => [
      station.id || "",
      station.project || "",
      station.capacity || "",
      station.currentStock || "",
      `${Number(station.percentage || 0).toFixed(1)}%`,
      station.status || "",
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
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
    link.download = `stations_export_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    showToast
      ? showToast("success", "Stations data exported successfully.")
      : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Stations data exported successfully."), "Stations data exported successfully.");
  };

  const exportStationsToPDF = () => {
    const escapePrintValue = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const reportDate = new Date().toLocaleString();

    const getStationTankLevel = (station) => {
      const capacity = Number(station?.capacity || 0);
      const currentStock = Number(station?.currentStock || 0);
      if (!capacity) return 0;
      return (currentStock / capacity) * 100;
    };

    const tableRowsHtml = filteredStations
      .map(
        (station, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapePrintValue(station.id || station.stationId || "-")}</td>
            <td>${escapePrintValue(station.project || station.projectName || "-")}</td>
            <td>${escapePrintValue(station.type || "-")}</td>
            <td>${escapePrintValue(formatNumber(station.capacity || 0))} L</td>
            <td>${escapePrintValue(formatNumber(station.currentCounter || station.counter || 0))}</td>
            <td>${escapePrintValue(formatNumber(station.openingBalance || 0))} L</td>
            <td>${escapePrintValue(formatNumber(station.currentStock || 0))} L</td>
            <td>${escapePrintValue(getStationTankLevel(station).toFixed(1))}%</td>
            <td>${escapePrintValue(station.status || "-")}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "", "width=1400,height=900");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stations Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            body {
              font-family: Arial, sans-serif;
              color: #111;
              padding: 10px;
            }

            h1 {
              margin: 0 0 6px;
              font-size: 24px;
            }

            h2 {
              margin: 26px 0 12px;
              font-size: 18px;
            }

            .meta {
              margin-bottom: 18px;
              font-size: 12px;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th, td {
              border: 1px solid #bbb;
              padding: 6px 8px;
              text-align: left;
            }

            th {
              background: #f0f0f0;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background: #fafafa;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <h1>Stations Report</h1>
          <div class="meta">
            Generated at: ${reportDate} | Total Stations: ${filteredStations.length}
          </div>

          <h2>Stations List</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Station ID</th>
                <th>Project</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Current Counter</th>
                <th>Opening Balance</th>
                <th>Current Stock</th>
                <th>Tank Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto overflow-x-hidden h-screen">
      <div className="fleet-page-shell w-full max-w-full min-w-0 mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Fuel Stations</h1>
          <p className="text-gray-400">Fuel stock management</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="text"
            placeholder="Search by station ID, name, project, type, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white w-full sm:w-[380px] focus:outline-none focus:border-yellow-400"
          />

          <div ref={stationSettingsRef} className="relative settings-layer-safe">
         <button
  onClick={(e) => {
    e.stopPropagation();
    setShowSettings(!showSettings);

    if (showSettings) {
      setShowExportMenu(false);
    }
  }}
  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
>
  ☰
</button>

          {showSettings && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`${getSmartDropdownClass(stationSettingsMenuAlign, "w-64")} bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-visible z-[10020] backdrop-blur-xl`}
            >
              {currentUser?.role === "Admin" && (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowExportMenu(false);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-slate-800 transition text-white"
                >
                  <span className="text-green-400 text-lg">＋</span>
                  Add Station
                </button>
              )}

              {canCurrentUserRequestZeroBalance() && (
                <button
                  onClick={openInventoryAdjustment}
                  className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-red-900/30 transition text-red-400"
                >
                  <span className="text-lg">⚠</span>
                  Zero Balance
                </button>
              )}

              {currentUser?.role === "Manager" && (
                <button
                  onClick={openStockCountAdjustment}
                  className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-amber-500/10 transition text-amber-300 border-t border-gray-700"
                >
                  <span className="text-lg">≋</span>
                  Inventory Adjustment
                </button>
              )}

              <div className="border-t border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu((prev) => !prev);
                  }}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-slate-800 transition text-white"
                >
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-blue-400 text-lg">⇩</span>
                    Export
                  </span>

                  <span className="text-gray-400">›</span>
                </button>

                {showExportMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-950 border-t border-gray-700"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToCSV();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToPDF();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Print Stations Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card title="Total Stations" value={filteredStations.length} />

        <Card
          title="Total Capacity"
          value={formatNumber(
            filteredStations.reduce((sum, s) => sum + (s.capacity || 0), 0)
          )}
        />

        <Card
          title="Current Stock"
          value={formatNumber(
            filteredStations.reduce(
              (sum, s) => sum + (s.currentStock || 0),
              0
            )
          )}
        />
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Stations Stock
            </h2>
            <p className="text-sm text-slate-400">
              Live stock overview by station
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {filteredStations.length} stations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div
              key={makeTenantEntityKey(station)}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-lg hover:border-yellow-400/60 hover:shadow-yellow-400/10 transition-all duration-300"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 w-full min-w-0">
                <div>
                  <div className="flex flex-col items-start w-full min-w-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedStationHistory(station)}
                      className="text-xl font-bold text-blue-200 truncate min-w-0 max-w-full"
                    >
                      {station.id}
                    </button>

                    {hasPermission("stations", "delete") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetStation(station);
                          setStationDeleteReason("");
                        }}
                        className="text-gray-400 hover:text-red-400 transition text-lg cursor-pointer"
                        title="Delete Station"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      if (!canCurrentUserCreateStationTransfer()) {
                        return;
                      }

                      setEditingProjectStation(station);
                      setNewStationProject(station.project || "");
                                                        }}
                    className={`mt-3 border border-slate-700/80 rounded-2xl bg-slate-950/50 px-4 py-3 min-w-[170px] shadow-lg transition-all duration-300 text-left ${
                      canCurrentUserCreateStationTransfer()
                        ? "hover:border-yellow-400 hover:bg-slate-900 cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
                      Project
                    </p>

                    <p className="text-sm font-semibold text-slate-100 mt-1">
                      {station.project || "-"}
                    </p>
                  </button>
                  <div className="mt-4 w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCounterResetStation(station);
                        setStationCounterResetValue(String(station.currentCounter ?? 0));
                        setStationCounterResetDate("");
                        setStationCounterResetReason("");
                      }}
                      className="block text-[10px] uppercase tracking-[0.24em] text-slate-400 hover:text-yellow-400 transition cursor-pointer mb-2"
                      title="Reset Station Counter"
                    >
                      Station Counter
                    </button>

                    <FlowmeterCounterDisplay value={station.currentCounter} />

                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        Lifetime Counter
                      </span>
                      <span className="text-sm font-bold text-amber-300 tabular-nums">
                        {formatNumber(station.lifetimeCounter)}
                      </span>
                    </div>
                  </div>
                </div>
                </div>

                <button
                  onClick={() => openStatusChange(station)}
                  className="cursor-pointer"
                >
                  <StatusBadge status={station.status} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">Capacity</p>
                  {capacityEditStation && tenantEntityMatches(capacityEditStation, station.id, station.companyId) ? (
                    <input
                      type="number"
                      min="0"
                      value={capacityDraftValue}
                      autoFocus
                      disabled={capacitySaveLoading}
                      onChange={(e) => setCapacityDraftValue(e.target.value)}
                      onBlur={saveCapacityInlineEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCapacityInlineEdit();
                        if (e.key === "Escape") cancelCapacityInlineEdit();
                      }}
                      className="w-full max-w-[140px] rounded-lg border border-yellow-400 bg-slate-950 px-2 py-1 text-lg font-semibold text-white outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => startCapacityInlineEdit(station)}
                      title="Double click to edit capacity"
                      className="text-lg font-semibold cursor-pointer hover:text-yellow-300 transition"
                    >
                      {formatNumber(station.capacity)} L
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 whitespace-nowrap">Total Pumped</p>
                  <p className="text-base lg:text-lg font-semibold text-slate-100 whitespace-nowrap">
                    {formatNumber(station.totalPumpedFromOperations)} L
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">Current Stock</p>
                  <p className="text-base lg:text-lg font-semibold text-slate-100 whitespace-nowrap">
                    {formatNumber(station.currentStock)} L
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-3">Tank Level</p>
                <FuelLevelIcon percentage={station.percentage} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Total Consumption per Station
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Direct refuel quantity grouped by source station
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {searchTerm.trim()
              ? `${filteredStations.length} matching station${filteredStations.length === 1 ? "" : "s"}`
              : "All Stations"}
          </span>
        </div>

        <ChartFrame height={260}>
          <BarChart
            data={stationConsumptionChartData}
            barCategoryGap="35%"
          >
            <XAxis
              dataKey="stationId"
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <YAxis
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <Tooltip />

            <Bar
              dataKey="qtyLiters"
              fill="#facc15"
              name="Qty Liters"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ChartFrame>
      </div>

      {selectedStationHistory && (
        <div className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-950 text-white w-full max-w-[min(1150px,calc(100vw-2rem))] max-h-[92vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden min-w-0">
            <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                  Station Operations History
                </h2>

                <p className="text-gray-400 mt-1">
                  Station:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedStationHistory.id}
                  </span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Direct refuel, internal transfers, and external supply related to this station
                </p>
              </div>

              <button
                onClick={() => setSelectedStationHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-3 sm:p-5 overflow-auto max-h-[68vh]">
              <table className="min-w-[820px] lg:min-w-[960px] xl:min-w-[1050px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                  <tr>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Operation ID</Th>
                    <Th>Type</Th>
                    <Th>Direction</Th>
                    <Th>Source</Th>
                    <Th>Destination</Th>
                    <Th>Fueler</Th>
                    <Th>Qty Liters</Th>
                  </tr>
                </thead>

                <tbody>
                  {getStationOperations(selectedStationHistory.id).length === 0 ? (
                    <tr>
                      <Td colSpan={9}>
                        <span className="text-gray-400">
                          No operations found for this station.
                        </span>
                      </Td>
                    </tr>
                  ) : (
                    getStationOperations(selectedStationHistory.id).map((item, i) => {
                      const row = item.row;
                      const direction = getStationOperationDirection(
                        row,
                        selectedStationHistory.id
                      );

                      return (
                        <tr
                          key={item.originalIndex}
                          className="hover:bg-slate-800/70 transition-colors duration-150"
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex] || "-"
                              : item.originalIndex + 1}
                          </Td>

                          <Td>{row[typeIndex] || "-"}</Td>

                          <Td>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                direction === "In"
                                  ? "bg-green-500/15 text-green-300 border border-green-500/30"
                                  : direction === "Out"
                                  ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                  : "bg-gray-500/15 text-gray-300 border border-gray-500/30"
                              }`}
                            >
                              {direction}
                            </span>
                          </Td>

                          <Td>{row[sourceIndex] || "-"}</Td>
                          <Td>{row[destinationIndex] || "-"}</Td>
                          <Td>{fuelerIndex !== -1 ? row[fuelerIndex] || "-" : "-"}</Td>
                          <Td>{formatNumber(row[dieselIndex])}</Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {editingProjectStation && (
        <div className="fixed inset-0 z-[12000] bg-black/70 flex items-center justify-center">
          <div className="bg-white text-black w-[560px] rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Change Station Project</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Station: {editingProjectStation.id}
                </p>
              </div>

              <button
                onClick={closeStationProjectTransferModal}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Current Project</p>
              <p className="text-xl font-bold">
                {editingProjectStation.project || "-"}
              </p>
            </div>

            <div className="mb-4">
              <label className="font-medium text-gray-700">New Project</label>

              <select
                value={newStationProject}
                onChange={(e) => setNewStationProject(e.target.value)}
                className="border rounded-lg p-3 w-full mt-2"
              >
                <option value="">Select Project</option>

                {filterActiveProjects(transferProjects || projects || []).map((project) => (
                  <option
                    key={makeTenantEntityKey(project, project.name)}
                    value={project.name || project.id}
                  >
                    {project.name || project.id}
                  </option>
                ))}
              </select>
            </div>


            <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
              <button
                onClick={closeStationProjectTransferModal}
                className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={submitStationProjectTransferRequest}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
              >
                Submit Transfer Request
              </button>
            </div>
          </div>
        </div>
      )}

      {stationTransferStockConfirmation && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-[520px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">
                Confirm Station Transfer
              </h2>
              <button
                onClick={() => setStationTransferStockConfirmation(null)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-300 p-4 rounded-lg space-y-2">
              <p>
                <strong>Station:</strong>{" "}
                {stationTransferStockConfirmation.station?.id || "-"}
              </p>
              <p>
                <strong>Current Project:</strong>{" "}
                {stationTransferStockConfirmation.station?.project || "-"}
              </p>
              <p>
                <strong>New Project:</strong> {newStationProject || "-"}
              </p>
              <p>
                <strong>Current Stock:</strong>{" "}
                {formatNumber(
                  stationTransferStockConfirmation.currentStock
                )}{" "}
                L
              </p>
            </div>

            <p className="mt-4 text-sm text-gray-700">
              This station currently contains fuel stock. Do you want to
              transfer the station with its current stock balance?
            </p>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setStationTransferStockConfirmation(null)}
                className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmStationTransferWithStock}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold"
              >
                Transfer With Current Stock
              </button>
            </div>
          </div>
        </div>
      )}




      {counterResetStation && (
        <ModalPortal>
          <div className="fixed inset-0 z-[12000] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-950 text-white w-full max-w-[560px] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden min-w-0">
              <div className="p-5 border-b border-slate-700 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    Reset Station Counter
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Station:{" "}
                    <span className="text-blue-300 font-semibold">
                      {counterResetStation.id}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => !stationCounterResetLoading && setCounterResetStation(null)}
                  disabled={stationCounterResetLoading}
                  className="text-slate-400 hover:text-red-400 text-2xl disabled:cursor-wait disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">Current Counter</p>
                  <p className="text-2xl font-bold text-yellow-300 mt-1">
                    {formatNumber(counterResetStation.currentCounter)} L
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    New Counter Reading
                  </label>
                  <input
                    type="number"
                    value={stationCounterResetValue}
                    onChange={(e) => setStationCounterResetValue(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                    placeholder="Enter new counter reading"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Effective Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={stationCounterResetDate}
                    onChange={(e) => setStationCounterResetDate(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Reason
                  </label>
                  <textarea
                    value={stationCounterResetReason}
                    onChange={(e) => setStationCounterResetReason(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white h-24"
                    placeholder="Example: station meter changed / counter reset"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => !stationCounterResetLoading && setCounterResetStation(null)}
                    disabled={stationCounterResetLoading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      if (!stationCounterResetValue) {
                        notifyUser(showToast, "warning", "Please enter new counter reading.");
                        return;
                      }

                      if (!stationCounterResetReason.trim()) {
                        notifyUser(showToast, "warning", "Please enter reset reason.");
                        return;
                      }

                      const saved = await saveStationCounterReset({
                        station: counterResetStation,
                        newReading: stationCounterResetValue,
                        effectiveFrom:
                          stationCounterResetDate || new Date().toISOString(),
                        reason: stationCounterResetReason,
                      });

                      if (!saved) return;

                      setCounterResetStation(null);
                      setStationCounterResetValue("");
                      setStationCounterResetDate("");
                      setStationCounterResetReason("");
                    }}
                    disabled={stationCounterResetLoading}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    {stationCounterResetLoading ? "Saving..." : "Save Reset"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showForm && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4">
            <div className="fleet-portal-modal-panel bg-white text-black w-[min(650px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Add Station</h2>
              <button onClick={closeAddStation}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Station ID"
                placeholder="Main_Station"
                value={newStation.id}
                onChange={(e) => setNewStation({ ...newStation, id: e.target.value })}
                error={stationIdDuplicateError}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Station Type</label>
                <select
                  value={newStation.type}
                  onChange={(e) => setNewStation({ ...newStation, type: e.target.value })}
                  className="col-span-2 border rounded-lg p-2"
                >
                  <option>Main</option>
                  <option>Sub</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Project</label>
                <select
                  value={newStation.project}
                  onChange={(e) => setNewStation({ ...newStation, project: e.target.value })}
                  className="col-span-2 border rounded-lg p-2"
                >
                  <option value="">Select Project</option>
                  {transferProjectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Capacity"
                placeholder="Liters"
                type="number"
                value={newStation.capacity}
                onChange={(e) => setNewStation({ ...newStation, capacity: e.target.value })}
              />
              <Field
                label="Opening Balance"
                placeholder="Liters"
                type="number"
                value={newStation.openingBalance}
                onChange={(e) => setNewStation({ ...newStation, openingBalance: e.target.value })}
              />
              <Field
                label="Current Station Counter"
                placeholder="Current station meter reading"
                type="number"
                value={newStationOpeningCounter}
                onChange={(e) => setNewStationOpeningCounter(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Status</label>
                <select
                  value={newStation.status}
                  onChange={(e) => setNewStation({ ...newStation, status: e.target.value })}
                  className="col-span-2 border rounded-lg p-2"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={closeAddStation}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={saveNewStation}
                disabled={stationSaveLoading || Boolean(stationIdDuplicateError) || !newStation.id.trim()}
                className={`px-3 lg:px-4 py-2 rounded-lg ${
                  stationSaveLoading || stationIdDuplicateError || !newStation.id.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {stationSaveLoading ? "Saving..." : "Save Station"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {statusEditStation && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Confirm Station Status Change</h2>
              <button onClick={() => setStatusEditStation(null)}>×</button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <p>
                <strong>Station:</strong> {statusEditStation.id}
              </p>
              <p>
                <strong>Current Status:</strong> {getCurrentStationStatus(statusEditStation) || "-"}
              </p>
              <p>
                <strong>New Status:</strong> {newStationStatus || "-"}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setStatusEditStation(null)}
                className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmStationStatusChange}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetStation && (
        <div className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-red-600">
              Delete Station
            </h2>

            <p className="text-gray-600 mb-5">
              Station: <strong>{deleteTargetStation.id}</strong>
            </p>

            <textarea
              value={stationDeleteReason}
              onChange={(e) => setStationDeleteReason(e.target.value)}
              placeholder="Enter deletion reason..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetStation(null);
                  setStationDeleteReason("");
                }}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedStationDeleteConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showStationDeleteConfirm && (
        <div className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">
              Confirm Delete Request
            </h2>

            <p className="text-gray-700 mb-5">
              Are you sure you want to submit a deletion request for station{" "}
              <strong>{deleteTargetStation?.id}</strong>?
            </p>

            <div className="bg-gray-100 rounded-xl p-4 mb-5 text-sm">
              <p>
                <strong>Reason:</strong> {stationDeleteReason}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStationDeleteConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Back
              </button>

              <button
                onClick={proceedStationDeletePassword}
                disabled={stationDeleteLoading}
                className={`bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg ${stationDeleteLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {stationDeleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}



      {showStockCountAdjustment && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 z-[12000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black w-[580px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-amber-600">
              Inventory Adjustment Request
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="font-medium">Select Station</label>
                <select
                  className="border rounded-lg p-2 w-full mt-2"
                  value={stockCountStation?.id || ""}
                  onChange={(e) => {
                    const station = stationsWithBalance.find(
                      (s) => s.id === e.target.value
                    );
                    setStockCountStation(station || null);
                    setActualStockQty("");
                    setStockCountReason("");
                  }}
                >
                  <option value="">Select Station</option>
                  {stationsWithBalance.map((s) => (
                    <option key={makeTenantEntityKey(s)} value={s.id}>
                      {s.id}
                    </option>
                  ))}
                </select>
              </div>

              {stockCountStation && (
                <div className="bg-gray-100 p-4 rounded">
                  <p>
                    <strong>System Balance:</strong>{" "}
                    {formatNumber(stockCountStation.currentStock)} L
                  </p>
                </div>
              )}

              <div>
                <label className="font-medium">Actual Quantity After Count</label>
                <input
                  type="number"
                  value={actualStockQty}
                  onChange={(e) => setActualStockQty(e.target.value)}
                  className="border rounded-lg p-2 w-full mt-2"
                  placeholder="Enter actual quantity in liters"
                />
              </div>

              {stockCountStation && actualStockQty !== "" && (
                <div className="bg-gray-100 p-4 rounded">
                  <p>
                    <strong>Actual Balance:</strong>{" "}
                    {formatNumber(Number(actualStockQty) || 0)} L
                  </p>
                  <p>
                    <strong>Adjustment Qty:</strong>{" "}
                    {formatNumber((Number(actualStockQty) || 0) - (Number(stockCountStation.currentStock) || 0))} L
                  </p>
                  <p>
                    <strong>Final Balance:</strong>{" "}
                    {formatNumber(Number(actualStockQty) || 0)} L
                  </p>
                </div>
              )}

              <div>
                <label className="font-medium">Reason</label>
                <textarea
                  value={stockCountReason}
                  onChange={(e) => setStockCountReason(e.target.value)}
                  className="border rounded-lg p-2 w-full mt-2 min-h-[80px]"
                  placeholder="Enter stock count variance reason"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => {
                  setShowStockCountAdjustment(false);
                  setStockCountStation(null);
                  setActualStockQty("");
                  setStockCountReason("");
                              }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmStockCountAdjustment}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Submit for Admin Approval
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showConfirm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center">
          <div className="bg-white text-black w-[560px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Zero Balance Adjustment
            </h2>

            <div className="mb-4">
              <label className="font-medium">Select Station</label>
              <select
                className="border rounded-lg p-2 w-full mt-2"
                value={selectedStation?.id || ""}
                onChange={(e) => {
                  const station = stationsWithBalance.find(
                    (s) => s.id === e.target.value
                  );
                  setSelectedStation(station);
                }}
              >
                <option value="">Select Station</option>
                {stationsWithBalance.map((s) => (
                  <option key={makeTenantEntityKey(s)} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </div>

            {selectedStation && (
              <div className="bg-gray-100 p-4 rounded mb-4">
                <p>
                  <strong>Current Balance:</strong>{" "}
                  {formatNumber(selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Adjustment Qty:</strong>{" "}
                  {formatNumber(-selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Final Balance:</strong> 0 L
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="font-medium">Reason</label>
              <textarea
                value={zeroBalanceReason}
                onChange={(e) => setZeroBalanceReason(e.target.value)}
                className="border rounded-lg p-2 w-full mt-2 min-h-[80px]"
                placeholder="Daily reconciliation after station emptying"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedStation(null);
                  setZeroBalanceReason("Daily reconciliation after station emptying");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedToPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}


      </div>
    </div>
  );
}

function FuelLevelIcon({ percentage }) {
  const level = Math.max(0, Math.min(100, Number(percentage) || 0));

  const color =
    level < 30
      ? "text-red-500"
      : level < 60
      ? "text-yellow-400"
      : "text-green-500";

  const bgColor =
    level < 30
      ? "bg-red-500/10"
      : level < 60
      ? "bg-yellow-400/10"
      : "bg-green-500/10";

  const glow =
    level < 30
      ? "shadow-red-500/40"
      : level < 60
      ? "shadow-yellow-400/40"
      : "shadow-green-500/40";

  const size =
    level < 30
      ? "text-2xl"
      : level < 60
      ? "text-3xl"
      : "text-4xl";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`${bgColor} ${glow} shadow-lg rounded-full w-14 h-14 flex items-center justify-center transition-all duration-500`}
      >
        <span className={`${color} ${size} transition-all duration-500`}>
          ⛽
        </span>
      </div>

      <div>
        <p className={`${color} font-bold text-sm`}>
          {level.toFixed(1)}%
        </p>

        <p className="text-xs text-gray-400">
          {level < 30 ? "Low" : level < 60 ? "Medium" : "Good"}
        </p>
      </div>
    </div>
  );
}
