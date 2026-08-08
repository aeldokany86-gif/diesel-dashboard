"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ModalPortal from "../../components/ui/ModalPortal";
import StatusBadge from "../../components/feedback/StatusBadge";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";
import { useLanguage } from "../../context/LanguageContext";
import { resolveRecordMessage, resolveEnumValue } from "../../lib/i18nMessageHelpers";

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

function buildApprovalGroups(requests, t) {
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
        ? (
            primaryRequest?.type === "asset_transfer"
              ? t("approvals.assetTransfer.bulkTitle", { count: group.requests.length })
              : t("approvals.batch.title", {
                  entity: primaryRequest?.entityType || t("approvals.entities.request"),
                })
          )
        : resolveRecordMessage(t, primaryRequest, "title", t("approvals.defaults.requestTitle")),
      details: group.isBatch
        ? (
            primaryRequest?.type === "asset_transfer"
              ? t("approvals.assetTransfer.bulkDetails", {
                  count: group.requests.length,
                  fromProject: primaryRequest?.approvalRoute?.sourceProject || "-",
                  toProject: primaryRequest?.approvalRoute?.destinationProject || "-",
                })
              : t("approvals.batch.details", {
                  count: group.requests.length,
                  batchId: group.batchId,
                })
          )
        : resolveRecordMessage(t, primaryRequest, "details", ""),
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
  onRejectAssetAction,
  onApproveStationAction,
  onRejectStationAction,
  onOperationApprovalReviewed,
  onOperationCorrectionReviewed,
  onOperationsWorkspaceRefresh,
  runWithActionLoading = async (_label, actionFn) => actionFn(),
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const getApprovalStatusLabel = (status) =>
    resolveEnumValue(t, "approvalStatus", status, status || "-");

  const getEntityTypeLabel = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("employee")) return t("approvals.entities.employee");
    if (normalized.includes("asset")) return t("approvals.entities.asset");
    if (normalized.includes("station")) return t("approvals.entities.station");
    if (normalized.includes("operation correction")) return t("approvals.entities.operationCorrection");
    if (normalized.includes("operation")) return t("approvals.entities.operation");
    if (normalized.includes("project")) return t("approvals.entities.project");
    return value || t("approvals.entities.request");
  };

  const getApprovalTitle = (request, isBatch = false, count = 0) =>
    isBatch
      ? t("approvals.batch.title", {
          entity: getEntityTypeLabel(request?.entityType),
          count,
        })
      : resolveRecordMessage(
          t,
          request,
          "title",
          request?.title || t("approvals.defaults.requestTitle"),
        );

  const getApprovalFieldLabel = (field = {}) => {
    if (field?.labelKey) {
      const translated = t(field.labelKey, field.labelParams || {});
      if (translated && translated !== field.labelKey) return translated;
    }

    const normalized = String(field?.field || "").trim().toLowerCase();
    const fieldKeyMap = {
      currentstock: "approvals.fields.inventoryAdjustment",
      adjustmentqty: "approvals.fields.adjustmentQuantity",
      reason: "approvals.fields.reason",
      zerobalance: "approvals.fields.zeroBalance",
    };

    const key = fieldKeyMap[normalized];
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }

    return field?.label || field?.labelFallback || makeFieldLabel(field?.field);
  };

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

  const isBackendAssetActionRequest = (request) =>
    Boolean(request?.isBackendAssetAction || request?.backendAssetActionRequestId);

  const isBackendStationActionRequest = (request) =>
    Boolean(request?.isBackendStationAction || request?.backendStationActionRequestId);

  const visibleApprovals = approvals.filter((item) => {
    if (!canUserViewApproval(currentUser, item)) return false;
    return selectedStatus === "All"
      ? true
      : normalizeApprovalStatus(item.status) === normalizeApprovalStatus(selectedStatus);
  });

  const approveRequest = async (request) => {
    return runWithActionLoading(t("approvals.loading.approving"), async () => {
    if (!canUserReviewApproval(currentUser, request)) {
      showToast?.("warning", t("approvals.messages.notAllowedReview"));
      return;
    }

    if (!isPendingApprovalStatus(request.status)) {
      showToast?.("warning", t("approvals.messages.alreadyReviewed"));
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || t("approvals.defaults.approvedNote");

    if (isBackendOperationCorrectionRequest(request)) {
      if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser?.role)) {
        showToast?.("warning", t("approvals.messages.onlyManagersApproveCorrection"));
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
        trackActivity(
          "Approve Operation Correction",
          "operations",
          request.title,
          {
            actionKey: "notifications.activity.actions.approveOperationCorrection",
            detailsKey: "notifications.activity.details.operationCorrectionApproved",
            detailsParams: { operationNo: request.entityId || request.backendOperationId || "-" },
          },
        );
        showToast?.("success", t("approvals.messages.correctionApproved"));
      } catch (error) {
        console.warn("Failed to approve operation correction.", error);
        showToast?.("warning", error?.message || t("approvals.messages.correctionApproveFailed"));
      }
      return;
    }

    if (isBackendOperationRequest(request)) {
      if (currentUser?.role !== "Manager") {
        showToast?.("warning", t("approvals.messages.onlyAssignedManagerApproveOperation"));
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
        trackActivity(
          "Approve Operation Request",
          "operations",
          request.title,
          {
            actionKey: "notifications.activity.actions.approveOperationRequest",
            detailsKey: "notifications.activity.details.operationRequestApproved",
            detailsParams: { operationNo: request.entityId || request.backendOperationId || "-" },
          },
        );
        showToast?.("success", t("approvals.messages.operationApproved"));
      } catch (error) {
        showToast?.("warning", getFriendlyApiErrorMessage(error, t("approvals.messages.operationApproveFailed")));
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
          showToast?.("warning", t("approvals.messages.adminManagerTransfersOnly"));
          return;
        }

        const reviewerUserId = currentUser?.id || "";

        if (!reviewerUserId) {
          showToast?.("warning", t("approvals.validation.approverIdRequired"));
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
          t("approvals.messages.employeeTransferApplyFailed");
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
          t("approvals.messages.assetTransferApplyFailed");
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
          t("approvals.messages.stationTransferApplyFailed");
        showToast?.("warning", message);
        return;
      }
    }

    if (isBackendAssetActionRequest(request)) {
      try {
        await onApproveAssetAction?.(request, note);
        setSelectedApprovalGroup(null);
        showToast?.("success", t("approvals.messages.fullyApproved"));
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message ||
            error?.message ||
            t("approvals.messages.assetApprovalApplyFailed")
        );
      }
      return;
    }

    if (isBackendStationActionRequest(request)) {
      try {
        await onApproveStationAction?.(request, note);
        setSelectedApprovalGroup(null);
        showToast?.("success", t("approvals.messages.fullyApproved"));
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message ||
            error?.message ||
            t("approvals.messages.stationApprovalApplyFailed")
        );
      }
      return;
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
          t("approvals.messages.assetApprovalApplyFailed");
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
          t("approvals.messages.stationApprovalApplyFailed");
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

    const approvedStationAction =
      request?.payload?.action ||
      request?.payload?.values?.action ||
      "";

    const hasDedicatedFinalActivity =
      fullyApproved &&
      request?.module === "stations" &&
      ["stock_count_adjustment", "zero_balance_adjustment"].includes(
        approvedStationAction,
      );

    if (request?.type === "employee_transfer") {
      const transfer = request?.payload?.transfer || {};
      const employeeId =
        transfer?.employeeId ||
        transfer?.employeeBackendId ||
        request?.entityId ||
        "-";
      const employeeName =
        transfer?.employeeName ||
        request?.payload?.employeeName ||
        employeeId;
      const fromProject =
        transfer?.fromProjectName ||
        transfer?.fromProjectId ||
        request?.payload?.fromProject ||
        "-";
      const toProject =
        transfer?.toProjectName ||
        transfer?.toProjectId ||
        request?.payload?.toProject ||
        "-";

      trackActivity(
        fullyApproved
          ? "Approve Team Transfer"
          : "Approve Team Transfer Stage",
        "team",
        fullyApproved
          ? `Team member ${employeeName} (${employeeId}) transfer from ${fromProject} to ${toProject} was approved.`
          : `Team member ${employeeName} (${employeeId}) transfer approval stage completed from ${fromProject} to ${toProject}.`,
        {
          actionKey: fullyApproved
            ? "notifications.activity.actions.employeeTransferApproved"
            : "notifications.activity.actions.employeeTransferStageApproved",
          actionFallback: fullyApproved
            ? "Team Transfer Approved"
            : "Team Transfer Stage Approved",
          detailsKey: fullyApproved
            ? "notifications.activity.details.employeeTransferApproved"
            : "notifications.activity.details.employeeTransferStageApproved",
          detailsParams: {
            employeeId,
            employeeName,
            fromProject,
            toProject,
            stage: getApprovalStageLabel(currentStage || {}),
          },
          detailsFallback: fullyApproved
            ? `Team member ${employeeName} (${employeeId}) transfer from ${fromProject} to ${toProject} was approved.`
            : `Team member ${employeeName} (${employeeId}) transfer approval stage completed from ${fromProject} to ${toProject}.`,
        },
      );
    } else if (request?.type === "station_transfer") {
      const transfer = request?.payload?.transfer || {};
      const stationId =
        transfer?.stationId ||
        transfer?.stationName ||
        request?.entityId ||
        "-";
      const fromProject =
        transfer?.fromProjectName ||
        transfer?.fromProjectId ||
        request?.payload?.fromProject ||
        "-";
      const toProject =
        transfer?.toProjectName ||
        transfer?.toProjectId ||
        request?.payload?.toProject ||
        "-";

      trackActivity(
        fullyApproved
          ? "Approve Station Transfer"
          : "Approve Station Transfer Stage",
        "stations",
        fullyApproved
          ? `Station ${stationId} transfer from ${fromProject} to ${toProject} was approved.`
          : `Station ${stationId} transfer approval stage completed from ${fromProject} to ${toProject}.`,
        {
          actionKey: fullyApproved
            ? "notifications.activity.actions.stationTransferApproved"
            : "notifications.activity.actions.stationTransferStageApproved",
          actionFallback: fullyApproved
            ? "Station Transfer Approved"
            : "Station Transfer Stage Approved",
          detailsKey: fullyApproved
            ? "notifications.activity.details.stationTransferApproved"
            : "notifications.activity.details.stationTransferStageApproved",
          detailsParams: {
            stationId,
            fromProject,
            toProject,
            stage: getApprovalStageLabel(currentStage || {}),
          },
          detailsFallback: fullyApproved
            ? `Station ${stationId} transfer from ${fromProject} to ${toProject} was approved.`
            : `Station ${stationId} transfer approval stage completed from ${fromProject} to ${toProject}.`,
        },
      );
    } else if (!hasDedicatedFinalActivity) {
      trackActivity(
        fullyApproved ? "Approve Request" : "Approve Request Stage",
        request.module,
        `${request.title} (${currentStage?.approvalStage || "Approval Stage"})`,
        {
          actionKey: fullyApproved
            ? "notifications.activity.actions.approveRequest"
            : "notifications.activity.actions.approveRequestStage",
          detailsKey: fullyApproved
            ? "notifications.activity.details.requestApproved"
            : "notifications.activity.details.requestStageApproved",
          detailsParams: {
            requestTitle: request.title || t("approvals.defaults.requestTitle"),
            entityType: request.entityType || "Request",
            entityId: request.entityId || "-",
            stage: getApprovalStageLabel(currentStage || {}),
          },
        },
      );
    }
    showToast?.("success", fullyApproved ? t("approvals.messages.fullyApproved") : t("approvals.messages.stageApprovedPending"));
  
    });
  };

  const rejectRequest = async (request) => {
    return runWithActionLoading(t("approvals.loading.rejecting"), async () => {
    if (!isBackendTransferRequest(request) && !canUserReviewApproval(currentUser, request) && currentUser?.role !== "Admin") {
      showToast?.("warning", t("approvals.messages.notAllowedReview"));
      return;
    }

    if (request.status !== "Pending") {
      showToast?.("warning", t("approvals.messages.alreadyReviewed"));
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || t("approvals.defaults.rejectedNote");

    if (isBackendAssetActionRequest(request)) {
      try {
        await onRejectAssetAction?.(request, note);
        setSelectedApprovalGroup(null);
        showToast?.("error", t("approvals.messages.requestRejected"));
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message ||
            error?.message ||
            t("approvals.messages.assetApprovalApplyFailed")
        );
      }
      return;
    }

    if (isBackendStationActionRequest(request)) {
      try {
        await onRejectStationAction?.(request, note);
        setSelectedApprovalGroup(null);
        showToast?.("error", t("approvals.messages.requestRejected"));
      } catch (error) {
        showToast?.(
          "warning",
          error?.response?.data?.message ||
            error?.message ||
            t("approvals.messages.stationApprovalApplyFailed")
        );
      }
      return;
    }

    if (isBackendOperationCorrectionRequest(request)) {
      if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser?.role)) {
        showToast?.("warning", t("approvals.messages.onlyManagersRejectCorrection"));
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
        trackActivity(
          "Reject Operation Correction",
          "operations",
          request.title,
          {
            actionKey: "notifications.activity.actions.rejectOperationCorrection",
            detailsKey: "notifications.activity.details.operationCorrectionRejected",
            detailsParams: { operationNo: request.entityId || request.backendOperationId || "-" },
          },
        );
        showToast?.("success", t("approvals.messages.correctionRejected"));
      } catch (error) {
        console.warn("Failed to reject operation correction.", error);
        showToast?.("warning", error?.message || t("approvals.messages.correctionRejectFailed"));
      }
      return;
    }

    if (isBackendOperationRequest(request)) {
      if (currentUser?.role !== "Manager") {
        showToast?.("warning", t("approvals.messages.onlyAssignedManagerRejectOperation"));
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
        trackActivity(
          "Reject Operation Request",
          "operations",
          request.title,
          {
            actionKey: "notifications.activity.actions.rejectOperationRequest",
            detailsKey: "notifications.activity.details.operationRequestRejected",
            detailsParams: { operationNo: request.entityId || request.backendOperationId || "-" },
          },
        );
        showToast?.("success", t("approvals.messages.operationRejected"));
      } catch (error) {
        showToast?.("warning", getFriendlyApiErrorMessage(error, t("approvals.messages.operationRejectFailed")));
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
          t("approvals.messages.employeeTransferRejectFailed");
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
          t("approvals.messages.assetTransferRejectFailed");
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
          t("approvals.messages.stationTransferRejectFailed");
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

    const rejectedStationAction =
      request?.payload?.action ||
      request?.payload?.values?.action ||
      "";
    const rejectedStationId =
      request?.payload?.stationId ||
      request?.payload?.id ||
      request?.entityId ||
      "-";

    if (rejectedStationAction === "zero_balance_adjustment") {
      trackActivity(
        "Reject Zero Balance Request",
        request.module,
        `Zero balance request rejected for station ${rejectedStationId}. Reason: ${note}`,
        {
          actionKey: "notifications.activity.actions.zeroBalanceRequestRejected",
          actionFallback: "Reject Zero Balance Request",
          detailsKey: "notifications.activity.details.zeroBalanceRequestRejected",
          detailsParams: {
            stationId: rejectedStationId,
            reason: note,
          },
          detailsFallback: `Zero balance request rejected for station ${rejectedStationId}. Reason: ${note}`,
        },
      );
    } else if (rejectedStationAction === "stock_count_adjustment") {
      trackActivity(
        "Reject Inventory Adjustment",
        request.module,
        `Inventory adjustment request rejected for station ${rejectedStationId}. Reason: ${note}`,
        {
          actionKey: "notifications.activity.actions.inventoryAdjustmentRejected",
          actionFallback: "Reject Inventory Adjustment",
          detailsKey: "notifications.activity.details.inventoryAdjustmentRejected",
          detailsParams: {
            stationId: rejectedStationId,
            reason: note,
          },
          detailsFallback: `Inventory adjustment request rejected for station ${rejectedStationId}. Reason: ${note}`,
        },
      );
    } else if (request?.type === "employee_transfer") {
      const transfer = request?.payload?.transfer || {};
      const employeeId =
        transfer?.employeeId ||
        transfer?.employeeBackendId ||
        request?.entityId ||
        "-";
      const employeeName =
        transfer?.employeeName ||
        request?.payload?.employeeName ||
        employeeId;
      const fromProject =
        transfer?.fromProjectName ||
        transfer?.fromProjectId ||
        request?.payload?.fromProject ||
        "-";
      const toProject =
        transfer?.toProjectName ||
        transfer?.toProjectId ||
        request?.payload?.toProject ||
        "-";

      trackActivity(
        "Reject Team Transfer",
        "team",
        `Team member ${employeeName} (${employeeId}) transfer from ${fromProject} to ${toProject} was rejected. Reason: ${note}`,
        {
          actionKey: "notifications.activity.actions.employeeTransferRejected",
          actionFallback: "Team Transfer Rejected",
          detailsKey: "notifications.activity.details.employeeTransferRejected",
          detailsParams: {
            employeeId,
            employeeName,
            fromProject,
            toProject,
            reason: note,
          },
          detailsFallback: `Team member ${employeeName} (${employeeId}) transfer from ${fromProject} to ${toProject} was rejected. Reason: ${note}`,
        },
      );
    } else if (request?.type === "station_transfer") {
      const transfer = request?.payload?.transfer || {};
      const stationId =
        transfer?.stationId ||
        transfer?.stationName ||
        request?.entityId ||
        "-";
      const fromProject =
        transfer?.fromProjectName ||
        transfer?.fromProjectId ||
        request?.payload?.fromProject ||
        "-";
      const toProject =
        transfer?.toProjectName ||
        transfer?.toProjectId ||
        request?.payload?.toProject ||
        "-";

      trackActivity(
        "Reject Station Transfer",
        "stations",
        `Station ${stationId} transfer from ${fromProject} to ${toProject} was rejected. Reason: ${note}`,
        {
          actionKey: "notifications.activity.actions.stationTransferRejected",
          actionFallback: "Station Transfer Rejected",
          detailsKey: "notifications.activity.details.stationTransferRejected",
          detailsParams: {
            stationId,
            fromProject,
            toProject,
            reason: note,
          },
          detailsFallback: `Station ${stationId} transfer from ${fromProject} to ${toProject} was rejected. Reason: ${note}`,
        },
      );
    } else {
      trackActivity(
        "Reject Request",
        request.module,
        `${request.title} (${request.entityType || "Request"}: ${request.entityId || "-"})`,
        {
          actionKey: "notifications.activity.actions.rejectRequest",
          detailsKey: "notifications.activity.details.requestRejected",
          detailsParams: {
            requestTitle: request.title || t("approvals.defaults.requestTitle"),
            entityType: request.entityType || "Request",
            entityId: request.entityId || "-",
          },
        },
      );
    }

    showToast?.("error", t("approvals.messages.requestRejected"));
  
    });
  };

  const approvalGroups = useMemo(
    () => buildApprovalGroups(visibleApprovals, t),
    [visibleApprovals, t]
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

  const getApprovalStageLabel = (approver = {}) => {
    const key = approver?.approvalStageKey;
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }

    const rawStage = String(approver?.approvalStage || "").trim();
    const normalized = rawStage.toLowerCase();

    if (normalized.includes("source")) {
      return t("approvals.stages.sourceProjectManager");
    }
    if (normalized.includes("destination")) {
      return t("approvals.stages.destinationProjectManager");
    }
    if (normalized.includes("project manager")) {
      return t("approvals.stages.projectManager");
    }

    return rawStage || t("approvals.defaults.approvalStage");
  };

  const getReadableApproverName = (approver) => {
    const rawName = String(approver?.userName || "").trim();
    if (rawName && !/^cm[a-z0-9]{10,}$/i.test(rawName)) return rawName;
    return getApprovalStageLabel(approver) || t("approvals.defaults.approver");
  };

  const getRequestItemLabel = (request) =>
    request?.entityId ||
    request?.payload?.asset?.assetCode ||
    request?.payload?.station?.stationName ||
    request?.payload?.employee?.fullName ||
    request?.title ||
    t("approvals.defaults.requestTitle");

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
      return <p className="text-sm text-slate-500">{t("approvals.empty.noChanges")}</p>;
    }

    const oldValueLabel = isRtl ? "القيمة القديمة" : "Old Value";
    const newValueLabel = isRtl ? "القيمة الجديدة" : "New Value";

    return (
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={`${request.id}-${field.field}-${index}`}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
          >
            <p className="mb-2 text-xs font-black text-slate-200">
              {getApprovalFieldLabel(field)}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {oldValueLabel}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-200 break-words" dir="ltr">
                  {normalizeApprovalValue(field.oldValue)}
                </p>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500/80">
                  {newValueLabel}
                </p>
                <p className="mt-1 text-sm font-black text-amber-300 break-words" dir="ltr">
                  {normalizeApprovalValue(field.newValue)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCompactRoute = (request) => {
    const approvers = request?.approvalRoute?.requiredApprovers || [];
    if (!approvers.length) {
      return <p className="text-sm text-slate-500">{t("approvals.empty.noRoute")}</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {approvers.map((approver, index) => {
          const status = normalizeApprovalStatus(approver.status);
          const marker = status === "Approved" ? "✓" : status === "Rejected" ? "×" : "•";
          return (
            <div
              key={`${request.id}-${approver.approvalStage}-${index}`}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5"
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
                <p className="text-[10px] text-slate-500">{getApprovalStageLabel(approver)}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen p-4 sm:p-6 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black">{t("approvals.title")}</h1>
            <p className="text-slate-400 text-sm">{t("approvals.subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">{t("approvals.cards.pending")}</p>
              <p className="text-2xl font-black text-amber-300">{pendingCount}</p>
            </div>
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-400">{t("approvals.cards.sensitive")}</p>
              <p className="text-2xl font-black text-red-300">{sensitiveCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className={`bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 ${isRtl ? "text-right" : "text-left"}`}
          >
            <option value="Pending">{t("approvals.status.pending")}</option>
            <option value="Approved">{t("approvals.status.approved")}</option>
            <option value="Rejected">{t("approvals.status.rejected")}</option>
            <option value="All">{t("approvals.status.all")}</option>
          </select>
          <p className="text-xs text-slate-500">
            {t("approvals.count", { count: approvalGroups.length })}
          </p>
        </div>

        <div className="space-y-3">
          {approvalGroups.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 text-slate-400">
              {t("approvals.empty.noRequests")}
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
                  className={`w-full bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl transition ${isRtl ? "text-right" : "text-left"}`}
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
                          {getApprovalStatusLabel(group.status)}
                        </span>
                        {group.isBatch && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700">
                            {t("approvals.itemsCount", { count: group.requests.length })}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-lg font-black text-slate-100">
                        {getApprovalTitle(request, group.isBatch, group.requests.length)}
                      </h2>

                      {direction ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-500">
                            {isRtl ? "القيمة القديمة:" : "Old Value:"}{" "}
                            <strong className="text-slate-200" dir="ltr">{direction.from}</strong>
                          </span>
                          <span className="text-amber-500/80">
                            {isRtl ? "القيمة الجديدة:" : "New Value:"}{" "}
                            <strong className="text-amber-300" dir="ltr">{direction.to}</strong>
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">{request.details}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-5 text-xs text-slate-500 shrink-0">
                      <div>
                        <p className="text-slate-300 font-bold">{request.requestedByName || t("approvals.defaults.unknownUser")}</p>
                        <p>{formatApprovalDate(request.requestedAt, language === "ar" ? "ar-SA" : "en-GB")}</p>
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
          <div className="fleet-modal-backdrop fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[84vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                      group.status === "Pending"
                        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                        : group.status === "Approved"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border-red-500/30"
                    }`}>
                      {getApprovalStatusLabel(group.status)}
                    </span>
                    {group.isBatch && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {t("approvals.itemsCount", { count: group.requests.length })}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                    {group.isBatch ? t("approvals.batch.reviewTitle", { count: group.requests.length, entity: getEntityTypeLabel(primary.entityType) }) : getApprovalTitle(primary)}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedApprovalGroup(null)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold"
                >
                  {t("common.close")}
                </button>
              </div>

              <div className="px-4 py-3 overflow-y-auto space-y-3.5">
                {group.isBatch ? (
                  <section>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">{t("approvals.sections.affectedItems")}</h3>
                      {group.status === "Pending" && (
                        <div className="flex gap-2">
                          <button onClick={selectAllPendingInGroup} className="text-xs font-bold text-amber-300">{t("approvals.actions.selectAll")}</button>
                          <button onClick={clearGroupSelection} className="text-xs font-bold text-slate-500">{t("common.clear")}</button>
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
                              checked ? "border-amber-500/40 bg-amber-500/5" : "border-slate-700 bg-slate-900/60"
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
                  <section className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <span className="text-[11px] font-bold text-slate-500">{t("approvals.sections.requestedBy")}:</span>
                    <span className="text-sm font-bold text-slate-100">
                      {primary.requestedByName || t("approvals.defaults.unknownUser")}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400" dir="ltr">
                      {formatApprovalDate(primary.requestedAt, language === "ar" ? "ar-SA" : "en-GB")}
                    </span>
                  </section>
                )}

                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5">{t("approvals.sections.changes")}</h3>
                  {renderCompactChanges(primary)}
                </section>

                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5">{t("approvals.sections.progress")}</h3>
                  {renderCompactRoute(primary)}
                </section>

                {group.status === "Pending" && (
                  <section>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5">{t("approvals.sections.reviewNote")}</h3>
                    <textarea
                      value={getGroupReviewNote()}
                      onChange={(event) => applyGroupReviewNote(event.target.value)}
                      placeholder={t("approvals.placeholders.optionalNote")}
                      className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 min-h-[58px] resize-none ${isRtl ? "text-right" : "text-left"}`}
                    />
                  </section>
                )}
              </div>

              {group.status === "Pending" && (
                <div className="px-4 py-3 border-t border-slate-700 bg-slate-950 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {group.isBatch ? t("approvals.selectedCount", { count: pendingSelectedCount }) : t("approvals.actions.readyForReview")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={isGroupActionRunning || pendingSelectedCount === 0}
                      onClick={() => reviewSelectedRequests("reject")}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-bold"
                    >
                      {group.isBatch ? t("approvals.actions.rejectSelected") : t("approvals.actions.reject")}
                    </button>
                    <button
                      disabled={isGroupActionRunning || pendingSelectedCount === 0}
                      onClick={() => reviewSelectedRequests("approve")}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-bold"
                    >
                      {group.isBatch ? t("approvals.actions.approveSelected") : t("approvals.actions.approve")}
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

function formatApprovalDate(rawDate, locale = "en-GB") {
  if (!rawDate) return "-";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return rawDate;
  return d.toLocaleString(locale || "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
