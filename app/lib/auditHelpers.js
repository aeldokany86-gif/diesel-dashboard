import { canUserViewApproval } from "./permissionHelpers";

export function buildAuditTimelineItems({ approvals = [], activityLog = [], currentUser }) {
  const canViewCompanyWide = ["PlatformAdmin", "Admin", "Manager", "Officer"].includes(currentUser?.role);
  if (!canViewCompanyWide) return [];

  const visibleApprovals = approvals.filter((item) => canUserViewApproval(currentUser, item));

  const activityEvents = activityLog
    .filter((item) => ["PlatformAdmin", "Admin"].includes(currentUser?.role) || item.userId === currentUser?.id || ["Manager", "Officer"].includes(currentUser?.role))
    .map((item) => ({
    id: `TML-ACT-${item.id}`,
    source: "Activity",
    sourceId: item.id,
    title: item.action || "Activity",
    module: item.module || "system",
    status: "Info",
    actorName: item.userName || "System",
    actorRole: item.role || "System",
    description: item.details || "System activity recorded.",
    entityType: "Activity",
    entityId: item.id,
    riskLevel: "Standard",
    sensitivity: "Normal",
    changedFields: [],
    createdAt: item.createdAt,
  }));

  const approvalRequestEvents = visibleApprovals.map((item) => ({
    id: `TML-APR-REQ-${item.id}`,
    source: "Approval",
    sourceId: item.id,
    title: `Approval requested: ${item.title}`,
    module: item.module || "approvals",
    status: "Pending",
    actorName: item.requestedByName || "System",
    actorRole: item.requestedByRole || "System",
    description: item.details || "Approval request submitted.",
    entityType: item.entityType || "Request",
    entityId: item.entityId || item.id,
    riskLevel: item.riskLevel || "Standard",
    sensitivity: item.sensitivity || "Normal",
    changedFields: item.changedFields || [],
    createdAt: item.requestedAt,
  }));

  const approvalReviewEvents = visibleApprovals
    .filter((item) => item.reviewedAt)
    .map((item) => ({
      id: `TML-APR-REV-${item.id}`,
      source: "Approval Review",
      sourceId: item.id,
      title: `${item.status}: ${item.title}`,
      module: item.module || "approvals",
      status: item.status || "Reviewed",
      actorName: item.reviewedBy || "Reviewer",
      actorRole: "Manager / Admin",
      description: item.reviewNote || `${item.status} by ${item.reviewedBy || "reviewer"}.`,
      entityType: item.entityType || "Request",
      entityId: item.entityId || item.id,
      riskLevel: item.riskLevel || "Standard",
      sensitivity: item.sensitivity || "Normal",
      changedFields: item.changedFields || [],
      createdAt: item.reviewedAt,
    }));

  return [...activityEvents, ...approvalRequestEvents, ...approvalReviewEvents].sort((a, b) => {
    const da = new Date(a.createdAt)?.getTime() || 0;
    const db = new Date(b.createdAt)?.getTime() || 0;
    return db - da;
  });
}

