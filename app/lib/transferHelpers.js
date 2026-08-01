// FILE: app/lib/transferHelpers.js
// Create this new file with the following content.

import { getLinkedUserRoleNameFromEmployee } from "./helpers";

function normalizeBackendApprovalStatusForState(status) {
  const normalized = String(status || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "APPROVED") return "Approved";
  if (normalized === "REJECTED") return "Rejected";
  return "Pending";
}

function normalizeBackendTransferStatusForState(status) {
  const normalized = String(status || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "REJECTED") return "REJECTED";
  if (normalized === "PARTIALLY_APPROVED") return "PARTIALLY_APPROVED";
  return "PENDING";
}

function mapTransferApprovals(approvals) {
  if (!Array.isArray(approvals)) return [];

  return approvals.map((approval) => ({
    id: approval.id || "",
    approverUserId: approval.approverUserId || "",
    projectId: approval.projectId || "",
    approvalStage: approval.approvalStage || "Project Manager",
    status: normalizeBackendApprovalStatusForState(approval.status),
    reviewedAt: approval.reviewedAt || "",
    note: approval.note || "",
  }));
}

export function mapBackendAssetTransferForState(transfer = {}) {
  const asset = transfer.asset || {};
  const fromProject = transfer.fromProject || {};
  const toProject = transfer.toProject || {};

  return {
    id: transfer.id || "",
    backendId: transfer.id || "",
    assetBackendId: transfer.assetId || asset.id || "",
    assetId: asset.assetId || transfer.assetId || "",
    assetName: asset.assetId || transfer.assetId || "Asset",
    companyId: transfer.companyId || asset.companyId || "",
    fromProjectId: transfer.fromProjectId || fromProject.id || "",
    fromProjectName: fromProject.name || fromProject.code || transfer.fromProjectId || "-",
    toProjectId: transfer.toProjectId || toProject.id || "",
    toProjectName: toProject.name || toProject.code || transfer.toProjectId || "-",
    requestedByUserId: transfer.requestedByUserId || "",
    transferBatchId: transfer.transferBatchId || transfer.batchId || null,
    status: normalizeBackendTransferStatusForState(transfer.status),
    reason: transfer.reason || "",
    rejectionReason: transfer.rejectionReason || "",
    createdAt: transfer.createdAt || "",
    approvedAt: transfer.approvedAt || "",
    appliedAt: transfer.appliedAt || "",
    approvals: mapTransferApprovals(transfer.approvals),
  };
}

export function mapBackendStationTransferForState(transfer = {}) {
  const station = transfer.station || {};
  const fromProject = transfer.fromProject || {};
  const toProject = transfer.toProject || {};

  return {
    id: transfer.id || "",
    backendId: transfer.id || "",
    stationBackendId: transfer.stationId || station.id || "",
    stationId: station.stationId || transfer.stationId || "",
    stationName: station.stationId || station.name || transfer.stationId || "Station",
    companyId: transfer.companyId || station.companyId || "",
    fromProjectId: transfer.fromProjectId || fromProject.id || "",
    fromProjectName: fromProject.name || fromProject.code || transfer.fromProjectId || "-",
    toProjectId: transfer.toProjectId || toProject.id || "",
    toProjectName: toProject.name || toProject.code || transfer.toProjectId || "-",
    requestedByUserId: transfer.requestedByUserId || "",
    transferBatchId: transfer.transferBatchId || transfer.batchId || null,
    status: normalizeBackendTransferStatusForState(transfer.status),
    effectiveDate: transfer.effectiveDate || "",
    reason: transfer.reason || "",
    rejectionReason: transfer.rejectionReason || "",
    createdAt: transfer.createdAt || "",
    approvedAt: transfer.approvedAt || "",
    appliedAt: transfer.appliedAt || "",
    approvals: mapTransferApprovals(transfer.approvals),
  };
}

export function mapBackendEmployeeTransferForState(transfer = {}) {
  const linkedEmployeeRole = getLinkedUserRoleNameFromEmployee(transfer.employee || {});

  return {
    id: transfer.id || "",
    backendId: transfer.id || "",
    employeeBackendId: transfer.employeeId || transfer.employee?.id || "",
    employeeId: transfer.employee?.employeeId || transfer.employeeId || "",
    employeeName: transfer.employee?.name || "",
    employeeRole: linkedEmployeeRole || "Employee",
    isManagerTransfer:
      String(transfer.reason || "")
        .toUpperCase()
        .includes("MANAGER_TRANSFER_ADMIN_APPROVAL") ||
      ["Manager", "TopManagement"].includes(linkedEmployeeRole),
    fromProjectId: transfer.fromProjectId || transfer.fromProject?.id || "",
    fromProjectName:
      transfer.fromProject?.name ||
      transfer.fromProject?.code ||
      transfer.fromProjectId ||
      "-",
    toProjectId: transfer.toProjectId || transfer.toProject?.id || "",
    toProjectName:
      transfer.toProject?.name ||
      transfer.toProject?.code ||
      transfer.toProjectId ||
      "-",
    requestedByUserId: transfer.requestedByUserId || "",
    transferBatchId: transfer.transferBatchId || transfer.batchId || null,
    status: normalizeBackendTransferStatusForState(transfer.status),
    reason: transfer.reason || "",
    rejectionReason: transfer.rejectionReason || "",
    createdAt: transfer.createdAt || "",
    approvedAt: transfer.approvedAt || "",
    appliedAt: transfer.appliedAt || "",
    effectiveDate: transfer.effectiveDate || "",
    approvals: mapTransferApprovals(transfer.approvals),
  };
}
