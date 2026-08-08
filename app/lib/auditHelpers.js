import { canUserViewApproval } from "./permissionHelpers";
import { createI18nMessage, createEnumI18nMessage } from "./i18nMessageHelpers";

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

function sourceDescriptor(source) {
  const normalized = String(source || "").trim().toLowerCase();

  if (normalized === "activity") {
    return createI18nMessage(
      "auditTimeline.sources.activity",
      {},
      "Activity",
    );
  }

  if (normalized === "approval") {
    return createI18nMessage(
      "auditTimeline.sources.approval",
      {},
      "Approval",
    );
  }

  if (normalized === "approval review") {
    return createI18nMessage(
      "auditTimeline.sources.approvalReview",
      {},
      "Approval Review",
    );
  }

  return createI18nMessage(
    "auditTimeline.sources.generic",
    { source: source || "-" },
    source || "-",
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
    "system",
  ]);

  return known.has(normalized)
    ? createI18nMessage(
        `auditTimeline.modules.${normalized}`,
        {},
        value || "system",
      )
    : createI18nMessage(
        "auditTimeline.modules.generic",
        { module: value || "-" },
        value || "-",
      );
}

function statusDescriptor(status) {
  return createEnumI18nMessage("approvalStatus", status, String(status || "-"));
}

function riskDescriptor(risk) {
  return createEnumI18nMessage("risk", risk, String(risk || "-"));
}

function sensitivityDescriptor(sensitivity) {
  return createEnumI18nMessage(
    "sensitivity",
    sensitivity,
    String(sensitivity || "-"),
  );
}

function entityTypeDescriptor(entityType) {
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

  return createI18nMessage(
    `auditTimeline.entities.${key}`,
    {},
    value || "Request",
  );
}

function actorRoleDescriptor(role) {
  const value = String(role || "").trim();
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, "");

  const map = {
    platformadmin: ["platformAdmin", "Platform Admin"],
    admin: ["admin", "Admin"],
    manager: ["manager", "Manager"],
    officer: ["officer", "Officer"],
    supervisor: ["supervisor", "Supervisor"],
    operator: ["operator", "Operator"],
    topmanagement: ["topManagement", "Top Management"],
    system: ["system", "System"],
    "manager/admin": ["managerAdmin", "Manager / Admin"],
  };

  if (String(value).toLowerCase() === "manager / admin") {
    return createI18nMessage(
      "auditTimeline.roles.managerAdmin",
      {},
      "Manager / Admin",
    );
  }

  const match = map[normalized];

  return match
    ? createI18nMessage(
        `auditTimeline.roles.${match[0]}`,
        {},
        match[1],
      )
    : createI18nMessage(
        "auditTimeline.roles.generic",
        { role: value || "-" },
        value || "-",
      );
}

function legacyActivityTitleDescriptor(item) {
  if (item?.actionKey) {
    return createI18nMessage(
      item.actionKey,
      item.actionParams || {},
      item.actionFallback || item.action || "Activity",
    );
  }

  const action = String(item?.action || "").trim();
  const knownActionMap = {
    "Approve Operation Request":
      "notifications.activity.actions.approveOperationRequest",
    "Reject Operation Request":
      "notifications.activity.actions.rejectOperationRequest",
    "Approve Operation Correction":
      "notifications.activity.actions.approveOperationCorrection",
    "Reject Operation Correction":
      "notifications.activity.actions.rejectOperationCorrection",
    "Submit Approval Request":
      "notifications.activity.actions.submitApprovalRequest",
    "Approve Request":
      "notifications.activity.actions.approveRequest",
    "Approve Request Stage":
      "notifications.activity.actions.approveRequestStage",
    "Reject Request":
      "notifications.activity.actions.rejectRequest",
    Login:
      "notifications.activity.actions.login",
    Logout:
      "notifications.activity.actions.logout",
    "Change Password":
      "notifications.activity.actions.changePassword",
  };

  const key = knownActionMap[action];

  return key
    ? createI18nMessage(key, {}, action)
    : createI18nMessage(
        "auditTimeline.activity.genericTitle",
        { action: action || "Activity" },
        action || "Activity",
      );
}

function legacyActivityDescriptionDescriptor(item) {
  if (item?.detailsKey) {
    return createI18nMessage(
      item.detailsKey,
      item.detailsParams || {},
      item.detailsFallback || item.details || "",
    );
  }

  return createI18nMessage(
    "auditTimeline.activity.genericDescription",
    { description: item?.details || "System activity recorded." },
    item?.details || "System activity recorded.",
  );
}

function approvalRequestTitleDescriptor(item) {
  return createI18nMessage(
    "auditTimeline.events.approvalRequested",
    {
      requestTitle: item?.title || "Approval Request",
    },
    `Approval requested: ${item?.title || "Approval Request"}`,
  );
}

function approvalRequestDescriptionDescriptor(item) {
  if (item?.detailsKey) {
    return createI18nMessage(
      item.detailsKey,
      item.detailsParams || {},
      item.detailsFallback || item.details || "Approval request submitted.",
    );
  }

  return createI18nMessage(
    "auditTimeline.events.approvalRequestSubmitted",
    {},
    item?.details || "Approval request submitted.",
  );
}

function approvalReviewTitleDescriptor(item) {
  const status = String(item?.status || "Reviewed");

  if (status === "Approved") {
    return createI18nMessage(
      "auditTimeline.events.approvalApproved",
      { requestTitle: item?.title || "Approval Request" },
      `Approved: ${item?.title || "Approval Request"}`,
    );
  }

  if (status === "Rejected") {
    return createI18nMessage(
      "auditTimeline.events.approvalRejected",
      { requestTitle: item?.title || "Approval Request" },
      `Rejected: ${item?.title || "Approval Request"}`,
    );
  }

  return createI18nMessage(
    "auditTimeline.events.approvalReviewed",
    {
      status,
      requestTitle: item?.title || "Approval Request",
    },
    `${status}: ${item?.title || "Approval Request"}`,
  );
}

function approvalReviewDescriptionDescriptor(item) {
  if (item?.reviewNote) {
    return createI18nMessage(
      "auditTimeline.events.reviewNote",
      { note: item.reviewNote },
      item.reviewNote,
    );
  }

  if (item?.status === "Approved") {
    return createI18nMessage(
      "auditTimeline.events.approvedBy",
      { reviewer: item?.reviewedBy || "reviewer" },
      `Approved by ${item?.reviewedBy || "reviewer"}.`,
    );
  }

  if (item?.status === "Rejected") {
    return createI18nMessage(
      "auditTimeline.events.rejectedBy",
      { reviewer: item?.reviewedBy || "reviewer" },
      `Rejected by ${item?.reviewedBy || "reviewer"}.`,
    );
  }

  return createI18nMessage(
    "auditTimeline.events.reviewedBy",
    {
      status: item?.status || "Reviewed",
      reviewer: item?.reviewedBy || "reviewer",
    },
    `${item?.status || "Reviewed"} by ${item?.reviewedBy || "reviewer"}.`,
  );
}

function decorateCommon(record) {
  let result = { ...record };

  result = withDescriptor(result, "source", sourceDescriptor(result.source));
  result = withDescriptor(result, "module", moduleDescriptor(result.module));
  result = withDescriptor(result, "status", statusDescriptor(result.status));
  result = withDescriptor(result, "riskLevel", riskDescriptor(result.riskLevel));
  result = withDescriptor(
    result,
    "sensitivity",
    sensitivityDescriptor(result.sensitivity),
  );
  result = withDescriptor(
    result,
    "entityType",
    entityTypeDescriptor(result.entityType),
  );
  result = withDescriptor(
    result,
    "actorRole",
    actorRoleDescriptor(result.actorRole),
  );

  return result;
}

export function buildAuditTimelineItems({
  approvals = [],
  activityLog = [],
  currentUser,
}) {
  const canViewCompanyWide = [
    "PlatformAdmin",
    "Admin",
    "Manager",
    "Officer",
  ].includes(currentUser?.role);

  if (!canViewCompanyWide) return [];

  const visibleApprovals = approvals.filter((item) =>
    canUserViewApproval(currentUser, item),
  );

  const activityEvents = activityLog
    .filter(
      (item) =>
        ["PlatformAdmin", "Admin"].includes(currentUser?.role) ||
        item.userId === currentUser?.id ||
        ["Manager", "Officer"].includes(currentUser?.role),
    )
    .map((item) => {
      const title = legacyActivityTitleDescriptor(item);
      const description = legacyActivityDescriptionDescriptor(item);

      let record = {
        id: `TML-ACT-${item.id}`,
        source: "Activity",
        sourceId: item.id,
        title: title.fallback,
        module: item.module || "system",
        status: "Info",
        actorName: item.userName || "System",
        actorRole: item.role || "System",
        description: description.fallback,
        entityType: "Activity",
        entityId: item.id,
        riskLevel: "Standard",
        sensitivity: "Normal",
        changedFields: [],
        createdAt: item.createdAt,
      };

      record = withDescriptor(record, "title", title);
      record = withDescriptor(record, "description", description);

      return decorateCommon(record);
    });

  const approvalRequestEvents = visibleApprovals.map((item) => {
    const title = approvalRequestTitleDescriptor(item);
    const description = approvalRequestDescriptionDescriptor(item);

    let record = {
      id: `TML-APR-REQ-${item.id}`,
      source: "Approval",
      sourceId: item.id,
      title: title.fallback,
      module: item.module || "approvals",
      status: "Pending",
      actorName: item.requestedByName || "System",
      actorRole: item.requestedByRole || "System",
      description: description.fallback,
      entityType: item.entityType || "Request",
      entityId: item.entityId || item.id,
      riskLevel: item.riskLevel || "Standard",
      sensitivity: item.sensitivity || "Normal",
      changedFields: item.changedFields || [],
      createdAt: item.requestedAt,
    };

    record = withDescriptor(record, "title", title);
    record = withDescriptor(record, "description", description);

    return decorateCommon(record);
  });

  const approvalReviewEvents = visibleApprovals
    .filter((item) => item.reviewedAt)
    .map((item) => {
      const title = approvalReviewTitleDescriptor(item);
      const description = approvalReviewDescriptionDescriptor(item);

      let record = {
        id: `TML-APR-REV-${item.id}`,
        source: "Approval Review",
        sourceId: item.id,
        title: title.fallback,
        module: item.module || "approvals",
        status: item.status || "Reviewed",
        actorName: item.reviewedBy || "Reviewer",
        actorRole: "Manager / Admin",
        description: description.fallback,
        entityType: item.entityType || "Request",
        entityId: item.entityId || item.id,
        riskLevel: item.riskLevel || "Standard",
        sensitivity: item.sensitivity || "Normal",
        changedFields: item.changedFields || [],
        createdAt: item.reviewedAt,
      };

      record = withDescriptor(record, "title", title);
      record = withDescriptor(record, "description", description);

      return decorateCommon(record);
    });

  return [
    ...activityEvents,
    ...approvalRequestEvents,
    ...approvalReviewEvents,
  ].sort((a, b) => {
    const da = new Date(a.createdAt)?.getTime() || 0;
    const db = new Date(b.createdAt)?.getTime() || 0;
    return db - da;
  });
}
