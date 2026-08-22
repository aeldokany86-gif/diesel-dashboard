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

import {
  formatNumber,
  normalizeScopeValue,
  isSameText,
  getDuplicateIdError,
  getHeaderIndex,
  mapBackendAssetForState,
  mapFrontendAssetStatusForBackend,
  filterActiveProjects,
} from "../../lib/helpers";

import { isAssetRefuelTransactionType } from "../../lib/operationHelpers";
import { createI18nMessage, resolveI18nMessage, resolveEnumValue } from "../../lib/i18nMessageHelpers";

import {
  companyMatches,
  makeTenantEntityKey,
  isPlatformContextValue,
} from "../../lib/companyHelpers";

import {
  createAssetRecord,
  updateAssetRecord,
  deleteAssetRecord,
  createAssetTransfer,
  createBulkAssetTransfer,
  resetAssetOdometer,
  createAssetActionRequest,
} from "../../services/assetsService";

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

function isOfficerUser(user) {
  return user?.role === "Officer";
}

function unwrapAssetTransferResult(result) {
  return result?.transfer || result?.data?.transfer || result?.data || result || {};
}

function isAssetTransferApplied(transfer, toProjectId) {
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

  const transferredAsset = transfer?.asset || transfer?.updatedAsset;
  const resultingProjectId =
    transferredAsset?.projectId ||
    transferredAsset?.project?.id ||
    transfer?.assetProjectId;

  return Boolean(
    resultingProjectId &&
      toProjectId &&
      normalizeScopeValue(resultingProjectId) === normalizeScopeValue(toProjectId)
  );
}

function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
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

function GenericModal({
  title,
  closeForm,
  saveText,
  onSave,
  saveDisabled = false,
  children,
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const resolveWorkflowMessage = (descriptor, fallback = "") =>
    resolveI18nMessage(t, descriptor, fallback || descriptor?.fallback || "");

  const createAssetWorkflowMessage = (key, params = {}, fallback = "") =>
    createI18nMessage(`workflowMessages.assets.${key}`, params, fallback);

  const assetActivityI18n = (
    actionKey,
    detailsKey,
    params = {},
    actionFallback = "",
    detailsFallback = "",
    options = {},
  ) => ({
    actionKey: `notifications.activity.actions.${actionKey}`,
    actionParams: params,
    actionEnumParams: options.actionEnumParams || {},
    actionFallback,
    detailsKey: `notifications.activity.details.${detailsKey}`,
    detailsParams: params,
    detailsEnumParams: options.detailsEnumParams || {},
    detailsFallback,
  });

  return (
    <ModalPortal>
      <div className="fleet-portal-modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className={`fleet-portal-modal-panel w-[min(650px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">{children}</div>

          <div className="flex justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
            <button
              onClick={closeForm}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-800/70 lg:px-4"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={onSave}
              disabled={saveDisabled}
              className={`px-3 lg:px-4 py-2 rounded-lg ${
                saveDisabled
                  ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {saveText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function AssetsPage({
  assets,
  setAssets,
  projects = [],
  transferProjects = projects,
  showToast,
  data = [],
  headers = [],
  assetOdometerHistory = [],
  setAssetOdometerHistory,
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
  onAssetTransferCreated = () => {},
  onAssetActionRequestCreated = () => {},
  runWithActionLoading = async (_label, actionFn) => actionFn(),
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const resolveWorkflowMessage = (descriptor, fallback = "") =>
    resolveI18nMessage(t, descriptor, fallback || descriptor?.fallback || "");

  const createAssetWorkflowMessage = (key, params = {}, fallback = "") =>
    createI18nMessage(`workflowMessages.assets.${key}`, params, fallback);

  const assetActivityI18n = (
    actionKey,
    detailsKey,
    params = {},
    actionFallback = "",
    detailsFallback = "",
    options = {},
  ) => ({
    actionKey: `notifications.activity.actions.${actionKey}`,
    actionParams: params,
    actionEnumParams: options.actionEnumParams || {},
    actionFallback,
    detailsKey: `notifications.activity.details.${detailsKey}`,
    detailsParams: params,
    detailsEnumParams: options.detailsEnumParams || {},
    detailsFallback,
  });

  const getAssetStatusLabel = (status) =>
    resolveEnumValue(t, "assetStatus", status, status || "-");

  const renderAssetStatusBadge = (status) => {
    const normalized = String(status || "").trim().toLowerCase();

    const statusClass =
      normalized === "active"
        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
        : normalized === "inactive"
        ? "border-red-500/50 bg-red-500/15 text-red-300"
        : "border-slate-500/50 bg-slate-500/15 text-slate-300";

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}
      >
        {getAssetStatusLabel(status)}
      </span>
    );
  };


  
  const getLatestAssetResetRecord = (asset, companyId = "") => {
    if (!asset) return undefined;

    /*
      Asset/reset records may use either the display asset code or the backend
      database id depending on whether the row came from immediate local state
      or a backend refresh. Match across the known identifiers without changing
      the existing reset chronology or company scoping rules.
    */
    const assetCandidates = [
      asset.id,
      asset.assetId,
      asset.backendId,
      asset.assetBackendId,
      asset.databaseId,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    return (assetOdometerHistory || [])
      .filter((item) => {
        const resetCandidates = [
          item.assetId,
          item.entityId,
          item.backendAssetId,
          item.assetBackendId,
          item.databaseId,
        ]
          .filter(Boolean)
          .map(normalizeScopeValue);

        const sameAsset = resetCandidates.some((candidate) =>
          assetCandidates.includes(candidate),
        );

        const sameCompany =
          !companyId ||
          !item.companyId ||
          companyMatches(item.companyId, companyId);

        return sameAsset && sameCompany;
      })
      .sort((a, b) => {
        const da =
          new Date(
            a.effectiveFrom ||
              a.effectiveAt ||
              a.effectiveDate ||
              a.createdAt,
          ).getTime() || 0;
        const db =
          new Date(
            b.effectiveFrom ||
              b.effectiveAt ||
              b.effectiveDate ||
              b.createdAt,
          ).getTime() || 0;
        return db - da;
      })[0];
  };

  const getEffectiveAssetOdometer = (asset) => {
    const latestReset = getLatestAssetResetRecord(
      asset,
      asset.companyId || currentUser?.companyId || "",
    );
    const latestOperationEntry = assetCurrentOdometerMap?.get?.(normalizeScopeValue(asset.id));
    const latestOperationTime = latestOperationEntry?.operationTime || 0;
    const latestResetTime = latestReset ? new Date(latestReset.effectiveFrom || latestReset.createdAt).getTime() || 0 : 0;

    if (latestReset && latestResetTime > latestOperationTime) {
      return parseFloat(latestReset.newReading ?? latestReset.resetReading ?? latestReset.reading) || 0;
    }

    return latestOperationEntry?.value ?? parseFloat(asset.odometer) ?? 0;
  };

  const assetCurrentOdometerMap = useMemo(() => {
    const map = new Map();

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
      "equipment no",
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
      "hour meter",
    ]);

    const dateIndexLocal = getHeaderIndex(headers, [
      "transaction_datetime",
      "Transaction datetime",
      "transaction datetime",
      "date",
    ]);

    if (
      typeIndexLocal === -1 ||
      destinationIndexLocal === -1 ||
      odometerIndexLocal === -1
    ) {
      return map;
    }

    data.forEach((row, originalIndex) => {
      const type = row[typeIndexLocal];
      const assetId = row[destinationIndexLocal];
      const odometerValue = parseFloat(row[odometerIndexLocal]);

      if (
        !assetId ||
        Number.isNaN(odometerValue) ||
        !isAssetRefuelTransactionType(type)
      ) {
        return;
      }

      const operationTime =
        dateIndexLocal !== -1
          ? new Date(row[dateIndexLocal]).getTime() || 0
          : originalIndex;

      const key = normalizeScopeValue(assetId);
      const previous = map.get(key);

      if (
        !previous ||
        operationTime > previous.operationTime ||
        (operationTime === previous.operationTime &&
          originalIndex > previous.originalIndex)
      ) {
        map.set(key, {
          value: odometerValue,
          operationTime,
          originalIndex,
        });
      }
    });

    return map;
  }, [data, headers]);


  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetsPage, setAssetsPage] = useState(1);
  const [newAsset, setNewAsset] = useState({
    id: "",
    project: "",
    type: "",
    category: "",
    odometer: "",
    fuelTank: "",
    status: "Active",
  });
  const [useCustomAssetType, setUseCustomAssetType] = useState(false);
  const [customAssetType, setCustomAssetType] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const [showAssetSettings, setShowAssetSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const assetSettingsRef = useRef(null);
  const assetSettingsMenuAlign = useSmartDropdownPosition(assetSettingsRef, showAssetSettings, 224);

  useOutsideClick(assetSettingsRef, () => {
  setShowAssetSettings(false);
  setShowExportMenu(false);
});

  const getBackendAssetId = (asset) => asset?.backendId || asset?.assetBackendId || "";

  const resolveProjectId = (projectValue) => {
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

  const replaceAssetInState = (updatedAsset) => {
    const mappedAsset = mapBackendAssetForState(updatedAsset);

    if (typeof setAssets === "function") {
      setAssets((prev) => {
        const next = [...(prev || [])];
        const index = next.findIndex((item) => {
          return (
            normalizeScopeValue(item.backendId || item.assetBackendId) === normalizeScopeValue(mappedAsset.backendId) ||
            normalizeScopeValue(item.id) === normalizeScopeValue(mappedAsset.id)
          );
        });

        if (index === -1) return [mappedAsset, ...next];

        next[index] = { ...next[index], ...mappedAsset };
        return next;
      });
    }

    return mappedAsset;
  };

  const applyTransferredProjectInState = (asset, projectValue, projectId, transfer) => {
    const updatedAsset = transfer?.asset || transfer?.updatedAsset;

    if (updatedAsset) {
      replaceAssetInState(updatedAsset);
      return;
    }

    if (typeof setAssets !== "function") return;

    const assetBackendId = getBackendAssetId(asset);
    setAssets((prev) =>
      (prev || []).map((item) => {
        const sameBackendAsset =
          assetBackendId &&
          normalizeScopeValue(getBackendAssetId(item)) === normalizeScopeValue(assetBackendId);
        const sameDisplayAsset =
          normalizeScopeValue(item.id) === normalizeScopeValue(asset?.id);

        if (!sameBackendAsset && !sameDisplayAsset) return item;

        return {
          ...item,
          project: projectValue,
          projectId,
        };
      })
    );
  };


  const [selectedAsset, setSelectedAsset] = useState(null);

  const [localAssetUpdates, setLocalAssetUpdates] = useState({});
  const [assetStatusConfirm, setAssetStatusConfirm] = useState(null);
  const [assetIdBackendError, setAssetIdBackendError] = useState("");

  const [projectTargetAsset, setProjectTargetAsset] = useState(null);
  const [selectedProjectValue, setSelectedProjectValue] = useState("");
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);

  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);
  const [bulkTransferProjectValue, setBulkTransferProjectValue] = useState("");
  const [savingBulkTransfer, setSavingBulkTransfer] = useState(false);

  const [deleteTargetAsset, setDeleteTargetAsset] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [odometerTargetAsset, setOdometerTargetAsset] = useState(null);
  const [oldOdometerBeforeReset, setOldOdometerBeforeReset] = useState("");
  const [newOdometer, setNewOdometer] = useState("");
  const [odometerEffectiveDate, setOdometerEffectiveDate] = useState("");
  const [odometerReason, setOdometerReason] = useState("");
  const [showOdometerConfirm, setShowOdometerConfirm] = useState(false);

  const assetIdExistsLocally = Boolean(
    getDuplicateIdError(
      newAsset.id,
      assets,
      "Asset ID"
    )
  );

  const assetIdDuplicateError =
    assetIdBackendError ||
    (assetIdExistsLocally
      ? t("assets.validation.duplicateAssetId")
      : "");

  const resetNewAsset = () => {
    setNewAsset({
      id: "",
      project: "",
      type: "",
      category: "",
      odometer: "",
      fuelTank: "",
      status: "Active",
    });
    setUseCustomAssetType(false);
    setCustomAssetType("");
    setUseCustomCategory(false);
    setCustomCategory("");
    setAssetIdBackendError("");
  };

  const closeAddAsset = () => {
    setShowForm(false);
    resetNewAsset();
  };

  const saveNewAsset = async () => {
    if (!hasPermission("assets", "add")) {
      showToast?.("warning", t("assets.messages.readOnlyAdd"));
      return;
    }

    if (!newAsset.id.trim()) {
      showToast?.("warning", t("assets.validation.enterAssetId"));
      return;
    }

    if (assetIdDuplicateError) {
      return;
    }

    if (!newAsset.project) {
      showToast?.("warning", t("assets.validation.selectProject"));
      return;
    }

    if (!newAsset.type.trim()) {
      showToast?.("warning", t("assets.validation.selectAssetType"));
      return;
    }

    if (!newAsset.category.trim()) {
      showToast?.("warning", t("assets.validation.selectCategory"));
      return;
    }

    const projectId = resolveProjectId(newAsset.project);
    const matchedProject = (transferProjects || projects || []).find((project) =>
      [project.id, project.backendId, project.name, project.code]
        .map(normalizeScopeValue)
        .includes(normalizeScopeValue(newAsset.project))
    );

    const companyId =
      currentUser?.companyId ||
      matchedProject?.companyId ||
      projects.find((project) => normalizeScopeValue(project.id) === normalizeScopeValue(projectId))?.companyId ||
      "";

    if (!companyId || isPlatformContextValue(companyId)) {
      showToast?.("warning", t("assets.validation.validCompanyRequired"));
      return;
    }

    const payload = {
      companyId,
      assetId: newAsset.id.trim(),
      type: newAsset.type.trim(),
      category: newAsset.category.trim(),
      currentOdometer: Number(newAsset.odometer || 0),
      fuelTankCapacity: Number(newAsset.fuelTank || 0),
      projectId,
      status: mapFrontendAssetStatusForBackend(newAsset.status),
      createdById: currentUser?.id || undefined,
    };

    
    try {
      const createdAsset = await createAssetRecord(payload);
      replaceAssetInState(createdAsset);
      trackActivity?.(
        "Add Asset",
        "assets",
        `${payload.assetId} added from backend.`,
        assetActivityI18n(
          "addAsset",
          "assetAdded",
          { assetId: payload.assetId },
          "Add Asset",
          `${payload.assetId} added from backend.`,
        ),
      );
      showToast?.("success", t("assets.messages.assetAdded"));
      closeAddAsset();
    } catch (error) {
      const backendMessage = String(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "",
      );

      const normalizedBackendMessage = backendMessage.toLowerCase();
      const isAssetIdConflict =
        Number(error?.response?.status) === 409 ||
        (
          normalizedBackendMessage.includes("asset id") &&
          (
            normalizedBackendMessage.includes("already") ||
            normalizedBackendMessage.includes("previously used") ||
            normalizedBackendMessage.includes("cannot be reused") ||
            normalizedBackendMessage.includes("unique")
          )
        );

      if (isAssetIdConflict) {
        setAssetIdBackendError(
          t("assets.validation.assetIdPreviouslyUsed"),
        );
        return;
      }

      showToast?.(
        "warning",
        t("assets.messages.assetAddFailed")
      );
    }
  };

  const displayAssets = assets.map((asset) => ({
    ...asset,
    status: localAssetUpdates[asset.id]?.status || asset.status,
    project: localAssetUpdates[asset.id]?.project || asset.project,
    odometer: localAssetUpdates[asset.id]?.odometer ?? asset.odometer,
    currentLifetimeOdometer:
      localAssetUpdates[asset.id]?.currentLifetimeOdometer ??
      asset.currentLifetimeOdometer ??
      0,
    currentMeterCycle:
      localAssetUpdates[asset.id]?.currentMeterCycle ??
      asset.currentMeterCycle ??
      1,
  }));

  const activeAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "active"
  );

  const inactiveAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "inactive"
  );

  const retiredAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "retired"
  );

  const visibleAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() !== "retired"
  );

  const projectOptions =
    transferProjects.length > 0
      ? filterActiveProjects(transferProjects).map((p) => p.name || p.id).filter(Boolean)
      : [];

  const assetTypeOptions = [
    ...new Set(
      displayAssets
        .map((asset) => String(asset.type || "").trim())
        .filter((value) => value && value !== "-")
    ),
  ].sort((a, b) => a.localeCompare(b));

  const defaultCategoryOptions = [
    "Heavy Equipment",
    "Trucks",
    "Generator",
    "Pickup",
    "Sedan",
    "Bus",
    "Crane",
    "Light Vehicle",
    "Service Vehicle",
    "Other",
  ];

  const categoryOptions = [
    ...new Set([
      ...defaultCategoryOptions,
      ...displayAssets
        .map((asset) => String(asset.category || "").trim())
        .filter((value) => value && value !== "-"),
    ]),
  ];

  const filteredAssets = visibleAssets.filter((asset) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const searchableText = [
      asset.id,
      asset.project,
      asset.type,
      asset.category,
      asset.odometer,
      asset.fuelTank,
      asset.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });

  const ASSETS_PAGE_SIZE = 5;
  const assetsTotalPages = Math.max(
    1,
    Math.ceil(filteredAssets.length / ASSETS_PAGE_SIZE)
  );
  const safeAssetsPage = Math.min(assetsPage, assetsTotalPages);
  const assetsPageStartIndex = (safeAssetsPage - 1) * ASSETS_PAGE_SIZE;
  const paginatedAssets = filteredAssets.slice(
    assetsPageStartIndex,
    assetsPageStartIndex + ASSETS_PAGE_SIZE
  );

  useEffect(() => {
    setAssetsPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (assetsPage > assetsTotalPages) {
      setAssetsPage(assetsTotalPages);
    }
  }, [assetsPage, assetsTotalPages]);

  const getAssetSelectionKey = (asset) =>
    getBackendAssetId(asset) || asset?.id || "";

  const selectedAssets = selectedAssetIds
    .map((id) =>
      visibleAssets.find(
        (asset) =>
          normalizeScopeValue(getAssetSelectionKey(asset)) ===
          normalizeScopeValue(id)
      )
    )
    .filter(Boolean);

  const visibleSelectableAssetIds = paginatedAssets
    .filter(
      (asset) =>
        asset.status?.trim().toLowerCase() === "active" &&
        Boolean(getBackendAssetId(asset))
    )
    .map(getAssetSelectionKey);

  const allVisibleAssetsSelected =
    visibleSelectableAssetIds.length > 0 &&
    visibleSelectableAssetIds.every((id) => selectedAssetIds.includes(id));

  const toggleAssetSelection = (asset) => {
    const key = getAssetSelectionKey(asset);
    if (!key) return;

    setSelectedAssetIds((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  };

  const toggleVisibleAssetSelection = () => {
    setSelectedAssetIds((prev) => {
      if (allVisibleAssetsSelected) {
        return prev.filter((id) => !visibleSelectableAssetIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleSelectableAssetIds]));
    });
  };

  const clearAssetSelection = () => {
    setSelectedAssetIds([]);
  };

  const openBulkTransferModal = () => {
    if (!canCurrentUserCreateAssetTransfer()) {
      showToast?.("warning", t("assetWorkflows.messages.transferRoleRequired"));
      return;
    }

    if (!selectedAssets.length) {
      showToast?.("warning", t("assetWorkflows.validation.selectAtLeastOne"));
      return;
    }

    const invalidAsset = selectedAssets.find(
      (asset) => asset.status?.trim().toLowerCase() !== "active"
    );

    if (invalidAsset) {
      showToast?.("warning", t("assetWorkflows.validation.activeAssetsOnly"));
      return;
    }

    setBulkTransferProjectValue("");
    setBulkTransferModalOpen(true);
  };

  const closeBulkTransferModal = () => {
    if (savingBulkTransfer) return;
    setBulkTransferModalOpen(false);
    setBulkTransferProjectValue("");
  };

  const confirmBulkAssetTransfer = async () => {
    if (savingBulkTransfer) return;

    if (!bulkTransferProjectValue) {
      showToast?.("warning", t("assetWorkflows.validation.selectDestinationProject"));
      return;
    }

    const toProjectId = resolveProjectId(bulkTransferProjectValue);
    const backendAssetIds = selectedAssets
      .map(getBackendAssetId)
      .filter(Boolean);

    if (!toProjectId) {
      showToast?.("warning", t("assetWorkflows.validation.selectValidProject"));
      return;
    }

    if (!backendAssetIds.length) {
      showToast?.("warning", t("assetWorkflows.validation.assetsNotLinked"));
      return;
    }

    setSavingBulkTransfer(true);

    try {
      const result = await createBulkAssetTransfer({
        assetIds: backendAssetIds,
        toProjectId,
        requestedByUserId: currentUser?.id || "",
      });

      const createdTransfers = Array.isArray(result)
        ? result
        : result?.transfers || [];

      createdTransfers.forEach((transfer) => {
        onAssetTransferCreated?.(transfer);
      });

      trackActivity?.(
        "Request Bulk Asset Transfer",
        "assets",
        `${backendAssetIds.length} assets transfer requested to ${bulkTransferProjectValue}.`,
        assetActivityI18n(
          "requestBulkAssetTransfer",
          "bulkAssetTransferRequested",
          {
            count: backendAssetIds.length,
            project: bulkTransferProjectValue,
            assetIds: selectedAssets.map((asset) => asset.id).join(", "),
          },
          "Request Bulk Asset Transfer",
          `${backendAssetIds.length} assets transfer requested to ${bulkTransferProjectValue}.`,
        ),
      );

      showToast?.(
        "success",
        t("assetWorkflows.messages.bulkTransferSubmitted", {
          count: backendAssetIds.length,
        })
      );

      clearAssetSelection();
      closeBulkTransferModal();
    } catch (error) {
      showToast?.(
        "warning",
        t("assetWorkflows.messages.bulkTransferFailed")
      );
    } finally {
      setSavingBulkTransfer(false);
    }
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
  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);

  const consumptionByAsset = data.reduce((acc, row) => {
    if (typeIndex === -1 || dieselIndex === -1 || destinationIndex === -1) {
      return acc;
    }

    if (!isAssetRefuelTransactionType(row[typeIndex])) {
      return acc;
    }

    const assetId = row[destinationIndex];
    const dieselQty = parseFloat(row[dieselIndex]) || 0;

    if (!assetId) {
      return acc;
    }

    acc[assetId] = (acc[assetId] || 0) + dieselQty;
    return acc;
  }, {});

  const assetConsumptionChartData = filteredAssets
    .map((asset) => ({
      equipmentNo: asset.id,
      qtyLiters: Number(consumptionByAsset[asset.id]) || 0,
    }))
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const assetConsumptionChartWidth = Math.max(
    assetConsumptionChartData.length * 85,
    900
  );

  const changeAssetStatus = (asset) => {
    if (!hasPermission("assets", "edit")) {
      showToast?.("warning", t("assetWorkflows.messages.readOnlyStatus"));
      return;
    }

    const currentStatus = asset.status?.trim().toLowerCase();
    const newStatus = currentStatus === "active" ? "Inactive" : "Active";

    setAssetStatusConfirm({
      asset,
      oldStatus: asset.status || "Inactive",
      newStatus,
    });
  };

  const confirmAssetStatusChange = async () => {
    if (!assetStatusConfirm?.asset) return;

    const { asset, newStatus } = assetStatusConfirm;
    const backendAssetId = getBackendAssetId(asset);

    if (!backendAssetId) {
      setLocalAssetUpdates((prev) => ({
        ...prev,
        [asset.id]: {
          ...prev[asset.id],
          status: newStatus,
        },
      }));
      showToast?.("success", t("assetWorkflows.messages.statusChanged", { status: getAssetStatusLabel(newStatus) }));
      setAssetStatusConfirm(null);
      return;
    }

    try {
      const updatedAsset = await updateAssetRecord(backendAssetId, {
        status: mapFrontendAssetStatusForBackend(newStatus),
      });

      replaceAssetInState(updatedAsset);
      trackActivity?.(
        "Change Asset Status",
        "assets",
        `${asset.id} status changed to ${newStatus}.`,
        assetActivityI18n(
          "changeAssetStatus",
          "assetStatusChanged",
          { assetId: asset.id, status: newStatus },
          "Change Asset Status",
          `${asset.id} status changed to ${newStatus}.`,
          { detailsEnumParams: { status: "assetStatus" } },
        ),
      );
      showToast?.("success", t("assetWorkflows.messages.statusChanged", { status: getAssetStatusLabel(newStatus) }));
    } catch (error) {
      showToast?.(
        "warning",
        t("assetWorkflows.messages.statusChangeFailed")
      );
    } finally {
      setAssetStatusConfirm(null);
    }
  };

  const canCurrentUserCreateAssetTransfer = () =>
    currentUser?.status === "Active" && ["Officer", "Manager"].includes(currentUser?.role);

  const openProjectChange = (asset) => {
    if (!canCurrentUserCreateAssetTransfer()) {
      showToast?.("warning", t("assetWorkflows.messages.transferRoleRequired"));
      return;
    }

    setProjectTargetAsset(asset);
    setSelectedProjectValue(asset.project || "");
  };

  const resetProjectWorkflow = () => {
    setProjectTargetAsset(null);
    setSelectedProjectValue("");
    setShowProjectConfirm(false);
  };

  const proceedProjectConfirm = () => {
    if (!selectedProjectValue) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.selectProject"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.selectProject")), t("assetWorkflows.validation.selectProject"));
      return;
    }

    setShowProjectConfirm(true);
  };

  const proceedProjectPassword = () => {
    setShowProjectConfirm(false);
    confirmProjectUpdate();
  };

  const confirmProjectUpdate = async () => {
    const targetAssetSnapshot = projectTargetAsset;
    if (!targetAssetSnapshot) {
      setShowProjectConfirm(false);
      return;
    }

    if (!canCurrentUserCreateAssetTransfer()) {
      showToast?.("warning", t("assetWorkflows.messages.transferRoleRequired"));
      resetProjectWorkflow();
      return;
    }

    const backendAssetId = getBackendAssetId(projectTargetAsset);
    const toProjectId = resolveProjectId(selectedProjectValue);

    if (!backendAssetId) {
      showToast?.("warning", t("assetWorkflows.validation.assetNotLinked"));
      resetProjectWorkflow();
      return;
    }

    if (!toProjectId) {
      showToast?.("warning", t("assetWorkflows.validation.selectValidProject"));
      return;
    }

    try {
      const transferResponse = await createAssetTransfer(backendAssetId, {
        toProjectId,
        requestedByUserId: currentUser?.id || "",
      });
      const createdTransfer = unwrapAssetTransferResult(transferResponse);
      const transferApplied = isAssetTransferApplied(createdTransfer, toProjectId);

      onAssetTransferCreated?.(createdTransfer);

      if (transferApplied) {
        applyTransferredProjectInState(
          projectTargetAsset,
          selectedProjectValue,
          toProjectId,
          createdTransfer
        );
        showToast?.(
          "success",
          t("assetWorkflows.messages.assetTransferred", {
            project: selectedProjectValue,
          })
        );
      } else {
        showToast?.(
          "warning",
          t("assetWorkflows.messages.transferPendingApproval")
        );
      }
      trackActivity?.(
        transferApplied ? "Transfer Asset" : "Request Asset Transfer",
        "assets",
        transferApplied
          ? `${targetAssetSnapshot.id} transferred from ${targetAssetSnapshot.project || "-"} to ${selectedProjectValue}.`
          : `${targetAssetSnapshot.id} transfer requested from ${targetAssetSnapshot.project || "-"} to ${selectedProjectValue}.`,
        assetActivityI18n(
          transferApplied ? "transferAsset" : "requestAssetTransfer",
          transferApplied ? "assetTransferred" : "assetTransferRequested",
          { assetId: targetAssetSnapshot.id, fromProject: targetAssetSnapshot.project || "-", toProject: selectedProjectValue },
          transferApplied ? "Transfer Asset" : "Request Asset Transfer",
          transferApplied
            ? `${targetAssetSnapshot.id} transferred from ${targetAssetSnapshot.project || "-"} to ${selectedProjectValue}.`
            : `${targetAssetSnapshot.id} transfer requested from ${targetAssetSnapshot.project || "-"} to ${selectedProjectValue}.`,
        ),
      );
      resetProjectWorkflow();
    } catch (error) {
      showToast?.(
        "warning",
        t("assetWorkflows.messages.transferFailed")
      );
    }
  };

  const proceedDeleteConfirm = () => {
    if (!deleteReason) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.enterDeletionReason"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.enterDeletionReason")), t("assetWorkflows.validation.enterDeletionReason"));
      return;
    }

    setShowDeleteConfirm(true);
  };

  const proceedDeletePassword = () => {
    setShowDeleteConfirm(false);
    confirmDeleteRequest();
  };

  const confirmDeleteRequest = async () => {
    const backendAssetId = getBackendAssetId(deleteTargetAsset);
    const currentRole = String(currentUser?.role || "").trim();
    const canDeleteDirectly = ["Admin", "PlatformAdmin"].includes(currentRole);

    if (!backendAssetId) {
      showToast?.("warning", t("assetWorkflows.validation.assetNotLinked"));
      return;
    }

    // Admin / PlatformAdmin delete directly from the Assets page.
    // Officer submits an Admin approval request.
    // Asset transfer remains a separate approval workflow regardless of role.
    if (canDeleteDirectly) {
      try {
        const deletedAsset = await runWithActionLoading(
          t("assetWorkflows.loading.deletingAsset"),
          async () => deleteAssetRecord(backendAssetId)
        );

        // Preserve the current asset identity even if the DELETE endpoint
        // returns no body (204) or only a partial record. Without this, the
        // state updater cannot match the existing row, so it stays visible
        // until the next full page reload.
        const deletedAssetSnapshot = {
          ...deleteTargetAsset,
          ...(deletedAsset || {}),
          backendId:
            deletedAsset?.backendId ||
            deletedAsset?.id ||
            deleteTargetAsset?.backendId ||
            deleteTargetAsset?.assetBackendId ||
            backendAssetId,
          assetBackendId:
            deletedAsset?.assetBackendId ||
            deletedAsset?.backendId ||
            deletedAsset?.id ||
            deleteTargetAsset?.assetBackendId ||
            deleteTargetAsset?.backendId ||
            backendAssetId,
          id:
            deleteTargetAsset?.id ||
            deletedAsset?.assetId ||
            deletedAsset?.equipmentNo ||
            deletedAsset?.equipmentNumber ||
            deletedAsset?.id ||
            "-",
          deletedAt: deletedAsset?.deletedAt || new Date().toISOString(),
          status: "Retired",
        };

        // Update the local display overlay first. displayAssets gives
        // localAssetUpdates priority over the parent assets prop, so this is
        // the guaranteed immediate UI update even if the parent state refresh
        // is delayed or the DELETE endpoint returns a partial payload.
        setLocalAssetUpdates((prev) => ({
          ...prev,
          [deleteTargetAsset?.id]: {
            ...prev[deleteTargetAsset?.id],
            status: "Retired",
          },
        }));

        // Remove the deleted asset from the visible parent state immediately.
        // Do NOT pass a soft-deleted asset through replaceAssetInState here:
        // mapBackendAssetForState normalizes backend status values for normal
        // active/inactive records and can turn a local "Retired" snapshot back
        // into "Active". Filtering by both backend identity and display ID makes
        // the UI update deterministic without waiting for a full page reload.
        if (typeof setAssets === "function") {
          setAssets((prev) =>
            (prev || []).filter((item) => {
              const sameBackendAsset =
                normalizeScopeValue(getBackendAssetId(item)) ===
                normalizeScopeValue(backendAssetId);

              const sameDisplayAsset =
                normalizeScopeValue(item?.id) ===
                normalizeScopeValue(deleteTargetAsset?.id);

              return !sameBackendAsset && !sameDisplayAsset;
            }),
          );
        }

        // Also clear it from any current bulk selection immediately.
        setSelectedAssetIds((prev) =>
          (prev || []).filter(
            (id) =>
              normalizeScopeValue(id) !== normalizeScopeValue(backendAssetId) &&
              normalizeScopeValue(id) !==
                normalizeScopeValue(deleteTargetAsset?.id),
          ),
        );

        // Close every UI layer related to the deleted asset immediately.
        setShowDeleteConfirm(false);
        setDeleteTargetAsset(null);
        setSelectedAsset(null);
        setDeleteReason("");

        showToast?.("success", t("assetWorkflows.messages.assetDeleted"));
      } catch (error) {
        showToast?.(
          "warning",
          t("assetWorkflows.messages.assetDeleteFailed")
        );
      }
      return;
    }

    if (!isOfficerUser(currentUser)) {
      showToast?.("warning", t("assetWorkflows.messages.deleteRoleRequired"));
      setShowDeleteConfirm(false);
      return;
    }

    await runWithActionLoading(t("assetWorkflows.loading.submittingDelete"), async () => {
      const deleteTitleMessage = createAssetWorkflowMessage(
        "deleteApproval.title",
        { assetId: deleteTargetAsset?.id || "-" },
        `Asset ${deleteTargetAsset?.id} deletion request`,
      );
      const deleteDetailsMessage = createAssetWorkflowMessage(
        "deleteApproval.details",
        { assetId: deleteTargetAsset?.id || "-", reason: deleteReason },
        deleteReason,
      );

      submitApprovalRequest({
        type: "master_data_change",
        module: "assets",
        title: resolveWorkflowMessage(deleteTitleMessage),
        titleKey: deleteTitleMessage.key,
        titleParams: deleteTitleMessage.params,
        titleFallback: deleteTitleMessage.fallback,
        details: resolveWorkflowMessage(deleteDetailsMessage),
        detailsKey: deleteDetailsMessage.key,
        detailsParams: deleteDetailsMessage.params,
        detailsFallback: deleteDetailsMessage.fallback,
        payload: {
          entity: "asset",
          action: "delete",
          id: deleteTargetAsset?.id,
          assetId: deleteTargetAsset?.assetId || deleteTargetAsset?.id,
          backendAssetId,
          assetBackendId: backendAssetId,
          approvalRouteStrategy: "admin",
          reason: deleteReason,
          changedFields: [
            {
              field: "delete",
              label: t("assetWorkflows.approvalFields.softDeleteRequest"),
              labelKey: "assetWorkflows.approvalFields.softDeleteRequest",
              oldValue: deleteTargetAsset?.id || "-",
              newValue: t("assetWorkflows.approvalFields.requestedDeletion"),
              newValueKey: "assetWorkflows.approvalFields.requestedDeletion",
              sensitive: true,
            },
          ],
        },
      });
    });

    setShowDeleteConfirm(false);
    setDeleteTargetAsset(null);
    setDeleteReason("");

    showToast
      ? showToast(
          "success",
          t("assetWorkflows.messages.deletePendingApproval")
        )
      : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.messages.deletePendingApproval")), t("assetWorkflows.messages.deletePendingApproval"));
  };

  const proceedOdometerConfirm = () => {
    const oldReading = Number(oldOdometerBeforeReset);
    const newReading = Number(newOdometer);

    if (oldOdometerBeforeReset === "" || Number.isNaN(oldReading) || oldReading < 0) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.validOldOdometer"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.validOldOdometer")), t("assetWorkflows.validation.validOldOdometer"));
      return;
    }

    const currentReading = Number(
      getEffectiveAssetOdometer(odometerTargetAsset) ?? 0
    );

    if (Number.isFinite(currentReading) && oldReading < currentReading) {
      const message = t("addOperation.validation.odometerBelowLast", {
        reading: formatNumber(currentReading),
      });
      showToast
        ? showToast("warning", message)
        : notifyUser(
            typeof showToast !== "undefined" ? showToast : null,
            inferToastTypeFromMessage(message),
            message
          );
      return;
    }

    if (newOdometer === "" || Number.isNaN(newReading) || newReading < 0) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.validNewOdometer"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.validNewOdometer")), t("assetWorkflows.validation.validNewOdometer"));
      return;
    }

    if (!odometerEffectiveDate) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.selectEffectiveDate"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.selectEffectiveDate")), t("assetWorkflows.validation.selectEffectiveDate"));
      return;
    }

    if (!odometerReason) {
      showToast
        ? showToast("warning", t("assetWorkflows.validation.enterResetReason"))
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.validation.enterResetReason")), t("assetWorkflows.validation.enterResetReason"));
      return;
    }

    setShowOdometerConfirm(true);
  };

  const proceedOdometerPassword = () => {
    setShowOdometerConfirm(false);
    confirmOdometerRequest();
  };

// {t("assetWorkflows.odometer.title")} Rules:
// Officer -> Request to Project Manager
// Manager/Admin -> Direct execute after confirmation


  const confirmOdometerRequest = async () => {
    const currentRole = String(currentUser?.role || "").trim();
    const canResetDirectly = ["Admin", "Manager", "PlatformAdmin"].includes(currentRole);
    const canSubmitOdometerRequest = isOfficerUser(currentUser) || canResetDirectly;

    // {t("assetWorkflows.odometer.title")} business rule:
    // Officer -> approval request to Project Manager.
    // Manager/Admin/PlatformAdmin -> direct execution after confirmation.
    if (!canSubmitOdometerRequest) {
      showToast?.("warning", t("assetWorkflows.messages.readOnlyOdometerReset"));
      return;
    }

    const backendAssetId = getBackendAssetId(odometerTargetAsset);
    if (!backendAssetId) {
      showToast?.("warning", t("assetWorkflows.validation.assetNotLinked"));
      return;
    }

    const oldReading = Number(oldOdometerBeforeReset) || 0;
    const newReading = Number(newOdometer) || 0;

    const odometerHistoryRecord = {
      assetId: odometerTargetAsset.id,
      entityId: odometerTargetAsset.id,
      backendAssetId,
      companyId: odometerTargetAsset.companyId || currentUser?.companyId || "",
      oldOdometerBeforeReset: oldReading,
      newOdometerAfterReset: newReading,
      newReading,
      effectiveDate: odometerEffectiveDate,
      effectiveFrom: odometerEffectiveDate,
      odometerOffset: oldReading,
      // Reset must not rewrite historical readings.
      // The asset current odometer after reset is the new meter reading only.
      // Future Operations distance can use:
      // totalDistance = oldOdometerBeforeReset + (currentReading - newOdometerAfterReset)
      actualOdometerAfterReset: newReading,
      historicalDistanceBase: oldReading,
      resetMeterStart: newReading,
      reason: odometerReason,
      project: odometerTargetAsset.project || "",
      projectId: odometerTargetAsset.projectId || "",
      requestedBy: currentUser?.fullName || currentUser?.name || "System",
      requestedAt: new Date().toISOString(),
      status: canResetDirectly ? "Approved" : "Pending Approval",
    };

    const closeOdometerResetUi = () => {
      setOdometerTargetAsset(null);
      setOldOdometerBeforeReset("");
      setNewOdometer("");
      setOdometerEffectiveDate("");
      setOdometerReason("");
      setShowOdometerConfirm(false);
      setSelectedAsset(null);
    };

    const updateAssetOdometerLocally = (updatedAssetFromBackend = null) => {
      const mappedBackendAsset = updatedAssetFromBackend
        ? mapBackendAssetForState(updatedAssetFromBackend)
        : null;

      const patchAsset = (asset) => {
        const candidates = [
          asset?.backendId,
          asset?.assetBackendId,
          asset?.id,
          asset?.assetId,
        ]
          .filter(Boolean)
          .map(normalizeScopeValue);

        const matches =
          candidates.includes(normalizeScopeValue(backendAssetId)) ||
          candidates.includes(normalizeScopeValue(odometerTargetAsset?.id));

        if (!matches) return asset;

        return {
          ...asset,
          ...(mappedBackendAsset?.id ? mappedBackendAsset : {}),
          odometer: String(newReading),
          currentOdometer: newReading,
          updatedAt: new Date().toISOString(),
        };
      };

      if (typeof setAssets === "function") {
        setAssets((prev) => (prev || []).map(patchAsset));
      }


      setSelectedAsset((prev) => (prev ? patchAsset(prev) : prev));
    };


    if (canResetDirectly) {
      try {
        const resetResult = await runWithActionLoading(t("assetWorkflows.loading.resettingOdometer"), async () =>
          resetAssetOdometer(backendAssetId, {
            newOdometer: newReading,
            oldOdometer: oldReading,
            reason: odometerReason,
            effectiveAt: odometerEffectiveDate || undefined,
            createdByUserId: currentUser?.id || undefined,
          })
        );

        const updatedAsset = resetResult?.asset || null;

        // Update the visible table immediately.
        // Do not call the global backend asset replacement helper here,
        // because this AssetsPage scope uses its own local state helpers.
        updateAssetOdometerLocally(updatedAsset);

        if (typeof setAssetOdometerHistory === "function") {
          const resetRecord = resetResult?.resetRecord;
          setAssetOdometerHistory((prev) => [
            ...(prev || []),
            resetRecord
              ? {
                  assetId: odometerTargetAsset.id,
                  entityId: odometerTargetAsset.id,
                  backendAssetId,
                  companyId: resetRecord.companyId || odometerTargetAsset.companyId || "",
                  oldOdometerBeforeReset: resetRecord.oldOdometer ?? oldReading,
                  newOdometerAfterReset: resetRecord.newOdometer ?? newReading,
                  newReading: resetRecord.newOdometer ?? newReading,
                  actualOdometerAfterReset: resetRecord.newOdometer ?? newReading,
                  historicalDistanceBase: resetRecord.oldOdometer ?? oldReading,
                  resetMeterStart: resetRecord.newOdometer ?? newReading,
                  effectiveDate: resetRecord.effectiveAt || odometerEffectiveDate,
                  effectiveFrom: resetRecord.effectiveAt || odometerEffectiveDate,
                  reason: resetRecord.reason || odometerReason,
                  requestedBy: currentUser?.fullName || currentUser?.name || "System",
                  requestedAt: resetRecord.createdAt || new Date().toISOString(),
                  status: "Approved",
                }
              : odometerHistoryRecord,
          ]);
        }

        closeOdometerResetUi();


        showToast?.("success", t("assetWorkflows.messages.odometerResetCompleted"));
      } catch (error) {
        showToast?.(
          "warning",
          t("assetWorkflows.messages.odometerResetFailed")
        );
      }

      return;
    }

    // Officer request is persisted in the backend so it is visible across devices.
    try {
      const createdRequest = await runWithActionLoading(
        t("assetWorkflows.loading.submittingOdometerReset"),
        async () =>
          createAssetActionRequest(backendAssetId, {
            actionType: "ODOMETER_RESET",
            requestedByUserId: currentUser?.id,
            reason: odometerReason,
            newOdometer: newReading,
            oldOdometer: oldReading,
            effectiveAt: odometerEffectiveDate || undefined,
          }),
      );

      await onAssetActionRequestCreated?.(createdRequest);
      closeOdometerResetUi();

      showToast
        ? showToast(
            "success",
            t("assetWorkflows.messages.odometerResetPendingApproval")
          )
        : notifyUser(
            typeof showToast !== "undefined" ? showToast : null,
            inferToastTypeFromMessage(t("assetWorkflows.messages.odometerResetPendingApproval")),
            t("assetWorkflows.messages.odometerResetPendingApproval")
          );
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        t("assetWorkflows.messages.odometerResetFailed");
      showToast?.("warning", backendMessage);
    }
  };

  const exportAssetsToCSV = () => {
  const csvHeaders = [
    t("assets.table.assetId"),
    t("assets.table.project"),
    t("assets.table.assetType"),
    t("assets.table.category"),
    t("assets.table.currentOdometer"),
    t("assets.table.fuelTankCapacity"),
    t("assets.table.status"),
  ];

  const csvRows = filteredAssets.map((asset) => [
    asset.id || "",
    asset.project || "",
    asset.type || "",
    asset.category || "",
    getEffectiveAssetOdometer(asset),
    asset.fuelTank || "",
    asset.status || "",
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const today = new Date().toISOString().split("T")[0];

  link.href = url;
  link.download = `assets_export_${today}.csv`;
  link.click();

  URL.revokeObjectURL(url);

  showToast
    ? showToast("success", t("assetWorkflows.messages.csvExported"))
    : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.messages.csvExported")), t("assetWorkflows.messages.csvExported"));
};

  const exportAssetsToPDF = () => {
  showToast
    ? showToast("warning", t("assetWorkflows.messages.pdfComingSoon"))
    : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(t("assetWorkflows.messages.pdfComingSoon")), t("assetWorkflows.messages.pdfComingSoon"));
};

  const escapePrintValue = (value) => {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

  const printAssetsReport = () => {
  const reportDate = new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-GB");

  const tableRowsHtml = filteredAssets
    .map(
      (asset, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapePrintValue(asset.id)}</td>
          <td>${escapePrintValue(asset.project)}</td>
          <td>${escapePrintValue(asset.type)}</td>
          <td>${escapePrintValue(asset.category)}</td>
          <td>${escapePrintValue(formatNumber(getEffectiveAssetOdometer(asset)))}</td>
          <td>${escapePrintValue(formatNumber(asset.fuelTank))} L</td>
          <td>${escapePrintValue(getAssetStatusLabel(asset.status))}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "", "width=1400,height=900");

  if (!printWindow) return;

  printWindow.document.write(`
    <html dir="${language === "ar" ? "rtl" : "ltr"}">
      <head>
        <title>${escapePrintValue(t("assetWorkflows.print.reportTitle"))}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 10px;
            direction: ${language === "ar" ? "rtl" : "ltr"};
            text-align: ${language === "ar" ? "right" : "left"};
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
            text-align: ${language === "ar" ? "right" : "left"};
          }

          h1, h2 {
            text-align: ${language === "ar" ? "right" : "left"};
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th, td {
            border: 1px solid #bbb;
            padding: 6px 8px;
            text-align: ${language === "ar" ? "right" : "left"};
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
        <h1>${escapePrintValue(t("assetWorkflows.print.reportTitle"))}</h1>
        <div class="meta">
          Generated at: ${reportDate} | Total Assets: ${filteredAssets.length}
        </div>

        <h2>${escapePrintValue(t("assets.list.title"))}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapePrintValue(t("assets.table.assetId"))}</th>
              <th>${escapePrintValue(t("assets.table.project"))}</th>
              <th>${escapePrintValue(t("assets.table.assetType"))}</th>
              <th>${escapePrintValue(t("assets.table.category"))}</th>
              <th>${escapePrintValue(t("assets.table.currentOdometer"))}</th>
              <th>${escapePrintValue(t("assets.table.fuelTankCapacity"))}</th>
              <th>${escapePrintValue(t("assets.table.status"))}</th>
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
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <style jsx global>{`
        /* Shared pointer behavior for interactive Assets controls */
        button,
        a,
        select,
        summary,
        [role="button"],
        input[type="button"],
        input[type="submit"],
        input[type="checkbox"],
        input[type="radio"],
        .settings-layer-safe,
        .settings-layer-safe *,
        .project-title,
        .project-card-print button {
          cursor: pointer !important;
        }

        button:disabled,
        select:disabled,
        input:disabled {
          cursor: not-allowed !important;
        }

      `}</style>
      <div className={`fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px] ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex justify-between items-center mb-4 gap-4">
  <div>
    <h1 className="text-xl sm:text-2xl font-bold">{t("assets.title")}</h1>
    <p className="text-gray-400">{t("assets.subtitle")}</p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <input
      type="text"
      placeholder={t("assets.searchPlaceholder")}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      dir={isRtl ? "rtl" : "ltr"}
      className={`bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white w-[380px] focus:outline-none focus:border-yellow-400 ${isRtl ? "text-right" : "text-left"}`}
    />

    <div ref={assetSettingsRef} className="relative settings-layer-safe">
      <button
        onClick={() => setShowAssetSettings(!showAssetSettings)}
        className="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 lg:px-4 py-2 lg:py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
      >
        ☰
      </button>

      {showAssetSettings && (
        <div className={`${getSmartDropdownClass(assetSettingsMenuAlign, "w-56")} bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-visible z-[10020]`}>
          {hasPermission("assets", "add") && (
            <button
              onClick={() => {
                setShowAssetSettings(false);
                setShowForm(true);
              }}
              className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-slate-800 transition text-white"
            >
              <span className="text-green-400 text-lg">＋</span>
              {t("assets.actions.addAsset")}
            </button>
          )}

          <button
            onClick={() => {
              setShowAssetSettings(false);
              setShowExportMenu(false);
              printAssetsReport();
            }}
            className="flex items-center gap-3 w-full cursor-pointer text-left px-5 py-4 hover:bg-slate-800 transition text-white border-t border-gray-700"
          >
            <span className="text-yellow-400 text-lg">⎙</span>
            {t("assets.actions.printReport")}
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center justify-between w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white border-t border-gray-700"
          >
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-blue-400 text-lg">⇩</span>
              {t("assets.actions.export")}
            </span>

            <span className="text-gray-400">›</span>
          </button>

          {showExportMenu && (
            <div className="bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToCSV();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                {t("common.exportCsv")}
              </button>

              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToPDF();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                {t("assets.actions.exportPdf")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
        <Card title={t("assets.cards.total")} value={visibleAssets.length} />
        <Card title={t("assets.cards.active")} value={activeAssets.length} />
        <Card title={t("assets.cards.inactive")} value={inactiveAssets.length} />
        <Card title={t("assets.cards.retired")} value={retiredAssets.length} />
      </div>


      <div className="bg-gray-800 rounded-2xl shadow-xl overflow-visible mb-4 border border-slate-700/70">
        <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/70">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              {t("assets.list.title")}
            </h2>
            <p className="text-sm text-slate-400">{t("assets.list.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedAssetIds.length > 0 && (
              <>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                  {t("assets.list.selectedCount", { count: selectedAssetIds.length })}
                </span>

                <button
                  type="button"
                  onClick={clearAssetSelection}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:border-slate-400"
                >
                  {t("assets.actions.clearSelection")}
                </button>

                <button
                  type="button"
                  onClick={openBulkTransferModal}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400"
                >
                  {t("assets.actions.transferSelected")}
                </button>
              </>
            )}

            <span className="text-sm text-slate-400">
              {t("assets.list.assetCount", { count: filteredAssets.length })}
            </span>
          </div>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-b-2xl">
          <table className="min-w-[760px] lg:min-w-[980px] w-full border-separate border-spacing-0 text-[11px] sm:text-xs lg:text-sm">
            <thead className="bg-slate-800 sticky top-0 z-[1] shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
              <tr>
                <Th>
                  <input
                    type="checkbox"
                    checked={allVisibleAssetsSelected}
                    onChange={toggleVisibleAssetSelection}
                    aria-label={t("assets.table.selectAll")}
                    className="h-4 w-4 accent-amber-500"
                  />
                </Th>
                <Th className={isRtl ? "text-right" : "text-left"}>#</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.assetId")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.project")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.assetType")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.category")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.currentOdometer")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.fuelTankCapacity")}</Th>
                <Th className={isRtl ? "text-right" : "text-left"}>{t("assets.table.status")}</Th>
              </tr>
            </thead>

            <tbody>
              {paginatedAssets.map((asset, i) => (
                <tr
                  key={makeTenantEntityKey(asset)}
                  className="odd:bg-slate-900/20 even:bg-slate-800/20 hover:bg-amber-400/10 transition-colors duration-200"
                >
                  <Td>
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(getAssetSelectionKey(asset))}
                      disabled={
                        asset.status?.trim().toLowerCase() !== "active" ||
                        !getBackendAssetId(asset)
                      }
                      onChange={() => toggleAssetSelection(asset)}
                      aria-label={t("assets.table.selectAsset", { id: asset.id })}
                      className="h-4 w-4 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </Td>

                  <Td>{assetsPageStartIndex + i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {asset.id}
                    </button>
                  </Td>

                  <Td>
                    {canCurrentUserCreateAssetTransfer() ? (
                      <button
                        onClick={() => openProjectChange(asset)}
                        className="hover:text-yellow-400 transition cursor-pointer"
                      >
                        {asset.project || "-"}
                      </button>
                    ) : (
                      <span>{asset.project || "-"}</span>
                    )}
                  </Td>

                  <Td>{asset.type || "-"}</Td>
                  <Td>{asset.category || "-"}</Td>
                  <Td>{formatNumber(getEffectiveAssetOdometer(asset))}</Td>
                  <Td>{formatNumber(asset.fuelTank)} L</Td>

                  <Td>
                    {hasPermission("assets", "edit") ? (
                      <button
                        onClick={() => changeAssetStatus(asset)}
                        className="cursor-pointer"
                      >
                        {renderAssetStatusBadge(asset.status)}
                      </button>
                    ) : (
                      renderAssetStatusBadge(asset.status)
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssets.length > ASSETS_PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-700/80 px-4 py-3">
            <button
              type="button"
              onClick={() => setAssetsPage((page) => Math.max(1, page - 1))}
              disabled={safeAssetsPage <= 1}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-600 bg-slate-950 text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              {isRtl ? "›" : "‹"}
            </button>

            <span className="min-w-[90px] text-center text-sm font-bold text-slate-300" dir="ltr">
              {safeAssetsPage} / {assetsTotalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setAssetsPage((page) => Math.min(assetsTotalPages, page + 1))
              }
              disabled={safeAssetsPage >= assetsTotalPages}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-600 bg-slate-950 text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              {isRtl ? "‹" : "›"}
            </button>
          </div>
        )}
      </div>


      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <h2 className={`fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3 ${isRtl ? "text-right" : "text-left"}`}>
          {t("assets.chart.consumedQuantityPerAsset")}
        </h2>

        <div className="overflow-x-auto overflow-y-hidden pb-2" dir={isRtl ? "rtl" : "ltr"}>
          <div className="flex min-w-full justify-center">
            <div
              className="mx-auto shrink-0"
              style={{ width: `${assetConsumptionChartWidth}px`, minWidth: "700px", height: "340px" }}
            >
              <ChartFrame height={260}>
                <BarChart
                  data={assetConsumptionChartData}
                  margin={{ top: 10, right: isRtl ? 24 : 12, left: isRtl ? 12 : 24, bottom: 5 }}
                >
                  <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={16} />
                  <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
                  <Tooltip wrapperStyle={{ direction: isRtl ? "rtl" : "ltr", textAlign: isRtl ? "right" : "left" }} />
                  <Bar dataKey="qtyLiters" fill="#86efac" name={t("assets.chart.qtyLiters")} />
                </BarChart>
              </ChartFrame>
            </div>
          </div>
        </div>
      </div>

      {assetStatusConfirm && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[20000] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">{t("assetWorkflows.status.title")}</h2>
              <button
                onClick={() => setAssetStatusConfirm(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5">
              <p className="text-sm text-slate-400">{t("assets.fields.assetId")}</p>
              <p className="text-base sm:text-lg font-bold">{assetStatusConfirm.asset?.id}</p>
              <p className="text-sm text-slate-300 mt-2">
                {getAssetStatusLabel(assetStatusConfirm.oldStatus)} → <span className="font-bold">{getAssetStatusLabel(assetStatusConfirm.newStatus)}</span>
              </p>
            </div>

            <p className="text-sm text-slate-400 mb-5">
              {t("assetWorkflows.status.directSaveNotice")}
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
              <button
                onClick={() => setAssetStatusConfirm(null)}
                className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={confirmAssetStatusChange}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold"
              >
                {t("assetWorkflows.status.save")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showForm && (
        <GenericModal
          title={t("assets.add.title")}
          closeForm={closeAddAsset}
          saveText={t("assets.add.save")}
          onSave={saveNewAsset}
          saveDisabled={
            Boolean(assetIdDuplicateError) ||
            !newAsset.id.trim() ||
            !newAsset.project ||
            !newAsset.type.trim() ||
            !newAsset.category.trim()
          }
        >
          <Field
            label={t("assets.fields.assetId")}
            placeholder="1-316"
            value={newAsset.id}
            onChange={(e) => {
              setAssetIdBackendError("");
              setNewAsset({ ...newAsset, id: e.target.value });
            }}
            error={assetIdDuplicateError}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-slate-300">{t("assets.fields.project")}</label>
            <select
              value={newAsset.project}
              onChange={(e) => setNewAsset({ ...newAsset, project: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
            >
              <option value="">{t("assets.placeholders.selectProject")}</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-slate-300">{t("assets.fields.assetType")}</label>
            <div className="col-span-2 space-y-2">
              <select
                value={useCustomAssetType ? "__add_new__" : newAsset.type}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === "__add_new__") {
                    setUseCustomAssetType(true);
                    setCustomAssetType("");
                    setNewAsset({ ...newAsset, type: "" });
                    return;
                  }

                  setUseCustomAssetType(false);
                  setCustomAssetType("");
                  setNewAsset({ ...newAsset, type: value });
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
              >
                <option value="">{t("assets.placeholders.selectAssetType")}</option>
                {assetTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value="__add_new__">＋ {t("assets.add.addNewAssetType")}</option>
              </select>

              {useCustomAssetType && (
                <input
                  value={customAssetType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomAssetType(value);
                    setNewAsset({ ...newAsset, type: value });
                  }}
                  placeholder={t("assets.placeholders.newAssetType")}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-slate-300">{t("assets.fields.category")}</label>
            <div className="col-span-2 space-y-2">
              <select
                value={useCustomCategory ? "__add_new__" : newAsset.category}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === "__add_new__") {
                    setUseCustomCategory(true);
                    setCustomCategory("");
                    setNewAsset({ ...newAsset, category: "" });
                    return;
                  }

                  setUseCustomCategory(false);
                  setCustomCategory("");
                  setNewAsset({ ...newAsset, category: value });
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
              >
                <option value="">{t("assets.placeholders.selectCategory")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__add_new__">＋ {t("assets.add.addNewCategory")}</option>
              </select>

              {useCustomCategory && (
                <input
                  value={customCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomCategory(value);
                    setNewAsset({ ...newAsset, category: value });
                  }}
                  placeholder={t("assets.placeholders.newCategory")}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                />
              )}
            </div>
          </div>
          <Field
            label={t("assets.fields.currentOdometer")}
            placeholder={t("assets.placeholders.currentReading")}
            type="number"
            value={newAsset.odometer}
            onChange={(e) => setNewAsset({ ...newAsset, odometer: e.target.value })}
          />
          <Field
            label={t("assets.fields.fuelTankCapacity")}
            placeholder={t("assets.placeholders.liters")}
            type="number"
            value={newAsset.fuelTank}
            onChange={(e) => setNewAsset({ ...newAsset, fuelTank: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-slate-300">{t("assets.fields.status")}</label>
            <select
              value={newAsset.status}
              onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none focus:border-amber-400"
            >
              <option value="Active">{t("assets.status.active")}</option>
              <option value="Inactive">{t("assets.status.inactive")}</option>
            </select>
          </div>
        </GenericModal>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`bg-gray-800 text-white w-[560px] rounded-3xl shadow-2xl border border-gray-700 p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold text-blue-200">
                    {selectedAsset.id}
                  </h2>

                  <button
                    onClick={() => setDeleteTargetAsset(selectedAsset)}
                    className="text-gray-400 hover:text-red-400 transition text-lg cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>

                <p className="text-gray-400 mt-1">{t("assets.details.title")}</p>
              </div>

              <button
                onClick={() => setSelectedAsset(null)}
                className="text-gray-400 hover:text-red-400 text-2xl transition"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs text-gray-400">{t("assets.fields.project")}</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedAsset.project || "-"}
                  </p>
                </div>

                {renderAssetStatusBadge(selectedAsset.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                <div>
                  <p className="text-xs text-gray-400">{t("assets.fields.assetType")}</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.type || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">{t("assets.fields.category")}</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.category || "-"}
                  </p>
                </div>

                <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/35 px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs text-gray-400">{t("assets.fields.currentOdometer")}</p>

                      <button
                        onClick={() => {
                          setOdometerTargetAsset(selectedAsset);
                          setOldOdometerBeforeReset(String(getEffectiveAssetOdometer(selectedAsset) ?? 0));
                          setNewOdometer("0");
                          setOdometerEffectiveDate("");
                          setOdometerReason("");
                        }}
                        className="text-gray-400 hover:text-yellow-400 transition text-sm cursor-pointer"
                      >
                        ✏️
                      </button>
                    </div>

                    <p className="mt-1 text-lg font-semibold text-yellow-300">
                      {formatNumber(getEffectiveAssetOdometer(selectedAsset))}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/35 px-3 py-3 text-center">
                    <p className="text-xs text-gray-400">{t("assets.details.lifetimeOdometer")}</p>
                    <p className="mt-1 text-lg font-semibold text-yellow-300">
                      {formatNumber(selectedAsset.currentLifetimeOdometer ?? 0)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/35 px-3 py-3 text-center">
                    <p className="text-xs text-gray-400">{t("assets.fields.fuelTankCapacity")}</p>
                    <p className="mt-1 text-lg font-semibold text-yellow-300">
                      {formatNumber(selectedAsset.fuelTank)} L
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                onClick={() => setSelectedAsset(null)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-900 text-white px-6 py-2 rounded-xl text-sm shadow-[0_3px_0_#111827] active:shadow-none active:translate-y-[3px] transition"
              >
                {t("assets.actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkTransferModalOpen && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
            <div className={`fleet-portal-modal-panel bg-white text-black w-[min(680px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {t("assetWorkflows.bulk.title")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("assetWorkflows.bulk.selectedCount", { count: selectedAssets.length })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeBulkTransferModal}
                  disabled={savingBulkTransfer}
                  className="text-2xl text-gray-500 hover:text-black disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {t("assetWorkflows.bulk.selectedAssets")}
                </label>

                <div className="max-h-44 overflow-y-auto rounded-lg border bg-gray-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedAssets.map((asset) => (
                      <div
                        key={getAssetSelectionKey(asset)}
                        className="rounded-md border bg-white px-3 py-2 text-sm"
                      >
                        <div className="font-bold text-gray-900">{asset.id}</div>
                        <div className="text-xs text-gray-500">
                          {t("assetWorkflows.bulk.currentProject")}:{" "}{asset.project || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {t("assetWorkflows.bulk.destinationProject")}
                </label>
                <select
                  value={bulkTransferProjectValue}
                  onChange={(e) => setBulkTransferProjectValue(e.target.value)}
                  disabled={savingBulkTransfer}
                  dir={isRtl ? "rtl" : "ltr"} className={`w-full rounded-lg border p-2.5 ${isRtl ? "text-right" : "text-left"}`}
                >
                  <option value="">{t("assets.placeholders.selectProject")}</option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-600">
                {t("assetWorkflows.bulk.approvalNotice")}
              </p>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeBulkTransferModal}
                  disabled={savingBulkTransfer}
                  className="rounded-lg bg-gray-200 px-4 py-2 font-semibold disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>

                <button
                  type="button"
                  onClick={confirmBulkAssetTransfer}
                  disabled={savingBulkTransfer}
                  className="rounded-lg bg-amber-500 px-4 py-2 font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBulkTransfer ? t("assetWorkflows.bulk.submitting") : t("assetWorkflows.bulk.submit")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {projectTargetAsset && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 z-[10050] bg-black/60 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`bg-white text-black w-[520px] rounded-xl shadow-xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl font-bold mb-4">{t("assetWorkflows.transfer.title")}</h2>

            <p className="text-sm text-gray-500 mb-4">
              {t("assetWorkflows.labels.asset")}:{" "}<strong>{projectTargetAsset?.id || "-"}</strong>
            </p>

            <select
              value={selectedProjectValue}
              onChange={(e) => setSelectedProjectValue(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"} className={`border rounded-lg p-2 w-full mb-6 ${isRtl ? "text-right" : "text-left"}`}
            >
              <option value="">{t("assets.placeholders.selectProject")}</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <p className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-600">
              {t("assetWorkflows.transfer.approvalNotice")}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setProjectTargetAsset(null);
                  setSelectedProjectValue("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedProjectConfirm}
                className="bg-gray-800 text-white px-4 py-2 rounded"
              >
                {t("assetWorkflows.actions.continue")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showProjectConfirm && projectTargetAsset && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 z-[10100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`bg-white text-black w-[520px] rounded-xl shadow-xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl font-bold mb-4 text-red-600">
              {t("assetWorkflows.transfer.confirmTitle")}
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>{t("assetWorkflows.labels.asset")}:</strong> {projectTargetAsset?.id || "-"}
              </p>
              <p>
                <strong>{t("assetWorkflows.transfer.oldProject")}:</strong> {projectTargetAsset?.project || "-"}
              </p>
              <p>
                <strong>{t("assetWorkflows.transfer.newProject")}:</strong> {selectedProjectValue}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowProjectConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedProjectPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                {t("assetWorkflows.actions.yesContinue")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {deleteTargetAsset && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[20000] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 p-6 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-red-600">
              {t("assetWorkflows.delete.title")}
            </h2>

            <p className="text-slate-400 mb-5">
              {t("assetWorkflows.labels.asset")}:{" "}<strong>{deleteTargetAsset.id}</strong>
            </p>

            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={t("assetWorkflows.delete.reasonPlaceholder")}
              dir={isRtl ? "rtl" : "ltr"} className={`border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 rounded-xl p-3 w-full h-28 mb-5 outline-none focus:border-amber-500 ${isRtl ? "text-right" : "text-left"}`}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetAsset(null);
                  setDeleteReason("");
                }}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 lg:px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedDeleteConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("assetWorkflows.actions.continue")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showDeleteConfirm && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[20010] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`w-[min(500px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 p-6 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl font-bold mb-4">
              {t("assetWorkflows.delete.confirmTitle")}
            </h2>

            <p className="mb-6">
              {currentUser?.role === "Admin" || currentUser?.role === "PlatformAdmin"
                ? t("assetWorkflows.delete.directQuestion", { id: deleteTargetAsset?.id })
                : t("assetWorkflows.delete.requestQuestion", { id: deleteTargetAsset?.id })}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 lg:px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedDeletePassword}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("assetWorkflows.actions.yesContinue")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}


      {odometerTargetAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-yellow-600">
              {t("assetWorkflows.odometer.title")}
            </h2>

            <p className="text-gray-600 mb-5">
              {t("assetWorkflows.labels.asset")}:{" "}<strong>{odometerTargetAsset.id}</strong>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("assetWorkflows.odometer.oldReading")}
            </label>
            <input
              type="number"
              min="0"
              value={oldOdometerBeforeReset}
              onChange={(e) => setOldOdometerBeforeReset(e.target.value)}
              title={t("assetWorkflows.odometer.oldReadingHelp")}
              placeholder={t("assetWorkflows.odometer.oldReadingPlaceholder")}
              className="border rounded-xl p-3 w-full mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("assetWorkflows.odometer.newReading")}
            </label>
            <input
              type="number"
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              placeholder={t("assetWorkflows.odometer.newReadingPlaceholder")}
              className="border rounded-xl p-3 w-full mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("assetWorkflows.odometer.effectiveDate")}
            </label>
            <input
              type="date"
              value={odometerEffectiveDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setOdometerEffectiveDate(e.target.value)}
              className="border rounded-xl p-3 w-full mb-4"
            />

            <textarea
              value={odometerReason}
              onChange={(e) => setOdometerReason(e.target.value)}
              placeholder={t("assetWorkflows.odometer.reasonPlaceholder")}
              dir={isRtl ? "rtl" : "ltr"} className={`border rounded-xl p-3 w-full h-28 mb-5 ${isRtl ? "text-right" : "text-left"}`}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOdometerTargetAsset(null);
                  setOldOdometerBeforeReset("");
                  setNewOdometer("");
                  setOdometerEffectiveDate("");
                  setOdometerReason("");
                }}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedOdometerConfirm}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("assetWorkflows.actions.continue")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3" dir={isRtl ? "rtl" : "ltr"}>
          <div className={`bg-white text-black w-[500px] rounded-2xl p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-xl font-bold mb-4">
              Confirm {t("assetWorkflows.odometer.title")}
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-6 space-y-1">
              <p>
                <strong>{t("assetWorkflows.labels.asset")}:</strong> {odometerTargetAsset?.id}
              </p>
              <p>
                <strong>{t("assetWorkflows.odometer.oldReading")}:</strong> {formatNumber(oldOdometerBeforeReset)}
              </p>
              <p>
                <strong>{t("assetWorkflows.odometer.newReading")}:</strong> {formatNumber(newOdometer)}
              </p>
              <p>
                <strong>{t("assetWorkflows.odometer.effectiveDate")}:</strong> {odometerEffectiveDate}
              </p>
              <p>
                <strong>{t("assetWorkflows.odometer.actualReading")}:</strong> {formatNumber(Number(newOdometer) || 0)}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("common.cancel")}
              </button>

              <button
                onClick={proceedOdometerPassword}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                {t("assetWorkflows.actions.yesContinue")}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
