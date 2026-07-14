import {
  canUserViewApproval,
  canUserReviewApproval,
} from "./permissionHelpers";

import {
  isPendingApprovalStatus,
} from "./approvalHelpers";

export function formatNotificationDate(rawDate) {
  if (!rawDate) return "-";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return rawDate;
  return d.toLocaleString("en-GB", {
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

export function buildNotificationItems({ approvals = [], activityLog = [], currentUser, readMap = {} }) {
  // Notifications are intentionally targeted.
  // Audit Timeline remains the comprehensive record for all activities.
  // Notification Center should show only items that need attention from the current user.
  const visibleApprovals = approvals.filter((item) => canUserViewApproval(currentUser, item));

  const approvalNotifications = visibleApprovals
    .map((item) => {
      const needsDecision = canUserReviewApproval(currentUser, item);
      const isOwnRequest = item.requestedById === currentUser?.id;
      const userIsApprover = item.approvalRoute?.requiredApprovers?.some(
        (approver) => approver.userId === currentUser?.id && isPendingApprovalStatus(approver.status)
      );

      const title = needsDecision
        ? `Approval required: ${item.title}`
        : isOwnRequest
        ? `Your request is ${item.status}: ${item.title}`
        : userIsApprover
        ? `${item.status}: ${item.title}`
        : "";

      if (!title) return null;

      return {
        id: `NTF-APR-${item.id}`,
        sourceId: item.id,
        type: "approval",
        category: needsDecision ? "Approval Required" : "Approval Update",
        module: item.module,
        title,
        message: item.details || "Approval workflow update.",
        status: item.status,
        priority: getNotificationPriority(item),
        entityType: item.entityType,
        entityId: item.entityId,
        createdAt: item.reviewedAt || item.requestedAt,
        read: Boolean(readMap[`NTF-APR-${item.id}`]),
        route: "approvals",
        actionable: needsDecision,
      };
    })
    .filter(Boolean);

  // Activity notifications are personal only.
  // Managers/Admins should use Audit Timeline for company-wide activity review.
  const visibleActivities = activityLog
    .filter((item) => item.userId === currentUser?.id)
    .slice(0, 8)
    .map((item) => ({
      id: `NTF-ACT-${item.id}`,
      sourceId: item.id,
      type: "activity",
      category: "My Activity",
      module: item.module,
      title: item.action,
      message: item.details,
      status: "Info",
      priority: "Normal",
      entityType: "Activity",
      entityId: item.id,
      createdAt: item.createdAt,
      read: Boolean(readMap[`NTF-ACT-${item.id}`]),
      route: item.module,
      actionable: false,
    }));

  return [...approvalNotifications, ...visibleActivities].sort((a, b) => {
    const da = new Date(a.createdAt)?.getTime() || 0;
    const db = new Date(b.createdAt)?.getTime() || 0;
    return db - da;
  });
}