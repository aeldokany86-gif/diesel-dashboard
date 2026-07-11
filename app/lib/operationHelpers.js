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
