import {
  canUserViewApproval,
  canUserReviewApproval,
} from "./permissionHelpers";

import {
  isPendingApprovalStatus,
} from "./approvalHelpers";

import { createI18nMessage, createEnumI18nMessage } from "./i18nMessageHelpers";

export function formatNotificationDate(rawDate, language = "en") {
  if (!rawDate) return "-";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return rawDate;

  return d.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNotificationPriority(item) {
  if (!item) return "Normal";
  if (item.status === "Pending" && item.sensitivity === "Sensitive") return "High";
  if (item.status === "Pending") return "Medium";
  if (item.status === "Rejected") return "High";
  return "Normal";
}

function withDescriptor(record, field, descriptor) {
  if (!descriptor) return record;
  return {
    ...record,
    [`${field}Key`]: descriptor.key,
    [`${field}Params`]: descriptor.params,
    [`${field}EnumParams`]: descriptor.enumParams || {},
    [`${field}Fallback`]: descriptor.fallback,
  };
}

function statusDescriptor(status) {
  return createEnumI18nMessage(
    "approvalStatus",
    status,
    String(status || "-"),
  );
}

function moduleDescriptor(module) {
  const value = String(module || "").trim();
  const normalized = value.toLowerCase();
  const known = new Set([
    "operations",
    "assets",
    "stations",
    "team",
    "projects",
    "reports",
    "approvals",
    "notifications",
    "auth",
    "companies",
  ]);

  return known.has(normalized)
    ? createI18nMessage(`notifications.modules.${normalized}`, {}, value)
    : createI18nMessage("notifications.modules.generic", { module: value || "-" }, value || "-");
}

function entityDescriptor(entityType) {
  const value = String(entityType || "").trim();
  const normalized = value.toLowerCase();

  let key = "request";
  if (normalized.includes("operation correction")) key = "operationCorrection";
  else if (normalized.includes("operation")) key = "operation";
  else if (normalized.includes("asset")) key = "asset";
  else if (normalized.includes("station")) key = "station";
  else if (normalized.includes("employee")) key = "employee";
  else if (normalized.includes("project")) key = "project";
  else if (normalized.includes("activity")) key = "activity";

  return createI18nMessage(`notifications.entities.${key}`, {}, value || "Request");
}

function categoryDescriptor(kind) {
  const map = {
    required: ["approvalRequired", "Approval Required"],
    update: ["approvalUpdate", "Approval Update"],
    activity: ["myActivity", "My Activity"],
  };
  const [key, fallback] = map[kind];
  return createI18nMessage(`notifications.categories.${key}`, {}, fallback);
}

function approvalTitleDescriptor({ needsDecision, isOwnRequest, userIsApprover, item }) {
  const requestTitleFallback =
    item?.titleFallback ||
    item?.title ||
    "Approval Request";

  const requestTitle =
    item?.titleKey
      ? createI18nMessage(
          item.titleKey,
          item.titleParams || {},
          requestTitleFallback,
        )
      : requestTitleFallback;

  const status = String(item?.status || "").toLowerCase();

  if (needsDecision) {
    return createI18nMessage(
      "notifications.workflow.approvalRequired",
      { requestTitle },
      `Approval required: ${requestTitleFallback}`,
    );
  }

  if (isOwnRequest) {
    const key =
      status === "approved"
        ? "yourRequestApproved"
        : status === "rejected"
        ? "yourRequestRejected"
        : "yourRequestPending";
    return createI18nMessage(
      `notifications.workflow.${key}`,
      { requestTitle },
      `Your request is ${item?.status || "Pending"}: ${requestTitleFallback}`,
    );
  }

  if (userIsApprover) {
    const key =
      status === "approved"
        ? "approvalApproved"
        : status === "rejected"
        ? "approvalRejected"
        : "approvalPending";
    return createI18nMessage(
      `notifications.workflow.${key}`,
      { requestTitle },
      `${item?.status || "Pending"}: ${requestTitle}`,
    );
  }

  return null;
}

function normalizeOperationType(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function approvalMessageDescriptor(item) {
  const operationType = normalizeOperationType(
    item?.payload?.operation?.type ||
      item?.payload?.operation?.transactionType ||
      item?.operation?.type,
  );

  if (
    item?.detailsKey === "workflowMessages.approvals.operation.details" &&
    operationType
  ) {
    const map = {
      DIRECT_REFUEL: "directRefuel",
      EXTERNAL_DIRECT_REFUEL: "externalDirectRefuel",
      INTERNAL_TRANSFER: "internalTransfer",
      EXTERNAL_SUPPLY: "externalSupply",
      EXTERNAL_TRANSFER: "externalTransfer",
    };

    const typeKey = map[operationType] || "generic";

    return createI18nMessage(
      `notifications.workflow.operationDetails.${typeKey}`,
      {
        quantity: item?.detailsParams?.quantity ?? "-",
        destination: item?.detailsParams?.destination ?? "-",
      },
      item?.details || "Approval workflow update.",
    );
  }

  if (item?.detailsKey) {
    return createI18nMessage(
      item.detailsKey,
      item.detailsParams || {},
      item.detailsFallback || item.details || "Approval workflow update.",
    );
  }

  return createI18nMessage(
    "notifications.workflow.approvalUpdate",
    {},
    item?.details || "Approval workflow update.",
  );
}

function extractOperationNo(value) {
  const match = String(value || "").match(/\bOP-\d+\b/i);
  return match?.[0] || "";
}

function legacyActivityDescriptors(item) {
  const action = String(item?.action || "").trim();
  const operationNo =
    item?.actionParams?.operationNo ||
    item?.detailsParams?.operationNo ||
    extractOperationNo(item?.details);

  const map = {
    "Approve Operation Request": ["approveOperationRequest", "operationRequestApproved"],
    "Reject Operation Request": ["rejectOperationRequest", "operationRequestRejected"],
    "Approve Operation Correction": ["approveOperationCorrection", "operationCorrectionApproved"],
    "Reject Operation Correction": ["rejectOperationCorrection", "operationCorrectionRejected"],
    "Submit Approval Request": ["submitApprovalRequest", "approvalRequestSubmitted"],
    "Approve Request": ["approveRequest", "requestApproved"],
    "Approve Request Stage": ["approveRequestStage", "requestStageApproved"],
    "Reject Request": ["rejectRequest", "requestRejected"],
    Login: ["login", "login"],
    Logout: ["logout", "logout"],
    "Change Password": ["changePassword", "passwordChanged"],
  };

  const mapped = map[action];
  if (!mapped) {
    return {
      title: createI18nMessage("", {}, action),
      message: createI18nMessage("", {}, item?.details || ""),
    };
  }

  const params = operationNo ? { operationNo } : {};
  return {
    title: createI18nMessage(
      `notifications.activity.actions.${mapped[0]}`,
      params,
      action,
    ),
    message: createI18nMessage(
      `notifications.activity.details.${mapped[1]}`,
      params,
      item?.details || "",
    ),
  };
}

function activityDescriptors(item) {
  const legacy = legacyActivityDescriptors(item);

  return {
    title: item?.actionKey
      ? createI18nMessage(
          item.actionKey,
          item.actionParams || {},
          item.actionFallback || item.action || legacy.title.fallback,
          { enumParams: item.actionEnumParams || {} },
        )
      : legacy.title,
    message: item?.detailsKey
      ? createI18nMessage(
          item.detailsKey,
          item.detailsParams || {},
          item.detailsFallback || item.details || legacy.message.fallback,
          { enumParams: item.detailsEnumParams || {} },
        )
      : legacy.message,
  };
}


function pushDetail(list, labelKey, value, options = {}) {
  const normalizedValue =
    value === null || value === undefined || value === "" ? null : value;

  if (normalizedValue === null) return list;

  const enumDescriptor = options.enumGroup
    ? createEnumI18nMessage(
        options.enumGroup,
        normalizedValue,
        String(normalizedValue),
      )
    : null;

  list.push({
    labelKey,
    labelFallback: options.labelFallback || "",
    value: normalizedValue,
    valueKey: enumDescriptor?.key || options.valueKey || "",
    valueParams: enumDescriptor?.params || options.valueParams || {},
    valueFallback:
      enumDescriptor?.fallback ??
      options.valueFallback ??
      (typeof normalizedValue === "string" || typeof normalizedValue === "number"
        ? String(normalizedValue)
        : ""),
    emphasis: options.emphasis || "normal",
  });

  return list;
}

function getApprovalNotificationDetails(item = {}) {
  const details = [];
  const entityType = String(item?.entityType || "").toLowerCase();

  const requestTitle = item?.title || item?.titleFallback || "";
  const entityId = item?.entityId || item?.id || "";

  if (entityType.includes("operation")) {
    const operation =
      item?.payload?.operation ||
      item?.operation ||
      {};

    const operationNo =
      entityId ||
      operation?.operationNo ||
      operation?.operationId ||
      operation?.id ||
      "";

    const operationType =
      operation?.type ||
      operation?.transactionType ||
      item?.detailsParams?.operationType ||
      "";

    const project =
      operation?.projectName ||
      operation?.project ||
      item?.payload?.projectName ||
      item?.payload?.project ||
      "";

    pushDetail(
      details,
      "notifications.detailLabels.operationNumber",
      operationNo,
      { emphasis: "strong" },
    );

    if (operationType) {
      pushDetail(
        details,
        "notifications.detailLabels.operationType",
        operationType,
        { enumGroup: "operationType" },
      );
    }

    if (project) {
      pushDetail(
        details,
        "notifications.detailLabels.project",
        project,
      );
    }

    return details;
  }

  if (entityType.includes("asset")) {
    const asset =
      item?.payload?.asset ||
      item?.payload?.entity ||
      {};

    const assetId =
      entityId ||
      asset?.assetId ||
      asset?.equipmentNo ||
      asset?.id ||
      "";

    const fromProject =
      item?.payload?.fromProjectName ||
      item?.payload?.fromProject ||
      item?.detailsParams?.fromProject ||
      "";

    const toProject =
      item?.payload?.toProjectName ||
      item?.payload?.toProject ||
      item?.detailsParams?.toProject ||
      "";

    const project =
      asset?.project ||
      asset?.projectName ||
      item?.payload?.project ||
      item?.payload?.projectName ||
      "";

    pushDetail(
      details,
      "notifications.detailLabels.assetNumber",
      assetId,
      { emphasis: "strong" },
    );

    if (fromProject || toProject) {
      pushDetail(
        details,
        "notifications.detailLabels.fromProject",
        fromProject,
      );
      pushDetail(
        details,
        "notifications.detailLabels.toProject",
        toProject,
      );
    } else if (project) {
      pushDetail(
        details,
        "notifications.detailLabels.project",
        project,
      );
    }

    return details;
  }

  if (entityType.includes("station")) {
    const station =
      item?.payload?.station ||
      item?.payload?.entity ||
      {};

    const stationId =
      entityId ||
      station?.stationId ||
      station?.code ||
      station?.id ||
      "";

    const project =
      station?.project ||
      station?.projectName ||
      item?.payload?.project ||
      item?.payload?.projectName ||
      "";

    pushDetail(
      details,
      "notifications.detailLabels.stationNumber",
      stationId,
      { emphasis: "strong" },
    );
    pushDetail(
      details,
      "notifications.detailLabels.project",
      project,
    );

    return details;
  }

  if (entityType.includes("employee")) {
    const employee =
      item?.payload?.employee ||
      item?.payload?.entity ||
      {};

    const employeeId =
      entityId ||
      employee?.employeeId ||
      employee?.code ||
      employee?.id ||
      "";

    const employeeName =
      employee?.name ||
      employee?.fullName ||
      item?.payload?.employeeName ||
      "";

    const project =
      employee?.project ||
      employee?.projectName ||
      item?.payload?.project ||
      item?.payload?.projectName ||
      "";

    pushDetail(
      details,
      "notifications.detailLabels.employeeNumber",
      employeeId,
      { emphasis: "strong" },
    );
    pushDetail(
      details,
      "notifications.detailLabels.employeeName",
      employeeName,
    );
    pushDetail(
      details,
      "notifications.detailLabels.project",
      project,
    );

    return details;
  }

  if (entityType.includes("project")) {
    const projectName =
      item?.payload?.projectName ||
      item?.payload?.project ||
      requestTitle ||
      entityId ||
      "";

    pushDetail(
      details,
      "notifications.detailLabels.project",
      projectName,
      { emphasis: "strong" },
    );

    return details;
  }

  pushDetail(
    details,
    "notifications.detailLabels.request",
    requestTitle,
    { emphasis: "strong" },
  );

  if (entityId) {
    pushDetail(
      details,
      "notifications.detailLabels.referenceNumber",
      entityId,
    );
  }

  return details;
}

function getActivityNotificationDetails(item = {}) {
  const details = [];

  const requestTitle =
    item?.detailsParams?.requestTitle ||
    item?.actionParams?.requestTitle ||
    "";

  const entityType =
    item?.detailsParams?.entityType ||
    item?.actionParams?.entityType ||
    "";

  const entityId =
    item?.detailsParams?.entityId ||
    item?.actionParams?.entityId ||
    "";

  const assetId =
    item?.detailsParams?.assetId ||
    item?.actionParams?.assetId ||
    "";

  const fromProject =
    item?.detailsParams?.fromProject ||
    item?.actionParams?.fromProject ||
    "";

  const toProject =
    item?.detailsParams?.toProject ||
    item?.actionParams?.toProject ||
    "";

  const project =
    item?.detailsParams?.project ||
    item?.actionParams?.project ||
    "";

  const operationNo =
    item?.detailsParams?.operationNo ||
    item?.actionParams?.operationNo ||
    extractOperationNo(item?.details) ||
    "";

  if (operationNo) {
    pushDetail(
      details,
      "notifications.detailLabels.operationNumber",
      operationNo,
      { emphasis: "strong" },
    );
  }

  if (assetId) {
    pushDetail(
      details,
      "notifications.detailLabels.assetNumber",
      assetId,
      { emphasis: "strong" },
    );
  }

  if (requestTitle) {
    pushDetail(
      details,
      "notifications.detailLabels.request",
      requestTitle,
      { emphasis: details.length ? "normal" : "strong" },
    );
  }

  if (entityType && !["Activity", "activity"].includes(entityType)) {
    pushDetail(
      details,
      "notifications.detailLabels.requestType",
      entityType,
    );
  }

  if (entityId && entityId !== item?.id) {
    pushDetail(
      details,
      "notifications.detailLabels.referenceNumber",
      entityId,
    );
  }

  if (fromProject || toProject) {
    pushDetail(
      details,
      "notifications.detailLabels.fromProject",
      fromProject,
    );
    pushDetail(
      details,
      "notifications.detailLabels.toProject",
      toProject,
    );
  } else if (project) {
    pushDetail(
      details,
      "notifications.detailLabels.project",
      project,
    );
  }

  return details;
}

export function buildNotificationItems({
  approvals = [],
  activityLog = [],
  currentUser,
  readMap = {},
}) {
  const visibleApprovals = approvals.filter((item) =>
    canUserViewApproval(currentUser, item),
  );

  const approvalNotifications = visibleApprovals
    .map((item) => {
      const needsDecision = canUserReviewApproval(currentUser, item);
      const isOwnRequest = item.requestedById === currentUser?.id;
      const userIsApprover = item.approvalRoute?.requiredApprovers?.some(
        (approver) =>
          approver.userId === currentUser?.id &&
          isPendingApprovalStatus(approver.status),
      );

      const title = approvalTitleDescriptor({
        needsDecision,
        isOwnRequest,
        userIsApprover,
        item,
      });

      if (!title) return null;

      const message = approvalMessageDescriptor(item);

      let record = {
        id: `NTF-APR-${item.id}`,
        sourceId: item.id,
        type: "approval",

        // Stable raw values used by routing/filtering/business logic.
        category: needsDecision ? "Approval Required" : "Approval Update",
        module: item.module,
        status: item.status,
        priority: getNotificationPriority(item),
        entityType: item.entityType,

        title: title.fallback,
        message: message.fallback,
        entityId: item.entityId,
        details: getApprovalNotificationDetails(item),
        createdAt: item.reviewedAt || item.requestedAt,
        read: Boolean(readMap[`NTF-APR-${item.id}`]),
        route: "approvals",
        actionable: needsDecision,
      };

      record = withDescriptor(
        record,
        "category",
        categoryDescriptor(needsDecision ? "required" : "update"),
      );
      record = withDescriptor(record, "module", moduleDescriptor(item.module));
      record = withDescriptor(record, "title", title);
      record = withDescriptor(record, "message", message);
      record = withDescriptor(record, "status", statusDescriptor(item.status));
      record = withDescriptor(record, "entityType", entityDescriptor(item.entityType));

      return record;
    })
    .filter(Boolean);

  const visibleActivities = activityLog
    .filter((item) => item.userId === currentUser?.id)
    .slice(0, 8)
    .map((item) => {
      const descriptors = activityDescriptors(item);

      let record = {
        id: `NTF-ACT-${item.id}`,
        sourceId: item.id,
        type: "activity",

        // Stable raw values.
        category: "My Activity",
        module: item.module,
        status: "Info",
        priority: "Normal",
        entityType: "Activity",

        title: descriptors.title.fallback,
        message: descriptors.message.fallback,
        entityId: item.id,

        // Human-readable context for approval/review activity.
        relatedTitle:
          item?.detailsParams?.requestTitle ||
          item?.actionParams?.requestTitle ||
          "",
        relatedEntityType:
          item?.detailsParams?.entityType ||
          item?.actionParams?.entityType ||
          "",
        relatedEntityId:
          item?.detailsParams?.entityId ||
          item?.actionParams?.entityId ||
          "",
        relatedStage:
          item?.detailsParams?.stage ||
          item?.actionParams?.stage ||
          "",

        details: getActivityNotificationDetails(item),

        createdAt: item.createdAt,
        read: Boolean(readMap[`NTF-ACT-${item.id}`]),
        route: item.module,
        actionable: false,
      };

      record = withDescriptor(record, "category", categoryDescriptor("activity"));
      record = withDescriptor(record, "module", moduleDescriptor(item.module));
      record = withDescriptor(record, "title", descriptors.title);
      record = withDescriptor(record, "message", descriptors.message);
      record = withDescriptor(record, "status", statusDescriptor("Info"));
      record = withDescriptor(record, "entityType", entityDescriptor("Activity"));

      return record;
    });

  return [...approvalNotifications, ...visibleActivities].sort((a, b) => {
    const da = new Date(a.createdAt)?.getTime() || 0;
    const db = new Date(b.createdAt)?.getTime() || 0;
    return db - da;
  });
}
