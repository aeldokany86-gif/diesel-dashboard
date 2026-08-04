import {
  isPendingApprovalStatus,
  isEmployeeTransferApproval,
  isManagerEmployeeTransferApproval,
} from "./approvalHelpers";

export function getPendingApprovers(request) {
  return (request?.approvalRoute?.requiredApprovers || []).filter((approver) =>
    isPendingApprovalStatus(approver?.status)
  );
}

export function userHasPendingApproval(user, request) {
  if (!user?.id) return false;
  return getPendingApprovers(request).some((approver) => approver.userId === user.id);
}

export function canUserViewApproval(user, request) {
  if (!user || !request) return false;

  const requestType = String(request?.type || "");
  const requestAction = String(request?.payload?.action || "");

  const isInventoryAdjustment =
    requestType === "station_stock_count_adjustment" ||
    requestType === "inventory_adjustment" ||
    requestAction === "stock_count_adjustment";

  if (isInventoryAdjustment) {
    return ["PlatformAdmin", "Admin"].includes(user.role);
  }

  if (isEmployeeTransferApproval(request)) {
    const isManagerTransfer = isManagerEmployeeTransferApproval(request);

    if (isManagerTransfer) {
      return ["PlatformAdmin", "Admin"].includes(user.role) && userHasPendingApproval(user, request);
    }

    if (["PlatformAdmin", "Admin"].includes(user.role)) return false;
    return userHasPendingApproval(user, request);
  }

  if (["asset_transfer", "station_transfer"].includes(requestType)) {
    if (["PlatformAdmin", "Admin"].includes(user.role)) return false;
    return userHasPendingApproval(user, request);
  }

  if (["PlatformAdmin", "Admin"].includes(user.role)) return true;
  if (request.requestedById === user.id) return true;

  const approvers = request.approvalRoute?.requiredApprovers || [];
  return approvers.some((approver) => approver.userId === user.id);
}

// ======================================================
// USERS, ROLES & PERMISSIONS - ENTERPRISE READY LAYER
// ======================================================
export const ROLE_PERMISSIONS = {
  PlatformAdmin: {
    operations: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    assets: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    stations: { view: true, add: false, edit: false, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: true, print: true },
    team: { view: true, add: true, edit: false, delete: false, approve: false, export: true, print: true },
    projects: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    reports: { view: true, export: true, print: true },
    users: { view: true, add: true, edit: true, deactivate: true, resetPassword: true, assignRoles: true },
    approvals: { view: true, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: true, export: true },
    auditLog: { view: true, export: true },
    companies: { view: true, add: true, edit: true, delete: false, export: true, print: true },
  },

  Admin: {
    // Admin is system administration only for Operations.
    // He can monitor operations, export, and print, but cannot create, edit, delete, or approve fuel operations.
    operations: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    assets: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
    stations: { view: true, add: true, edit: true, delete: true, approve: true, adjustInventory: true, updatePrice: true, export: true, print: true },
    team: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
    projects: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
    reports: { view: true, export: true, print: true },
    users: { view: true, add: true, edit: true, deactivate: true, resetPassword: true, assignRoles: true },
    approvals: { view: true, approve: true, reject: true },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: true, export: true },
    auditLog: { view: true, export: true },
  },

  Manager: {
    operations: { view: true, add: true, edit: true, delete: false, approve: true, export: true, print: true },
    assets: { view: true, add: true, edit: true, delete: false, approve: true, export: true, print: true },
    stations: { view: true, add: false, edit: true, delete: false, approve: true, adjustInventory: true, updatePrice: false, export: true, print: true },
    team: { view: true, add: true, edit: true, delete: false, approve: true, export: true, print: true },
    projects: { view: true, add: true, edit: true, delete: false, approve: true, export: true, print: true },
    reports: { view: true, export: true, print: true },
    // Manager can monitor users later, but cannot manage the Users & Roles page in Phase 1.
    // Admin remains the only role that can access and manage system users.
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: true, approve: true, reject: true },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: true, export: true },
    auditLog: { view: true, export: true },
  },

  Officer: {
    // Officer can view Operations as read-only.
    // Officer can propose changes on master-data pages; non-status changes go to Manager approval.
    operations: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    assets: { view: true, add: false, edit: true, delete: false, approve: false, export: true, print: true },
    stations: { view: true, add: false, edit: true, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: true, print: true },
    team: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    projects: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    reports: { view: true, export: true, print: true },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: true, export: false },
    auditLog: { view: true, export: false },
  },

  TopManagement: {
    // Executive visibility role.
    // Can view all operational pages and reports, but cannot perform actions or access governance/security pages.
    operations: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    assets: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    stations: { view: true, add: false, edit: false, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: true, print: true },
    team: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    projects: { view: true, add: false, edit: false, delete: false, approve: false, export: true, print: true },
    reports: { view: true, export: true, print: true },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: false, markRead: false },
    auditTimeline: { view: false, export: false },
    auditLog: { view: false, export: false },
  },


  Supervisor: {
    // Supervisor is site-limited in Phase 2.
    // He can access Operations only, and can edit operations inside his assigned project scope.
    operations: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    assets: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    stations: { view: false, add: false, edit: false, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: false, print: false },
    team: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    projects: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    reports: { view: false, export: false, print: false },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: false, export: false },
    auditLog: { view: false, export: false },
  },

  Operator: {
    // Operator is data-entry only in Phase 1.
    // He can access Operations and add new operations, but cannot see master-data pages.
    operations: { view: true, add: true, edit: false, delete: false, approve: false, export: false, print: false },
    assets: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    stations: { view: false, add: false, edit: false, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: false, print: false },
    team: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    projects: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    reports: { view: false, export: false, print: false },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: false, export: false },
    auditLog: { view: false, export: false },
  },
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || {};
}

export function hasPermissionForUser(user, module, action = "view") {
  if (!user || user.status !== "Active") return false;
  return Boolean(getRolePermissions(user.role)?.[module]?.[action]);
}

export function canAccessPageForUser(user, pageKey) {
  return hasPermissionForUser(user, pageKey, "view");
}

export function actionRequiresManagerApproval(user) {
  if (!user || user.status !== "Active") return true;
  return !["Admin", "Manager"].includes(user.role);
}

export function canPerformWriteAction(user, module) {
  if (!user || user.status !== "Active") return false;
  if (user.role === "TopManagement") return false;
  return Boolean(
    hasPermissionForUser(user, module, "add") ||
    hasPermissionForUser(user, module, "edit") ||
    hasPermissionForUser(user, module, "delete") ||
    hasPermissionForUser(user, module, "approve")
  );
}

export function canUserReviewApproval(user, request) {
  if (!hasPermissionForUser(user, "approvals", "approve")) return false;

  const requestType = String(request?.type || "");
  const requestAction = String(request?.payload?.action || "");

  const isInventoryAdjustment =
    requestType === "station_stock_count_adjustment" ||
    requestType === "inventory_adjustment" ||
    requestAction === "stock_count_adjustment";

  if (isInventoryAdjustment) {
    return ["PlatformAdmin", "Admin"].includes(user?.role);
  }

  const approvers = request?.approvalRoute?.requiredApprovers || [];

  if (isEmployeeTransferApproval(request)) {
    if (["PlatformAdmin", "Admin"].includes(user?.role)) {
      return isManagerEmployeeTransferApproval(request) && userHasPendingApproval(user, request);
    }

    return approvers.some((approver) => approver.userId === user?.id && isPendingApprovalStatus(approver.status));
  }

  if (["asset_transfer", "station_transfer"].includes(requestType)) {
    if (["PlatformAdmin", "Admin"].includes(user?.role)) return false;
    return approvers.some((approver) => approver.userId === user?.id && isPendingApprovalStatus(approver.status));
  }

  if (user?.role === "Admin") return true;

  return approvers.some((approver) => approver.userId === user?.id && isPendingApprovalStatus(approver.status));
}