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


function makeFieldLabel(fieldName) {
  return String(fieldName || "Field")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getApprovalBatchId(request) {
  return (
    request?.transferBatchId ||
    request?.batchId ||
    request?.payload?.transferBatchId ||
    request?.payload?.batchId ||
    request?.payload?.transfer?.transferBatchId ||
    request?.payload?.transfer?.batchId ||
    null
  );
}

function getApprovalGroupStatus(requests) {
  if (requests.some((request) => isPendingApprovalStatus(request?.status))) return "Pending";
  if (requests.some((request) => normalizeApprovalStatus(request?.status) === "Rejected")) return "Rejected";
  return "Approved";
}

function buildApprovalGroups(requests) {
  const groups = new Map();

  for (const request of requests) {
    const batchId = getApprovalBatchId(request);
    const key = batchId ? `batch:${batchId}` : `single:${request.id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        batchId,
        isBatch: Boolean(batchId),
        requests: [],
      });
    }

    groups.get(key).requests.push(request);
  }

  return Array.from(groups.values()).map((group) => {
    const primaryRequest = group.requests[0];
    const pendingRequests = group.requests.filter((request) =>
      isPendingApprovalStatus(request?.status)
    );

    return {
      ...group,
      primaryRequest,
      pendingRequests,
      status: getApprovalGroupStatus(group.requests),
      module: primaryRequest?.module || "approvals",
      sensitivity: group.requests.some((request) => request?.sensitivity === "Sensitive")
        ? "Sensitive"
        : "Normal",
      riskLevel: group.requests.some((request) => request?.sensitivity === "Sensitive")
        ? "Sensitive"
        : primaryRequest?.riskLevel || "Standard",
      title: group.isBatch
        ? `Bulk ${primaryRequest?.entityType || "Approval"} Request`
        : primaryRequest?.title || "Approval Request",
      details: group.isBatch
        ? `${group.requests.length} related requests grouped under batch ${group.batchId}.`
        : primaryRequest?.details || "",
    };
  });
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
  const [selectedApprovalGroup, setSelectedApprovalGroup] = useState(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isGroupActionRunning, setIsGroupActionRunning] = useState(false);

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
        setSelectedApprovalGroup(null);
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
        setSelectedApprovalGroup(null);
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

    setSelectedApprovalGroup(null);
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
        setSelectedApprovalGroup(null);
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
        setSelectedApprovalGroup(null);
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

    setSelectedApprovalGroup(null);
    trackActivity("Reject Request", request.module, `${request.title} (${request.entityType || "Request"}: ${request.entityId || "-"})`);
    showToast?.("error", "Approval request rejected.");
  
    });
  };

  const approvalGroups = useMemo(
    () => buildApprovalGroups(visibleApprovals),
    [visibleApprovals]
  );

  const pendingCount = visibleApprovals.filter((item) =>
    isPendingApprovalStatus(item.status)
  ).length;
  const sensitiveCount = visibleApprovals.filter(
    (item) => isPendingApprovalStatus(item.status) && item.sensitivity === "Sensitive"
  ).length;

  const openApprovalGroup = (group) => {
    const initialSelection = group.pendingRequests.map((request) => request.id);
    setSelectedRequestIds(initialSelection);
    setSelectedApprovalGroup(group);
  };

  const toggleSelectedRequest = (requestId) => {
    setSelectedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId]
    );
  };

  const selectAllPendingInGroup = () => {
    setSelectedRequestIds(
      selectedApprovalGroup?.pendingRequests?.map((request) => request.id) || []
    );
  };

  const clearGroupSelection = () => setSelectedRequestIds([]);

  const applyGroupReviewNote = (value) => {
    const targetRequests = selectedApprovalGroup?.requests || [];
    const targetIds = selectedRequestIds.length
      ? selectedRequestIds
      : targetRequests.map((request) => request.id);

    setReviewNotes((current) => {
      const next = { ...current };
      targetIds.forEach((id) => {
        next[id] = value;
      });
      return next;
    });
  };

  const getGroupReviewNote = () => {
    const firstSelectedId = selectedRequestIds[0];
    if (firstSelectedId) return reviewNotes[firstSelectedId] || "";
    return "";
  };

  const reviewSelectedRequests = async (action) => {
    if (!selectedApprovalGroup || isGroupActionRunning) return;

    const selectedRequests = selectedApprovalGroup.requests.filter(
      (request) =>
        selectedRequestIds.includes(request.id) &&
        isPendingApprovalStatus(request.status)
    );

    if (selectedRequests.length === 0) {
      showToast?.("warning", "Select at least one pending request.");
      return;
    }

    setIsGroupActionRunning(true);
    try {
      for (const request of selectedRequests) {
        if (action === "approve") {
          await approveRequest(request);
        } else {
          await rejectRequest(request);
        }
      }
      setSelectedApprovalGroup(null);
      setSelectedRequestIds([]);
    } finally {
      setIsGroupActionRunning(false);
    }
  };

  const getReadableApproverName = (approver) => {
    const rawName = String(approver?.userName || "").trim();
    if (rawName && !/^cm[a-z0-9]{10,}$/i.test(rawName)) return rawName;
    return approver?.approvalStage || "Approver";
  };

  const getRequestItemLabel = (request) =>
    request?.entityId ||
    request?.payload?.asset?.assetCode ||
    request?.payload?.station?.stationName ||
    request?.payload?.employee?.fullName ||
    request?.title ||
    "Request";

  const getTransferDirection = (request) => {
    const fields = Array.isArray(request?.changedFields) ? request.changedFields : [];
    const transferField = fields.find((field) =>
      /project|transfer|location/i.test(String(field?.field || field?.label || ""))
    );

    if (!transferField) return null;
    return {
      from: normalizeApprovalValue(transferField.oldValue),
      to: normalizeApprovalValue(transferField.newValue),
    };
  };

  const renderCompactChanges = (request) => {
    const fields = Array.isArray(request?.changedFields) ? request.changedFields : [];
    if (!fields.length) {
      return <p className="text-sm text-slate-500">No additional changes to display.</p>;
    }

    return (
      <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 overflow-hidden">
        {fields.map((field, index) => (
          <div
            key={`${request.id}-${field.field}-${index}`}
            className="grid grid-cols-[minmax(110px,0.8fr)_1fr_auto_1fr] items-center gap-3 bg-slate-950/40 px-4 py-3"
          >
            <p className="text-xs font-bold text-slate-300">
              {field.label || makeFieldLabel(field.field)}
            </p>
            <p className="text-sm text-slate-400 break-words">
              {normalizeApprovalValue(field.oldValue)}
            </p>
            <span className="text-slate-600">→</span>
            <p className="text-sm font-bold text-amber-300 break-words">
              {normalizeApprovalValue(field.newValue)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderCompactRoute = (request) => {
    const approvers = request?.approvalRoute?.requiredApprovers || [];
    if (!approvers.length) {
      return <p className="text-sm text-slate-500">No approval route assigned.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {approvers.map((approver, index) => {
          const status = normalizeApprovalStatus(approver.status);
          const marker = status === "Approved" ? "✓" : status === "Rejected" ? "×" : "•";
          return (
            <div
              key={`${request.id}-${approver.approvalStage}-${index}`}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-xs font-black ${
                  status === "Approved"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : status === "Rejected"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {marker}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold text-slate-100">{getReadableApproverName(approver)}</p>
                <p className="text-[10px] text-slate-500">{approver.approvalStage || "Approval"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen p-4 sm:p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black">Approvals Center</h1>
            <p className="text-slate-400 text-sm">Review and decide on pending requests</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-2xl font-black text-amber-300">{pendingCount}</p>
            </div>
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">Sensitive</p>
              <p className="text-2xl font-black text-red-300">{sensitiveCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100"
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="All">All</option>
          </select>
          <p className="text-xs text-slate-500">
            {approvalGroups.length} approval{approvalGroups.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="space-y-3">
          {approvalGroups.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 text-slate-400">
              No approval requests found.
            </div>
          ) : (
            approvalGroups.map((group) => {
              const request = group.primaryRequest;
              const direction = getTransferDirection(request);
              return (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => openApprovalGroup(group)}
                  className="w-full text-left bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                          group.status === "Pending"
                            ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                            : group.status === "Approved"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border-red-500/30"
                        }`}>
                          {group.status}
                        </span>
                        {group.isBatch && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700">
                            {group.requests.length} items
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-lg font-black text-slate-100">
                        {group.isBatch ? `Bulk ${request.entityType || "Approval"}` : request.title}
                      </h2>

                      {direction ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-bold text-slate-200">{direction.from}</span>
                          <span className="text-amber-400">→</span>
                          <span className="font-bold text-amber-300">{direction.to}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">{request.details}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-5 text-xs text-slate-500 shrink-0">
                      <div>
                        <p className="text-slate-300 font-bold">{request.requestedByName || "Unknown user"}</p>
                        <p>{formatApprovalDate(request.requestedAt)}</p>
                      </div>
                      <span className="text-xl text-slate-500">›</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedApprovalGroup && (() => {
        const group = selectedApprovalGroup;
        const primary = group.primaryRequest;
        const direction = getTransferDirection(primary);
        const pendingSelectedCount = group.requests.filter(
          (request) => selectedRequestIds.includes(request.id) && isPendingApprovalStatus(request.status)
        ).length;

        return (
          <div className="fleet-modal-backdrop fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                      group.status === "Pending"
                        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                        : group.status === "Approved"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border-red-500/30"
                    }`}>
                      {group.status}
                    </span>
                    {group.isBatch && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {group.requests.length} items
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-100">
                    {group.isBatch ? `Review ${group.requests.length} ${primary.entityType || "items"}` : primary.title}
                  </h2>
                  {direction && (
                    <p className="text-sm mt-1">
                      <span className="text-slate-300 font-semibold">{direction.from}</span>
                      <span className="mx-2 text-amber-400">→</span>
                      <span className="text-amber-300 font-bold">{direction.to}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedApprovalGroup(null)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold"
                >
                  Close
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
                {group.isBatch ? (
                  <section>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Affected Items</h3>
                      {group.status === "Pending" && (
                        <div className="flex gap-2">
                          <button onClick={selectAllPendingInGroup} className="text-xs font-bold text-amber-300">Select all</button>
                          <button onClick={clearGroupSelection} className="text-xs font-bold text-slate-500">Clear</button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.requests.map((request) => {
                        const selectable = isPendingApprovalStatus(request.status);
                        const checked = selectedRequestIds.includes(request.id);
                        return (
                          <label
                            key={request.id}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                              checked ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-900/60"
                            } ${selectable ? "cursor-pointer" : "opacity-60"}`}
                          >
                            {selectable && (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectedRequest(request.id)}
                                className="h-4 w-4 accent-amber-500"
                              />
                            )}
                            <span className="text-sm font-bold text-slate-100 truncate">{getRequestItemLabel(request)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                    <p className="text-xs text-slate-500">Requested by</p>
                    <p className="text-sm font-bold text-slate-100">
                      {primary.requestedByName || "Unknown user"} • {formatApprovalDate(primary.requestedAt)}
                    </p>
                  </section>
                )}

                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-300 mb-2">Changes</h3>
                  {renderCompactChanges(primary)}
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-300 mb-2">Approval Progress</h3>
                  {renderCompactRoute(primary)}
                </section>

                {group.status === "Pending" && (
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-300 mb-2">Review Note</h3>
                    <textarea
                      value={getGroupReviewNote()}
                      onChange={(event) => applyGroupReviewNote(event.target.value)}
                      placeholder="Optional note..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 min-h-[72px]"
                    />
                  </section>
                )}
              </div>

              {group.status === "Pending" && (
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {group.isBatch ? `${pendingSelectedCount} selected` : "Ready for review"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={isGroupActionRunning || pendingSelectedCount === 0}
                      onClick={() => reviewSelectedRequests("reject")}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-bold"
                    >
                      {group.isBatch ? "Reject Selected" : "Reject"}
                    </button>
                    <button
                      disabled={isGroupActionRunning || pendingSelectedCount === 0}
                      onClick={() => reviewSelectedRequests("approve")}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-bold"
                    >
                      {group.isBatch ? "Approve Selected" : "Approve"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
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
