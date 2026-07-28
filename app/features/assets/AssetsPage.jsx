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
  return (
    <ModalPortal>
      <div className="fleet-portal-modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div className="fleet-portal-modal-panel bg-white text-black w-[min(650px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
            <button
              onClick={closeForm}
              className="text-gray-500 hover:text-black text-xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">{children}</div>

          <div className="flex justify-end gap-3 mt-6 border-t pt-4">
            <button
              onClick={closeForm}
              className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saveDisabled}
              className={`px-3 lg:px-4 py-2 rounded-lg ${
                saveDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
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
  runWithActionLoading = async (_label, actionFn) => actionFn(),
}) {


  
  const getLatestAssetResetRecord = (assetId, companyId = "") => {
    return (assetOdometerHistory || [])
      .filter((item) => {
        const sameAsset = isSameText(item.assetId || item.entityId, assetId);
        const sameCompany = !companyId || !item.companyId || companyMatches(item.companyId, companyId);
        return sameAsset && sameCompany;
      })
      .sort((a, b) => {
        const da = new Date(a.effectiveFrom || a.createdAt).getTime() || 0;
        const db = new Date(b.effectiveFrom || b.createdAt).getTime() || 0;
        return db - da;
      })[0];
  };

  const getEffectiveAssetOdometer = (asset) => {
    const latestReset = getLatestAssetResetRecord(asset.id, asset.companyId || currentUser?.companyId || "");
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


  const [selectedAsset, setSelectedAsset] = useState(null);

  const [localAssetUpdates, setLocalAssetUpdates] = useState({});
  const [assetStatusConfirm, setAssetStatusConfirm] = useState(null);

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

  const assetIdDuplicateError = getDuplicateIdError(
    newAsset.id,
    assets,
    "Asset ID"
  );

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
  };

  const closeAddAsset = () => {
    setShowForm(false);
    resetNewAsset();
  };

  const saveNewAsset = async () => {
    if (!hasPermission("assets", "add")) {
      showToast?.("warning", "Read-only access: you cannot add assets.");
      return;
    }

    if (!newAsset.id.trim()) {
      showToast?.("warning", "Please enter Asset ID.");
      return;
    }

    if (assetIdDuplicateError) {
      showToast?.("warning", assetIdDuplicateError);
      return;
    }

    if (!newAsset.project) {
      showToast?.("warning", "Please select project.");
      return;
    }

    if (!newAsset.type.trim()) {
      showToast?.("warning", "Please select or add Asset Type.");
      return;
    }

    if (!newAsset.category.trim()) {
      showToast?.("warning", "Please select or add Category.");
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
      showToast?.("warning", "Cannot create asset without a valid company.");
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
      trackActivity?.("Add Asset", "assets", `${payload.assetId} added from backend.`);
      showToast?.("success", "Asset added successfully.");
      closeAddAsset();
    } catch (error) {
      showToast?.(
        "warning",
        error?.response?.data?.message || error?.message || "Failed to add asset."
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

  const visibleSelectableAssetIds = filteredAssets
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
      showToast?.("warning", "Only Officer or Manager can request asset transfer.");
      return;
    }

    if (!selectedAssets.length) {
      showToast?.("warning", "Please select at least one asset.");
      return;
    }

    const invalidAsset = selectedAssets.find(
      (asset) => asset.status?.trim().toLowerCase() !== "active"
    );

    if (invalidAsset) {
      showToast?.("warning", "Only active assets can be transferred.");
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
      showToast?.("warning", "Please select destination project.");
      return;
    }

    const toProjectId = resolveProjectId(bulkTransferProjectValue);
    const backendAssetIds = selectedAssets
      .map(getBackendAssetId)
      .filter(Boolean);

    if (!toProjectId) {
      showToast?.("warning", "Please select a valid project.");
      return;
    }

    if (!backendAssetIds.length) {
      showToast?.("warning", "Selected assets are not linked to backend.");
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
        `${backendAssetIds.length} assets transfer requested to ${bulkTransferProjectValue}.`
      );

      showToast?.(
        "success",
        `Bulk transfer request submitted for ${backendAssetIds.length} asset(s).`
      );

      clearAssetSelection();
      closeBulkTransferModal();
    } catch (error) {
      showToast?.(
        "warning",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit bulk asset transfer request."
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
      showToast?.("warning", "Read-only access: you cannot change asset status.");
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
      showToast?.("success", `Asset status changed to ${newStatus}.`);
      setAssetStatusConfirm(null);
      return;
    }

    try {
      const updatedAsset = await updateAssetRecord(backendAssetId, {
        status: mapFrontendAssetStatusForBackend(newStatus),
      });

      replaceAssetInState(updatedAsset);
      trackActivity?.("Change Asset Status", "assets", `${asset.id} status changed to ${newStatus}.`);
      showToast?.("success", `Asset status changed to ${newStatus}.`);
    } catch (error) {
      showToast?.(
        "warning",
        error?.response?.data?.message || error?.message || "Failed to change asset status."
      );
    } finally {
      setAssetStatusConfirm(null);
    }
  };

  const canCurrentUserCreateAssetTransfer = () =>
    currentUser?.status === "Active" && ["Officer", "Manager"].includes(currentUser?.role);

  const openProjectChange = (asset) => {
    if (!canCurrentUserCreateAssetTransfer()) {
      showToast?.("warning", "Only Officer or Manager can request asset transfer.");
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
        ? showToast("warning", "Please select a project.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select a project."), "Please select a project.");
      return;
    }

    setShowProjectConfirm(true);
  };

  const proceedProjectPassword = () => {
    setShowProjectConfirm(false);
    confirmProjectUpdate();
  };

  const confirmProjectUpdate = async () => {
    if (!canCurrentUserCreateAssetTransfer()) {
      showToast?.("warning", "Only Officer or Manager can request asset transfer.");
      resetProjectWorkflow();
      return;
    }

    const backendAssetId = getBackendAssetId(projectTargetAsset);
    const toProjectId = resolveProjectId(selectedProjectValue);

    if (!backendAssetId) {
      showToast?.("warning", "This asset is not linked to backend yet.");
      resetProjectWorkflow();
      return;
    }

    if (!toProjectId) {
      showToast?.("warning", "Please select a valid project.");
      return;
    }

    try {
      const createdTransfer = await createAssetTransfer(backendAssetId, {
        toProjectId,
        requestedByUserId: currentUser?.id || "",
      });

      onAssetTransferCreated?.(createdTransfer);

      showToast?.("warning", "Asset transfer request submitted for project manager approval.");
      trackActivity?.(
        "Request Asset Transfer",
        "assets",
        `${projectTargetAsset.id} transfer requested from ${projectTargetAsset.project || "-"} to ${selectedProjectValue}.`
      );
      resetProjectWorkflow();
    } catch (error) {
      showToast?.(
        "warning",
        error?.response?.data?.message || error?.message || "Failed to submit asset transfer request."
      );
    }
  };

  const proceedDeleteConfirm = () => {
    if (!deleteReason) {
      showToast
        ? showToast("warning", "Please enter deletion reason.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter deletion reason."), "Please enter deletion reason.");
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
      showToast?.("warning", "This asset is not linked to backend yet.");
      return;
    }

    // Admin / PlatformAdmin delete directly from the Assets page.
    // Officer submits an Admin approval request.
    // Asset transfer remains a separate approval workflow regardless of role.
    if (canDeleteDirectly) {
      try {
        const deletedAsset = await runWithActionLoading(
          "Deleting asset...",
          async () => deleteAssetRecord(backendAssetId)
        );

        // Keep the soft-deleted record in state as Retired so the KPI updates
        // immediately, while visibleAssets continues to hide it from the list.
        replaceAssetInState({
          ...deletedAsset,
          deletedAt: deletedAsset?.deletedAt || new Date().toISOString(),
          status: "Retired",
        });

        // Close every UI layer related to the deleted asset immediately.
        setShowDeleteConfirm(false);
        setDeleteTargetAsset(null);
        setSelectedAsset(null);
        setDeleteReason("");

        showToast?.("success", "Asset deleted successfully.");
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message || error?.message || "Failed to delete asset."
        );
      }
      return;
    }

    if (!isOfficerUser(currentUser)) {
      showToast?.("warning", "Only Admin can delete directly. Officer can submit a delete request.");
      setShowDeleteConfirm(false);
      return;
    }

    await runWithActionLoading("Submitting delete request...", async () => {
      submitApprovalRequest({
        type: "master_data_change",
        module: "assets",
        title: `Asset ${deleteTargetAsset?.id} deletion request`,
        details: deleteReason,
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
              label: "Soft Delete Request",
              oldValue: deleteTargetAsset?.id || "-",
              newValue: "Requested Deletion",
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
          "Asset deletion request submitted for Admin approval."
        )
      : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Asset deletion request submitted for Admin approval."), "Asset deletion request submitted for Admin approval.");
  };

  const proceedOdometerConfirm = () => {
    const oldReading = Number(oldOdometerBeforeReset);
    const newReading = Number(newOdometer);

    if (oldOdometerBeforeReset === "" || Number.isNaN(oldReading) || oldReading < 0) {
      showToast
        ? showToast("warning", "Please enter valid old odometer before reset.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter valid old odometer before reset."), "Please enter valid old odometer before reset.");
      return;
    }

    if (newOdometer === "" || Number.isNaN(newReading) || newReading < 0) {
      showToast
        ? showToast("warning", "Please enter valid new odometer after reset.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter valid new odometer after reset."), "Please enter valid new odometer after reset.");
      return;
    }

    if (!odometerEffectiveDate) {
      showToast
        ? showToast("warning", "Please select odometer reset effective date.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select odometer reset effective date."), "Please select odometer reset effective date.");
      return;
    }

    if (!odometerReason) {
      showToast
        ? showToast("warning", "Please enter reset reason.")
        : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter reset reason."), "Please enter reset reason.");
      return;
    }

    setShowOdometerConfirm(true);
  };

  const proceedOdometerPassword = () => {
    setShowOdometerConfirm(false);
    confirmOdometerRequest();
  };

// Odometer Reset Rules:
// Officer -> Request to Project Manager
// Manager/Admin -> Direct execute after confirmation


  const confirmOdometerRequest = async () => {
    const currentRole = String(currentUser?.role || "").trim();
    const canResetDirectly = ["Admin", "Manager", "PlatformAdmin"].includes(currentRole);
    const canSubmitOdometerRequest = isOfficerUser(currentUser) || canResetDirectly;

    // Odometer Reset business rule:
    // Officer -> approval request to Project Manager.
    // Manager/Admin/PlatformAdmin -> direct execution after confirmation.
    if (!canSubmitOdometerRequest) {
      showToast?.("warning", "Read-only access: you cannot request odometer reset.");
      return;
    }

    const backendAssetId = getBackendAssetId(odometerTargetAsset);
    if (!backendAssetId) {
      showToast?.("warning", "This asset is not linked to backend yet.");
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
        const resetResult = await runWithActionLoading("Resetting odometer...", async () =>
          resetAssetOdometer(backendAssetId, {
            newOdometer: newReading,
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


        showToast?.("success", "Odometer reset completed successfully.");
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message || error?.message || "Failed to reset odometer."
        );
      }

      return;
    }

    // Officer request only. No backend reset is executed here.
    if (setAssetOdometerHistory) {
      setAssetOdometerHistory((prev) => [...(prev || []), odometerHistoryRecord]);
    }

    await runWithActionLoading("Submitting odometer reset request...", async () => {
      submitApprovalRequest({
        type: "master_data_change",
        module: "assets",
        title: `Asset ${odometerTargetAsset?.id} odometer reset`,
        details: odometerReason,
        payload: {
          entity: "asset",
          action: "odometer_reset",
          id: odometerTargetAsset?.id,
          backendAssetId,
          approvalRouteStrategy: "project_manager",
          project: odometerTargetAsset?.project || odometerTargetAsset?.projectId || "",
          values: odometerHistoryRecord,
          changedFields: [
            {
              field: "currentOdometer",
              label: "Odometer Reset",
              oldValue: oldReading,
              newValue: newReading,
              sensitive: true,
            },
          ],
        },
      });
    });

    closeOdometerResetUi();

    showToast
      ? showToast(
          "success",
          "Odometer reset request submitted for project manager approval."
        )
      : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Odometer reset request submitted for project manager approval."), "Odometer reset request submitted for project manager approval.");
  };

  const exportAssetsToCSV = () => {
  const csvHeaders = [
    "Asset ID",
    "Project",
    "Asset Type",
    "Category",
    "Current Odometer",
    "Fuel Tank Capacity",
    "Status",
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
    ? showToast("success", "Assets data exported successfully.")
    : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Assets data exported successfully."), "Assets data exported successfully.");
};

  const exportAssetsToPDF = () => {
  showToast
    ? showToast("warning", "PDF export will be added in the next step.")
    : notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("PDF export will be added in the next step."), "PDF export will be added in the next step.");
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
  const reportDate = new Date().toLocaleString();

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
          <td>${escapePrintValue(asset.status)}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "", "width=1400,height=900");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Assets Report</title>
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
        <h1>Assets Report</h1>
        <div class="meta">
          Generated at: ${reportDate} | Total Assets: ${filteredAssets.length}
        </div>

        <h2>Assets List</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Asset ID</th>
              <th>Project</th>
              <th>Asset Type</th>
              <th>Category</th>
              <th>Current Odometer</th>
              <th>Fuel Tank Capacity</th>
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
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex justify-between items-center mb-4 gap-4">
  <div>
    <h1 className="text-xl sm:text-2xl font-bold">Assets</h1>
    <p className="text-gray-400">Fleet master data</p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <input
      type="text"
      placeholder="Search by asset ID, type, project, status..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white w-[380px] focus:outline-none focus:border-yellow-400"
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
              Add Asset
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
            Print Assets Report
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center justify-between w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white border-t border-gray-700"
          >
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-blue-400 text-lg">⇩</span>
              Export
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
                Export CSV
              </button>

              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToPDF();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
        <Card title="Total Assets" value={visibleAssets.length} />
        <Card title="Active Assets" value={activeAssets.length} />
        <Card title="Inactive Assets" value={inactiveAssets.length} />
        <Card title="Retired Assets" value={retiredAssets.length} />
      </div>


      <div className="bg-gray-800 rounded-2xl shadow-xl overflow-visible mb-4 border border-slate-700/70">
        <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/70">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Assets List
            </h2>
            <p className="text-sm text-slate-400">Fleet operational assets</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedAssetIds.length > 0 && (
              <>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                  {selectedAssetIds.length} selected
                </span>

                <button
                  type="button"
                  onClick={clearAssetSelection}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:border-slate-400"
                >
                  Clear Selection
                </button>

                <button
                  type="button"
                  onClick={openBulkTransferModal}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400"
                >
                  Transfer Selected
                </button>
              </>
            )}

            <span className="text-sm text-slate-400">
              {filteredAssets.length} assets
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
                    aria-label="Select all visible assets"
                    className="h-4 w-4 accent-amber-500"
                  />
                </Th>
                <Th>#</Th>
                <Th>Asset ID</Th>
                <Th>Project</Th>
                <Th>Asset Type</Th>
                <Th>Category</Th>
                <Th>Current Odometer</Th>
                <Th>Fuel Tank Capacity</Th>
                <Th>Status</Th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset, i) => (
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
                      aria-label={`Select asset ${asset.id}`}
                      className="h-4 w-4 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </Td>

                  <Td>{i + 1}</Td>

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
                        <StatusBadge status={asset.status} />
                      </button>
                    ) : (
                      <StatusBadge status={asset.status} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
          Consumed Quantity Per Equipment No.
        </h2>

        <div className="overflow-x-auto overflow-y-hidden pb-2">
          <div style={{ width: `${assetConsumptionChartWidth}px`, height: "340px" }}>
            <ChartFrame height={260}>
              <BarChart data={assetConsumptionChartData}>
                <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={16} />
                <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
              </BarChart>
            </ChartFrame>
          </div>
        </div>
      </div>

      {assetStatusConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10020] p-3">
          <div className="bg-white text-black w-[min(520px,calc(100vw-2rem))] rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Confirm Asset Status Change</h2>
              <button
                onClick={() => setAssetStatusConfirm(null)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-600">Asset ID</p>
              <p className="text-base sm:text-lg font-bold">{assetStatusConfirm.asset?.id}</p>
              <p className="text-sm text-gray-600 mt-2">
                {assetStatusConfirm.oldStatus} → <span className="font-bold">{assetStatusConfirm.newStatus}</span>
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-5">
              This status change will be saved directly without reason or password.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
              <button
                onClick={() => setAssetStatusConfirm(null)}
                className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmAssetStatusChange}
                className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <GenericModal
          title="Add Asset"
          closeForm={closeAddAsset}
          saveText="Save Asset"
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
            label="Asset ID"
            placeholder="1-316"
            value={newAsset.id}
            onChange={(e) => setNewAsset({ ...newAsset, id: e.target.value })}
            error={assetIdDuplicateError}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700">Project</label>
            <select
              value={newAsset.project}
              onChange={(e) => setNewAsset({ ...newAsset, project: e.target.value })}
              className="col-span-2 border rounded-lg p-2"
            >
              <option value="">Select Project</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700">Asset Type</label>
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
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select Asset Type</option>
                {assetTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value="__add_new__">＋ Add new Asset Type</option>
              </select>

              {useCustomAssetType && (
                <input
                  value={customAssetType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomAssetType(value);
                    setNewAsset({ ...newAsset, type: value });
                  }}
                  placeholder="Enter new asset type"
                  className="w-full border rounded-lg p-2"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700">Category</label>
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
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__add_new__">＋ Add new Category</option>
              </select>

              {useCustomCategory && (
                <input
                  value={customCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomCategory(value);
                    setNewAsset({ ...newAsset, category: value });
                  }}
                  placeholder="Enter new category"
                  className="w-full border rounded-lg p-2"
                />
              )}
            </div>
          </div>
          <Field
            label="Current Odometer"
            placeholder="Current reading"
            type="number"
            value={newAsset.odometer}
            onChange={(e) => setNewAsset({ ...newAsset, odometer: e.target.value })}
          />
          <Field
            label="Fuel Tank Capacity"
            placeholder="Liters"
            type="number"
            value={newAsset.fuelTank}
            onChange={(e) => setNewAsset({ ...newAsset, fuelTank: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700">Status</label>
            <select
              value={newAsset.status}
              onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
              className="col-span-2 border rounded-lg p-2"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </GenericModal>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-gray-800 text-white w-[560px] rounded-3xl shadow-2xl border border-gray-700 p-6">
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

                <p className="text-gray-400 mt-1">Asset Details</p>
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
                  <p className="text-xs text-gray-400">Project</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedAsset.project || "-"}
                  </p>
                </div>

                <StatusBadge status={selectedAsset.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                <div>
                  <p className="text-xs text-gray-400">Asset Type</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.type || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.category || "-"}
                  </p>
                </div>

                <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/35 px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs text-gray-400">Current Odometer</p>

                      <button
                        onClick={() => {
                          setOdometerTargetAsset(selectedAsset);
                          setOldOdometerBeforeReset(String(getEffectiveAssetOdometer(selectedAsset) || ""));
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
                    <p className="text-xs text-gray-400">Lifetime Odometer</p>
                    <p className="mt-1 text-lg font-semibold text-yellow-300">
                      {formatNumber(selectedAsset.currentLifetimeOdometer ?? 0)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/35 px-3 py-3 text-center">
                    <p className="text-xs text-gray-400">Fuel Tank Capacity</p>
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkTransferModalOpen && (
        <ModalPortal>
          <div className="fleet-portal-modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4">
            <div className="fleet-portal-modal-panel bg-white text-black w-[min(680px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Transfer Selected Assets
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedAssets.length} asset(s) selected
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
                  Selected Assets
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
                          Current project: {asset.project || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Destination Project
                </label>
                <select
                  value={bulkTransferProjectValue}
                  onChange={(e) => setBulkTransferProjectValue(e.target.value)}
                  disabled={savingBulkTransfer}
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="">Select Project</option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-600">
                One bulk submission will create the required approval workflow
                for every selected asset. The transfer takes effect when the
                final required approval is completed.
              </p>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeBulkTransferModal}
                  disabled={savingBulkTransfer}
                  className="rounded-lg bg-gray-200 px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmBulkAssetTransfer}
                  disabled={savingBulkTransfer}
                  className="rounded-lg bg-amber-500 px-4 py-2 font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBulkTransfer ? "Submitting..." : "Submit Bulk Transfer"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {projectTargetAsset && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">Change Project</h2>

            <p className="text-sm text-gray-500 mb-4">
              Asset: <strong>{projectTargetAsset.id}</strong>
            </p>

            <select
              value={selectedProjectValue}
              onChange={(e) => setSelectedProjectValue(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
            >
              <option value="">Select Project</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <p className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-600">
              The asset will move to the destination project when the final
              required approval is completed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setProjectTargetAsset(null);
                  setSelectedProjectValue("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectConfirm}
                className="bg-gray-800 text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectConfirm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirm Project Change
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>Asset:</strong> {projectTargetAsset.id}
              </p>
              <p>
                <strong>Old Project:</strong> {projectTargetAsset.project || "-"}
              </p>
              <p>
                <strong>New Project:</strong> {selectedProjectValue}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowProjectConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}


      {deleteTargetAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-red-600">
              Delete Asset
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{deleteTargetAsset.id}</strong>
            </p>

            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter deletion reason..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetAsset(null);
                  setDeleteReason("");
                }}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeleteConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Asset Deletion
            </h2>

            <p className="mb-6">
              {currentUser?.role === "Admin" || currentUser?.role === "PlatformAdmin"
                ? "Are you sure you want to delete asset:"
                : "Are you sure you want to submit deletion request for:"}
              <strong> {deleteTargetAsset?.id}</strong> ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeletePassword}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}


      {odometerTargetAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-yellow-600">
              Odometer Reset
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{odometerTargetAsset.id}</strong>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Odometer Before Reset
            </label>
            <input
              type="number"
              value={oldOdometerBeforeReset}
              readOnly
              aria-readonly="true"
              title="Old odometer is captured from the current asset reading and cannot be edited here."
              placeholder="Reading before computer / meter replacement"
              className="border rounded-xl p-3 w-full mb-4 bg-gray-100 text-gray-700 cursor-not-allowed"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Odometer After Reset
            </label>
            <input
              type="number"
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              placeholder="Usually 0 after reset"
              className="border rounded-xl p-3 w-full mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Effective Date
            </label>
            <input
              type="date"
              value={odometerEffectiveDate}
              onChange={(e) => setOdometerEffectiveDate(e.target.value)}
              className="border rounded-xl p-3 w-full mb-4"
            />

            <textarea
              value={odometerReason}
              onChange={(e) => setOdometerReason(e.target.value)}
              placeholder="Enter reset reason, e.g. computer / meter replaced..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
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
                Cancel
              </button>

              <button
                onClick={proceedOdometerConfirm}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Odometer Reset
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-6 space-y-1">
              <p>
                <strong>Asset:</strong> {odometerTargetAsset?.id}
              </p>
              <p>
                <strong>Old Odometer Before Reset:</strong> {formatNumber(oldOdometerBeforeReset)}
              </p>
              <p>
                <strong>New Odometer After Reset:</strong> {formatNumber(newOdometer)}
              </p>
              <p>
                <strong>Effective Date:</strong> {odometerEffectiveDate}
              </p>
              <p>
                <strong>Actual Odometer After Reset:</strong> {formatNumber(Number(newOdometer) || 0)}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedOdometerPassword}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
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
