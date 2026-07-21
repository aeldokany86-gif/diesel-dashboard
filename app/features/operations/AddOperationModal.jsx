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

  const userProjectDisplayName = useMemo(() => {
    if (isAllProjectsUser) return "All Projects";

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
  }, [currentUser, isAllProjectsUser, projects, userProjectScope]);

  const isItemInUserProject = (projectValue) => {
    return isAllProjectsUser || isProjectAllowedForUser(currentUser, projectValue, projects);
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
      isItemInUserProject(station.project) &&
      status === "active"
    );
  });

  const otherProjectStations = (allStations.length ? allStations : stations).filter((station) => {
    const status = String(station.status || "Active").trim().toLowerCase();

    return (
      station.id &&
      !isSameText(station.id, "External_Supply") &&
      !isItemInUserProject(station.project) &&
      status === "active"
    );
  });

  const currentProjectAssets = assets.filter((asset) => {
    const status = String(asset.status || "").trim().toLowerCase();
    return asset.id && isItemInUserProject(asset.project) && status === "active";
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
        { key: "stationMeterPhoto", label: "Odometer Photo *", value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "odometer" },
        { key: "assetPhoto", label: "Asset Photo *", value: assetPhoto, setValue: setAssetPhoto, photoType: "asset" },
        { key: "assetMeterPhoto", label: "Fuel Quantity Photo *", value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "asset-meter" },
      ]);
    }

    if (isExternalDirectRefuel) {
      return withDestinationOwner([
        { key: "invoicePhoto", label: "Invoice Photo *", value: invoicePhoto, setValue: setInvoicePhoto, photoType: "invoice" },
        { key: "stationMeterPhoto", label: "Meter Photo *", value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "asset-meter" },
        { key: "assetPhoto", label: "Asset Photo *", value: assetPhoto, setValue: setAssetPhoto, photoType: "asset" },
      ]);
    }

    if (isInternalTransfer) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: "Destination Station Counter Photo *", value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "destination-meter" },
        { key: "assetPhoto", label: "Station Number Photo *", value: assetPhoto, setValue: setAssetPhoto, photoType: "station-number" },
        { key: "assetMeterPhoto", label: "Fuel Quantity Photo *", value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "fuel-quantity" },
      ]);
    }

    if (isExternalSupply) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: "Destination Station Counter Photo *", value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "destination-meter" },
        { key: "assetPhoto", label: "Station Number Photo *", value: assetPhoto, setValue: setAssetPhoto, photoType: "station-number" },
        { key: "invoicePhoto", label: "Invoice Photo *", value: invoicePhoto, setValue: setInvoicePhoto, photoType: "invoice" },
      ]);
    }

    if (isExternalTransfer) {
      return withDestinationOwner([
        { key: "stationMeterPhoto", label: "Source Station Counter Photo *", value: stationMeterPhoto, setValue: setStationMeterPhoto, photoType: "source-meter" },
        { key: "assetPhoto", label: "Destination Station Counter Photo *", value: assetPhoto, setValue: setAssetPhoto, photoType: "destination-meter" },
        { key: "assetMeterPhoto", label: "Fuel Quantity Photo *", value: assetMeterPhoto, setValue: setAssetMeterPhoto, photoType: "fuel-quantity" },
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
      throw new Error("Company ID is required before uploading photos.");
    }

    if (!photoConfig?.ownerType || !photoConfig?.ownerCode) {
      throw new Error("Please select the related station, asset, or supplier before uploading this photo.");
    }

    if (!photoConfig?.photoType) {
      throw new Error("Photo type is missing.");
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

  const destinationLabel = isAssetRefuel ? "Asset" : "Destination Station";
  const readingLabel = isAssetRefuel
    ? "Odometer / Hour Meter"
    : isExternalTransfer
    ? "Destination Station Counter"
    : "Station Meter / Counter";

  const readingPlaceholder = isAssetRefuel
    ? "Previous reading is filled automatically; replace it with the new reading"
    : "Previous counter is filled automatically; replace it with the new counter";

  const needsSourceStation = Boolean(transactionType) && !isExternalSource;
  const needsExternalSourceDetails = isExternalDirectRefuel || isExternalSupply;
  const needsInvoiceNumber = isExternalDirectRefuel || isExternalSupply;
  const needsReading = Boolean(transactionType);
  const isDieselQuantityOverTankCapacity =
    isAssetRefuel &&
    tankCapacity > 0 &&
    Number(dieselQuantity || 0) > tankCapacity;
  const dieselQuantityError = isDieselQuantityOverTankCapacity
    ? `Diesel quantity cannot exceed tank capacity (${formatNumber(tankCapacity)} L).`
    : "";

  const validateBeforeSave = () => {
    if (!transactionType) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select transaction type."), "Please select transaction type.");
      return false;
    }

    if (!transactionTypesForAdd.includes(transactionType)) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("You are not allowed to add this transaction type."), "You are not allowed to add this transaction type.");
      return false;
    }

    if (needsSourceStation && !sourceStation) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select source station."), "Please select source station.");
      return false;
    }

    if (!destinationId) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select destination."), "Please select destination.");
      return false;
    }

    if (isInternalTransfer && sourceStation && isSameText(sourceStation, destinationId)) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Source station and destination station cannot be the same."), "Source station and destination station cannot be the same.");
      return false;
    }

    if (needsExternalSourceDetails && !externalStationName.trim()) {
      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        inferToastTypeFromMessage(isExternalSupply ? "Please enter supplier / external source." : "Please enter external station name."),
        isExternalSupply ? "Please enter supplier / external source." : "Please enter external station name."
      );
      return false;
    }

    if (needsInvoiceNumber && !invoiceNumber.trim()) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter invoice / receipt number."), "Please enter invoice / receipt number.");
      return false;
    }

    if (isExternalDirectRefuel) {
      const invoiceAmount = Number(externalInvoiceAmount);

      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter invoice amount greater than zero."), "Please enter invoice amount greater than zero.");
        return false;
      }
    }

    const qty = Number(dieselQuantity);

    if (!qty || qty <= 0) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Diesel quantity must be greater than 0."), "Diesel quantity must be greater than 0.");
      return false;
    }

    if (isAssetRefuel && tankCapacity > 0 && qty > tankCapacity) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(`Diesel quantity cannot exceed tank capacity (${formatNumber(tankCapacity)} L).`), `Diesel quantity cannot exceed tank capacity (${formatNumber(tankCapacity)} L).`);
      return false;
    }

    const newReading = Number(odometer);

    if (needsReading && (!newReading || newReading <= 0)) {
      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        inferToastTypeFromMessage(isAssetRefuel ? "Please enter valid odometer / hour meter." : "Please enter valid station counter."),
        isAssetRefuel ? "Please enter valid odometer / hour meter." : "Please enter valid station counter."
      );
      return false;
    }

    if (isAssetRefuel && lastOdometer > 0 && newReading < lastOdometer) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(`Odometer / hour meter cannot be less than last reading (${formatNumber(lastOdometer)}).`), `Odometer / hour meter cannot be less than last reading (${formatNumber(lastOdometer)}).`);
      return false;
    }

    if (isStationCounterOperation && lastStationCounter > 0 && newReading < lastStationCounter) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage(`Station meter / counter cannot be less than last reading (${formatNumber(lastStationCounter)}).`), `Station meter / counter cannot be less than last reading (${formatNumber(lastStationCounter)}).`);
      return false;
    }

    if (!requiredPhotosComplete) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("The 3 required photos are mandatory for this operation."), "The 3 required photos are mandatory for this operation.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    const qty = Number(dieselQuantity);
    const createdByName = currentUser?.fullName || currentUser?.username || currentUser?.email || currentUser?.id || "System";
    const operationId = `OP-${Date.now()}`;

    const uploadedPhotosByKey = {};
    let uploadedRequiredPhotos = [];

    try {
      uploadedRequiredPhotos = await Promise.all(
        requiredPhotoConfigs.map(async (photo) => {
          const file = photo.value?.file;

          if (!file) {
            throw new Error(`${photo.label.replace(" *", "")} is required.`);
          }

          if (!operationCompanyId) {
            throw new Error("Company ID is required before saving operation photos.");
          }

          if (!photo.ownerType || !photo.ownerCode) {
            throw new Error("Please select the destination asset or station before saving photos.");
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
      const message = getFriendlyApiErrorMessage(error, "Photo upload failed. Operation was not saved.");
      notifyUser(typeof showToast !== "undefined" ? showToast : null, "warning", message);
      return;
    }

    onSaveOperation?.({
      operationId,
      transactionDate: new Date().toISOString(),
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
    <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white text-black w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Add Diesel Operation</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select the operation type first, then complete all required fields and the 3 mandatory photos.
            </p>
          </div>

          <button
            onClick={closeForm}
            className="text-2xl text-gray-500 hover:text-red-500 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 gap-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-3 text-sm">
            User Project Scope:{" "}
            <span className="font-bold">
              {userProjectDisplayName}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
            Created By:{" "}
            <span className="font-bold">
              {currentUser?.fullName || currentUser?.username || currentUser?.email || currentUser?.id || "-"}
            </span>
          </div>

          <SearchableSelectField
            label="Transaction Type"
            value={transactionType}
            onChange={(value) => {
              setTransactionType(value);
              resetAfterTransactionTypeChange(value);
            }}
            options={transactionTypesForAdd}
            placeholder="Select Transaction Type"
            searchValue={transactionTypeSearch}
            setSearchValue={setTransactionTypeSearch}
          />

          {transactionType && (
            <>
              {needsSourceStation && (
                <>
                  <SearchableSelectField
                    label="Source Station"
                    value={sourceStation}
                    onChange={(value) => {
                      setSourceStation(value);
                      setDestinationId("");
                      setOdometer("");
                      setDestinationSearch("");
                      resetPhotos();
                    }}
                    options={sourceStationOptions}
                    placeholder="Search / Select Source Station"
                    searchValue={sourceStationSearch}
                    setSearchValue={setSourceStationSearch}
                  />

                  {shouldShowSourceStationBalance && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 -mt-2">
                      <div />
                      <p className="col-span-2 text-xs text-slate-500 px-1">
                        Current balance:{" "}
                        <span className="font-semibold text-slate-700">
                          {sourceStationBalance === null
                            ? "-"
                            : `${formatNumber(sourceStationBalance)} L`}
                        </span>
                      </p>
                    </div>
                  )}

                  {sourceStation && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                      <label className="font-medium text-gray-700">Source Project</label>
                      <div className="col-span-2 bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-gray-800 font-semibold">
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
                    ? "Search / Select Active Asset in Your Project"
                    : isExternalTransfer
                    ? "Search / Select Station from Other Projects"
                    : "Search / Select Destination Station"
                }
                searchValue={destinationSearch}
                setSearchValue={setDestinationSearch}
              />

              {shouldShowDestinationStationBalance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 -mt-2">
                  <div />
                  <p className="col-span-2 text-xs text-slate-500 px-1">
                    Current balance:{" "}
                    <span className="font-semibold text-slate-700">
                      {destinationStationBalance === null
                        ? "-"
                        : `${formatNumber(destinationStationBalance)} L`}
                    </span>
                  </p>
                </div>
              )}

              {isExternalTransfer && destinationId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                  <label className="font-medium text-gray-700">Destination Project</label>
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-gray-800 font-semibold">
                    {selectedDestinationStation?.project || "-"}
                  </div>
                </div>
              )}

              {isAssetRefuel && destinationId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                  <label className="font-medium text-gray-700">Tank Capacity</label>
                  <div className="col-span-2 bg-gray-100 border rounded-lg p-2 text-gray-700">
                    {tankCapacity > 0 ? `${formatNumber(tankCapacity)} L` : "-"}
                  </div>
                </div>
              )}

              {needsExternalSourceDetails && (
                <>
                  <Field
                    label={isExternalSupply ? "Supplier / External Source" : "External Station Name"}
                    value={externalStationName}
                    onChange={(e) => setExternalStationName(e.target.value)}
                    placeholder={isExternalSupply ? "Enter supplier or external source" : "Enter external fuel station name"}
                    list={externalSourceDatalistId}
                    datalistOptions={externalSourceHistoryOptions}
                  />

                  <Field
                    label="Invoice / Receipt Number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice or receipt number"
                  />

                  {isExternalDirectRefuel && (
                    <Field
                      label="Invoice Amount (SAR)"
                      type="number"
                      value={externalInvoiceAmount}
                      onChange={(e) => setExternalInvoiceAmount(e.target.value)}
                      placeholder="Enter total invoice amount"
                    />
                  )}
                </>
              )}

              <Field
                label="Diesel Quantity"
                value={dieselQuantity}
                onChange={(e) => setDieselQuantity(e.target.value)}
                type="number"
                placeholder="Enter quantity in liters"
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
                label="Notes"
                value={operationNotes}
                onChange={(e) => setOperationNotes(e.target.value)}
                placeholder="Optional notes"
              />

              <div className="border-t pt-4">
                <h3 className="text-lg font-bold italic underline mb-3">Required Photos - 3 Mandatory Photos</h3>

                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
                  All three photos below are required before saving this operation.
                </div>

                {requiredPhotoConfigs.map((photo) => (
                  <ImageField
                    key={photo.key}
                    label={photo.label}
                    preview={photo.value}
                    setPreview={photo.setValue}
                    showToast={showToast}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <button
            onClick={closeForm}
            className="bg-gray-200 px-4 py-2 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!canSaveOperation}
            className={`px-5 py-2 rounded-xl font-semibold transition-all ${
              canSaveOperation
                ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save Operation
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
    String(item || "")
      .toLowerCase()
      .includes(String(searchValue || "").toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
      <label className="font-medium text-gray-700">{label}</label>

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
          className={`w-full border rounded-lg p-3 text-left flex justify-between items-center ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white hover:border-yellow-500 cursor-pointer"
          }`}
        >
          <span className={value ? "text-black" : "text-gray-400"}>
            {value || placeholder}
          </span>

          <span className="text-gray-500">▾</span>
        </button>

        {open && !disabled && (
          <div
            style={dropdownStyle}
            className="bg-white border border-gray-300 rounded-xl shadow-2xl p-3 overflow-hidden"
          >
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full border rounded-lg p-2 mb-2"
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
                    className={`block w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-100 cursor-pointer ${
                      value === item ? "bg-yellow-200 font-bold" : ""
                    }`}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <div className="text-sm text-red-500 px-3 py-2">
                  No matching results found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageField({ label, preview, setPreview, onUpload, showToast }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const previewUrl = typeof preview === "string" ? preview : preview?.previewUrl;
  const isUploading = Boolean(preview?.uploading);
  const uploadError = preview?.uploadError || "";
  const uploadedPath = preview?.path || "";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 sm:gap-4 mb-4">
      <label className="font-medium text-gray-700">{label}</label>

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

              notifyUser(showToast, "success", `${label.replace(" *", "")} uploaded successfully.`);
            } catch (error) {
              const message = getFriendlyApiErrorMessage(error, "Photo upload failed.");

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
            Uploading photo...
          </div>
        )}

        {uploadedPath && !isUploading && !uploadError && (
          <div className="mt-2 text-sm text-green-700 font-semibold break-all">
            ✅ Uploaded: {uploadedPath}
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
