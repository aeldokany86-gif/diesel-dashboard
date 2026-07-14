import { isSameText } from "./helpers";

export function mapFrontendOperationToBackendPayload(operation = {}) {
  const normalizedType = String(operation.transactionType || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const payload = {
    type: normalizedType,
    quantity: Number(operation.dieselQuantity || 0),
    notes: operation.notes || undefined,
    externalStationName: operation.externalStationName || undefined,
    invoiceNumber: operation.invoiceNumber || undefined,
    externalInvoiceAmount:
      operation.externalInvoiceAmount === undefined ||
      operation.externalInvoiceAmount === null ||
      operation.externalInvoiceAmount === ""
        ? undefined
        : Number(operation.externalInvoiceAmount),
    attachments: operation.requiredPhotos || operation.photos || undefined,
  };

  if (["DIRECT_REFUEL", "INTERNAL_TRANSFER", "EXTERNAL_TRANSFER"].includes(normalizedType)) {
    payload.sourceStationId = operation.sourceStation || undefined;
  }

  if (["INTERNAL_TRANSFER", "EXTERNAL_SUPPLY", "EXTERNAL_TRANSFER"].includes(normalizedType)) {
    payload.destinationStationId = operation.destinationId || undefined;
    payload.stationCounter =
      operation.odometer === undefined || operation.odometer === null
        ? undefined
        : Number(operation.odometer);
  }

  if (["DIRECT_REFUEL", "EXTERNAL_DIRECT_REFUEL"].includes(normalizedType)) {
    payload.assetId = operation.destinationId || undefined;
    payload.odometer =
      operation.odometer === undefined || operation.odometer === null
        ? undefined
        : Number(operation.odometer);
  }

  return payload;
}

export function buildOperationRequestHeaders(currentUser = {}) {
  return {
    "x-user-id": currentUser?.id || "",
    "x-user-role": currentUser?.role || currentUser?.roleName || "",
    "x-user-name": currentUser?.fullName || currentUser?.username || currentUser?.email || "",
  };
}

export function mergeOperationRequestHeaders(config = {}, currentUser = {}) {
  const authHeaders = buildOperationRequestHeaders(currentUser);

  if (!authHeaders["x-user-id"]) return config;

  const headers = config.headers || {};

  if (typeof headers.set === "function") {
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (!value) return;
      const currentValue = headers.get?.(key);
      if (!currentValue) headers.set(key, value);
    });
    config.headers = headers;
    return config;
  }

  config.headers = {
    ...authHeaders,
    ...headers,
  };

  return config;
}

export function normalizeOperationAttachments(value) {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeOperationAttachments(JSON.parse(value));
    } catch {
      const trimmed = value.trim();
      return trimmed ? [{ type: "photo", key: "photo", path: trimmed }] : [];
    }
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeOperationAttachments(item))
      .filter((item) => item?.path);
  }

  if (typeof value === "object") {
    const directPath =
      value.path ||
      value.storagePath ||
      value.filePath ||
      value.objectPath ||
      value.signedPath ||
      "";

    if (directPath) {
      return [
        {
          ...value,
          key: value.key || value.type || value.photoType || value.name || "photo",
          type: value.type || value.photoType || value.key || "photo",
          path: directPath,
        },
      ];
    }

    // Backward/alternate JSON support:
    // { stationMeterPhoto: { path: "..." }, assetPhoto: { path: "..." } }
    return Object.entries(value)
      .flatMap(([key, child]) =>
        normalizeOperationAttachments(child).map((attachment) => ({
          ...attachment,
          key: attachment.key || key,
          type: attachment.type || attachment.photoType || key,
        }))
      )
      .filter((item) => item?.path);
  }

  return [];
}

export function getPhotoLabel(type) {
  const normalized = String(type || "photo")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

  const labels = {
    "source-meter": "Source Meter",
    "station-meter": "Station Meter",
    "asset-meter": "Asset Meter",
    "odometer": "Odometer",
    "asset": "Asset Photo",
    "asset-photo": "Asset Photo",
    "equipment": "Equipment Photo",
    "invoice": "Invoice / Receipt",
  };

  return labels[normalized] || normalized.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function getOperationTypeDisplay(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const labels = {
    DIRECT_REFUEL: "Direct Refuel",
    EXTERNAL_DIRECT_REFUEL: "External Direct Refuel",
    INTERNAL_TRANSFER: "Internal Transfer",
    EXTERNAL_SUPPLY: "External Supply",
    EXTERNAL_TRANSFER: "External Transfer",
  };

  return labels[normalized] || String(value || "-").replace(/_/g, " ");
}

export function getOperationTypeBadgeClass(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "EXTERNAL_DIRECT_REFUEL") {
    return "bg-purple-500/15 text-purple-200 border border-purple-400/40";
  }

  if (normalized === "DIRECT_REFUEL") {
    return "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40";
  }

  return "bg-slate-700 text-slate-200 border border-slate-600";
}

export function getOperationTotalCostAtOperation(rowOrItem = {}) {
  const backendOperation =
    rowOrItem?.row?.__operation ||
    rowOrItem?.__operation ||
    {};

  const totalCostAtOperation = Number(backendOperation.totalCostAtOperation || 0);

  return Number.isFinite(totalCostAtOperation) && totalCostAtOperation > 0
    ? totalCostAtOperation
    : 0;
}

export function getAllowedTransactionTypesForUser(user) {
  if (!user || user.status !== "Active") return [];

  if (user.role === "Operator") {
    return ["Direct_Refuel"];
  }

  if (user.role === "Supervisor" || user.role === "Manager") {
    return [
      "Direct_Refuel",
      "External_Direct_Refuel",
      "Internal_Transfer",
      "External_Supply",
      "External_Transfer",
    ];
  }

  // Admin, Officer, TopManagement, and PlatformAdmin are view-only in Operations.
  return [];
}

export function isAssetRefuelTransactionType(transactionType) {
  return ["Direct_Refuel", "External_Direct_Refuel"].some((type) =>
    isSameText(transactionType, type)
  );
}

export function isExternalDirectRefuelTransactionType(transactionType) {
  return isSameText(transactionType, "External_Direct_Refuel");
}

export function isExternalSupplyTransactionType(transactionType) {
  return isSameText(transactionType, "External_Supply");
}

export function isExternalTransferTransactionType(transactionType) {
  return isSameText(transactionType, "External_Transfer");
}

export function isExternalSourceOperation(transactionType) {
  return (
    isExternalSupplyTransactionType(transactionType) ||
    isExternalDirectRefuelTransactionType(transactionType)
  );
}

export function isStationCounterTransactionType(transactionType) {
  return (
    isSameText(transactionType, "Internal_Transfer") ||
    isExternalSupplyTransactionType(transactionType) ||
    isExternalTransferTransactionType(transactionType)
  );
}

export function shouldOperationRequireManagerApproval(transactionType, user) {
  if (!user || user.status !== "Active") return true;

  if (isExternalTransferTransactionType(transactionType)) {
    // Cross-project diesel transfer needs the two project managers.
    // If a Manager creates it, backend will later treat him as the first approval.
    return user.role === "Supervisor" || user.role === "Manager";
  }

  if (
    isExternalDirectRefuelTransactionType(transactionType) ||
    isExternalSupplyTransactionType(transactionType)
  ) {
    // Supervisor submits a request. Manager executes immediately.
    return user.role === "Supervisor";
  }

  return false;
}

export function getOperationApprovalType(transactionType) {
  if (isExternalDirectRefuelTransactionType(transactionType)) return "operation_external_direct_refuel";
  if (isExternalSupplyTransactionType(transactionType)) return "operation_external_supply";
  if (isExternalTransferTransactionType(transactionType)) return "operation_external_transfer";
  return "operation";
}

export function getOperationApprovalTitle(transactionType, operationId) {
  if (isExternalDirectRefuelTransactionType(transactionType)) {
    return `External Direct Refuel ${operationId} pending approval`;
  }

  if (isExternalSupplyTransactionType(transactionType)) {
    return `External Supply ${operationId} pending approval`;
  }

  if (isExternalTransferTransactionType(transactionType)) {
    return `External Transfer ${operationId} pending approval`;
  }

  return `Operation ${operationId} pending approval`;
}

export function getOperationApprovalSuccessMessage(transactionType) {
  if (isExternalDirectRefuelTransactionType(transactionType)) {
    return "External Direct Refuel saved as Pending Manager Approval.";
  }

  if (isExternalSupplyTransactionType(transactionType)) {
    return "External Supply saved as Pending Manager Approval.";
  }

  if (isExternalTransferTransactionType(transactionType)) {
    return "External Transfer saved as Pending Project Managers Approval.";
  }

  return "Operation saved as Pending Manager Approval.";
}

export function shouldExternalSupplyRequireApproval(user) {
  return shouldOperationRequireManagerApproval("External_Supply", user);
}
