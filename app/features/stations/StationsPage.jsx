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
import { useLanguage } from "../../context/LanguageContext";
import { resolveEnumValue } from "../../lib/i18nMessageHelpers";

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
  createStationActionRequest,
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

function unwrapStationTransferResult(result) {
  return result?.transfer || result?.data?.transfer || result?.data || result || {};
}

function isStationTransferApplied(transfer, toProjectId) {
  const normalizedStatus = normalizeScopeValue(
    transfer?.status || transfer?.approvalStatus || transfer?.transferStatus
  );

  if (["approved", "completed", "applied"].includes(normalizedStatus)) {
    return true;
  }

  if (
    transfer?.autoApproved === true ||
    transfer?.isAutoApproved === true ||
    transfer?.applied === true ||
    transfer?.requiresApproval === false
  ) {
    return true;
  }

  const transferredStation = transfer?.station || transfer?.updatedStation;
  const resultingProjectId =
    transferredStation?.projectId ||
    transferredStation?.project?.id ||
    transfer?.stationProjectId;

  return Boolean(
    resultingProjectId &&
      toProjectId &&
      normalizeScopeValue(resultingProjectId) === normalizeScopeValue(toProjectId)
  );
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
  onStationActionRequestCreated = () => {},
  externalStockAdjustments = [],

  stationCounterResetHistory,
  setStationCounterResetHistory,}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const getStationStatusLabel = (status) =>
    resolveEnumValue(t, "stationStatus", status, status || "-");

  const renderStationStatusBadge = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    const statusClass =
      normalized === "active"
        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
        : normalized === "inactive"
        ? "border-red-500/50 bg-red-500/15 text-red-300"
        : "border-slate-500/50 bg-slate-500/15 text-slate-300";

    return (
      <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}>
        {getStationStatusLabel(status)}
      </span>
    );
  };

  const getStationTypeLabel = (type) =>
    resolveEnumValue(t, "stationType", type, type || "-");

  const getDirectionLabel = (direction) => {
    if (direction === "In") return t("stations.history.in");
    if (direction === "Out") return t("stations.history.out");
    return direction || "-";
  };
  const FlowmeterCounterDisplay = ({ value }) => {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    const digits = String(safeValue).padStart(9, "0").slice(-9).split("");

    return (
      <div dir="ltr" className="station-counter-display w-full flex items-center gap-1.5">
        {digits.map((digit, index) => (
          <span
            key={`${digit}-${index}`}
            className="station-counter-digit w-6 h-9 sm:w-7 flex items-center justify-center rounded-md border border-slate-600/80 bg-slate-950 text-amber-300 font-mono text-base sm:text-lg font-black shadow-inner shadow-black/80 tabular-nums"
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
        t("stationWorkflows.validation.stationNotLinked")
      );
      return false;
    }

    const parsedNewReading = Number(newReading);
    if (!Number.isFinite(parsedNewReading) || parsedNewReading < 0) {
      notifyUser(
        showToast,
        "warning",
        t("stationWorkflows.validation.validCounter")
      );
      return false;
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      notifyUser(showToast, "warning", t("stationWorkflows.validation.enterResetReason"));
      return false;
    }

    if (!canUseNetwork(showToast)) return false;

    const oldReading = Number(
      station.currentCounter ?? getEffectiveStationCounter(station) ?? 0
    );

    setStationCounterResetLoading(true);

    try {
      if (isOfficerUser(currentUser)) {
        const createdRequest = await createStationActionRequest(backendId, {
          actionType: "COUNTER_RESET",
          requestedByUserId: currentUser?.id,
          reason: cleanReason,
          newCounter: parsedNewReading,
          effectiveAt: effectiveFrom || new Date().toISOString(),
        });

        await onStationActionRequestCreated?.(createdRequest);
        notifyUser(
          showToast,
          "success",
          language === "ar"
            ? "تم إرسال طلب إعادة ضبط عداد المحطة للموافقة."
            : "Station counter reset request sent for approval."
        );
        return true;
      }

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
        t("stationWorkflows.counter.title"),
        "stations",
        `Station ${station.id} counter reset from ${formatNumber(oldReading)} to ${formatNumber(parsedNewReading)}.`,
        {
          actionKey: "notifications.activity.actions.resetStationCounter",
          actionFallback: "Reset Station Counter",
          detailsKey: "notifications.activity.details.stationCounterReset",
          detailsParams: {
            stationId: station.id,
            oldReading: formatNumber(oldReading),
            newReading: formatNumber(parsedNewReading),
          },
          detailsFallback: `Station ${station.id} counter reset from ${formatNumber(oldReading)} to ${formatNumber(parsedNewReading)}.`,
        },
      );

      notifyUser(
        showToast,
        "success",
        t("stationWorkflows.messages.counterResetCompleted")
      );

      return true;
    } catch (error) {
      notifyUser(
        showToast,
        "warning",
        getFriendlyApiErrorMessage(
          error,
          t("stationWorkflows.messages.counterResetFailed")
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
  const [zeroBalanceReason, setZeroBalanceReason] = useState(t("stationWorkflows.zero.defaultReason"));
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
  const [stationIdBackendError, setStationIdBackendError] = useState("");
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




  const stationIdExistsLocally = Boolean(
    getDuplicateIdError(
      newStation.id,
      [...stations, ...localStations],
      "Station ID"
    )
  );

  const stationIdDuplicateError =
    stationIdBackendError ||
    (stationIdExistsLocally
      ? t("stationWorkflows.validation.duplicateStationId")
      : "");

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
    setStationIdBackendError("");
  };

  const closeAddStation = () => {
    setShowForm(false);
    resetNewStation();
  };

  const saveNewStation = async () => {
    if (currentUser?.role !== "Admin") {
      showToast?.("warning", t("stationWorkflows.messages.adminOnlyAdd"));
      return;
    }

    if (stationSaveLoading) return;

    const stationId = newStation.id.trim();

    if (!stationId) {
      showToast?.("warning", t("stationWorkflows.validation.enterStationId"));
      return;
    }

    if (stationIdDuplicateError) {
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
      showToast?.("warning", t("stationWorkflows.validation.projectNotFound"));
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
      showToast?.("warning", t("stationWorkflows.validation.selectCompany"));
      return;
    }

    const capacity = Number(newStation.capacity || 0);
    const openingBalance = Number(newStation.openingBalance || 0);
    const openingCounter = Number(newStationOpeningCounter || 0);

    if (!Number.isFinite(capacity) || capacity < 0) {
      showToast?.("warning", t("stationWorkflows.validation.validCapacity"));
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      showToast?.("warning", t("stationWorkflows.validation.validOpeningBalance"));
      return;
    }

    if (!Number.isFinite(openingCounter) || openingCounter < 0) {
      showToast?.("warning", t("stationWorkflows.validation.validOpeningCounter"));
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
      const backendMessage = getFriendlyApiErrorMessage(
        error,
        t("stationWorkflows.messages.addFailed"),
      );

      const normalizedBackendMessage = String(backendMessage || "").toLowerCase();
      const isStationIdConflict =
        Number(error?.response?.status) === 409 ||
        (
          normalizedBackendMessage.includes("station id") &&
          (
            normalizedBackendMessage.includes("already") ||
            normalizedBackendMessage.includes("previously used") ||
            normalizedBackendMessage.includes("cannot be reused") ||
            normalizedBackendMessage.includes("unique")
          )
        );

      if (isStationIdConflict) {
        setStationIdBackendError(
          t("stationWorkflows.validation.stationIdPreviouslyUsed"),
        );
        setStationSaveLoading(false);
        return;
      }

      showToast?.("warning", backendMessage);
      setStationSaveLoading(false);
      return;
    }

    showToast?.("success", t("stationWorkflows.messages.added"));
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
      const createdStationId = createdStation?.id || cleanStation.id;

      trackActivity?.(
        t("stations.actions.addStation"),
        "stations",
        `Station ${createdStationId} was added successfully.`,
        {
          actionKey: "notifications.activity.actions.addStation",
          actionFallback: "Add Station",
          detailsKey: "notifications.activity.details.stationAdded",
          detailsParams: { stationId: createdStationId },
          detailsFallback: `Station ${createdStationId} was added successfully.`,
        },
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

    return d.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
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
      const transferResponse = await createStationTransfer(backendId, {
        toProjectId,
        requestedByUserId: currentUser?.id || "",
        stockAtRequest: currentStock,
        transferWithStockConfirmed,
        stockSnapshotNote,
      });
      const createdTransfer = unwrapStationTransferResult(transferResponse);
      const transferApplied = isStationTransferApplied(createdTransfer, toProjectId);

      onStationTransferCreated?.(createdTransfer);

      if (transferApplied) {
        const updatedStation = createdTransfer?.station || createdTransfer?.updatedStation;

        setStations((prev) =>
          (prev || []).map((item) => {
            const sameBackendStation =
              normalizeScopeValue(getStationBackendId(item)) === normalizeScopeValue(backendId);
            const sameDisplayStation =
              normalizeScopeValue(item.id) === normalizeScopeValue(station.id);

            if (!sameBackendStation && !sameDisplayStation) return item;

            if (updatedStation) {
              const mappedStation = mapBackendStationForState(updatedStation);
              return {
                ...item,
                ...mappedStation,
                project: newStationProject,
                projectName: newStationProject,
                projectId: toProjectId,
              };
            }

            return {
              ...item,
              project: newStationProject,
              projectId: toProjectId,
            };
          })
        );
      }

      trackActivity?.(
        transferApplied ? "Transfer Station" : "Request Station Transfer",
        "stations",
        transferApplied
          ? `${station.id} transferred from ${station.project || "-"} to ${newStationProject}.`
          : `${station.id} transfer requested from ${station.project || "-"} to ${newStationProject}.`,
        {
          actionKey: transferApplied
            ? "notifications.activity.actions.transferStation"
            : "notifications.activity.actions.requestStationTransfer",
          actionFallback: transferApplied
            ? "Transfer Station"
            : "Request Station Transfer",
          detailsKey: transferApplied
            ? "notifications.activity.details.stationTransferred"
            : "notifications.activity.details.stationTransferRequested",
          detailsParams: {
            stationId: station.id,
            fromProject: station.project || "-",
            toProject: newStationProject,
          },
          detailsFallback: transferApplied
            ? `Station ${station.id} transferred from ${station.project || "-"} to ${newStationProject}.`
            : `Station ${station.id} transfer requested from ${station.project || "-"} to ${newStationProject}.`,
        },
      );

      if (transferApplied) {
        showToast?.(
          "success",
          t("stationWorkflows.messages.transferCompleted", {
            project: newStationProject,
          })
        );
      } else {
        showToast?.(
          "warning",
          t("stationWorkflows.messages.transferPendingApproval")
        );
      }
      closeStationProjectTransferModal();
      return true;
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        t("stationWorkflows.messages.transferFailed");

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
      showToast?.("warning", t("stationWorkflows.validation.selectNewProject"));
      return;
    }

    if (
      normalizeScopeValue(newStationProject) ===
      normalizeScopeValue(editingProjectStation.project)
    ) {
      showToast?.("warning", t("stationWorkflows.validation.differentProject"));
      return;
    }


    const backendId = getStationBackendId(editingProjectStation);
    const toProjectId = resolveStationProjectId(newStationProject);

    if (!backendId) {
      showToast?.(
        "warning",
        t("stationWorkflows.validation.stationNotLinked")
      );
      closeStationProjectTransferModal();
      return;
    }

    if (!toProjectId) {
      showToast?.("warning", t("stationWorkflows.validation.selectValidProject"));
      return;
    }

    const currentStock = Number(
      String(editingProjectStation.currentStock ?? "").replace(/,/g, "").trim()
    );

    if (!Number.isFinite(currentStock)) {
      showToast?.(
        "warning",
        t("stationWorkflows.validation.stockVerificationFailed")
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
      setEditingProjectStation(null);
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
      showToast?.("warning", t("stationWorkflows.messages.readOnlyStatus"));
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
      showToast?.("warning", t("stationWorkflows.validation.selectStatus"));
      return;
    }

    const backendId = getStationBackendId(statusEditStation);
    if (!backendId) {
      showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
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
        `${statusEditStation.id} status changed from ${oldStatus || "-"} to ${newStationStatus}.`,
        {
          actionKey: "notifications.activity.actions.changeStationStatus",
          actionFallback: "Change Station Status",
          detailsKey: "notifications.activity.details.stationStatusChanged",
          detailsParams: {
            stationId: statusEditStation.id,
            oldStatus: oldStatus || "-",
            status: newStationStatus,
          },
          detailsEnumParams: {
            oldStatus: "stationStatus",
            status: "stationStatus",
          },
          detailsFallback: `${statusEditStation.id} status changed from ${oldStatus || "-"} to ${newStationStatus}.`,
        },
      );

      setStatusEditStation(null);
      setNewStationStatus("");

      showToast?.("success", t("stationWorkflows.messages.statusUpdated"));
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t("stationWorkflows.messages.statusUpdateFailed");

      showToast?.(
        "warning",
        Array.isArray(backendMessage) ? backendMessage.join(" / ") : backendMessage
      );
    }
  };

  const startCapacityInlineEdit = (station) => {
    if (!hasPermission("stations", "edit")) {
      showToast?.("warning", t("stationWorkflows.messages.readOnlyCapacity"));
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
      showToast?.("warning", t("stationWorkflows.validation.validCapacity"));
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
      showToast?.("warning", t("stationWorkflows.messages.capacityPendingApproval"));
      return;
    }

    const confirmed = window.confirm(
      `Update station ${capacityEditStation.id} capacity from ${formatNumber(oldCapacity)} L to ${formatNumber(nextCapacity)} L?`
    );

    if (!confirmed) return;

    const backendId = getStationBackendId(capacityEditStation);
    if (!backendId) {
      showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
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
      showToast?.("success", t("stationWorkflows.messages.capacityUpdated"));
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t("stationWorkflows.messages.capacityUpdateFailed");

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
        t("stationWorkflows.validation.stockVerificationFailed")
      );
      return;
    }

    if (Math.abs(currentStock) > 0.000001) {
      showToast?.(
        "warning",
        t("stationWorkflows.validation.cannotDeleteWithStock", {
          id: deleteTargetStation.id,
          stock: formatNumber(currentStock),
        })
      );
      return;
    }

    if (!stationDeleteReason) {
      showToast
        ? showToast("warning", t("stationWorkflows.validation.enterDeletionReason"))
        : notifyUser(
            typeof showToast !== "undefined" ? showToast : null,
            inferToastTypeFromMessage(t("stationWorkflows.validation.enterDeletionReason")),
            t("stationWorkflows.validation.enterDeletionReason")
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
      showToast?.("warning", t("stationWorkflows.messages.readOnlyDelete"));
      return;
    }

    const currentStock = Number(deleteTargetStation.currentStock);

    if (!Number.isFinite(currentStock)) {
      showToast?.(
        "warning",
        t("stationWorkflows.validation.stockVerificationFailed")
      );
      return;
    }

    if (Math.abs(currentStock) > 0.000001) {
      showToast?.(
        "warning",
        t("stationWorkflows.validation.cannotDeleteWithStock", {
          id: deleteTargetStation.id,
          stock: formatNumber(currentStock),
        })
      );
      return;
    }

    const backendId = getStationBackendId(deleteTargetStation);
    if (!backendId) {
      showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
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
        t("stationWorkflows.delete.title"),
        "stations",
        `Station ${deleteTargetStation.id} was deleted.${stationDeleteReason ? ` Reason: ${stationDeleteReason}` : ""}`,
        {
          actionKey: "notifications.activity.actions.deleteStation",
          actionFallback: "Delete Station",
          detailsKey: "notifications.activity.details.stationDeleted",
          detailsParams: { stationId: deleteTargetStation.id, reason: stationDeleteReason || "-" },
          detailsFallback: `Station ${deleteTargetStation.id} was deleted.${stationDeleteReason ? ` Reason: ${stationDeleteReason}` : ""}`,
        },
      );

      setDeleteTargetStation(null);
      setStationDeleteReason("");
      setShowStationDeleteConfirm(false);

      showToast?.("success", t("stationWorkflows.messages.deleted"));
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t("stationWorkflows.messages.deleteFailed");

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
    setZeroBalanceReason(t("stationWorkflows.zero.defaultReason"));
    setShowConfirm(true);
  };

  const openStockCountAdjustment = () => {
    if (currentUser?.role !== "Manager") {
      showToast?.("warning", t("stationWorkflows.messages.managerOnlyAdjustment"));
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
      showToast?.("warning", t("stationWorkflows.messages.managerOnlyAdjustment"));
      return;
    }

    if (!stockCountStation) {
      showToast?.("warning", t("stationWorkflows.validation.selectStation"));
      return;
    }

    const actualQty = Number(actualStockQty);

    if (actualStockQty === "" || Number.isNaN(actualQty) || actualQty < 0) {
      showToast?.("warning", t("stationWorkflows.validation.validActualStock"));
      return;
    }

    const reason = String(stockCountReason || "").trim();

    if (!reason) {
      showToast?.("warning", t("stationWorkflows.validation.enterAdjustmentReason"));
      return;
    }

    const systemQty = Number(stockCountStation.currentStock) || 0;
    const adjustmentQty = actualQty - systemQty;
    const backendId = getStationBackendId(stockCountStation);

    if (!backendId) {
      showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
      return;
    }

    createStationActionRequest(backendId, {
      actionType: "INVENTORY_ADJUSTMENT",
      requestedByUserId: currentUser?.id,
      reason,
      actualStock: actualQty,
      movementAt: new Date().toISOString(),
    })
      .then(async (createdRequest) => {
        await onStationActionRequestCreated?.(createdRequest);
        setShowStockCountAdjustment(false);
        setStockCountStation(null);
        setActualStockQty("");
        setStockCountReason("");
        showToast?.("warning", t("stationWorkflows.messages.adjustmentPendingApproval"));
      })
      .catch((error) => {
        showToast?.(
          "warning",
          getFriendlyApiErrorMessage(
            error,
            t("stationWorkflows.messages.adjustmentFailed")
          )
        );
      });
  };

  const proceedToPassword = () => {
    if (!selectedStation) {
      showToast
        ? showToast("warning", t("stationWorkflows.validation.selectStation"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("stationWorkflows.validation.selectStation")), t("stationWorkflows.validation.selectStation"));
      return;
    }

    setShowConfirm(false);
    confirmZeroBalance();
  };

  const confirmZeroBalance = async () => {
    if (!selectedStation) {
      showToast?.("warning", t("stationWorkflows.validation.selectStation"));
      return;
    }

    if (!canCurrentUserRequestZeroBalance()) {
      setShowConfirm(false);
      setSelectedStation(null);
      setZeroBalanceReason(t("stationWorkflows.zero.defaultReason"));
      return;
    }

    const currentStock = Number(selectedStation.currentStock) || 0;

    if (currentStock === 0) {
      showToast?.("warning", t("stationWorkflows.validation.stockAlreadyZero"));
      return;
    }

    const adjustmentQty = -currentStock;
    const reason =
      zeroBalanceReason?.trim() || t("stationWorkflows.zero.defaultReason");
    const backendId = getStationBackendId(selectedStation);

    if (currentUser?.role === "Officer") {
      if (!backendId) {
        showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
        return;
      }

      try {
        const createdRequest = await createStationActionRequest(backendId, {
          actionType: "ZERO_BALANCE",
          requestedByUserId: currentUser?.id,
          reason,
          movementAt: new Date().toISOString(),
        });

        await onStationActionRequestCreated?.(createdRequest);
        setShowConfirm(false);
        setSelectedStation(null);
        setZeroBalanceReason(t("stationWorkflows.zero.defaultReason"));
        showToast?.("warning", t("stationWorkflows.messages.zeroPendingApproval"));
      } catch (error) {
        showToast?.(
          "warning",
          getFriendlyApiErrorMessage(
            error,
            t("stationWorkflows.messages.zeroFailed")
          )
        );
      }
      return;
    }

    if (!backendId) {
      showToast?.("warning", t("stationWorkflows.validation.stationNotLinked"));
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
          createdBy: currentUser?.fullName || currentUser?.name || t("stationWorkflows.defaults.manager"),
          createdAt: new Date().toISOString(),
          source: "manager_zero_balance",
        },
      ]);

      trackActivity?.(
        "Zero Balance Adjustment",
        "stations",
        `${selectedStation.id} balance zeroed. Adjustment: ${formatNumber(adjustmentQty)} L.`,
        {
          actionKey: "notifications.activity.actions.zeroBalanceCompleted",
          actionFallback: "Zero Balance Completed",
          detailsKey: "notifications.activity.details.zeroBalanceCompletedDirect",
          detailsParams: {
            stationId: selectedStation.id,
            previousStock: formatNumber(currentStock),
            adjustmentQty: formatNumber(adjustmentQty),
          },
          detailsFallback: `Station ${selectedStation.id} balance was zeroed from ${formatNumber(currentStock)} L. Adjustment: ${formatNumber(adjustmentQty)} L.`,
        },
      );

      setShowConfirm(false);
      setSelectedStation(null);
      setZeroBalanceReason(t("stationWorkflows.zero.defaultReason"));
      showToast?.("success", t("stationWorkflows.messages.zeroCompleted"));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        t("stationWorkflows.messages.zeroFailed");
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
      ? showToast("success", t("stationWorkflows.messages.csvExported"))
      : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("stationWorkflows.messages.csvExported")), t("stationWorkflows.messages.csvExported"));
  };

  const exportStationsToPDF = () => {
    const escapePrintValue = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const reportDate = new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-GB");

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
      <html dir="${language === "ar" ? "rtl" : "ltr"}">
        <head>
          <title>${t("stationWorkflows.print.reportTitle")}</title>
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
          <h1>${t("stationWorkflows.print.reportTitle")}</h1>
          <div class="meta">
            Generated at: ${reportDate} | Total Stations: ${filteredStations.length}
          </div>

          <h2>${t("stations.list.title")}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${t("stations.table.stationId")}</th>
                <th>${t("stations.table.project")}</th>
                <th>${t("stations.table.type")}</th>
                <th>${t("stations.table.capacity")}</th>
                <th>${t("stations.table.currentCounter")}</th>
                <th>${t("stations.table.openingBalance")}</th>
                <th>${t("stations.table.currentStock")}</th>
                <th>${t("stations.table.tankLevel")}</th>
                <th>${t("stations.table.status")}</th>
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
    <>
      <style jsx global>{`
        .station-card-print .station-lifetime {
          background-color: rgba(2, 6, 23, 0.6);
          border-color: rgba(51, 65, 85, 0.8);
        }

        .station-card-print .station-lifetime-label {
          color: #94a3b8;
        }

        .station-card-print .station-lifetime-value {
          color: #fcd34d;
        }

        [data-theme="light"] .station-card-print .station-lifetime {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        [data-theme="light"] .station-card-print .station-lifetime-label {
          color: #64748b !important;
        }

        [data-theme="light"] .station-card-print .station-lifetime-value {
          color: #b45309 !important;
        }
      `}</style>
      <div className="bg-gray-900 min-h-screen text-white overflow-y-auto overflow-x-hidden h-screen">
      <div className="fleet-page-shell w-full max-w-full min-w-0 mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("stations.title")}</h1>
          <p className="text-gray-400">{t("stations.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="text"
            placeholder={t("stations.searchPlaceholder")}
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
                  {t("stations.actions.addStation")}
                </button>
              )}

              {canCurrentUserRequestZeroBalance() && (
                <button
                  onClick={openInventoryAdjustment}
                  className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-red-900/30 transition text-red-400"
                >
                  <span className="text-lg">⚠</span>
                  {t("stationWorkflows.zero.menu")}
                </button>
              )}

              {currentUser?.role === "Manager" && (
                <button
                  onClick={openStockCountAdjustment}
                  className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-amber-500/10 transition text-amber-300 border-t border-gray-700"
                >
                  <span className="text-lg">≋</span>
                  {t("stationWorkflows.stock.menu")}
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
                    {t("stations.actions.export")}
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
                      {t("common.exportCsv")}
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
                      {t("stations.actions.printReport")}
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
        <Card title={t("stations.cards.totalStations")} value={filteredStations.length} />

        <Card
          title={t("stations.cards.totalCapacity")}
          value={formatNumber(
            filteredStations.reduce((sum, s) => sum + (s.capacity || 0), 0)
          )}
        />

        <Card
          title={t("stations.cards.currentStock")}
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
              {t("stations.list.title")}
            </h2>
            <p className="text-sm text-slate-400">
              {t("stations.list.subtitle")}
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {t("stations.list.stationCount", { count: filteredStations.length })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div
              key={makeTenantEntityKey(station)}
              className="station-card-print relative overflow-hidden bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-lg hover:border-yellow-400/60 hover:shadow-yellow-400/10 transition-all duration-300"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 w-full min-w-0">
                <div>
                  <div className="flex flex-col items-start w-full min-w-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedStationHistory(station)}
                      className="station-title text-xl font-bold text-blue-200 truncate min-w-0 max-w-full"
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
                        title={t("stationWorkflows.delete.title")}
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
                      setNewStationProject("");
                                                        }}
                    className={`station-metric mt-3 border border-slate-700/80 rounded-2xl bg-slate-950/50 px-4 py-3 min-w-[170px] shadow-lg transition-all duration-300 text-left ${
                      canCurrentUserCreateStationTransfer()
                        ? "hover:border-yellow-400 hover:bg-slate-900 cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <p
                      className={`text-[9px] uppercase tracking-[0.22em] text-slate-500 ${
                        isRtl ? "text-right" : "text-left"
                      }`}
                    >
                      {t("stations.fields.project")}
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
                      title={t("stationWorkflows.counter.title")}
                    >
                      {t("stations.table.currentCounter")}
                    </button>

                    <FlowmeterCounterDisplay value={station.currentCounter} />

                    <div className="station-lifetime mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <span className="station-lifetime-label text-[10px] uppercase tracking-[0.16em]">
                        {t("stations.table.lifetimeCounter")}
                      </span>
                      <span className="station-lifetime-value text-sm font-black tabular-nums">
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
                  {renderStationStatusBadge(station.status)}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">{t("stations.table.capacity")}</p>
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
                      title={t("stationWorkflows.capacity.doubleClickHint")}
                      className="text-lg font-semibold cursor-pointer hover:text-yellow-300 transition"
                    >
                      {formatNumber(station.capacity)} L
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 whitespace-nowrap">{t("stations.table.totalPumped")}</p>
                  <p className="text-base lg:text-lg font-semibold text-slate-100 whitespace-nowrap">
                    {formatNumber(station.totalPumpedFromOperations)} L
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">{t("stations.table.currentStock")}</p>
                  <p className="text-base lg:text-lg font-semibold text-slate-100 whitespace-nowrap">
                    {formatNumber(station.currentStock)} L
                  </p>
                </div>
              </div>

              <div className="station-metric bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-3">{t("stations.table.tankLevel")}</p>
                <FuelLevelIcon
                  percentage={station.percentage}
                  lowLabel={t("stations.level.low")}
                  mediumLabel={t("stations.level.medium")}
                  goodLabel={t("stations.level.good")}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              {t("stations.chart.totalConsumption")}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {t("stations.chart.description")}
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {searchTerm.trim()
              ? t("stations.chart.matchingStations", {
                  count: filteredStations.length,
                })
              : t("stations.chart.allStations")}
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

            <Tooltip wrapperStyle={{ direction: isRtl ? "rtl" : "ltr", textAlign: isRtl ? "right" : "left" }} />

            <Bar
              dataKey="qtyLiters"
              fill="#facc15"
              name={t("stations.chart.qtyLiters")}
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ChartFrame>
      </div>

      {selectedStationHistory && (
        <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-950 text-white w-full max-w-[min(1150px,calc(100vw-2rem))] max-h-[92vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden min-w-0">
            <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                  {t("stations.history.title")}
                </h2>

                <p className="text-gray-400 mt-1">
                  {t("stationWorkflows.labels.station")}:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedStationHistory.id}
                  </span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  {t("stations.history.description")}
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
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.date")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.operationId")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.table.type")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.direction")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.source")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.destination")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.fueler")}</Th>
                    <Th className={isRtl ? "text-right" : "text-left"}>{t("stations.history.qtyLiters")}</Th>
                  </tr>
                </thead>

                <tbody>
                  {getStationOperations(selectedStationHistory.id).length === 0 ? (
                    <tr>
                      <Td colSpan={9}>
                        <span className="text-gray-400">
                          {t("stations.history.noOperations")}
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
                              {getDirectionLabel(direction)}
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
        <ModalPortal>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fleet-portal-modal-backdrop bg-black/80 backdrop-blur-[3px] flex items-center justify-center p-4"
          >
            <div
              className={`fleet-portal-modal-panel w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    {t("stationWorkflows.transfer.title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {t("stationWorkflows.labels.station")}:{" "}
                    <span className="font-semibold text-slate-200" dir="ltr">
                      {editingProjectStation.id}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeStationProjectTransferModal}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label={t("common.close")}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-xs font-medium text-slate-400">
                    {t("stationWorkflows.transfer.currentProject")}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {editingProjectStation.project || "-"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    {t("stationWorkflows.transfer.newProject")}
                  </label>

                  <select
                    value={newStationProject}
                    onChange={(e) => setNewStationProject(e.target.value)}
                    className={`mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-3 text-slate-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                      isRtl ? "text-right" : "text-left"
                    }`}
                  >
                    <option value="">{t("stations.placeholders.selectProject")}</option>

                    {filterActiveProjects(transferProjects || projects || [])
                      .filter(
                        (project) =>
                          normalizeScopeValue(project.name || project.id) !==
                          normalizeScopeValue(editingProjectStation.project)
                      )
                      .map((project) => (
                        <option
                          key={makeTenantEntityKey(project, project.name)}
                          value={project.name || project.id}
                        >
                          {project.name || project.id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-950 px-5 py-4">
                <button
                  type="button"
                  onClick={closeStationProjectTransferModal}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>

                <button
                  type="button"
                  onClick={submitStationProjectTransferRequest}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  {t("stationWorkflows.transfer.submit")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {stationTransferStockConfirmation && (
        <ModalPortal>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fleet-portal-modal-backdrop bg-black/85 backdrop-blur-[3px] flex items-start justify-center p-4 pt-[7vh] sm:pt-[9vh]"
          >
            <div className="fleet-portal-modal-panel w-full max-w-[540px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {t("stationWorkflows.transfer.confirmTitle")}
                </h2>
                <button
                  type="button"
                  onClick={() => setStationTransferStockConfirmation(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label={t("common.close")}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
                  <p className="flex flex-wrap justify-between gap-2 text-sm">
                    <strong className="text-slate-400">{t("stationWorkflows.labels.station")}</strong>
                    <span className="font-bold text-white" dir="ltr">
                      {stationTransferStockConfirmation.station?.id || "-"}
                    </span>
                  </p>
                  <p className="flex flex-wrap justify-between gap-2 text-sm">
                    <strong className="text-slate-400">{t("stationWorkflows.transfer.currentProject")}</strong>
                    <span className="font-bold text-white">
                      {stationTransferStockConfirmation.station?.project || "-"}
                    </span>
                  </p>
                  <p className="flex flex-wrap justify-between gap-2 text-sm">
                    <strong className="text-slate-400">{t("stationWorkflows.transfer.newProject")}</strong>
                    <span className="font-bold text-amber-300">{newStationProject || "-"}</span>
                  </p>
                  <p className="flex flex-wrap justify-between gap-2 text-sm">
                    <strong className="text-slate-400">{t("stations.table.currentStock")}</strong>
                    <span className="font-black text-amber-300" dir="ltr">
                      {formatNumber(stationTransferStockConfirmation.currentStock)} L
                    </span>
                  </p>
                </div>

                <p className="text-sm leading-6 text-slate-300">
                  {t("stationWorkflows.transfer.stockQuestion")}
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-950 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setStationTransferStockConfirmation(null)}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>

                <button
                  type="button"
                  onClick={confirmStationTransferWithStock}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  {t("stationWorkflows.transfer.withStock")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}




      {counterResetStation && (
        <ModalPortal>
          <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[12000] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-950 text-white w-full max-w-[560px] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden min-w-0">
              <div className="p-5 border-b border-slate-700 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    {t("stationWorkflows.counter.title")}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {t("stationWorkflows.labels.station")}:{" "}
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
                  <p className="text-[11px] text-slate-400 whitespace-nowrap">{t("stations.table.currentCounter")}</p>
                  <p className="text-2xl font-bold text-yellow-300 mt-1">
                    {formatNumber(counterResetStation.currentCounter)} L
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    {t("stationWorkflows.counter.newReading")}
                  </label>
                  <input
                    type="number"
                    value={stationCounterResetValue}
                    onChange={(e) => setStationCounterResetValue(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                    placeholder={t("stationWorkflows.counter.newReadingPlaceholder")}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    {t("stationWorkflows.counter.effectiveDate")}
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
                    {t("stationWorkflows.labels.reason")}
                  </label>
                  <textarea
                    value={stationCounterResetReason}
                    onChange={(e) => setStationCounterResetReason(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white h-24"
                    placeholder={t("stationWorkflows.counter.reasonPlaceholder")}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => !stationCounterResetLoading && setCounterResetStation(null)}
                    disabled={stationCounterResetLoading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50"
                  >
                    {t("common.cancel")}
                  </button>

                  <button
                    onClick={async () => {
                      if (!stationCounterResetValue) {
                        notifyUser(showToast, "warning", t("stationWorkflows.validation.enterNewCounter"));
                        return;
                      }

                      if (!stationCounterResetReason.trim()) {
                        notifyUser(showToast, "warning", t("stationWorkflows.validation.enterResetReason"));
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
                    {stationCounterResetLoading ? t("common.saving") : t("stationWorkflows.counter.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showForm && (
        <ModalPortal>
          <div dir={isRtl ? "rtl" : "ltr"} className="fleet-portal-modal-backdrop fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4">
            <div className="fleet-portal-modal-panel w-[min(650px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">{t("stations.actions.addStation")}</h2>
              <button onClick={closeAddStation} className="text-xl text-slate-400 hover:text-white">×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field
                label={t("stations.fields.stationId")}
                placeholder="Main_Station"
                value={newStation.id}
                onChange={(e) => {
                  setStationIdBackendError("");
                  setNewStation({ ...newStation, id: e.target.value });
                }}
                error={stationIdDuplicateError}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-slate-300">{t("stations.fields.stationType")}</label>
                <select
                  value={newStation.type}
                  onChange={(e) => setNewStation({ ...newStation, type: e.target.value })}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
                >
                  <option value="Main">{t("stations.types.main")}</option>
                  <option value="Sub">{t("stations.types.sub")}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-slate-300">{t("stations.fields.project")}</label>
                <select
                  value={newStation.project}
                  onChange={(e) => setNewStation({ ...newStation, project: e.target.value })}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
                >
                  <option value="">{t("stations.placeholders.selectProject")}</option>
                  {transferProjectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label={t("stations.fields.capacity")}
                placeholder={t("stations.placeholders.liters")}
                type="number"
                value={newStation.capacity}
                onChange={(e) => setNewStation({ ...newStation, capacity: e.target.value })}
              />
              <Field
                label={t("stations.fields.openingBalance")}
                placeholder={t("stations.placeholders.liters")}
                type="number"
                value={newStation.openingBalance}
                onChange={(e) => setNewStation({ ...newStation, openingBalance: e.target.value })}
              />
              <Field
                label={t("stations.fields.currentCounter")}
                placeholder={t("stations.placeholders.currentCounter")}
                type="number"
                value={newStationOpeningCounter}
                onChange={(e) => setNewStationOpeningCounter(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-slate-300">{t("stations.fields.status")}</label>
                <select
                  value={newStation.status}
                  onChange={(e) => setNewStation({ ...newStation, status: e.target.value })}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
                >
                  <option value="Active">{t("stations.status.active")}</option>
                  <option value="Inactive">{t("stations.status.inactive")}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
              <button
                onClick={closeAddStation}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-800/70 lg:px-4"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={saveNewStation}
                disabled={stationSaveLoading || Boolean(stationIdDuplicateError) || !newStation.id.trim()}
                className={`px-3 lg:px-4 py-2 rounded-lg ${
                  stationSaveLoading || stationIdDuplicateError || !newStation.id.trim()
                    ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {stationSaveLoading ? t("common.saving") : t("stations.add.save")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {statusEditStation && (
        <ModalPortal>
          <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
            <div className={`w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
                <h2 className="text-xl sm:text-2xl font-bold">{t("stationWorkflows.status.title")}</h2>
                <button onClick={() => setStatusEditStation(null)} className="text-slate-400 hover:text-white text-xl">×</button>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <p><strong>{t("stationWorkflows.labels.station")}:</strong> {statusEditStation.id}</p>
                <p className="text-slate-300"><strong>{t("stationWorkflows.status.currentStatus")}:</strong> {getStationStatusLabel(getCurrentStationStatus(statusEditStation))}</p>
                <p className="text-slate-300"><strong>{t("stationWorkflows.status.newStatus")}:</strong> <span className="font-bold text-amber-300">{getStationStatusLabel(newStationStatus)}</span></p>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
                <button onClick={() => setStatusEditStation(null)} className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition">{t("common.cancel")}</button>
                <button onClick={confirmStationStatusChange} className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold">{t("stationWorkflows.status.confirmChange")}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTargetStation && (
        <ModalPortal>
        <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className={`w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 p-6 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-red-600">
              {t("stationWorkflows.delete.title")}
            </h2>

            <p className="text-slate-400 mb-5">
              {t("stationWorkflows.labels.station")}:{" "}
              <strong>{deleteTargetStation.id}</strong>
            </p>

            <textarea
              value={stationDeleteReason}
              onChange={(e) => setStationDeleteReason(e.target.value)}
              placeholder={t("stationWorkflows.delete.reasonPlaceholder")}
              dir={isRtl ? "rtl" : "ltr"}
              className={`border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-xl p-3 w-full h-28 mb-5 outline-none focus:border-amber-500 ${
                isRtl ? "text-right" : "text-left"
              }`}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetStation(null);
                  setStationDeleteReason("");
                }}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 lg:px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedStationDeleteConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("common.continue")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showStationDeleteConfirm && (
        <ModalPortal>
        <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[20010] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className={`w-[min(500px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 p-6 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">
              {t("stationWorkflows.delete.requestTitle")}
            </h2>

            <p className="text-slate-300 mb-5">
              {t("stationWorkflows.delete.requestQuestion", {
                id: deleteTargetStation?.id,
              })}
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5 text-sm text-slate-300">
              <p>
                <strong>{t("stationWorkflows.labels.reason")}:</strong>{" "}
                {stationDeleteReason}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStationDeleteConfirm(false)}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 lg:px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                {t("stationWorkflows.actions.back")}
              </button>

              <button
                onClick={proceedStationDeletePassword}
                disabled={stationDeleteLoading}
                className={`bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg ${stationDeleteLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {stationDeleteLoading ? t("stationWorkflows.delete.deleting") : t("stationWorkflows.delete.confirmButton")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}



      {showStockCountAdjustment && (
        <ModalPortal>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed inset-0 z-[20020] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className={`w-[min(580px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
              <h2 className="text-xl font-bold mb-4 text-amber-400">
                {t("stationWorkflows.stock.title")}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="font-medium text-slate-200">{t("stationWorkflows.labels.selectStation")}</label>
                  <select
                    className="border border-slate-700 bg-slate-900 text-slate-100 rounded-lg p-2 w-full mt-2 outline-none focus:border-amber-500"
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
                    <option value="">{t("stationWorkflows.labels.selectStation")}</option>
                    {stationsWithBalance.map((s) => (
                      <option key={makeTenantEntityKey(s)} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </select>
                </div>

                {stockCountStation && (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-300">
                    <p>
                      <strong>{t("stationWorkflows.stock.systemBalance")}:</strong>{" "}
                      {formatNumber(stockCountStation.currentStock)} L
                    </p>
                  </div>
                )}

                <div>
                  <label className="font-medium text-slate-200">{t("stationWorkflows.stock.actualQuantity")}</label>
                  <input
                    type="number"
                    value={actualStockQty}
                    onChange={(e) => setActualStockQty(e.target.value)}
                    className="border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-lg p-2 w-full mt-2 outline-none focus:border-amber-500"
                    placeholder={t("stationWorkflows.stock.actualPlaceholder")}
                  />
                </div>

                {stockCountStation && actualStockQty !== "" && (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-300">
                    <p>
                      <strong>{t("stationWorkflows.stock.actualBalance")}:</strong>{" "}
                      {formatNumber(Number(actualStockQty) || 0)} L
                    </p>
                    <p>
                      <strong>{t("stationWorkflows.stock.adjustmentQty")}:</strong>{" "}
                      {formatNumber((Number(actualStockQty) || 0) - (Number(stockCountStation.currentStock) || 0))} L
                    </p>
                    <p>
                      <strong>{t("stationWorkflows.stock.finalBalance")}:</strong>{" "}
                      {formatNumber(Number(actualStockQty) || 0)} L
                    </p>
                  </div>
                )}

                <div>
                  <label className="font-medium text-slate-200">{t("stationWorkflows.labels.reason")}</label>
                  <textarea
                    value={stockCountReason}
                    onChange={(e) => setStockCountReason(e.target.value)}
                    className="border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-lg p-2 w-full mt-2 min-h-[80px] outline-none focus:border-amber-500"
                    placeholder={t("stationWorkflows.stock.reasonPlaceholder")}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
                <button
                  onClick={() => {
                    setShowStockCountAdjustment(false);
                    setStockCountStation(null);
                    setActualStockQty("");
                    setStockCountReason("");
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-slate-200 hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>

                <button
                  onClick={confirmStockCountAdjustment}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {t("stationWorkflows.stock.submit")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showConfirm && (
        <ModalPortal>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed inset-0 z-[20030] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className={`w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
              <h2 className="text-xl font-bold mb-4 text-red-400">
                {t("stationWorkflows.zero.title")}
              </h2>

              <div className="mb-4">
                <label className="font-medium text-slate-200">{t("stationWorkflows.labels.selectStation")}</label>
                <select
                  className="border border-slate-700 bg-slate-900 text-slate-100 rounded-lg p-2 w-full mt-2 outline-none focus:border-amber-500"
                  value={selectedStation?.id || ""}
                  onChange={(e) => {
                    const station = stationsWithBalance.find(
                      (s) => s.id === e.target.value
                    );
                    setSelectedStation(station);
                  }}
                >
                  <option value="">{t("stationWorkflows.labels.selectStation")}</option>
                  {stationsWithBalance.map((s) => (
                    <option key={makeTenantEntityKey(s)} value={s.id}>
                      {s.id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStation && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 text-slate-300">
                  <p>
                    <strong>{t("stationWorkflows.zero.currentBalance")}:</strong>{" "}
                    {formatNumber(selectedStation.currentStock)} L
                  </p>
                  <p>
                    <strong>{t("stationWorkflows.stock.adjustmentQty")}:</strong>{" "}
                    {formatNumber(-selectedStation.currentStock)} L
                  </p>
                  <p>
                    <strong>{t("stationWorkflows.stock.finalBalance")}:</strong> 0 L
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="font-medium text-slate-200">{t("stationWorkflows.labels.reason")}</label>
                <textarea
                  value={zeroBalanceReason}
                  onChange={(e) => setZeroBalanceReason(e.target.value)}
                  className="border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-lg p-2 w-full mt-2 min-h-[80px] outline-none focus:border-amber-500"
                  placeholder={t("stationWorkflows.zero.defaultReason")}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700 pt-4">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedStation(null);
                    setZeroBalanceReason(t("stationWorkflows.zero.defaultReason"));
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-slate-200 hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>

                <button
                  onClick={proceedToPassword}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {t("common.yesContinue")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}


      </div>
    </div>
    </>
  );
}

function FuelLevelIcon({ percentage, lowLabel, mediumLabel, goodLabel }) {
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
          {level < 30 ? lowLabel : level < 60 ? mediumLabel : goodLabel}
        </p>
      </div>
      </div>
  );
}
