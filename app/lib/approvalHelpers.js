import {
  normalizeScopeValue,
  makeFieldLabel,
  toFrontendOperationType,
} from "./helpers";

import {
  getOperationApprovalType,
  getOperationApprovalTitle,
  getOperationApprovalMessage,
} from "./operationHelpers";
import { resolveI18nMessage } from "./i18nMessageHelpers";

export function normalizeOperationCorrectionFieldName(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const map = {
    ASSET: "ASSET_ID",
    ASSET_ID: "ASSET_ID",
    EQUIPMENT: "ASSET_ID",
    EQUIPMENT_ID: "ASSET_ID",
    SOURCE_STATION: "SOURCE_STATION_ID",
    SOURCE_STATION_ID: "SOURCE_STATION_ID",
    STATION: "SOURCE_STATION_ID",
    STATION_ID: "SOURCE_STATION_ID",
    QUANTITY: "QUANTITY",
    DIESEL: "QUANTITY",
    DIESEL_QUANTITY: "QUANTITY",
    ODOMETER: "ODOMETER",
    ODOMETER_AT_FUELING: "ODOMETER",
    NOTES: "NOTES",
    NOTE: "NOTES",
    INVOICE_NUMBER: "INVOICE_NUMBER",
    INVOICE: "INVOICE_NUMBER",
  };

  return map[normalized] || normalized;
}

export function getOperationCorrectionFieldLabel(fieldName, t) {
  const normalized = normalizeOperationCorrectionFieldName(fieldName);
  const labels = {
    ASSET_ID: "workflowMessages.fields.equipment",
    SOURCE_STATION_ID: "workflowMessages.fields.sourceStation",
    QUANTITY: "workflowMessages.fields.dieselQuantity",
    ODOMETER: "workflowMessages.fields.odometer",
    NOTES: "workflowMessages.fields.notes",
    INVOICE_NUMBER: "workflowMessages.fields.invoiceNumber",
  };

  const key = labels[normalized];
  if (key && typeof t === "function") {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }

  return makeFieldLabel(normalized);
}

export function findApprovalEntityByAnyId(items = [], value) {
  const normalizedValue = normalizeScopeValue(value);
  if (!normalizedValue) return null;

  return (items || []).find((item) => {
    const candidates = [
      item?.backendId,
      item?.assetBackendId,
      item?.stationBackendId,
      item?.id,
      item?.assetId,
      item?.stationId,
      item?.equipmentNo,
      item?.equipmentNumber,
      item?.code,
      item?.name,
    ].map(normalizeScopeValue);

    return candidates.includes(normalizedValue);
  }) || null;
}

export function getAssetApprovalDisplayValue(value, assets = []) {
  const asset = findApprovalEntityByAnyId(assets, value);
  return (
    asset?.assetId ||
    asset?.equipmentNo ||
    asset?.equipmentNumber ||
    asset?.name ||
    value ||
    "-"
  );
}

export function getStationApprovalDisplayValue(value, stations = []) {
  const station = findApprovalEntityByAnyId(stations, value);
  return station?.stationId || station?.code || station?.name || value || "-";
}


export function getApprovalEntityDisplayValue(
  entityType,
  value,
  { assets = [], stations = [] } = {},
) {
  const normalizedType = String(entityType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (["asset", "equipment"].includes(normalizedType)) {
    return getAssetApprovalDisplayValue(value, assets);
  }

  if (["station", "sourcestation", "destinationstation"].includes(normalizedType)) {
    return getStationApprovalDisplayValue(value, stations);
  }

  return value === undefined || value === null || value === "" ? "-" : String(value);
}

export function getOperationCorrectionApprovalDisplayValue(fieldName, value, assets = [], stations = []) {
  if (value === undefined || value === null || value === "") return "-";

  const normalized = normalizeOperationCorrectionFieldName(fieldName);

  if (normalized === "ASSET_ID") return getAssetApprovalDisplayValue(value, assets);
  if (normalized === "SOURCE_STATION_ID") return getStationApprovalDisplayValue(value, stations);
  if (normalized === "QUANTITY") return `${value} L`;

  return String(value);
}

export function normalizeApprovalStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function isPendingApprovalStatus(value) {
  return normalizeApprovalStatus(value) === "PENDING";
}

export function isApprovedApprovalStatus(value) {
  return normalizeApprovalStatus(value) === "APPROVED";
}

export function isApprovalFullyApproved(request) {
  const approvers = request?.approvalRoute?.requiredApprovers || [];
  return approvers.length > 0 && approvers.every((approver) => isApprovedApprovalStatus(approver.status));
}

export function isEmployeeTransferApproval(request) {
  return String(request?.type || "") === "employee_transfer";
}

export function isManagerEmployeeTransferApproval(request) {
  if (!isEmployeeTransferApproval(request)) return false;

  const approvers = request?.approvalRoute?.requiredApprovers || [];
  const reason = String(request?.payload?.transfer?.reason || request?.payload?.reason || request?.reason || "").toUpperCase();

  return Boolean(
    request?.payload?.transfer?.isManagerTransfer ||
      request?.payload?.isManagerTransfer ||
      request?.approvalRoute?.routeType === "admin_manager_transfer" ||
      request?.approvalRoute?.routeType === "admin" ||
      reason.includes("MANAGER_TRANSFER_ADMIN_APPROVAL") ||
      approvers.some((approver) =>
        String(approver?.approvalStage || "").toUpperCase().includes("ADMIN") ||
        ["Admin", "PlatformAdmin"].includes(approver?.role)
      )
  );
}


export function mapBackendOperationApprovalForFrontend(
  item = {},
  currentUser = {},
  assets = [],
  stations = [],
  t,
) {
  const operation = item.operation || item;
  const tr = (key, params = {}, fallback = "") =>
    resolveI18nMessage(t, { key, params, fallback }, fallback);
  const approvalTitleMessage = getOperationApprovalMessage(
    toFrontendOperationType(
      String(operation.type || item.type || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_"),
    ),
    operation.operationNo || item.operationNo || operation.id || item.operationId || item.id || "",
  );
  const operationId = operation.id || item.operationId || item.id || "";

  if (!operationId) return null;

  const normalizedType = String(operation.type || item.type || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const frontendType = toFrontendOperationType(normalizedType);
  const requestType = getOperationApprovalType(frontendType);
  const operationNo = operation.operationNo || item.operationNo || operationId;
  const quantity = operation.quantity ?? item.quantity ?? "";
  const sourceStationId = operation.sourceStationId || item.sourceStationId || "";
  const destinationStationId = operation.destinationStationId || item.destinationStationId || "";
  const assetId = operation.assetId || item.assetId || "";

  const sourceStationDisplay = sourceStationId
    ? getApprovalEntityDisplayValue("sourceStation", sourceStationId, { assets, stations })
    : operation.externalStationName || "-";

  const destinationStationDisplay = destinationStationId
    ? getApprovalEntityDisplayValue("destinationStation", destinationStationId, { assets, stations })
    : "-";

  const assetDisplay = assetId
    ? getApprovalEntityDisplayValue("asset", assetId, { assets, stations })
    : "-";

  const destinationDisplay = assetId
    ? assetDisplay
    : destinationStationDisplay;
  const requestedBy = operation.requestedBy || item.requestedBy || {};
  const rawApprovals = Array.isArray(operation.approvals)
    ? operation.approvals
    : Array.isArray(item.approvals)
    ? item.approvals
    : item.approverUserId
    ? [item]
    : [];

  const approvalStatusToFrontend = (value) => {
    const status = normalizeApprovalStatus(value);
    if (status === "APPROVED") return "Approved";
    if (status === "REJECTED") return "Rejected";
    return "Pending";
  };

  let requiredApprovers = rawApprovals.map((approval) => {
    const approverId = approval.approverUserId || approval.userId || approval.approver?.id || "";
    return {
      userId: approverId,
      userName:
        approval.approver?.fullName ||
        approval.approver?.name ||
        (approverId === currentUser?.id ? currentUser?.fullName : "") ||
        approval.approverName ||
        tr("workflowMessages.roles.projectManager", {}, "Project Manager"),
      role: "Manager",
      projectId: approval.projectId || operation.projectId || item.projectId || "-",
      approvalStage: approval.approvalStage || tr("workflowMessages.roles.projectManager", {}, "Project Manager"),
      status: approvalStatusToFrontend(approval.status),
      reviewedAt: approval.reviewedAt || "",
      reviewNote: approval.note || approval.reviewNote || "",
    };
  });

  if (!requiredApprovers.length && currentUser?.id && normalizeApprovalStatus(operation.status || item.status) === "PENDING") {
    requiredApprovers = [
      {
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.email || tr("workflowMessages.roles.projectManager", {}, "Project Manager"),
        role: "Manager",
        projectId: operation.projectId || item.projectId || "-",
        approvalStage: tr("workflowMessages.roles.projectManager", {}, "Project Manager"),
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      },
    ];
  }

  const hasPendingStageForCurrentUser = requiredApprovers.some(
    (approver) => approver.userId === currentUser?.id && isPendingApprovalStatus(approver.status)
  );

  const requestStatus = hasPendingStageForCurrentUser
    ? "Pending"
    : requiredApprovers.length && requiredApprovers.every((approver) => isApprovedApprovalStatus(approver.status))
    ? "Approved"
    : normalizeApprovalStatus(operation.status) === "REJECTED"
    ? "Rejected"
    : "Pending";

  const changedFields = [
    {
      field: "transactionType",
      label: tr("workflowMessages.fields.operationType", {}, "Operation Type"),
      oldValue: "-",
      newValue: frontendType || normalizedType || "Operation",
      sensitive: true,
    },
    {
      field: "sourceStation",
      label: tr("workflowMessages.fields.sourceStation", {}, "Source Station"),
      oldValue: "-",
      newValue: sourceStationDisplay,
      sensitive: true,
    },
    {
      field: "destinationId",
      label: assetId
        ? tr("workflowMessages.fields.asset", {}, "Asset")
        : tr("workflowMessages.fields.destinationStation", {}, "Destination Station"),
      oldValue: "-",
      newValue: destinationDisplay,
      sensitive: true,
    },
    {
      field: "dieselQuantity",
      label: tr("workflowMessages.fields.dieselQuantity", {}, "Diesel Quantity"),
      oldValue: "-",
      newValue: quantity === "" ? "-" : `${quantity} L`,
      sensitive: true,
    },
  ];

  if (operation.odometer !== undefined && operation.odometer !== null) {
    changedFields.push({
      field: "odometer",
      label: tr("workflowMessages.fields.odometer", {}, "Odometer / Hour Meter"),
      oldValue: "-",
      newValue: operation.odometer,
      sensitive: true,
    });
  }

  if (operation.stationCounter !== undefined && operation.stationCounter !== null) {
    changedFields.push({
      field: "stationCounter",
      label: tr("workflowMessages.fields.stationCounter", {}, "Station Counter"),
      oldValue: "-",
      newValue: operation.stationCounter,
      sensitive: true,
    });
  }

  if (operation.externalStationName) {
    changedFields.push({
      field: "externalStationName",
      label: normalizedType === "EXTERNAL_SUPPLY"
        ? tr("workflowMessages.fields.externalSupplier", {}, "External Supplier")
        : tr("workflowMessages.fields.externalStation", {}, "External Station"),
      oldValue: "-",
      newValue: operation.externalStationName,
      sensitive: false,
    });
  }

  if (operation.invoiceNumber) {
    changedFields.push({
      field: "invoiceNumber",
      label: tr("workflowMessages.fields.invoiceNumber", {}, "Invoice / Receipt Number"),
      oldValue: "-",
      newValue: operation.invoiceNumber,
      sensitive: false,
    });
  }

  return {
    id: `BACKEND-OPERATION-${operationId}`,
    backendOperationId: operationId,
    isBackendOperationApproval: true,
    type: requestType,
    module: "operations",
    title: resolveI18nMessage(t, approvalTitleMessage, approvalTitleMessage.fallback),
    titleKey: approvalTitleMessage.key,
    titleParams: approvalTitleMessage.params,
    titleFallback: approvalTitleMessage.fallback,
    payload: {
      operation,
      backendOperationId: operationId,
    },
    details: tr(
      "workflowMessages.approvals.operation.details",
      {
        quantity: quantity || "-",
        operationType: frontendType || normalizedType || "Operation",
        destination: destinationDisplay,
      },
      `${quantity || "-"} L - ${frontendType || normalizedType || "Operation"} - ${destinationDisplay}`,
    ),
    detailsKey: "workflowMessages.approvals.operation.details",
    detailsParams: {
      quantity: quantity || "-",
      operationType: frontendType || normalizedType || "Operation",
      destination: destinationDisplay,
    },
    status: requestStatus,
    changedFields,
    entityType: "Operation",
    entityId: operationNo,
    sensitivity: "Sensitive",
    riskLevel: "High",
    approvalRoute: {
      routeType: normalizedType === "EXTERNAL_TRANSFER" ? "dual_project_manager" : "single_project_manager",
      sourceProject: sourceStationDisplay,
      destinationProject: destinationDisplay,
      requiredApprovers,
      routeStatus: requestStatus,
    },
    requestedById: requestedBy.id || operation.requestedByUserId || item.requestedByUserId || "System",
    requestedByName: requestedBy.fullName || requestedBy.name || operation.requestedByUserId || "System",
    requestedByRole: requestedBy.role?.name || requestedBy.roleName || "System",
    requestedAt: operation.createdAt || item.createdAt || new Date().toISOString(),
    reviewedBy: "",
    reviewedAt: "",
    reviewNote: "",
  };

}

export function mapBackendOperationCorrectionForFrontend(item = {}, currentUser = {}, assets = [], stations = [], t) {
  const tr = (key, params = {}, fallback = "") =>
    resolveI18nMessage(t, { key, params, fallback }, fallback);
  const correctionId = item.id || "";
  const operation = item.operation || {};
  const operationId = item.operationId || operation.id || "";

  if (!correctionId || !operationId) return null;

  const fieldName = normalizeOperationCorrectionFieldName(item.fieldName);
  const operationNo = operation.operationNo || operationId;
  const requestedBy = item.requestedBy || {};
  const status = normalizeApprovalStatus(item.status);
  const isPending = status === "PENDING";
  const fieldLabel = getOperationCorrectionFieldLabel(fieldName, t);

  return {
    id: `BACKEND-OPERATION-CORRECTION-${correctionId}`,
    backendCorrectionId: correctionId,
    backendOperationId: operationId,
    isBackendOperationCorrection: true,
    type: "operation_correction",
    module: "operations",
    title: tr(
      "workflowMessages.approvals.operationCorrection.title",
      { operationNo },
      `Operation Correction - ${operationNo}`,
    ),
    titleKey: "workflowMessages.approvals.operationCorrection.title",
    titleParams: { operationNo },
    titleFallback: `Operation Correction - ${operationNo}`,
    payload: {
      correction: item,
      operation,
      backendCorrectionId: correctionId,
      backendOperationId: operationId,
    },
    details: tr(
      "workflowMessages.approvals.operationCorrection.details",
      { field: fieldLabel, operationNo },
      `${fieldLabel} correction for ${operationNo}`,
    ),
    detailsKey: "workflowMessages.approvals.operationCorrection.details",
    detailsParams: { field: fieldLabel, operationNo },
    status: isPending ? "Pending" : status === "APPROVED" ? "Approved" : "Rejected",
    changedFields: [
      {
        field: fieldName,
        label: fieldLabel,
        oldValue: getOperationCorrectionApprovalDisplayValue(fieldName, item.oldValue, assets, stations),
        newValue: getOperationCorrectionApprovalDisplayValue(fieldName, item.newValue, assets, stations),
        sensitive: ["ASSET_ID", "SOURCE_STATION_ID", "QUANTITY", "ODOMETER"].includes(fieldName),
      },
    ],
    entityType: "Operation",
    entityId: operationNo,
    sensitivity: "Sensitive",
    riskLevel: "High",
    approvalRoute: {
      routeType: "operation_correction_manager",
      sourceProject: operation.projectId || operation.sourceProjectId || "-",
      destinationProject: operation.projectId || operation.destinationProjectId || "-",
      requiredApprovers: isPending && ["Manager", "Admin", "PlatformAdmin"].includes(currentUser?.role)
        ? [
            {
              userId: currentUser.id,
              userName: currentUser.fullName || currentUser.email || "Manager",
              role: currentUser.role || "Manager",
              projectId: operation.projectId || "-",
              approvalStage: tr("workflowMessages.roles.managerReview", {}, "Manager Review"),
              status: "Pending",
              reviewedAt: "",
              reviewNote: "",
            },
          ]
        : [],
      routeStatus: isPending ? "Pending" : status,
    },
    requestedById: requestedBy.id || item.requestedByUserId || "System",
    requestedByName: requestedBy.fullName || requestedBy.name || item.requestedByUserId || "System",
    requestedByRole: requestedBy.role?.name || requestedBy.roleName || "Supervisor",
    requestedAt: item.createdAt || new Date().toISOString(),
    reviewedBy: item.reviewedBy?.fullName || "",
    reviewedAt: item.reviewedAt || "",
    reviewNote: item.reviewNote || "",
  };
}

export function normalizeApprovalValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function isSensitiveApprovalField(field) {
  const sensitiveFields = [
    "project",
    "capacity",
    "fuelTank",
    "fuelTankCapacity",
    "odometer",
    "dieselQuantity",
    "openingBalance",
    "price",
    "status",
    "delete",
  ];

  return sensitiveFields.some((item) =>
    String(field || "").toLowerCase().includes(String(item).toLowerCase())
  );
}

export function buildApprovalChangedFields({ type, payload = {} }) {
  if (Array.isArray(payload.changedFields)) {
    return payload.changedFields.map((item) => ({
      field: item.field,
      label: item.label || makeFieldLabel(item.field),
      labelKey: item.labelKey || "",
      labelParams: item.labelParams || {},
      labelFallback:
        item.labelFallback || item.label || makeFieldLabel(item.field),
      oldValue: normalizeApprovalValue(item.oldValue),
      newValue: normalizeApprovalValue(item.newValue),
      sensitive: item.sensitive ?? isSensitiveApprovalField(item.field),
    }));
  }

  if (payload.field) {
    return [
      {
        field: payload.field,
        label: makeFieldLabel(payload.field),
        oldValue: normalizeApprovalValue(payload.oldValue),
        newValue: normalizeApprovalValue(payload.newValue),
        sensitive: isSensitiveApprovalField(payload.field),
      },
    ];
  }

  if (payload.action === "delete") {
    return [
      {
        field: "delete",
        label: "Delete Request",
        oldValue: normalizeApprovalValue(payload.id),
        newValue: "Requested Deletion",
        sensitive: true,
      },
    ];
  }

  if (type === "operation_external_supply" && payload.operation) {
    const operation = payload.operation;
    return [
      {
        field: "transactionType",
        label: tr("workflowMessages.fields.operationType", {}, "Operation Type"),
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.transactionType),
        sensitive: true,
      },
      {
        field: "sourceStation",
        label: tr("workflowMessages.fields.sourceStation", {}, "Source Station"),
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.sourceStation),
        sensitive: false,
      },
      {
        field: "destinationId",
        label: "Destination",
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.destinationId),
        sensitive: false,
      },
      {
        field: "dieselQuantity",
        label: tr("workflowMessages.fields.dieselQuantity", {}, "Diesel Quantity"),
        oldValue: "-",
        newValue: `${normalizeApprovalValue(operation.dieselQuantity)} L`,
        sensitive: true,
      },
    ];
  }

  if (
    ["operation_external_direct_refuel", "operation_external_supply", "operation_external_transfer"].includes(type) &&
    payload.operation
  ) {
    const operation = payload.operation;
    const changedFields = [
      {
        field: "transactionType",
        label: tr("workflowMessages.fields.operationType", {}, "Operation Type"),
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.transactionType),
        sensitive: true,
      },
      {
        field: "sourceStation",
        label: tr("workflowMessages.fields.sourceStation", {}, "Source Station"),
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.sourceStation),
        sensitive: true,
      },
      {
        field: "destinationId",
        label: "Destination",
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.destinationId),
        sensitive: true,
      },
      {
        field: "dieselQuantity",
        label: tr("workflowMessages.fields.dieselQuantity", {}, "Diesel Quantity"),
        oldValue: "-",
        newValue: `${normalizeApprovalValue(operation.dieselQuantity)} L`,
        sensitive: true,
      },
    ];

    if (type === "operation_external_transfer") {
      changedFields.push({
        field: "project",
        label: "Project Transfer",
        oldValue: normalizeApprovalValue(payload.sourceProject || operation.sourceProject),
        newValue: normalizeApprovalValue(payload.destinationProject || operation.destinationProject),
        sensitive: true,
      });
    }

    return changedFields;
  }

  return [];
}

export function inferApprovalEntity({ type, payload = {} }) {
  if (payload.entity || payload.id) {
    return {
      entityType: payload.entity || payload.entityType || "Record",
      entityId: payload.id || payload.entityId || "-",
    };
  }

  if (
    ["operation_external_direct_refuel", "operation_external_supply", "operation_external_transfer"].includes(type) &&
    payload.operation
  ) {
    return {
      entityType: "Operation",
      entityId: payload.operation.operationId || "New Operation",
    };
  }

  return {
    entityType: payload.entityType || "Request",
    entityId: payload.entityId || "-",
  };
}

export function extractApprovalProjects({ payload = {}, changedFields = [] }) {
  const projectField = changedFields.find((field) =>
    ["project", "projectName", "assignedProject", "project_id"].includes(field.field)
  );

  if (projectField) {
    return {
      sourceProject: projectField.oldValue && projectField.oldValue !== "-" ? projectField.oldValue : "",
      destinationProject: projectField.newValue && projectField.newValue !== "-" ? projectField.newValue : "",
      isTransfer: Boolean(projectField.oldValue && projectField.newValue && projectField.oldValue !== projectField.newValue),
    };
  }

  const valuesProject =
    payload?.values?.projectId ||
    payload?.values?.project ||
    payload?.values?.projectName ||
    payload?.projectId ||
    payload?.project ||
    payload?.projectName ||
    "";

  return {
    sourceProject: valuesProject,
    destinationProject: valuesProject,
    isTransfer: false,
  };
}

export function getProjectScopeValues(user, key = "managedProjects") {
  if (!user || !Array.isArray(user[key])) return [];
  return user[key];
}

export function projectMatchesScope(projectValue, scopeValue, projects = []) {
  if (!projectValue || !scopeValue) return false;
  if (scopeValue === "All") return true;

  const normalizedProjectValue = normalizeScopeValue(projectValue);
  const normalizedScopeValue = normalizeScopeValue(scopeValue);

  if (normalizedProjectValue === normalizedScopeValue) return true;

  const matchedProject = projects.find((project) => {
    const projectCandidates = [
      project?.id,
      project?.name,
      project?.code,
      project?.projectId,
      project?.projectName,
    ].map(normalizeScopeValue);

    return projectCandidates.includes(normalizedProjectValue);
  });

  if (!matchedProject) return false;

  const matchedProjectCandidates = [
    matchedProject?.id,
    matchedProject?.name,
    matchedProject?.code,
    matchedProject?.projectId,
    matchedProject?.projectName,
  ].map(normalizeScopeValue);

  return matchedProjectCandidates.includes(normalizedScopeValue);
}

export function findManagerForProject(projectValue, users = [], projects = []) {
  const activeManagers = users.filter((user) => user.role === "Manager" && user.status === "Active");

  if (!activeManagers.length) {
    return users.find((user) => user.role === "Admin" && user.status === "Active") || null;
  }

  if (!projectValue || projectValue === "-") {
    return activeManagers.find((user) => getProjectScopeValues(user).includes("All")) || activeManagers[0];
  }

  return (
    activeManagers.find((manager) =>
      getProjectScopeValues(manager).some((projectScope) => projectMatchesScope(projectValue, projectScope, projects))
    ) ||
    activeManagers.find((user) => getProjectScopeValues(user).includes("All")) ||
    activeManagers[0]
  );
}

export function getReportingManagerForUser(user, users = [], projects = [], fallbackProject = "") {
  const directManager = users.find(
    (item) => item.id === user?.reportingManagerId && item.role === "Manager" && item.status === "Active"
  );

  return directManager || findManagerForProject(fallbackProject, users, projects);
}

export function findStrictProjectManagerForProject(projectValue, users = [], projects = []) {
  if (!projectValue || projectValue === "-") return null;

  const normalizedProjectValue = normalizeScopeValue(projectValue);

  const matchedProject = (projects || []).find((project) => {
    const candidates = [
      project?.backendId,
      project?.id,
      project?.name,
      project?.code,
      project?.projectId,
      project?.projectName,
    ].map(normalizeScopeValue);

    return candidates.includes(normalizedProjectValue);
  });

  if (!matchedProject) return null;

  const explicitManagerId =
    matchedProject?.projectManagerId ||
    matchedProject?.managerUserId ||
    matchedProject?.managerId ||
    matchedProject?.projectManager?.id ||
    "";

  if (explicitManagerId) {
    const explicitManager = (users || []).find(
      (user) =>
        normalizeScopeValue(user?.id) === normalizeScopeValue(explicitManagerId) &&
        user?.role === "Manager" &&
        user?.status === "Active"
    );

    if (explicitManager) return explicitManager;

    return {
      id: explicitManagerId,
      fullName:
        matchedProject?.projectManagerName ||
        matchedProject?.managerName ||
        matchedProject?.projectManager?.fullName ||
        tr("workflowMessages.roles.projectManager", {}, "Project Manager"),
      email:
        matchedProject?.projectManagerEmail ||
        matchedProject?.projectManager?.email ||
        "",
      role: "Manager",
      status: "Active",
    };
  }

  return null;
}

export function buildApprovalRoute({ requestedBy, users = [], projects = [], payload = {}, changedFields = [] }) {
  const { sourceProject, destinationProject, isTransfer } = extractApprovalProjects({ payload, changedFields });

  if (isTransfer && sourceProject && destinationProject) {
    const sourceManager = findManagerForProject(sourceProject, users, projects);
    const destinationManager = findManagerForProject(destinationProject, users, projects);

    const approvers = [
      sourceManager && {
        userId: sourceManager.id,
        userName: sourceManager.fullName,
        role: "Manager",
        projectId: sourceProject,
        approvalStage: "Source Project Manager",
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      },
      destinationManager && {
        userId: destinationManager.id,
        userName: destinationManager.fullName,
        role: "Manager",
        projectId: destinationProject,
        approvalStage: "Destination Project Manager",
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      },
    ]
      .filter(Boolean)
      .filter((approver, index, list) =>
        list.findIndex((item) => item.userId === approver.userId && item.approvalStage === approver.approvalStage) === index
      );

    return {
      routeType: "dual_project_manager",
      sourceProject,
      destinationProject,
      requiredApprovers: approvers,
      routeStatus: "Pending",
    };
  }

  const projectForApproval =
    destinationProject ||
    sourceProject ||
    payload?.projectId ||
    payload?.project ||
    payload?.projectName ||
    "";

  if (payload?.approvalRouteStrategy === "admin") {
    const adminApprovers = (users || []).filter(
      (user) =>
        ["Admin", "PlatformAdmin"].includes(user?.role) &&
        user?.status === "Active"
    );

    return {
      routeType: "admin",
      sourceProject: projectForApproval,
      destinationProject: projectForApproval,
      requiredApprovers: adminApprovers.map((admin) => ({
        userId: admin.id,
        userName: admin.fullName || admin.email || "Admin",
        role: "Admin",
        projectId: projectForApproval || "-",
        approvalStage: "Admin Approval",
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      })),
      routeStatus: "Pending",
    };
  }

  // Some approvals must be routed to the manager responsible for a specific project,
  // not only to the requester's direct reporting manager.
  // Example: External Supply is diesel coming from an external supplier into a station,
  // so the approval must go to the destination station project manager.
  const manager =
    payload?.approvalRouteStrategy === "project_manager"
      ? findStrictProjectManagerForProject(projectForApproval, users, projects)
      : getReportingManagerForUser(requestedBy, users, projects, projectForApproval);

  return {
    routeType: payload?.approvalRouteStrategy === "project_manager" ? "single_project_manager" : "single_manager",
    sourceProject: projectForApproval,
    destinationProject: projectForApproval,
    requiredApprovers: manager
      ? [
          {
            userId: manager.id,
            userName: manager.fullName,
            role: "Manager",
            projectId: projectForApproval || "-",
            approvalStage: "Direct Manager",
            status: "Pending",
            reviewedAt: "",
            reviewNote: "",
          },
        ]
      : [],
    routeStatus: "Pending",
  };
}

export function createApprovalRequest({
  type,
  module,
  title,
  titleKey = "",
  titleParams = {},
  titleFallback = "",
  payload,
  requestedBy,
  details,
  detailsKey = "",
  detailsParams = {},
  detailsFallback = "",
  users = [],
  projects = [],
}) {
  const changedFields = buildApprovalChangedFields({ type, payload });
  const sensitive = changedFields.some((item) => item.sensitive);
  const entityInfo = inferApprovalEntity({ type, payload });
  const approvalRoute = buildApprovalRoute({ requestedBy, users, projects, payload, changedFields });

  return {
    id: `APR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    module,
    title,
    titleKey,
    titleParams,
    titleFallback: titleFallback || title || "",
    payload,
    details,
    detailsKey,
    detailsParams,
    detailsFallback: detailsFallback || details || "",
    status: "Pending",
    changedFields,
    entityType: entityInfo.entityType,
    entityId: entityInfo.entityId,
    sensitivity: sensitive ? "Sensitive" : "Normal",
    riskLevel: sensitive ? "High" : "Standard",
    approvalRoute,
    requestedById: requestedBy?.id || "System",
    requestedByName: requestedBy?.fullName || requestedBy?.name || "System",
    requestedByRole: requestedBy?.role || "System",
    requestedAt: new Date().toISOString(),
    reviewedBy: "",
    reviewedAt: "",
    reviewNote: "",
  };
}
