"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ModalPortal from "../../components/ui/ModalPortal";
import StatusBadge from "../../components/feedback/StatusBadge";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  normalizeScopeValue,
  normalizeBackendRoleName,
  formatNumber,
} from "../../lib/helpers";

import {
  getOperationTypeDisplay,
  getOperationTypeBadgeClass,
  getPhotoLabel,
} from "../../lib/operationHelpers";

import {
  normalizeOperationCorrectionFieldName,
  getOperationCorrectionFieldLabel,
  findApprovalEntityByAnyId,
  getAssetApprovalDisplayValue,
  getStationApprovalDisplayValue,
  getOperationCorrectionApprovalDisplayValue,
  normalizeApprovalStatus,
  isPendingApprovalStatus,
  isApprovedApprovalStatus,
  isApprovalFullyApproved,
  isEmployeeTransferApproval,
  isManagerEmployeeTransferApproval,
  mapBackendOperationApprovalForFrontend,
  mapBackendOperationCorrectionForFrontend,
  normalizeApprovalValue,
  isSensitiveApprovalField,
  buildApprovalChangedFields,
  inferApprovalEntity,
  extractApprovalProjects,
  getProjectScopeValues,
  projectMatchesScope,
  findManagerForProject,
  getReportingManagerForUser,
  findStrictProjectManagerForProject,
  buildApprovalRoute,
} from "../../lib/approvalHelpers";

import {
  getPendingApprovers,
  userHasPendingApproval,
  canUserViewApproval,
  canUserReviewApproval,
} from "../../lib/permissionHelpers";

import {
  companyMatches,
  isPlatformAdminUser,
  isPlatformContextValue,
  getItemCompanyId,
} from "../../lib/companyHelpers";

import {
  reviewOperation,
} from "../../services/operationsService";

import {
  reviewOperationCorrection,
} from "../../services/operationCorrectionsService";

const NETWORK_OFFLINE_MESSAGE = "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE = "Connection to server is unavailable. Please try again.";

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

function getFriendlyApiErrorMessage(error, fallbackMessage = BACKEND_UNAVAILABLE_MESSAGE) {
  if (isNetworkConnectionError(error)) return NETWORK_OFFLINE_MESSAGE;

  const backendMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (Array.isArray(backendMessage)) return backendMessage.join(" / ");
  if (backendMessage) return String(backendMessage);

  return fallbackMessage;
}

function canUseNetwork(showToastFn) {
  if (!isBrowserOffline()) return true;

  notifyUser(showToastFn, "warning", NETWORK_OFFLINE_MESSAGE);
  return false;
}

function logHandledApiIssue(label, error) {
  const safeLabel = String(label || "API request failed");
  const safeMessage = getFriendlyApiErrorMessage(error, BACKEND_UNAVAILABLE_MESSAGE);

  // Use warn instead of error for expected connection/backend failures so Next.js dev overlay does not block the UI.
  console.warn(`${safeLabel}: ${safeMessage}`);
}

export default function ApprovalsPage({
  approvals = [],
  setApprovals,
  currentUser,
  hasPermission = () => false,
  setData,
  trackActivity = () => {},
  showToast,
  onApproveEmployeeTransfer,
  onRejectEmployeeTransfer,
  onApproveAssetTransfer,
  onRejectAssetTransfer,
  onApproveStationTransfer,
  onRejectStationTransfer,
  onApproveAssetAction,
  onApproveStationAction,
  onOperationApprovalReviewed,
  onOperationCorrectionReviewed,
  onOperationsWorkspaceRefresh,
  runWithActionLoading = async (_label, actionFn) => actionFn(),
}) {
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [reviewNotes, setReviewNotes] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);

  const isBackendTransferRequest = (request) =>
    ["employee_transfer", "asset_transfer", "station_transfer"].includes(
      String(request?.type || "").trim()
    );

  const isBackendOperationCorrectionRequest = (request) =>
    Boolean(request?.isBackendOperationCorrection || request?.backendCorrectionId);

  const isBackendOperationRequest = (request) =>
    Boolean(request?.isBackendOperationApproval || (request?.backendOperationId && !isBackendOperationCorrectionRequest(request)));

  const visibleApprovals = approvals.filter((item) => {
    if (!canUserViewApproval(currentUser, item)) return false;
    return selectedStatus === "All"
      ? true
      : normalizeApprovalStatus(item.status) === normalizeApprovalStatus(selectedStatus);
  });

  const approveRequest = async (request) => {
    return runWithActionLoading("Approving request...", async () => {
    if (!canUserReviewApproval(currentUser, request)) {
      showToast?.("warning", "You are not allowed to review this request.");
      return;
    }

    if (!isPendingApprovalStatus(request.status)) {
      showToast?.("warning", "This request has already been reviewed.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || "Approved";

    if (isBackendOperationCorrectionRequest(request)) {
      if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser?.role)) {
        showToast?.("warning", "Only managers can approve operation corrections.");
        return;
      }

      try {
        await reviewOperationCorrection(
          request.backendCorrectionId,
          "APPROVE",
          note,
          currentUser
        );

        if (typeof onOperationsWorkspaceRefresh === "function") {
          await onOperationsWorkspaceRefresh();
        } else {
          await onOperationCorrectionReviewed?.();
          await onOperationApprovalReviewed?.();
        }
        setSelectedRequest(null);
        trackActivity("Approve Operation Correction", "operations", request.title);
        showToast?.("success", "Operation correction approved and applied successfully.");
      } catch (error) {
        console.warn("Failed to approve operation correction.", error);
        showToast?.("warning", error?.message || "Failed to approve operation correction.");
      }
      return;
    }

    if (isBackendOperationRequest(request)) {
      if (currentUser?.role !== "Manager") {
        showToast?.("warning", "Only the assigned project manager can approve operation requests.");
        return;
      }

      try {
        await reviewOperation(
          request.backendOperationId,
          "APPROVE",
          note,
          currentUser
        );

        if (typeof onOperationsWorkspaceRefresh === "function") {
          await onOperationsWorkspaceRefresh();
        } else {
          await onOperationApprovalReviewed?.();
        }
        setSelectedRequest(null);
        trackActivity("Approve Operation Request", "operations", request.title);
        showToast?.("success", "Operation request approved successfully.");
      } catch (error) {
        showToast?.("warning", getFriendlyApiErrorMessage(error, "Failed to approve operation request."));
      }
      return;
    }

    const routeApprovers = request.approvalRoute?.requiredApprovers || [];
    const currentStage = routeApprovers.find(
      (approver) => approver.userId === currentUser?.id && isPendingApprovalStatus(approver.status)
    );

    const updatedApprovers = routeApprovers.map((approver) => {
      const shouldApprove = approver.userId === currentUser?.id && isPendingApprovalStatus(approver.status);

      return shouldApprove
        ? {
            ...approver,
            status: "Approved",
            reviewedAt,
            reviewNote: note,
            reviewedBy: currentUser?.fullName || "Manager",
          }
        : approver;
    });

    let fullyApproved =
      updatedApprovers.length > 0
        ? updatedApprovers.every((approver) => isApprovedApprovalStatus(approver.status))
        : currentUser?.role === "Admin";

    if (fullyApproved && request.type === "operation_external_supply" && request.payload?.row) {
      setData?.((prev) => [...prev, request.payload.row]);
    }

    if (request.type === "employee_transfer") {
      try {
        if (["Admin", "PlatformAdmin"].includes(currentUser?.role) && !isManagerEmployeeTransferApproval(request)) {
          showToast?.("warning", "Admin can approve manager transfers only.");
          return;
        }

        const reviewerUserId = currentUser?.id || "";

        if (!reviewerUserId) {
          showToast?.("warning", "Approver user ID is required.");
          return;
        }

        const latestReviewResult = await onApproveEmployeeTransfer?.(
          request.payload?.transfer || request.payload,
          reviewerUserId
        );

        if (String(latestReviewResult?.status || "").toUpperCase() === "APPROVED") {
          fullyApproved = true;
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to apply employee transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    if (request.type === "asset_transfer") {
      try {
        const pendingApprovers = routeApprovers.filter((approver) => approver.status === "Pending");
        const approverIdsToSubmit =
          currentUser?.role === "Admin"
            ? pendingApprovers.map((approver) => approver.userId).filter(Boolean)
            : [currentUser?.id].filter(Boolean);

        let latestReviewResult = null;

        for (const reviewerUserId of approverIdsToSubmit) {
          latestReviewResult = await onApproveAssetTransfer?.(
            request.payload?.transfer || request.payload,
            reviewerUserId
          );
        }

        if (String(latestReviewResult?.status || "").toUpperCase() === "APPROVED") {
          fullyApproved = true;
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to apply asset transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    if (request.type === "station_transfer") {
      try {
        const pendingApprovers = routeApprovers.filter((approver) => approver.status === "Pending");
        const approverIdsToSubmit =
          currentUser?.role === "Admin"
            ? pendingApprovers.map((approver) => approver.userId).filter(Boolean)
            : [currentUser?.id].filter(Boolean);

        let latestReviewResult = null;

        for (const reviewerUserId of approverIdsToSubmit) {
          latestReviewResult = await onApproveStationTransfer?.(
            request.payload?.transfer || request.payload,
            reviewerUserId
          );
        }

        if (String(latestReviewResult?.status || "").toUpperCase() === "APPROVED") {
          fullyApproved = true;
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to apply station transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    if (
      fullyApproved &&
      request.module === "assets" &&
      ["add", "delete", "odometer_reset"].includes(String(request.payload?.action || ""))
    ) {
      try {
        await onApproveAssetAction?.(request);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to apply asset approval.";
        showToast?.("warning", message);
        return;
      }
    }

    if (
      fullyApproved &&
      request.module === "stations" &&
      ["zero_balance_adjustment", "stock_count_adjustment"].includes(
        String(request.payload?.action || "")
      )
    ) {
      try {
        await onApproveStationAction?.(request);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to apply station approval.";
        showToast?.("warning", message);
        return;
      }
    }

    setApprovals((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: fullyApproved ? "Approved" : "Pending",
              approvalRoute: {
                ...(item.approvalRoute || {}),
                requiredApprovers: updatedApprovers,
                routeStatus: fullyApproved ? "Approved" : "Pending",
              },
              reviewedBy: fullyApproved ? currentUser?.fullName || "Manager" : item.reviewedBy,
              reviewedAt: fullyApproved ? reviewedAt : item.reviewedAt,
              reviewNote: fullyApproved ? note : item.reviewNote,
            }
          : item
      )
    );

    setSelectedRequest(null);
    trackActivity(
      fullyApproved ? "Approve Request" : "Approve Request Stage",
      request.module,
      `${request.title} (${currentStage?.approvalStage || "Approval Stage"})`
    );
    showToast?.("success", fullyApproved ? "Approval request fully approved." : "Approval stage approved. Waiting for remaining manager approval.");
  
    });
  };

  const rejectRequest = async (request) => {
    return runWithActionLoading("Rejecting request...", async () => {
    if (!isBackendTransferRequest(request) && !canUserReviewApproval(currentUser, request) && currentUser?.role !== "Admin") {
      showToast?.("warning", "You are not allowed to review this request.");
      return;
    }

    if (request.status !== "Pending") {
      showToast?.("warning", "This request has already been reviewed.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || "Rejected";

    if (isBackendOperationCorrectionRequest(request)) {
      if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser?.role)) {
        showToast?.("warning", "Only managers can reject operation corrections.");
        return;
      }

      try {
        await reviewOperationCorrection(
          request.backendCorrectionId,
          "REJECT",
          note,
          currentUser
        );

        if (typeof onOperationsWorkspaceRefresh === "function") {
          await onOperationsWorkspaceRefresh();
        } else {
          await onOperationCorrectionReviewed?.();
        }
        setSelectedRequest(null);
        trackActivity("Reject Operation Correction", "operations", request.title);
        showToast?.("success", "Operation correction rejected.");
      } catch (error) {
        console.warn("Failed to reject operation correction.", error);
        showToast?.("warning", error?.message || "Failed to reject operation correction.");
      }
      return;
    }

    if (isBackendOperationRequest(request)) {
      if (currentUser?.role !== "Manager") {
        showToast?.("warning", "Only the assigned project manager can reject operation requests.");
        return;
      }

      try {
        await reviewOperation(
          request.backendOperationId,
          "REJECT",
          note,
          currentUser
        );

        if (typeof onOperationsWorkspaceRefresh === "function") {
          await onOperationsWorkspaceRefresh();
        } else {
          await onOperationApprovalReviewed?.();
        }
        setSelectedRequest(null);
        trackActivity("Reject Operation Request", "operations", request.title);
        showToast?.("success", "Operation request rejected.");
      } catch (error) {
        showToast?.("warning", getFriendlyApiErrorMessage(error, "Failed to reject operation request."));
      }
      return;
    }

    if (request.type === "employee_transfer") {
      try {
        const routeApprovers = request.approvalRoute?.requiredApprovers || [];
        const firstPendingApprover = routeApprovers.find((approver) => approver.status === "Pending");
        const reviewerUserId =
          currentUser?.role === "Admin"
            ? firstPendingApprover?.userId || currentUser?.id
            : currentUser?.id;

        await onRejectEmployeeTransfer?.(
          request.payload?.transfer || request.payload,
          note,
          reviewerUserId
        );
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to reject employee transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    if (request.type === "asset_transfer") {
      try {
        const routeApprovers = request.approvalRoute?.requiredApprovers || [];
        const firstPendingApprover = routeApprovers.find((approver) => approver.status === "Pending");
        const reviewerUserId =
          currentUser?.role === "Admin"
            ? firstPendingApprover?.userId || currentUser?.id
            : currentUser?.id;

        await onRejectAssetTransfer?.(
          request.payload?.transfer || request.payload,
          note,
          reviewerUserId
        );
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to reject asset transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    if (request.type === "station_transfer") {
      try {
        const routeApprovers = request.approvalRoute?.requiredApprovers || [];
        const firstPendingApprover = routeApprovers.find((approver) => approver.status === "Pending");
        const reviewerUserId =
          currentUser?.role === "Admin"
            ? firstPendingApprover?.userId || currentUser?.id
            : currentUser?.id;

        await onRejectStationTransfer?.(
          request.payload?.transfer || request.payload,
          note,
          reviewerUserId
        );
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to reject station transfer.";
        showToast?.("warning", message);
        return;
      }
    }

    setApprovals((prev) =>
      prev.map((item) => {
        if (item.id !== request.id) return item;

        const updatedApprovers = (item.approvalRoute?.requiredApprovers || []).map((approver) => {
          const shouldReject = currentUser?.role === "Admin"
            ? approver.status === "Pending"
            : approver.userId === currentUser?.id && approver.status === "Pending";

          return shouldReject
            ? {
                ...approver,
                status: "Rejected",
                reviewedAt,
                reviewNote: note,
                reviewedBy: currentUser?.fullName || "Manager",
              }
            : approver;
        });

        return {
          ...item,
          status: "Rejected",
          approvalRoute: {
            ...(item.approvalRoute || {}),
            requiredApprovers: updatedApprovers,
            routeStatus: "Rejected",
          },
          reviewedBy: currentUser?.fullName || "Manager",
          reviewedAt,
          reviewNote: note,
        };
      })
    );

    setSelectedRequest(null);
    trackActivity("Reject Request", request.module, `${request.title} (${request.entityType || "Request"}: ${request.entityId || "-"})`);
    showToast?.("error", "Approval request rejected.");
  
    });
  };

  const pendingCount = visibleApprovals.filter((item) => item.status === "Pending").length;
  const sensitiveCount = visibleApprovals.filter((item) => item.status === "Pending" && item.sensitivity === "Sensitive").length;

  const renderChangedFields = (request, compact = false) => {
    const fields = Array.isArray(request.changedFields) ? request.changedFields : [];

    if (fields.length === 0) {
      return (
        <div className="text-xs text-slate-500 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
          No structured field changes available for this request.
        </div>
      );
    }

    const visibleFields = compact ? fields.slice(0, 3) : fields;

    return (
      <div className="space-y-2">
        {visibleFields.map((field, index) => (
          <div
            key={`${request.id}-${field.field}-${index}`}
            className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start rounded-xl border p-3 ${
              field.sensitive
                ? "bg-red-500/10 border-red-500/30"
                : "bg-slate-950/50 border-slate-800"
            }`}
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Field</p>
              <p className="text-sm font-bold text-slate-100">{field.label || makeFieldLabel(field.field)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Old Value</p>
              <p className="text-sm text-slate-300 break-words">{normalizeApprovalValue(field.oldValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">New Value</p>
              <p className="text-sm text-amber-300 font-semibold break-words">{normalizeApprovalValue(field.newValue)}</p>
            </div>
            <div className="md:text-right">
              {field.sensitive && (
                <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  Sensitive
                </span>
              )}
            </div>
          </div>
        ))}

        {compact && fields.length > 3 && (
          <p className="text-xs text-slate-500">+ {fields.length - 3} more changed field(s)</p>
        )}
      </div>
    );
  };


  const renderApprovalRoute = (request) => {
    const approvers = request.approvalRoute?.requiredApprovers || [];

    if (approvers.length === 0) {
      return (
        <div className="text-xs text-slate-500 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
          No approval route assigned. Admin can still review this request.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {approvers.map((approver, index) => (
          <div
            key={`${request.id}-${approver.userId}-${approver.approvalStage}-${index}`}
            className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-950/50 border border-slate-800 rounded-xl p-3"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{approver.approvalStage}</p>
              <p className="text-sm font-bold text-slate-100">{approver.userName || approver.userId}</p>
              <p className="text-xs text-slate-400">Project: {approver.projectId || "-"}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              approver.status === "Approved"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : approver.status === "Rejected"
                ? "bg-red-500/15 text-red-300 border-red-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}>
              {approver.status}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black">Approvals Center</h1>
            <p className="text-slate-400 text-sm">Manager approval queue with old vs new change tracking</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">Pending Requests</p>
              <p className="text-2xl font-black text-amber-300">{pendingCount}</p>
            </div>
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">Sensitive Pending</p>
              <p className="text-2xl font-black text-red-300">{sensitiveCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100"
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="All">All</option>
          </select>
          <p className="text-xs text-slate-500">
            Showing {visibleApprovals.length} request(s). Click Details to review the full approval diff before action.
          </p>
        </div>

        <div className="space-y-3">
          {visibleApprovals.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 text-slate-400">
              No approval requests found.
            </div>
          ) : (
            visibleApprovals.map((request) => (
              <div key={request.id} className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 shadow-xl">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        request.status === "Pending"
                          ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                          : request.status === "Approved"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border border-red-500/30"
                      }`}>
                        {request.status}
                      </span>
                      <span className="text-xs text-slate-500 uppercase tracking-[0.18em]">{request.module}</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                        request.sensitivity === "Sensitive"
                          ? "bg-red-500/10 text-red-300 border-red-500/30"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}>
                        {request.riskLevel || "Standard"}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-100 break-words">{request.title}</h2>
                    <p className="text-sm text-slate-400 mt-1">{request.details}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 mb-3">
                      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity</p>
                        <p className="text-sm font-bold text-slate-100">{request.entityType || "Request"}</p>
                      </div>
                      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity ID</p>
                        <p className="text-sm font-bold text-amber-300 break-words">{request.entityId || "-"}</p>
                      </div>
                      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Changed Fields</p>
                        <p className="text-sm font-bold text-slate-100">{request.changedFields?.length || 0}</p>
                      </div>
                    </div>

                    {renderChangedFields(request, true)}

                    <p className="text-xs text-slate-500 mt-3">
                      Requested by: {request.requestedByName} ({request.requestedByRole}) • {formatApprovalDate(request.requestedAt)}
                    </p>
                    {request.reviewedBy && (
                      <p className="login-muted text-xs text-slate-500 mt-1">
                        Reviewed by: {request.reviewedBy} • {formatApprovalDate(request.reviewedAt)} • {request.reviewNote}
                      </p>
                    )}
                  </div>

                  <div className="w-full xl:w-[380px] space-y-2">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-xl font-bold border border-slate-700"
                    >
                      View Details
                    </button>

                    {request.status === "Pending" && (
                      <>
                        <textarea
                          value={reviewNotes[request.id] || ""}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                          placeholder="Manager note optional..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => rejectRequest(request)}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => approveRequest(request)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold"
                          >
                            Approve
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedRequest && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                    {selectedRequest.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                    selectedRequest.sensitivity === "Sensitive"
                      ? "bg-red-500/10 text-red-300 border-red-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}>
                    {selectedRequest.sensitivity || "Normal"}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-100">{selectedRequest.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedRequest.details}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-4 py-2 font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-210px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Module</p>
                  <p className="text-sm font-bold text-slate-100">{selectedRequest.module}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity</p>
                  <p className="text-sm font-bold text-slate-100">{selectedRequest.entityType || "Request"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity ID</p>
                  <p className="text-sm font-bold text-amber-300 break-words">{selectedRequest.entityId || "-"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Risk</p>
                  <p className="text-sm font-bold text-slate-100">{selectedRequest.riskLevel || "Standard"}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-100 mb-3 uppercase tracking-[0.14em]">Old vs New Changes</h3>
                {renderChangedFields(selectedRequest, false)}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-black text-slate-100 mb-2 uppercase tracking-[0.14em]">Request Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p className="text-slate-400">Requested By: <span className="text-slate-100 font-semibold">{selectedRequest.requestedByName} ({selectedRequest.requestedByRole})</span></p>
                  <p className="text-slate-400">Requested At: <span className="text-slate-100 font-semibold">{formatApprovalDate(selectedRequest.requestedAt)}</span></p>
                  <p className="text-slate-400">Reviewed By: <span className="text-slate-100 font-semibold">{selectedRequest.reviewedBy || "-"}</span></p>
                  <p className="text-slate-400">Review Note: <span className="text-slate-100 font-semibold">{selectedRequest.reviewNote || "-"}</span></p>
                </div>
              </div>
            </div>

            {selectedRequest.status === "Pending" && (
              <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => rejectRequest(selectedRequest)}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => approveRequest(selectedRequest)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold"
                >
                  Approve Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatApprovalDate(rawDate) {
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
