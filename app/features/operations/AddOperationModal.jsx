"use client";

import React, {  useEffect, useMemo, useRef, useState } from "react";

import Field from "../../components/forms/Field";

import {
  formatNumber,
  isSameText,
  normalizeScopeValue,
} from "../../lib/helpers";

import {
  getAllowedTransactionTypesForUser,
  isAssetRefuelTransactionType,
  isExternalDirectRefuelTransactionType,
  isExternalSupplyTransactionType,
  isExternalTransferTransactionType,
  isExternalSourceOperation,
  isStationCounterTransactionType,
} from "../../lib/operationHelpers";

import { uploadOperationPhotoFile } from "../../services/operationsService";
import { useLanguage } from "../../context/LanguageContext";

const NETWORK_OFFLINE_MESSAGE =
  "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE =
  "Connection to server is unavailable. Please try again.";

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

function isProjectAllowedForUser(user, projectValue, projects = []) {
  if (userCanAccessAllProjects(user)) return true;

  const scope = getUserProjectScope(user);
  if (!scope.length || !projectValue) return false;

  const normalizedScope = scope.map(normalizeScopeValue);
  const normalizedProjectValue = normalizeScopeValue(projectValue);

  if (normalizedScope.includes(normalizedProjectValue)) return true;

  const matchedProject = projects.find((project) => {
    const projectId = normalizeScopeValue(project.id);
    const projectName = normalizeScopeValue(project.name);

    return (
      projectId === normalizedProjectValue ||
      projectName === normalizedProjectValue
    );
  });

  if (!matchedProject) return false;

  return (
    normalizedScope.includes(normalizeScopeValue(matchedProject.id)) ||
    normalizedScope.includes(normalizeScopeValue(matchedProject.name))
  );
}


export default function AddOperationModal({
  closeForm,
  fuelers,
  stations,
  allStations = [],
  assets = [],
  projects = [],
  currentUser,
  activeProjectScopeLabel = "",
  activeProjectScopeValues = [],
  activeProjectId = "",
  transactionType,
  setTransactionType,
  stationMeterPhoto,
  setStationMeterPhoto,
  assetPhoto,
  setAssetPhoto,
  assetMeterPhoto,
  setAssetMeterPhoto,
  invoicePhoto,
  setInvoicePhoto,
  getLastOdometerForEquipment,
  getLastStationCounter,
  externalStationHistory = [],
  externalSupplierHistory = [],
  onSaveOperation,
  showToast,
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const [sourceStation, setSourceStation] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [dieselQuantity, setDieselQuantity] = useState("");
  const [odometer, setOdometer] = useState("");
  const [externalStationName, setExternalStationName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [externalInvoiceAmount, setExternalInvoiceAmount] = useState("");
  const [operationNotes, setOperationNotes] = useState("");
  const uploadDraftOperationNoRef = useRef(`DRAFT-${Date.now()}`);

  const [transactionTypeSearch, setTransactionTypeSearch] = useState("");
  const [sourceStationSearch, setSourceStationSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  const userProjectScope = getUserProjectScope(currentUser);
  const isAllProjectsUser = userCanAccessAllProjects(currentUser);

  const normalizedActiveProjectScopeValues = useMemo(
    () =>
      (activeProjectScopeValues || [])
        .filter(Boolean)
        .map(normalizeScopeValue),
    [activeProjectScopeValues]
  );

  const userProjectDisplayName = useMemo(() => {
    if (activeProjectScopeLabel) {
      return activeProjectScopeLabel;
    }

    if (isAllProjectsUser) return t("addOperation.allProjects");

    const linkedProjectName =
      currentUser?.linkedEmployee?.projectName ||
      currentUser?.teamProject ||
      "";

    if (
      linkedProjectName &&
      normalizeScopeValue(linkedProjectName) !==
        normalizeScopeValue("Platform Console")
    ) {
      return linkedProjectName;
    }

    const normalizedScope = userProjectScope.map(normalizeScopeValue);

    const matchedProject = projects.find((project) => {
      const projectValues = [
        project?.id,
        project?.backendId,
        project?.name,
        project?.code,
        project?.projectCode,
      ]
        .filter(Boolean)
        .map(normalizeScopeValue);

      return projectValues.some((value) => normalizedScope.includes(value));
    });

    return (
      matchedProject?.name ||
      matchedProject?.code ||
      userProjectScope[0] ||
      "-"
    );
  }, [
    activeProjectScopeLabel,
    currentUser,
    isAllProjectsUser,
    projects,
    userProjectScope,
  ]);

  const isItemInUserProject = (projectValue, item = null) => {
    if (normalizedActiveProjectScopeValues.includes("all")) return true;

    if (normalizedActiveProjectScopeValues.length) {
      const itemProjectValues = [
        projectValue,
        item?.projectId,
        item?.projectName,
        item?.projectCode,
        item?.project?.id,
        item?.project?.backendId,
        item?.project?.name,
        item?.project?.code,
      ]
        .filter(Boolean)
        .map(normalizeScopeValue);

      return itemProjectValues.some((value) =>
        normalizedActiveProjectScopeValues.includes(value)
      );
    }

    return (
      isAllProjectsUser ||
      isProjectAllowedForUser(currentUser, projectValue, projects)
    );
  };

  const allowedTransactionTypes = getAllowedTransactionTypesForUser(currentUser);
  const transactionTypesForAdd = allowedTransactionTypes;

  const isAssetRefuel = isAssetRefuelTransactionType(transactionType);
  const isExternalDirectRefuel = isExternalDirectRefuelTransactionType(transactionType);
  const isExternalSupply = isExternalSupplyTransactionType(transactionType);
  const isExternalTransfer = isExternalTransferTransactionType(transactionType);
  const isInternalTransfer = isSameText(transactionType, "Internal_Transfer");
  const isDirectRefuel = isSameText(transactionType, "Direct_Refuel");
  const isExternalSource = isExternalSourceOperation(transactionType);
  const isStationCounterOperation = isStationCounterTransactionType(transactionType);

  const getTransactionTypeLabel = (value) => {
    const normalized = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

    const labelMap = {
      DIRECT_REFUEL: t("addOperation.transactionTypes.directRefuel"),
      EXTERNAL_DIRECT_REFUEL: t("addOperation.transactionTypes.externalDirectRefuel"),
      INTERNAL_TRANSFER: t("addOperation.transactionTypes.internalTransfer"),
      EXTERNAL_SUPPLY: t("addOperation.transactionTypes.externalSupply"),
      EXTERNAL_TRANSFER: t("addOperation.transactionTypes.externalTransfer"),
    };

    return labelMap[normalized] || value || "-";
  };

  const externalSourceHistoryOptions = isExternalSupply
    ? externalSupplierHistory
    : isExternalDirectRefuel
    ? externalStationHistory
    : [];
  const externalSourceDatalistId = isExternalSupply
    ? "external-supplier-history-options"
    : "external-station-history-options";

  const currentProjectStations = stations.filter((station) => {
    const status = String(station.status || "Active").trim().toLowerCase();

    return (
      station.id &&
      !isSameText(station.id, "External_Supply") &&
      isItemInUserProject(station.project, station) &&
      status === "active"
    );
  });

  const otherProjectStations = (allStations.length ? allStations : stations).filter((station) => {
    const status = String(station.status || "Active").trim().toLowerCase();

    return (
      station.id &&
      !isSameText(station.id, "External_Supply") &&
      !isItemInUserProject(station.project, station) &&
      status === "active"
    );
  });

  const currentProjectAssets = assets.filter((asset) => {
    const status = String(asset.status || "").trim().toLowerCase();
    return asset.id && isItemInUserProject(asset.project, asset) && status === "active";
  });

  const sourceStationOptions = isExternalSource
    ? []
    : currentProjectStations.map((station) => station.id);

  const destinationOptions = isAssetRefuel
    ? currentProjectAssets.map((asset) => asset.id)
    : isInternalTransfer
    ? currentProjectStations
        .filter((station) => !sourceStation || !isSameText(station.id, sourceStation))
        .map((station) => station.id)
    : isExternalSupply
    ? currentProjectStations.map((station) => station.id)
    : isExternalTransfer
    ? otherProjectStations.map((station) => station.id)
    : [];

  const selectedAsset = assets.find((asset) => isSameText(asset.id, destinationId));
  const tankCapacity = Number(selectedAsset?.fuelTank) || 0;
  const selectedSourceStation = stations.find((station) => isSameText(station.id, sourceStation));
  const selectedDestinationStation = (allStations.length ? allStations : stations).find(
    (station) => isSameText(station.id, destinationId)
  );

  const getStationBalance = (station) => {
    const rawBalance =
      station?.currentStock ??
      station?.balance ??
      station?.currentBalance ??
      station?.availableStock ??
      station?.stock;

    const numericBalance = Number(rawBalance);

    return Number.isFinite(numericBalance) ? numericBalance : null;
  };

  const sourceStationBalance = getStationBalance(selectedSourceStation);
  const destinationStationBalance = getStationBalance(selectedDestinationStation);

  const shouldShowSourceStationBalance =
    Boolean(sourceStation) &&
    [isDirectRefuel, isInternalTransfer, isExternalTransfer].some(Boolean);

  const shouldShowDestinationStationBalance =
    Boolean(destinationId) &&
    [isInternalTransfer, isExternalSupply, isExternalTransfer].some(Boolean);

  const operationCompanyId =
    currentUser?.companyId ||
    selectedSourceStation?.companyId ||
    selectedDestinationStation?.companyId ||
    selectedAsset?.companyId ||
    "";

  const getDisplayStationCode = (station) =>
    station?.stationId || station?.stationCode || station?.code || station?.id || "";

  const getDisplayAssetCode = (asset) =>
    asset?.assetId || asset?.assetCode || asset?.code || asset?.id || "";

  const lastOdometer =
    isAssetRefuel && destinationId
      ? getLastOdometerForEquipment?.(destinationId) || 0
      : 0;

  const lastStationCounter =
    isStationCounterOperation && destinationId
      ? getLastStationCounter?.(destinationId) || 0
      : 0;

  const resetPhotos = () => {
    setStationMeterPhoto?.(null);
    setAssetPhoto?.(null);
    setAssetMeterPhoto?.(null);
    setInvoicePhoto?.(null);
  };

  const resetAfterTransactionTypeChange = (nextType) => {
    setSourceStation("");
    setDestinationId("");
    setDieselQuantity("");
    setOdometer("");
    setExternalStationName("");
    setInvoiceNumber("");
    setExternalInvoiceAmount("");
    setOperationNotes("");
    setSourceStationSearch("");
    setDestinationSearch("");
    resetPhotos();

    if (isExternalSourceOperation(nextType)) {
      setSourceStation("");
    }
  };

  const resetAfterSourceStationChange = () => {
    if (isInternalTransfer && destinationId && isSameText(destinationId, sourceStation)) {
      setDestinationId("");
    }
    resetPhotos();
  };

  const handleDestinationChange = (value) => {
    setDestinationId(value);

    if (isAssetRefuel) {
      const lastReading = getLastOdometerForEquipment?.(value) || 0;
      setOdometer(lastReading ? String(lastReading) : "");
    } else {
      const lastCounter = getLastStationCounter?.(value) || 0;
      setOdometer(lastCounter ? String(lastCounter) : "");
    }
  };

  const getRequiredPhotoConfigs = () => {
    const destinationStationCode = getDisplayStationCode(selectedDestinationStation) || destinationId;
    const assetCode = getDisplayAssetCode(selectedAsset) || destinationId;

    const destinationOwnerType = isAssetRefuel ? "asset" : "station";
    const destinationOwnerCode = isAssetRefuel ? assetCode : destinationStationCode;

    const withDestinationOwner = (items = []) =>
      items.map((item) => ({
        ...item,
        ownerType: destinationOwnerType,
        ownerCode: destinationOwnerCode,
      }));

    if (isDirectRefuel) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: t("addOperation.photos.odometerPhotoRequired"), value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "odometer" },
        { key: "assetPhoto", label: t("addOperation.photos.assetPhotoRequired"), value: assetPhoto, setValue: setAssetPhoto, photoType: "asset" },
        { key: "assetMeterPhoto", label: t("addOperation.photos.fuelQuantityPhotoRequired"), value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "asset-meter" },
      ]);
    }

    if (isExternalDirectRefuel) {
      return withDestinationOwner([
        { key: "invoicePhoto", label: t("addOperation.photos.invoicePhotoRequired"), value: invoicePhoto, setValue: setInvoicePhoto, photoType: "invoice" },
        { key: "stationMeterPhoto", label: t("addOperation.photos.meterPhotoRequired"), value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "asset-meter" },
        { key: "assetPhoto", label: t("addOperation.photos.assetPhotoRequired"), value: assetPhoto, setValue: setAssetPhoto, photoType: "asset" },
      ]);
    }

    if (isInternalTransfer) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: t("addOperation.photos.destinationCounterPhotoRequired"), value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "destination-meter" },
        { key: "assetPhoto", label: t("addOperation.photos.stationNumberPhotoRequired"), value: assetPhoto, setValue: setAssetPhoto, photoType: "station-number" },
        { key: "assetMeterPhoto", label: t("addOperation.photos.fuelQuantityPhotoRequired"), value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "fuel-quantity" },
      ]);
    }

    if (isExternalSupply) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: t("addOperation.photos.destinationCounterPhotoRequired"), value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "destination-meter" },
        { key: "assetPhoto", label: t("addOperation.photos.stationNumberPhotoRequired"), value: assetPhoto, setValue: setAssetPhoto, photoType: "station-number" },
        { key: "invoicePhoto", label: t("addOperation.photos.invoicePhotoRequired"), value: invoicePhoto, setValue: setInvoicePhoto, photoType: "invoice" },
      ]);
    }

    if (isExternalTransfer) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: t("addOperation.photos.sourceCounterPhotoRequired"), value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "source-meter" },
        { key: "assetPhoto", label: t("addOperation.photos.destinationCounterPhotoRequired"), value: assetPhoto, setValue: setAssetPhoto, photoType: "destination-meter" },
        { key: "assetMeterPhoto", label: t("addOperation.photos.fuelQuantityPhotoRequired"), value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "fuel-quantity" },
      ]);
    }

    return [];
  };

  const requiredPhotoConfigs = getRequiredPhotoConfigs();
  const requiredPhotosUploading = requiredPhotoConfigs.some((photo) => photo.value?.uploading);
  const requiredPhotosComplete =
    requiredPhotoConfigs.length === 3 &&
    requiredPhotoConfigs.every((photo) => Boolean(photo.value?.file || photo.value?.path) && !photo.value?.uploading && !photo.value?.uploadError);

  const uploadRequiredOperationPhoto = async (file, photoConfig) => {
    if (!file) return null;

    if (!operationCompanyId) {
      throw new Error(t("addOperation.validation.companyRequiredUpload"));
    }

    if (!photoConfig?.ownerType || !photoConfig?.ownerCode) {
      throw new Error(t("addOperation.validation.relatedEntityRequired"));
    }

    if (!photoConfig?.photoType) {
      throw new Error(t("addOperation.validation.photoTypeMissing"));
    }

    return uploadOperationPhotoFile({
      file,
      companyId: operationCompanyId,
      ownerType: photoConfig.ownerType,
      ownerCode: photoConfig.ownerCode,
      operationNo: uploadDraftOperationNoRef.current,
      photoType: photoConfig.photoType,
      currentUser,
    });
  };

  const destinationLabel = isAssetRefuel
    ? t("addOperation.fields.asset")
    : t("addOperation.fields.destinationStation");
  const readingLabel = isAssetRefuel
    ? t("addOperation.fields.odometerHourMeter")
    : isExternalTransfer
    ? t("addOperation.fields.destinationStationCounter")
    : t("addOperation.fields.stationMeterCounter");

  const readingPlaceholder = isAssetRefuel
    ? t("addOperation.placeholders.newAssetReading")
    : t("addOperation.placeholders.newStationCounter");

  const needsSourceStation = Boolean(transactionType) && !isExternalSource;
  const needsExternalSourceDetails = isExternalDirectRefuel || isExternalSupply;
  const needsInvoiceNumber = isExternalDirectRefuel || isExternalSupply;
  const needsReading = Boolean(transactionType);
  const isDieselQuantityOverTankCapacity =
    isAssetRefuel &&
    tankCapacity > 0 &&
    Number(dieselQuantity || 0) > tankCapacity;
  const dieselQuantityError = isDieselQuantityOverTankCapacity
    ? t("addOperation.validation.tankCapacityExceeded", {
        capacity: formatNumber(tankCapacity),
      })
    : "";

  const validateBeforeSave = () => {
    if (!transactionType) {
      notifyUser(showToast, "warning", t("addOperation.validation.selectTransactionType"));
      return false;
    }

    if (!transactionTypesForAdd.includes(transactionType)) {
      notifyUser(showToast, "warning", t("addOperation.validation.transactionNotAllowed"));
      return false;
    }

    if (needsSourceStation && !sourceStation) {
      notifyUser(showToast, "warning", t("addOperation.validation.selectSourceStation"));
      return false;
    }

    if (!destinationId) {
      notifyUser(showToast, "warning", t("addOperation.validation.selectDestination"));
      return false;
    }

    if (
      isInternalTransfer &&
      sourceStation &&
      isSameText(sourceStation, destinationId)
    ) {
      notifyUser(showToast, "warning", t("addOperation.validation.sameStation"));
      return false;
    }

    if (needsExternalSourceDetails && !externalStationName.trim()) {
      notifyUser(
        showToast,
        "warning",
        isExternalSupply
          ? t("addOperation.validation.enterSupplier")
          : t("addOperation.validation.enterExternalStation")
      );
      return false;
    }

    if (needsInvoiceNumber && !invoiceNumber.trim()) {
      notifyUser(showToast, "warning", t("addOperation.validation.enterInvoiceNumber"));
      return false;
    }

    if (isExternalDirectRefuel) {
      const invoiceAmount = Number(externalInvoiceAmount);

      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        notifyUser(showToast, "warning", t("addOperation.validation.invoiceAmountPositive"));
        return false;
      }
    }

    const qty = Number(dieselQuantity);

    if (!qty || qty <= 0) {
      notifyUser(showToast, "warning", t("addOperation.validation.quantityPositive"));
      return false;
    }

    if (isAssetRefuel && tankCapacity > 0 && qty > tankCapacity) {
      notifyUser(
        showToast,
        "warning",
        t("addOperation.validation.tankCapacityExceeded", {
          capacity: formatNumber(tankCapacity),
        })
      );
      return false;
    }

    const newReading = Number(odometer);

    if (needsReading && (!newReading || newReading <= 0)) {
      notifyUser(
        showToast,
        "warning",
        isAssetRefuel
          ? t("addOperation.validation.validOdometer")
          : t("addOperation.validation.validStationCounter")
      );
      return false;
    }

    if (isAssetRefuel && lastOdometer > 0 && newReading < lastOdometer) {
      notifyUser(
        showToast,
        "warning",
        t("addOperation.validation.odometerBelowLast", {
          reading: formatNumber(lastOdometer),
        })
      );
      return false;
    }

    if (
      isStationCounterOperation &&
      lastStationCounter > 0 &&
      newReading < lastStationCounter
    ) {
      notifyUser(
        showToast,
        "warning",
        t("addOperation.validation.counterBelowLast", {
          reading: formatNumber(lastStationCounter),
        })
      );
      return false;
    }

    if (!requiredPhotosComplete) {
      notifyUser(showToast, "warning", t("addOperation.validation.threePhotosRequired"));
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    const qty = Number(dieselQuantity);
    const createdByName = currentUser?.fullName || currentUser?.username || currentUser?.email || currentUser?.id || t("addOperation.systemUser");
    const operationId = `OP-${Date.now()}`;

    const uploadedPhotosByKey = {};
    let uploadedRequiredPhotos = [];

    try {
      uploadedRequiredPhotos = await Promise.all(
        requiredPhotoConfigs.map(async (photo) => {
          const file = photo.value?.file;

          if (!file) {
            throw new Error(t("addOperation.validation.photoRequired", { photo: photo.label.replace(" *", "") }));
          }

          if (!operationCompanyId) {
            throw new Error(t("addOperation.validation.companyRequiredSave"));
          }

          if (!photo.ownerType || !photo.ownerCode) {
            throw new Error(t("addOperation.validation.destinationRequiredPhotos"));
          }

          photo.setValue?.({
            ...photo.value,
            uploading: true,
            uploaded: false,
            uploadError: "",
          });

          const uploaded = await uploadOperationPhotoFile({
            file,
            companyId: operationCompanyId,
            ownerType: photo.ownerType,
            ownerCode: photo.ownerCode,
            operationNo: operationId,
            photoType: photo.photoType,
            currentUser,
          });

          const uploadedValue = {
            ...photo.value,
            ...uploaded,
            uploaded: true,
            uploading: false,
            uploadError: "",
            fileName: uploaded?.fileName || photo.value?.fileName || file.name,
            mimeType: uploaded?.mimeType || photo.value?.mimeType || file.type,
            sizeBytes: uploaded?.size || photo.value?.sizeBytes || file.size,
            photoType: uploaded?.photoType || photo.photoType || "",
            ownerType: uploaded?.ownerType || photo.ownerType || "",
            ownerCode: uploaded?.ownerCode || photo.ownerCode || "",
          };

          uploadedPhotosByKey[photo.key] = uploadedValue;
          photo.setValue?.(uploadedValue);

          return {
            key: photo.key,
            label: photo.label.replace(" *", ""),
            fileName: uploadedValue.fileName || "",
            path: uploadedValue.path || "",
            bucket: uploadedValue.bucket || "",
            photoType: uploadedValue.photoType || "",
            ownerType: uploadedValue.ownerType || "",
            ownerCode: uploadedValue.ownerCode || "",
            mimeType: uploadedValue.mimeType || "",
            size: uploadedValue.size || uploadedValue.sizeBytes || "",
          };
        })
      );
    } catch (error) {
      const message = getFriendlyApiErrorMessage(error, t("addOperation.messages.photoUploadOperationFailed"));
      notifyUser(typeof showToast !== "undefined" ? showToast : null, "warning", message);
      return;
    }

    onSaveOperation?.({
      operationId,
      transactionDate: new Date().toISOString(),
      currentProjectId: activeProjectId || "",
      transactionType,
      sourceStation: isExternalSource ? "" : sourceStation,
      fuelerId: currentUser?.id || createdByName,
      createdByUserId: currentUser?.id || "",
      createdByName,
      createdByRole: currentUser?.role || "",
      destinationId,
      dieselQuantity: qty,
      odometer: Number(odometer),
      externalStationName: externalStationName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      externalInvoiceAmount: isExternalDirectRefuel ? Number(externalInvoiceAmount) : undefined,
      notes: operationNotes.trim(),
      photos: {
        stationMeterPhoto: uploadedPhotosByKey.stationMeterPhoto || stationMeterPhoto,
        assetPhoto: uploadedPhotosByKey.assetPhoto || assetPhoto,
        assetMeterPhoto: uploadedPhotosByKey.assetMeterPhoto || assetMeterPhoto,
        invoicePhoto: uploadedPhotosByKey.invoicePhoto || invoicePhoto,
      },
      requiredPhotos: uploadedRequiredPhotos,
    });
  };

  const canSaveOperation =
    Boolean(transactionType) &&
    (!needsSourceStation || Boolean(sourceStation)) &&
    Boolean(destinationId) &&
    Boolean(dieselQuantity) &&
    Number(dieselQuantity) > 0 &&
    !isDieselQuantityOverTankCapacity &&
    (!needsExternalSourceDetails || Boolean(externalStationName.trim())) &&
    (!needsInvoiceNumber || Boolean(invoiceNumber.trim())) &&
    (!isExternalDirectRefuel || Number(externalInvoiceAmount) > 0) &&
    Boolean(odometer) &&
    Number(odometer) > 0 &&
    !requiredPhotosUploading &&
    requiredPhotosComplete;

  return (
    <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl ${isRtl ? "text-right" : "text-left"}`}>
        <div className="flex justify-between items-center gap-4 p-5 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-extrabold text-white">{t("addOperation.title")}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {t("addOperation.subtitle")}
            </p>
          </div>

          <button
            onClick={closeForm}
            className="text-2xl text-slate-400 hover:text-red-400 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 gap-4 max-h-[80vh] overflow-y-auto">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            {t("addOperation.projectScope")}:{" "}
            <span className="font-bold">
              {userProjectDisplayName}
            </span>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
            {t("addOperation.createdBy")}:{" "}
            <span className="font-bold">
              {currentUser?.fullName || currentUser?.username || currentUser?.email || currentUser?.id || "-"}
            </span>
          </div>

          <SearchableSelectField
            label={t("addOperation.fields.transactionType")}
            value={transactionType}
            onChange={(value) => {
              setTransactionType(value);
              resetAfterTransactionTypeChange(value);
            }}
            options={transactionTypesForAdd}
            placeholder={t("addOperation.placeholders.selectTransactionType")}
            searchValue={transactionTypeSearch}
            setSearchValue={setTransactionTypeSearch}
            getOptionLabel={getTransactionTypeLabel}
            language={language}
            t={t}
          />

          {transactionType && (
            <>
              {needsSourceStation && (
                <>
                  <SearchableSelectField
                    label={t("addOperation.fields.sourceStation")}
                    value={sourceStation}
                    onChange={(value) => {
                      setSourceStation(value);
                      setDestinationId("");
                      setOdometer("");
                      setDestinationSearch("");
                      resetPhotos();
                    }}
                    options={sourceStationOptions}
                    placeholder={t("addOperation.placeholders.selectSourceStation")}
                    searchValue={sourceStationSearch}
                    setSearchValue={setSourceStationSearch}
                    language={language}
                    t={t}
                  />

                  {shouldShowSourceStationBalance && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 -mt-2">
                      <div />
                      <p className="col-span-2 text-xs text-slate-400 px-1">
                        {t("addOperation.currentBalance")}:{" "}
                        <span className="font-semibold text-slate-200">
                          {sourceStationBalance === null
                            ? "-"
                            : `${formatNumber(sourceStationBalance)} L`}
                        </span>
                      </p>
                    </div>
                  )}

                  {sourceStation && (
                    <div className={`grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4 ${isRtl ? "text-right" : "text-left"}`}>
                      <label className="font-medium text-slate-300">{t("addOperation.fields.sourceProject")}</label>
                      <div className="col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 font-semibold text-amber-300">
                        {selectedSourceStation?.project || "-"}
                      </div>
                    </div>
                  )}
                </>
              )}

              <SearchableSelectField
                label={destinationLabel}
                value={destinationId}
                onChange={(value) => handleDestinationChange(value)}
                options={destinationOptions}
                placeholder={
                  isAssetRefuel
                    ? t("addOperation.placeholders.selectActiveAsset")
                    : isExternalTransfer
                    ? t("addOperation.placeholders.selectOtherProjectStation")
                    : t("addOperation.placeholders.selectDestinationStation")
                }
                searchValue={destinationSearch}
                setSearchValue={setDestinationSearch}
                language={language}
                t={t}
              />

              {shouldShowDestinationStationBalance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 -mt-2">
                  <div />
                  <p className="col-span-2 text-xs text-slate-400 px-1">
                    {t("addOperation.currentBalance")}:{" "}
                    <span className="font-semibold text-slate-200">
                      {destinationStationBalance === null
                        ? "-"
                        : `${formatNumber(destinationStationBalance)} L`}
                    </span>
                  </p>
                </div>
              )}

              {isExternalTransfer && destinationId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                  <label className="font-medium text-slate-300">{t("addOperation.fields.destinationProject")}</label>
                  <div className="col-span-2 rounded-lg border border-blue-500/30 bg-blue-500/15 p-2 font-semibold text-blue-300">
                    {selectedDestinationStation?.project || "-"}
                  </div>
                </div>
              )}

              {isAssetRefuel && destinationId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                  <label className="font-medium text-slate-300">{t("addOperation.fields.tankCapacity")}</label>
                  <div className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300">
                    {tankCapacity > 0 ? `${formatNumber(tankCapacity)} L` : "-"}
                  </div>
                </div>
              )}

              {needsExternalSourceDetails && (
                <>
                  <Field
                    label={isExternalSupply ? t("addOperation.fields.supplierExternalSource") : t("addOperation.fields.externalStationName")}
                    value={externalStationName}
                    onChange={(e) => setExternalStationName(e.target.value)}
                    placeholder={isExternalSupply ? t("addOperation.placeholders.enterSupplier") : t("addOperation.placeholders.enterExternalStation")}
                    list={externalSourceDatalistId}
                    datalistOptions={externalSourceHistoryOptions}
                  />

                  <Field
                    label={t("addOperation.fields.invoiceReceiptNumber")}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder={t("addOperation.placeholders.enterInvoiceNumber")}
                  />

                  {isExternalDirectRefuel && (
                    <Field
                      label={t("addOperation.fields.invoiceAmount", { currency: "SAR" })}
                      type="number"
                      value={externalInvoiceAmount}
                      onChange={(e) => setExternalInvoiceAmount(e.target.value)}
                      placeholder={t("addOperation.placeholders.enterInvoiceAmount")}
                    />
                  )}
                </>
              )}

              <Field
                label={t("addOperation.fields.dieselQuantity")}
                value={dieselQuantity}
                onChange={(e) => setDieselQuantity(e.target.value)}
                type="number"
                placeholder={t("addOperation.placeholders.enterQuantity")}
                error={dieselQuantityError}
              />

              <Field
                label={readingLabel}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                type="number"
                placeholder={readingPlaceholder}
              />

              <Field
                label={t("addOperation.fields.notes")}
                value={operationNotes}
                onChange={(e) => setOperationNotes(e.target.value)}
                placeholder={t("addOperation.placeholders.optionalNotes")}
              />

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-bold italic underline mb-3">{t("addOperation.photos.sectionTitle")}</h3>

                <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">
                  {t("addOperation.photos.allRequiredNotice")}
                </div>

                {requiredPhotoConfigs.map((photo) => (
                  <ImageField
                    key={photo.key}
                    label={photo.label}
                    preview={photo.value}
                    setPreview={photo.setValue}
                    showToast={showToast}
                    language={language}
                    t={t}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-900/80 p-5">
          <button
            onClick={closeForm}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-800/70"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleSave}
            disabled={!canSaveOperation}
            className={`px-5 py-2 rounded-xl font-semibold transition-all ${
              canSaveOperation
                ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                : "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
            }`}
          >
            {t("addOperation.saveOperation")}
          </button>
        </div>
      </div>
    </div>
  );
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

function SearchableSelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  searchValue,
  setSearchValue,
  disabled = false,
  getOptionLabel = (item) => item,
  language = "en",
  t = (key) => key,
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const updateDropdownPosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 260 && spaceAbove > spaceBelow;

    const availableHeight = shouldOpenUp
      ? Math.max(180, Math.min(420, spaceAbove - 16))
      : Math.max(180, Math.min(420, spaceBelow - 16));

    setDropdownStyle({
      position: "fixed",
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: shouldOpenUp ? "auto" : `${rect.bottom + 8}px`,
      bottom: shouldOpenUp ? `${window.innerHeight - rect.top + 8}px` : "auto",
      maxHeight: `${availableHeight}px`,
      zIndex: 10050,
    });
  };

  useOutsideClick(dropdownRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  const filteredOptions = (options || []).filter((item) =>
    String(getOptionLabel(item) || "")
      .toLowerCase()
      .includes(String(searchValue || "").toLowerCase())
  );

  const isRtl = language === "ar";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
      <label className="font-medium text-slate-300">{label}</label>

      <div ref={dropdownRef} className="col-span-2 relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((prev) => !prev);
              requestAnimationFrame(updateDropdownPosition);
            }
          }}
          dir={isRtl ? "rtl" : "ltr"}
          className={`w-full border rounded-lg p-3 flex justify-between items-center ${
            isRtl ? "text-right" : "text-left"
          } ${
            disabled
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-slate-900 text-slate-100 hover:border-amber-400 cursor-pointer"
          }`}
        >
          <span className={value ? "text-slate-100" : "text-slate-500"}>
            {value ? getOptionLabel(value) : placeholder}
          </span>

          <span className="text-slate-400">▾</span>
        </button>

        {open && !disabled && (
          <div
            style={dropdownStyle}
            className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100 shadow-2xl"
          >
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t("addOperation.searchPlaceholder", { field: label })}
              dir={isRtl ? "rtl" : "ltr"}
              className={`mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white placeholder:text-slate-500 outline-none focus:border-amber-400 ${
                isRtl ? "text-right" : "text-left"
              }`}
              autoFocus
            />

            <div className="overflow-auto" style={{ maxHeight: "calc(100% - 48px)" }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setSearchValue("");
                      setOpen(false);
                    }}
                    dir={isRtl ? "rtl" : "ltr"}
                    className={`block w-full px-3 py-2 rounded-lg hover:bg-amber-500/10 cursor-pointer ${
                      isRtl ? "text-right" : "text-left"
                    } ${
                      value === item ? "bg-amber-500/20 text-amber-300 font-bold" : ""
                    }`}
                  >
                    {getOptionLabel(item)}
                  </button>
                ))
              ) : (
                <div className="text-sm text-red-500 px-3 py-2">
                  {t("addOperation.noMatchingResults")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageField({ label, preview, setPreview, onUpload, showToast, language = "en", t = (key) => key }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const previewUrl = typeof preview === "string" ? preview : preview?.previewUrl;
  const isUploading = Boolean(preview?.uploading);
  const uploadError = preview?.uploadError || "";
  const uploadedPath = preview?.path || "";
  const isRtl = language === "ar";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 items-start gap-2 sm:gap-4 mb-4 ${isRtl ? "text-right" : "text-left"}`}>
      <label className="font-medium text-slate-300">{label}</label>

      <div className="col-span-2">
        <input
          type="file"
          accept="image/*"
          capture={isMobile ? "environment" : undefined}
          disabled={isUploading}
          className={`w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
            isUploading ? "opacity-60 cursor-wait" : ""
          }`}
          onChange={async (e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            const localPreview = {
              file,
              previewUrl: URL.createObjectURL(file),
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              uploading: Boolean(onUpload),
              uploaded: false,
              uploadError: "",
            };

            setPreview(localPreview);

            if (!onUpload) return;

            try {
              const uploaded = await onUpload(file);

              setPreview({
                ...localPreview,
                ...uploaded,
                uploaded: true,
                uploading: false,
                uploadError: "",
                fileName: uploaded?.fileName || localPreview.fileName,
                mimeType: uploaded?.mimeType || localPreview.mimeType,
                sizeBytes: uploaded?.size || localPreview.sizeBytes,
              });

              notifyUser(showToast, "success", t("addOperation.messages.photoUploaded", { photo: label.replace(" *", "") }));
            } catch (error) {
              const message = getFriendlyApiErrorMessage(error, t("addOperation.messages.photoUploadFailed"));

              setPreview({
                ...localPreview,
                uploaded: false,
                uploading: false,
                uploadError: message,
              });

              notifyUser(showToast, "warning", message);
            }
          }}
        />

        {isUploading && (
          <div className="mt-2 text-sm text-amber-700 font-semibold">
            {t("addOperation.photos.uploading")}
          </div>
        )}

        {uploadedPath && !isUploading && !uploadError && (
          <div className="mt-2 text-sm text-green-700 font-semibold break-all">
            ✅ {t("addOperation.photos.uploaded")}: {uploadedPath}
          </div>
        )}

        {uploadError && (
          <div className="mt-2 text-sm text-red-700 font-semibold">
            ❌ {uploadError}
          </div>
        )}

        {previewUrl && (
          <img
            src={previewUrl}
            alt={label}
            className="mt-3 w-32 h-32 object-cover rounded-lg border"
          />
        )}
      </div>
    </div>
  );
}
