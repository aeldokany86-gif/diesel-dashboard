"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import ChartFrame from "../../components/charts/ChartFrame";
import Field from "../../components/forms/Field";
import ModalPortal from "../../components/ui/ModalPortal";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  cleanCsvCell,
  filterActiveProjects,
  formatNumber,
  getDuplicateIdError,
  getHeaderIndex,
  isSameText,
  mapFrontendEmployeeStatusForBackend,
  normalizeBackendRoleName,
  normalizeScopeValue,
  normalizeText,
} from "../../lib/helpers";

import {
  companyMatches,
  makeTenantEntityKey,
} from "../../lib/companyHelpers";

function notifyUser(showToastFn, type, message) {
  const safeType = type || "info";
  const safeMessage = String(message ?? "");

  if (typeof showToastFn === "function") {
    showToastFn(safeType, safeMessage);
    return;
  }

  // Avoid browser-native alert boxes so the UI remains consistent.
  if (safeType === "warning" || safeType === "error") {
    console.warn(safeMessage);
  } else {
    console.log(safeMessage);
  }
}

function inferToastTypeFromMessage(message) {
  const normalized = String(message || "").toLowerCase();

  if (
    normalized.includes("success") ||
    normalized.includes("saved") ||
    normalized.includes("updated") ||
    normalized.includes("exported") ||
    normalized.includes("completed") ||
    normalized.includes("submitted") ||
    normalized.includes("added")
  ) {
    return "success";
  }

  if (
    normalized.includes("not allowed") ||
    normalized.includes("cannot") ||
    normalized.includes("invalid") ||
    normalized.includes("failed") ||
    normalized.includes("error")
  ) {
    return "warning";
  }

  return "warning";
}

function isOfficerUser(user) {
  return user?.role === "Officer";
}

function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

const TEAM_CREATE_USER_ROLE_NAMES = [
  "Admin",
  "Manager",
  "Officer",
  "Supervisor",
  "Operator",
  "Top Management",
];

export default function TeamPage({
  fuelers = [],
  users = [],
  projects = [],
  transferProjects = projects,
  data = [],
  headers = [],
  showToast,
  currency = "SAR",
  getLiterPriceByDate,
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
  onCreateEmployee,
  onUpdateEmployee,
  onCreateEmployeeTransfer,
  onCreateUserFromEmployee,
  onUpdateUserStatus,
  onLoadRoles,
  pendingEmployeeTransfers = [],
  companies = [],
}) {
  const [localFuelers, setLocalFuelers] = useState([]);
  const [localFuelerUpdates, setLocalFuelerUpdates] = useState({});
  const [inlineFuelerEdit, setInlineFuelerEdit] = useState(null);
  const [pendingTeamChange, setPendingTeamChange] = useState(null);
  const [savingTeamChange, setSavingTeamChange] = useState(false);
  const [updatingUserStatusByFuelerId, setUpdatingUserStatusByFuelerId] = useState({});
  const [linkUserModal, setLinkUserModal] = useState(null);
  const [savingLinkedUser, setSavingLinkedUser] = useState(false);
  const [showAddFueler, setShowAddFueler] = useState(false);
  const [selectedFuelerHistory, setSelectedFuelerHistory] = useState(null);
  const [fuelerAuditLog, setFuelerAuditLog] = useState([]);
  const [showFuelersSettings, setShowFuelersSettings] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState([]);
  const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);
  const [bulkTransferProjectId, setBulkTransferProjectId] = useState("");
  const [savingBulkTransfer, setSavingBulkTransfer] = useState(false);

  const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10);

  const fuelersSettingsRef = useRef(null);

  useOutsideClick(fuelersSettingsRef, () => {
    setShowFuelersSettings(false);
  });

  const [teamRoleOptions, setTeamRoleOptions] = useState([]);
  const [loadingTeamRoles, setLoadingTeamRoles] = useState(false);

  const getCompanyCodeForFueler = (fueler = {}) => {
    const matchedCompany = companies.find((company) =>
      companyMatches(company.id, fueler.companyId || currentUser?.companyId)
    );

    return String(matchedCompany?.code || currentUser?.companyCode || "")
      .trim()
      .toLowerCase();
  };

  const getGeneratedUsernameForFueler = (fueler = {}) => {
    const employeeId = String(fueler.employeeId || fueler.id || "").trim();
    const companyCode = getCompanyCodeForFueler(fueler);

    return companyCode && employeeId ? `${companyCode}.${employeeId}` : employeeId ? `company.${employeeId}` : "-";
  };

  const [newFueler, setNewFueler] = useState({
    id: "",
    name: "",
    mobile: "",
    email: "",
    jobTitle: "Operator",
    projectId: "",
    projectName: "",
    status: "On Duty",
  });

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Team Member ID",
    "fueler id",
    "fueler",
  ]);

  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);

  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "transaction id",
    "id",
  ]);

  const sourceIndex = getHeaderIndex(headers, [
    "source_station",
    "Source station",
    "source station",
    "source_station_id",
    "station_id",
  ]);

  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);

  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "-";
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const masterFuelers = [...fuelers, ...localFuelers];
  const teamMemberIdDuplicateError = getDuplicateIdError(
    newFueler.id,
    masterFuelers,
    "Team Member ID"
  );

  const displayFuelers = masterFuelers.map((fueler) => {
    const localUpdate = localFuelerUpdates[fueler.id] || {};
    const effectiveLinkedUserId =
      localUpdate.linkedUserId !== undefined
        ? localUpdate.linkedUserId
        : fueler.linkedUserId || "";

    const explicitlyLinkedUser = users.find(
      (user) => normalizeText(user.id) === normalizeText(effectiveLinkedUserId)
    );

    const matchedEmailUser = !explicitlyLinkedUser
      ? users.find((user) => {
          const userEmail = normalizeText(user.email);
          return userEmail && userEmail === normalizeText(fueler.email);
        })
      : null;

    const linkedUser = explicitlyLinkedUser || matchedEmailUser;
    const linkedUserIsActive =
      localUpdate.linkedUserIsActive !== undefined
        ? Boolean(localUpdate.linkedUserIsActive)
        : explicitlyLinkedUser?.status === "Active" || explicitlyLinkedUser?.isActive === true;

    const pendingTransfer = pendingEmployeeTransfers.find((transfer) => {
      const status = String(transfer.status || "").toUpperCase();

      if (!["PENDING", "PARTIALLY_APPROVED"].includes(status)) return false;

      return (
        normalizeText(transfer.employeeBackendId) === normalizeText(fueler.backendId) ||
        normalizeText(transfer.employeeId) === normalizeText(fueler.id)
      );
    });

    return {
      ...fueler,
      ...localUpdate,
      backendId: fueler.backendId || fueler.id,
      mobile: localUpdate.mobile || fueler.mobile || "-",
      email: localUpdate.email || fueler.email || "-",
      projectId:
        localUpdate.projectId ||
        fueler.projectId ||
        "",
      projectName:
        localUpdate.projectName ||
        fueler.projectName ||
        fueler.project ||
        "-",
      status: localUpdate.status || fueler.status || "On Duty",
      role: explicitlyLinkedUser?.role || fueler.role || "Operator",
      jobTitle: localUpdate.jobTitle || fueler.jobTitle || fueler.role || "Operator",
      userStatus:
        effectiveLinkedUserId && linkedUserIsActive
          ? "Linked"
          : "Not Linked",
      linkedUserName: explicitlyLinkedUser?.fullName || localUpdate.linkedUserName || fueler.linkedUserName || "-",
      linkedUserId: effectiveLinkedUserId,
      linkedUserIsActive,
      userStatusUpdating: Boolean(updatingUserStatusByFuelerId[fueler.id]),
      suggestedUserId: matchedEmailUser?.id || "",
      suggestedUserName: matchedEmailUser?.fullName || "",
      suggestedUserStatus: matchedEmailUser?.status || "",
      pendingTransfer,
    };
  });

  const directRefuelOperations =
    typeIndex === -1
      ? []
      : data
          .map((row, originalIndex) => ({ row, originalIndex }))
          .filter((item) => isSameText(item.row[typeIndex], "Direct_Refuel"));

  const getFuelerOperations = (fuelerId) => {
    if (fuelerIndex === -1 || typeIndex === -1) return [];

    return directRefuelOperations
      .filter((item) => {
        const rowFuelerId = normalizeText(item.row[fuelerIndex]);
        return rowFuelerId === normalizeText(fuelerId);
      })
      .sort((a, b) => {
        const da = dateIndex !== -1 ? new Date(a.row[dateIndex]).getTime() || 0 : 0;
        const db = dateIndex !== -1 ? new Date(b.row[dateIndex]).getTime() || 0 : 0;
        return db - da;
      });
  };

  const getFuelerDieselQty = (fuelerId) => {
    if (dieselIndex === -1) return 0;

    return getFuelerOperations(fuelerId).reduce((sum, item) => {
      return sum + (parseFloat(item.row[dieselIndex]) || 0);
    }, 0);
  };

  const fuelersWithKpi = displayFuelers.map((fueler) => {
    const operations = getFuelerOperations(fueler.id);
    const dieselQty = getFuelerDieselQty(fueler.id);

    return {
      ...fueler,
      operationsCount: operations.length,
      dieselQty,
    };
  });

  const activeTeamFuelers = fuelersWithKpi.filter(
    (fueler) => !isRetiredTeamStatus(fueler.status)
  );

  const normalizedTeamSearch = normalizeText(teamSearch);
  const visibleTeamFuelers = normalizedTeamSearch
    ? activeTeamFuelers.filter((fueler) => {
        const searchableText = [
          fueler.id,
          fueler.name,
          fueler.mobile,
          fueler.email,
          fueler.jobTitle,
          fueler.projectName,
          fueler.status,
          fueler.userStatus,
        ]
          .map((value) => normalizeText(value))
          .join(" ");

        return searchableText.includes(normalizedTeamSearch);
      })
    : activeTeamFuelers;

  const selectedTeamFuelers = selectedTeamMemberIds
    .map((id) => activeTeamFuelers.find((fueler) => normalizeText(fueler.backendId || fueler.id) === normalizeText(id)))
    .filter(Boolean);

  const visibleSelectableFuelerIds = visibleTeamFuelers.map((fueler) => fueler.backendId || fueler.id);
  const allVisibleFuelersSelected =
    visibleSelectableFuelerIds.length > 0 &&
    visibleSelectableFuelerIds.every((id) => selectedTeamMemberIds.includes(id));

  const chartData = activeTeamFuelers
    .map((fueler) => ({
      name: fueler.name || fueler.id,
      dieselQty: Number(fueler.dieselQty) || 0,
    }))
    .sort((a, b) => b.dieselQty - a.dieselQty);

  const totalOperations = activeTeamFuelers.reduce(
    (sum, fueler) => sum + fueler.operationsCount,
    0
  );

  const totalDiesel = activeTeamFuelers.reduce(
    (sum, fueler) => sum + fueler.dieselQty,
    0
  );

  const assignedProjectsCount = new Set(
    activeTeamFuelers
      .map((fueler) => fueler.projectName)
      .filter((projectName) => projectName && projectName !== "-")
  ).size;

  const toggleTeamMemberSelection = (fueler) => {
    const key = fueler.backendId || fueler.id;
    setSelectedTeamMemberIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleVisibleTeamSelection = () => {
    setSelectedTeamMemberIds((prev) => {
      if (allVisibleFuelersSelected) {
        return prev.filter((id) => !visibleSelectableFuelerIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleSelectableFuelerIds]));
    });
  };

  const clearTeamSelection = () => {
    setSelectedTeamMemberIds([]);
  };

  const openBulkTransferModal = () => {
    if (!hasPermission("team", "edit")) {
      showToast?.("warning", "Read-only access: you cannot transfer team members.");
      return;
    }

    if (!selectedTeamFuelers.length) {
      showToast?.("warning", "Please select at least one team member.");
      return;
    }

    setBulkTransferProjectId("");
    setBulkTransferModalOpen(true);
  };

  const closeBulkTransferModal = () => {
    if (savingBulkTransfer) return;
    setBulkTransferModalOpen(false);
    setBulkTransferProjectId("");
  };

  const confirmBulkTransfer = async () => {
    if (savingBulkTransfer) return;

    if (!bulkTransferProjectId) {
      showToast?.("warning", "Please select destination project.");
      return;
    }

    if (!selectedTeamFuelers.length) {
      showToast?.("warning", "Please select at least one team member.");
      return;
    }

    if (typeof onCreateEmployeeTransfer !== "function") {
      showToast?.("warning", "Employee transfer API is not configured.");
      return;
    }

    setSavingBulkTransfer(true);

    try {
      const targetProjectName = getProjectNameById(bulkTransferProjectId);

      for (const fueler of selectedTeamFuelers) {
        if (normalizeText(fueler.projectId || fueler.projectName) === normalizeText(bulkTransferProjectId)) {
          continue;
        }

        await onCreateEmployeeTransfer(fueler, bulkTransferProjectId);
      }

      showToast?.(
        "success",
        `Bulk transfer request submitted for ${selectedTeamFuelers.length} team member(s) to ${targetProjectName}.`
      );

      setFuelerAuditLog((prev) => [
        ...prev,
        {
          fuelerId: selectedTeamFuelers.map((fueler) => fueler.id).join(", "),
          fuelerName: `${selectedTeamFuelers.length} selected team member(s)`,
          field: "Bulk Transfer",
          oldValue: selectedTeamFuelers.map((fueler) => `${fueler.id} - ${fueler.projectName || "-"}`).join(" | "),
          newValue: targetProjectName,
          reason: "Bulk transfer request",
          editedBy: currentUser?.fullName || currentUser?.email || "System",
          editedAt: new Date().toISOString(),
        },
      ]);

      clearTeamSelection();
      closeBulkTransferModal();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit bulk transfer request.";
      showToast?.("warning", message);
    } finally {
      setSavingBulkTransfer(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const value = cleanCsvCell(status).toLowerCase();

    if (value === "on duty" || value === "active") {
      return "bg-green-500/20 text-green-300 border border-green-500/30";
    }

    if (value === "in vacation" || value === "vacation" || value === "في اجازة") {
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    }

    if (
      value === "retired / resigned" ||
      value === "retired/resigned" ||
      value === "retired" ||
      value === "resigned"
    ) {
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    }

    return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  };

  function isRetiredTeamStatus(status) {
    const value = cleanCsvCell(status).toLowerCase().replace(/[\s_-]+/g, "");

    return (
      value === "retiredresigned" ||
      value === "retired/resigned" ||
      value === "retired" ||
      value === "resigned"
    );
  }

  const requestRetireFueler = (fueler) => {
    if (!hasPermission("team", "edit")) {
      showToast?.("warning", "Read-only access: you cannot retire team members.");
      return;
    }

    if (!fueler?.id) {
      showToast?.("warning", "Team member is not valid.");
      return;
    }

    setPendingTeamChange({
      fueler,
      field: "retire",
      oldValue: fueler.status || "On Duty",
      newValue: "Retired / Resigned",
      oldDisplayValue: fueler.status || "On Duty",
      newDisplayValue: "Retired / Resigned",
      message:
        "This team member will be retired and hidden from the Team page. Historical operations and reports will remain unchanged. If this employee has a linked system user, the user login will be deactivated. If the employee returns later, create a new team member with a new Team Member ID.",
    });
  };


  const printTable = (tableId, title = "Team Report") => {
    const tableElement = document.getElementById(tableId);

    if (!tableElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #111;
            }

            h2 {
              margin-bottom: 20px;
              font-size: 22px;
            }

            .report-meta {
              margin-bottom: 18px;
              font-size: 12px;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th, td {
              border: 1px solid #ccc;
              padding: 8px 10px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background: #fafafa;
            }

            button {
              background: transparent;
              border: 0;
              color: #111;
              padding: 0;
              font: inherit;
              text-align: left;
            }

            span {
              color: #111 !important;
            }

            @media print {
              body {
                padding: 15px;
              }
            }
          </style>
        </head>

        <body>
          <h2>${title}</h2>
          <div class="report-meta">
            Generated at: ${new Date().toLocaleString()}
          </div>

          ${tableElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportFuelersCSV = () => {
    exportRowsToCSV(
      "team_report",
      [
        "#",
        "Team Member ID",
        "Name",
        "Mobile",
        "Email",
        "Job Title",
        "User Status",
        "Project Name",
        "Work Status",
      ],
      activeTeamFuelers.map((fueler, i) => [
        i + 1,
        fueler.id,
        fueler.name || "-",
        fueler.mobile || "-",
        fueler.email || "-",
        fueler.jobTitle || "Operator",
        fueler.userStatus || "Active",
        fueler.projectName || "-",
        fueler.status || "On Duty",
      ])
    );
  };

  const resetNewFueler = () => {
    setNewFueler({
      id: "",
      name: "",
      mobile: "",
      email: "",
      jobTitle: "Operator",
      projectId: "",
      projectName: "",
      status: "On Duty",
    });
  };

  const closeAddFueler = () => {
    setShowAddFueler(false);
    resetNewFueler();
  };

  const saveNewFueler = async () => {
    if (!hasPermission("team", "add")) {
      showToast?.("warning", "Read-only access: you cannot add team members.");
      return;
    }

    const fuelerId = newFueler.id.trim();
    const fuelerName = newFueler.name.trim();
    const mobile = newFueler.mobile.trim();
    const email = newFueler.email.trim();
    const jobTitle = String(newFueler.jobTitle || "Operator").trim() || "Operator";
    const projectId = newFueler.projectId || newFueler.projectName || "";
    const selectedProject = transferProjects.find((project) =>
      normalizeText(project.backendId || project.id) === normalizeText(projectId) ||
      normalizeText(project.name) === normalizeText(projectId)
    );

    if (!fuelerId) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter Team Member ID."), "Please enter Team Member ID.");
      return;
    }

    if (!fuelerName) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter Team Member Name."), "Please enter Team Member Name.");
      return;
    }

    if (!mobile) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please enter Mobile Number."), "Please enter Mobile Number.");
      return;
    }

    if (!projectId) {
      notifyUser(typeof showToast !== "undefined" ? showToast : null, inferToastTypeFromMessage("Please select Project."), "Please select Project.");
      return;
    }

    const idExists = masterFuelers.some(
      (fueler) => normalizeText(fueler.id) === normalizeText(fuelerId)
    );

    if (idExists) {
      showToast?.("warning", "Team Member ID already exists. Please use a unique ID.");
      return;
    }

    try {
      if (typeof onCreateEmployee === "function") {
        await onCreateEmployee({
          companyId:
            currentUser?.companyId ||
            selectedProject?.companyId ||
            "",
          employeeId: fuelerId,
          name: fuelerName,
          phone: mobile,
          email: email || undefined,
          projectId,
          jobTitle,
          status: mapFrontendEmployeeStatusForBackend(newFueler.status),
        });

        showToast?.("success", "Team member added successfully.");
        closeAddFueler();
        return;
      }

      if (isOfficerUser(currentUser)) {
        submitApprovalRequest({
          type: "master_data_change",
          module: "team",
          title: `New team member ${fuelerId}`,
          details: `Officer requested new operator ${fuelerName}`,
          payload: { entity: "team_member", action: "add", values: { ...newFueler, id: fuelerId, name: fuelerName, mobile, email } },
        });
        closeAddFueler();
        return;
      }

      setLocalFuelers((prev) => [
        ...prev,
        {
          id: fuelerId,
          name: fuelerName,
          mobile,
          email,
          projectId,
          projectName: selectedProject?.name || newFueler.projectName || "-",
          status: newFueler.status || "On Duty",
          jobTitle,
          createdLocally: true,
        },
      ]);

      showToast?.("success", "Team member added locally.");
      closeAddFueler();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add team member.";
      showToast?.("warning", message);
    }
  };

  const getEditableTeamValue = (fueler, field) => {
    if (field === "name") return fueler.name || "";
    if (field === "jobTitle") return fueler.jobTitle || "Operator";
    if (field === "mobile") return fueler.mobile || "";
    if (field === "email") return fueler.email || "";
    if (field === "status") return fueler.status || "On Duty";
    if (field === "project") return fueler.projectId || fueler.projectName || "";
    return "";
  };

  const getTeamFieldLabel = (field) => {
    if (field === "name") return "Name";
    if (field === "mobile") return "Mobile";
    if (field === "email") return "Email";
    if (field === "jobTitle") return "Job Title";
    if (field === "status") return "Operational Status";
    if (field === "project") return "Project";
    if (field === "userLink") return "User Status";
    return "Field";
  };

  const getProjectNameById = (projectId) => {
    const project = filterActiveProjects(transferProjects).find((item) =>
      normalizeText(item.backendId || item.id) === normalizeText(projectId) ||
      normalizeText(item.name) === normalizeText(projectId)
    );

    return project?.name || projectId || "-";
  };

  const getFuelerLinkedSystemRole = (fueler) => {
    if (!fueler) return "";

    const directRole = normalizeBackendRoleName(
      fueler.linkedUserRole ||
        fueler.linkedUserRoleName ||
        fueler.systemRole ||
        fueler.systemRoleName ||
        fueler.userRole ||
        fueler.userRoleName ||
        ""
    );

    if (directRole) return directRole;

    const linkedUserId = normalizeText(
      fueler.linkedUserId ||
        fueler.userId ||
        fueler.user?.id ||
        fueler.systemUserId ||
        ""
    );

    const employeeBackendId = normalizeText(fueler.backendId || fueler.employeeBackendId || "");
    const employeeId = normalizeText(fueler.employeeId || fueler.id || "");
    const employeeEmail = normalizeText(fueler.email || "");

    const matchedUser = users.find((user) => {
      const userId = normalizeText(user.id || "");
      const userLinkedEmployeeId = normalizeText(user.linkedEmployeeId || "");
      const userEmployeeId = normalizeText(user.employeeId || "");
      const userEmail = normalizeText(user.email || "");

      return (
        (linkedUserId && userId === linkedUserId) ||
        (employeeBackendId && userLinkedEmployeeId === employeeBackendId) ||
        (employeeId && userEmployeeId === employeeId) ||
        (employeeEmail && userEmail === employeeEmail)
      );
    });

    return normalizeBackendRoleName(
      matchedUser?.role ||
        matchedUser?.roleName ||
        matchedUser?.normalizedRole ||
        ""
    );
  };

  const isFuelerManagerSystemRole = (fueler) =>
    ["Manager", "TopManagement"].includes(getFuelerLinkedSystemRole(fueler));

  const canRequestTeamProjectTransfer = (fueler) => {
    if (!currentUser || currentUser.status !== "Active") return false;
    if (!fueler || fueler.pendingTransfer) return false;

    const currentRole = normalizeBackendRoleName(currentUser.role || currentUser.roleName || "");

    if (["Admin", "PlatformAdmin", "TopManagement", "Supervisor", "Operator"].includes(currentRole)) {
      return false;
    }

    if (isFuelerManagerSystemRole(fueler)) {
      return currentRole === "Officer";
    }

    return currentRole === "Officer" || currentRole === "Manager";
  };

  const isEmployeeCurrentProjectManager = (fueler) => {
    if (!fueler) return false;

    const linkedUserId = normalizeText(
      fueler.linkedUserId ||
        fueler.userId ||
        fueler.user?.id ||
        fueler.systemUserId ||
        ""
    );

    const employeeId = normalizeText(fueler.backendId || fueler.id || "");
    const employeeEmail = normalizeText(fueler.email || "");

    const matchedUser = users.find((user) => {
      const userId = normalizeText(user.id || "");
      const userEmail = normalizeText(user.email || "");

      return (linkedUserId && userId === linkedUserId) || (employeeEmail && userEmail === employeeEmail);
    });

    const managerUserId = linkedUserId || normalizeText(matchedUser?.id || "");

    return filterActiveProjects(projects).some((project) => {
      const projectManagerId = normalizeText(
        project.projectManagerId ||
          project.managerUserId ||
          project.managerId ||
          project.projectManager?.id ||
          ""
      );

      if (!projectManagerId) return false;

      return projectManagerId === managerUserId || projectManagerId === employeeId;
    });
  };

  const buildTeamChangeMessage = ({ field, oldDisplayValue, newDisplayValue }) => {
    if (field === "project") {
      return `Are you sure you want to submit a transfer request from ${oldDisplayValue || "-"} to ${newDisplayValue || "-"}? The current project will not change until approval is completed.`;
    }

    return `Are you sure you want to change ${getTeamFieldLabel(field)} from ${oldDisplayValue || "-"} to ${newDisplayValue || "-"}?`;
  };

  const buildUserLinkMessage = ({ action }) => {
    if (action === "unlink") {
      return "Are you sure you want to deactivate login access for this employee? The employee-user link will remain saved so you can reactivate it later.";
    }

    return "Are you sure you want to activate login access for this employee?";
  };

  const getExistingUserForFueler = (fueler) => {
    const explicitUser = users.find(
      (user) => normalizeText(user.id) === normalizeText(fueler.linkedUserId)
    );

    if (explicitUser) return explicitUser;

    return users.find((user) => {
      const userEmail = normalizeText(user.email);
      return userEmail && userEmail === normalizeText(fueler.email);
    });
  };

  const normalizeBackendTeamRoles = (roles = []) => {
    const allowedRoleNames = new Set(
      TEAM_CREATE_USER_ROLE_NAMES.map((roleName) =>
        normalizeBackendRoleName(roleName)
      )
    );

    return (roles || [])
      .map((role) => {
        const name =
          role?.name ||
          role?.roleName ||
          role?.label ||
          role?.key ||
          "";

        return {
          id: String(role?.id || "").trim(),
          name,
          normalizedName: normalizeBackendRoleName(name),
        };
      })
      .filter(
        (role) =>
          role.id &&
          role.name &&
          allowedRoleNames.has(role.normalizedName)
      );
  };

  const loadTeamRoleOptions = async (companyId = "") => {
    if (typeof onLoadRoles !== "function") {
      throw new Error("Roles API is not configured.");
    }

    const targetCompanyId = companyId || currentUser?.companyId || "";

    setLoadingTeamRoles(true);

    try {
      const backendRoles = await onLoadRoles({
        companyId: targetCompanyId,
        fallbackToGlobal: false,
      });

      const normalizedRoles = normalizeBackendTeamRoles(backendRoles);
      setTeamRoleOptions(normalizedRoles);
      return normalizedRoles;
    } finally {
      setLoadingTeamRoles(false);
    }
  };

  const getTeamRoleOptionByValue = (roleValue, options = teamRoleOptions) => {
    const normalizedRoleValue = normalizeScopeValue(roleValue);

    return (options || []).find((role) =>
      normalizeScopeValue(role.id) === normalizedRoleValue ||
      normalizeScopeValue(role.normalizedName) === normalizedRoleValue ||
      normalizeScopeValue(role.name) === normalizedRoleValue
    );
  };

  const resolveTeamRoleForSave = async (roleValue, companyId = "") => {
    let selectedRole = getTeamRoleOptionByValue(roleValue);

    if (selectedRole?.id) {
      return selectedRole;
    }

    const roles = await loadTeamRoleOptions(companyId);
    selectedRole = getTeamRoleOptionByValue(roleValue, roles);

    return selectedRole || null;
  };

  const getDefaultTeamRoleId = (roles = []) => {
    return (
      roles.find((role) => role.normalizedName === "Operator")?.id ||
      roles.find((role) => role.normalizedName === "Officer")?.id ||
      roles[0]?.id ||
      ""
    );
  };

  const openCreateUserFromFueler = async (fueler) => {
    const employeeId = String(fueler?.employeeId || fueler?.id || "").trim();

    if (!employeeId) {
      showToast?.("warning", "Employee ID is required before creating a system user.");
      return;
    }

    const roleCompanyId = fueler?.companyId || currentUser?.companyId || "";

    try {
      const backendRoles = await loadTeamRoleOptions(roleCompanyId);

      if (!backendRoles.length) {
        showToast?.(
          "warning",
          "No backend roles are available for this company."
        );
        return;
      }

      const defaultRoleId = getDefaultTeamRoleId(backendRoles);

      setLinkUserModal({
        fueler,
        roleId: defaultRoleId,
        password: `FFP@${Math.floor(100000 + Math.random() * 900000)}`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load company roles.";

      showToast?.("warning", message);
    }
  };

  const handleUserLinkStatusChange = async (fueler, nextStatus) => {
    if (!hasPermission("team", "edit")) {
      showToast?.("warning", "Read-only access: you cannot link team members to users.");
      return;
    }

    const normalizedNextStatus = normalizeText(nextStatus);

    if (normalizedNextStatus === "not linked") {
      const existingUser = getExistingUserForFueler(fueler);

      if (!existingUser && !fueler.linkedUserId) {
        return;
      }

      setPendingTeamChange({
        fueler,
        field: "userLink",
        action: "unlink",
        user: existingUser,
        oldValue: "Linked",
        newValue: "Not Linked",
        oldDisplayValue: "Linked",
        newDisplayValue: "Not Linked",
        message: buildUserLinkMessage({ action: "unlink" }),
      });

      return;
    }

    const existingUser = getExistingUserForFueler(fueler);

    if (existingUser) {
      setPendingTeamChange({
        fueler,
        field: "userLink",
        action: "link-existing",
        user: existingUser,
        oldValue: fueler.userStatus || "Not Linked",
        newValue: "Linked",
        oldDisplayValue: "Not Linked",
        newDisplayValue: "Linked",
        message: buildUserLinkMessage({
          action: "link-existing",
        }),
      });

      return;
    }

    await openCreateUserFromFueler(fueler);
  };

  const closeLinkUserModal = () => {
    setLinkUserModal(null);
  };

  const confirmCreateAndLinkUser = async () => {
    if (!linkUserModal?.fueler) return;

    if (!linkUserModal.roleId) {
      showToast?.("warning", "Please select user role.");
      return;
    }

    if (!String(linkUserModal.password || "").trim()) {
      showToast?.("warning", "Temporary password is required.");
      return;
    }

    if (typeof onCreateUserFromEmployee !== "function") {
      showToast?.("warning", "Create user API is not configured.");
      return;
    }

    if (typeof onUpdateEmployee !== "function") {
      showToast?.("warning", "Employee update API is not configured.");
      return;
    }

    setSavingLinkedUser(true);

    try {
      const fueler = linkUserModal.fueler;
      const fuelerId = fueler.id;
      const employeeId = String(fueler.employeeId || fueler.id || "").trim();
      const linkedEmployeeId = fueler.backendId || fueler.employeeBackendId || "";

      if (!employeeId) {
        showToast?.("warning", "Employee ID is required before creating a system user.");
        setSavingLinkedUser(false);
        return;
      }

      if (!linkedEmployeeId) {
        showToast?.("warning", "Linked employee record is missing. Please refresh Team data and try again.");
        setSavingLinkedUser(false);
        return;
      }

      setUpdatingUserStatusByFuelerId((prev) => ({
        ...prev,
        [fuelerId]: true,
      }));

      const roleCompanyId = fueler.companyId || currentUser?.companyId || "";
      const selectedTeamRole = await resolveTeamRoleForSave(
        linkUserModal.roleId,
        roleCompanyId
      );

      if (!selectedTeamRole?.id) {
        showToast?.(
          "warning",
          "Selected backend role is no longer available for this company."
        );
        setSavingLinkedUser(false);
        setUpdatingUserStatusByFuelerId((prev) => ({
          ...prev,
          [fuelerId]: false,
        }));
        return;
      }

      const selectedTeamRoleName = selectedTeamRole?.name || linkUserModal.roleId;
      const selectedTeamNormalizedRole = normalizeBackendRoleName(
        selectedTeamRole?.normalizedName || selectedTeamRoleName
      );

      const createdUser = await onCreateUserFromEmployee({
        employeeId,
        linkedEmployeeId,
        fullName: fueler.name || employeeId,
        email: fueler.email && fueler.email !== "-" ? fueler.email : "",
        phone: fueler.mobile || fueler.phone || "",
        roleId: selectedTeamRole.id,
        role: selectedTeamNormalizedRole,
        roleName: selectedTeamRoleName,
        companyId: roleCompanyId,
        password: linkUserModal.password,
        isActive: true,
      });

      // Instant UI update: the created user is already inserted into users state by
      // onCreateUserFromEmployee, so we update only this employee row locally instead
      // of waiting for a full Users/Team reload.
      setLocalFuelerUpdates((prev) => ({
        ...prev,
        [fuelerId]: {
          ...prev[fuelerId],
          linkedUserId: createdUser.id,
          linkedUserName: createdUser.username || createdUser.fullName || createdUser.email || "Linked User",
          linkedUserIsActive: true,
          userStatus: "Linked",
        },
      }));

      closeLinkUserModal();
      showToast?.("success", "System user created and linked. Saving employee link...");

      await onUpdateEmployee(fueler, {
        linkedUserId: createdUser.id,
      });

      setLocalFuelerUpdates((prev) => ({
        ...prev,
        [fuelerId]: {
          ...prev[fuelerId],
          linkedUserId: createdUser.id,
          linkedUserName: createdUser.username || createdUser.fullName || createdUser.email || "Linked User",
          linkedUserIsActive: true,
          userStatus: "Linked",
        },
      }));

      showToast?.("success", "Employee-user link saved successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create and link user.";
      showToast?.("warning", message);
    } finally {
      const fuelerId = linkUserModal?.fueler?.id;

      if (fuelerId) {
        setUpdatingUserStatusByFuelerId((prev) => {
          const next = { ...prev };
          delete next[fuelerId];
          return next;
        });
      }

      setSavingLinkedUser(false);
    }
  };

  const requestTeamChange = ({ fueler, field, newValue }) => {
    if (field === "project") {
      if (!canRequestTeamProjectTransfer(fueler)) {
        showToast?.(
          "warning",
          isFuelerManagerSystemRole(fueler)
            ? "Only Officer can request transferring a Manager user."
            : "Read-only access: you cannot transfer this team member."
        );
        return;
      }
    } else if (!hasPermission("team", "edit")) {
      showToast?.("warning", "Read-only access: you cannot edit team members.");
      return;
    }

    const oldValue = getEditableTeamValue(fueler, field);

    if (normalizeText(oldValue) === normalizeText(newValue)) return;

    if (!String(newValue || "").trim()) {
      showToast?.("warning", `Please select or enter ${getTeamFieldLabel(field)}.`);
      return;
    }

    const oldDisplayValue = field === "project" ? fueler.projectName || "-" : oldValue || "-";
    const newDisplayValue = field === "project" ? getProjectNameById(newValue) : newValue || "-";

    if (field === "status" && isRetiredTeamStatus(newValue)) {
      setPendingTeamChange({
        fueler,
        field: "retire",
        oldValue,
        newValue: "Retired / Resigned",
        oldDisplayValue,
        newDisplayValue: "Retired / Resigned",
        message:
          "This team member will be retired and hidden from the Team page. Historical operations and reports will remain unchanged. If this employee has a linked system user, the user login will be deactivated. If the employee returns later, create a new team member with a new Team Member ID.",
      });
      return;
    }

    setPendingTeamChange({
      fueler,
      field,
      oldValue,
      newValue,
      oldDisplayValue,
      newDisplayValue,
      effectiveDate: field === "project" ? "" : undefined,
      message:
        field === "project" && isFuelerManagerSystemRole(fueler)
          ? `Are you sure you want to submit a Manager / Top Management transfer request from ${oldDisplayValue || "-"} to ${newDisplayValue || "-"}? This transfer requires Admin approval.`
          : buildTeamChangeMessage({ field, oldDisplayValue, newDisplayValue }),
    });
  };

  const closeTeamChangeConfirmation = () => {
    if (savingTeamChange) return;
    setPendingTeamChange(null);
  };

  const saveTeamChange = async () => {
    if (!pendingTeamChange || savingTeamChange) return;

    const { fueler, field, newValue, oldValue, oldDisplayValue, newDisplayValue } = pendingTeamChange;
    const fuelerId = fueler.id;
    const fieldLabel = getTeamFieldLabel(field);

    setSavingTeamChange(true);

    try {
      if (field === "userLink") {
        if (pendingTeamChange.action === "unlink") {
          const linkedUserId = pendingTeamChange.user?.id || fueler.linkedUserId || "";

          if (!linkedUserId) {
            throw new Error("Linked user ID is required.");
          }

          if (typeof onUpdateUserStatus !== "function") {
            throw new Error("User status API is not configured.");
          }

          setUpdatingUserStatusByFuelerId((prev) => ({
            ...prev,
            [fuelerId]: true,
          }));

          await onUpdateUserStatus(linkedUserId, false);

          setLocalFuelerUpdates((prev) => ({
            ...prev,
            [fuelerId]: {
              ...prev[fuelerId],
              linkedUserId,
              linkedUserName:
                pendingTeamChange.user?.fullName ||
                fueler.linkedUserName ||
                "Linked User",
              linkedUserIsActive: false,
              userStatus: "Not Linked",
            },
          }));

          showToast?.("success", "User login deactivated. The employee-user link remains saved.");
          setPendingTeamChange(null);
          return;
        }

        const targetUser = pendingTeamChange.user;

        if (!targetUser?.id) {
          throw new Error("Target user is required.");
        }

        if (typeof onUpdateUserStatus !== "function") {
          throw new Error("User status API is not configured.");
        }

        setUpdatingUserStatusByFuelerId((prev) => ({
          ...prev,
          [fuelerId]: true,
        }));

        await onUpdateUserStatus(targetUser.id, true);

        setLocalFuelerUpdates((prev) => ({
          ...prev,
          [fuelerId]: {
            ...prev[fuelerId],
            linkedUserId: targetUser.id,
            linkedUserName: targetUser.fullName || targetUser.email || "Linked User",
            linkedUserIsActive: true,
            userStatus: "Linked",
          },
        }));

        showToast?.("success", "Employee linked and user login activated.");
        setPendingTeamChange(null);
        return;
      }

      if (field === "retire") {
        if (typeof onUpdateEmployee !== "function") {
          throw new Error("Employee update API is not configured.");
        }

        await onUpdateEmployee(fueler, {
          status: "RETIRED_RESIGNED",
        });

        const linkedUserId =
          fueler.linkedUserId ||
          pendingTeamChange.user?.id ||
          getExistingUserForFueler(fueler)?.id ||
          "";

        if (linkedUserId && typeof onUpdateUserStatus === "function") {
          await onUpdateUserStatus(linkedUserId, false);
        }

        setLocalFuelerUpdates((prev) => ({
          ...prev,
          [fuelerId]: {
            ...prev[fuelerId],
            status: "Retired / Resigned",
            linkedUserIsActive: false,
            userStatus: linkedUserId ? "Not Linked" : prev[fuelerId]?.userStatus,
          },
        }));

        setSelectedTeamMemberIds((prev) =>
          prev.filter((id) => normalizeText(id) !== normalizeText(fueler.backendId || fueler.id))
        );

        setFuelerAuditLog((prev) => [
          ...prev,
          {
            fuelerId,
            fuelerName: fueler.name,
            field: "Retire Employee",
            oldValue: oldDisplayValue || oldValue,
            newValue: "Retired / Resigned",
            reason: "Employee retired from Team page",
            editedBy: currentUser?.fullName || currentUser?.email || "System",
            editedAt: new Date().toISOString(),
          },
        ]);

        showToast?.(
          "success",
          "Team member retired successfully. Historical operations remain unchanged and linked user login was deactivated if applicable."
        );

        setPendingTeamChange(null);
        return;
      }

      if (field === "project") {
        if (typeof onCreateEmployeeTransfer !== "function") {
          throw new Error("Employee transfer API is not configured.");
        }

        await onCreateEmployeeTransfer(fueler, newValue, {
          effectiveDate: pendingTeamChange.effectiveDate || undefined,
        });

        showToast?.(
          "success",
          isFuelerManagerSystemRole(fueler)
            ? "Manager transfer request submitted for Admin approval."
            : "Transfer request submitted for approval. The current project will remain unchanged until approval is completed."
        );

        setPendingTeamChange(null);
        return;
      }

      const payload =
        field === "name"
          ? { name: newValue }
          : field === "jobTitle"
          ? { jobTitle: newValue }
          : field === "mobile"
          ? { phone: newValue }
          : field === "email"
          ? { email: newValue }
          : field === "status"
          ? { status: mapFrontendEmployeeStatusForBackend(newValue) }
          : {};

      if (typeof onUpdateEmployee === "function") {
        await onUpdateEmployee(fueler, payload);
      } else {
        const updateKey =
          field === "name"
            ? "name"
            : field === "jobTitle"
            ? "jobTitle"
            : field === "mobile"
            ? "mobile"
            : field === "email"
            ? "email"
            : "status";

        setLocalFuelerUpdates((prev) => ({
          ...prev,
          [fuelerId]: {
            ...prev[fuelerId],
            [updateKey]: newValue,
          },
        }));
      }

      setFuelerAuditLog((prev) => [
        ...prev,
        {
          fuelerId,
          fuelerName: fueler.name,
          field: fieldLabel,
          oldValue: oldDisplayValue || oldValue,
          newValue: newDisplayValue || newValue,
          reason: field === "status" ? "Status update" : "Inline table edit",
          editedBy: currentUser?.fullName || currentUser?.email || "System",
          editedAt: new Date().toISOString(),
        },
      ]);

      showToast?.("success", `${fieldLabel} updated successfully.`);
      setPendingTeamChange(null);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save team change.";
      showToast?.("warning", message);
    } finally {
      setSavingTeamChange(false);

      if (field === "userLink") {
        setUpdatingUserStatusByFuelerId((prev) => {
          const next = { ...prev };
          delete next[fuelerId];
          return next;
        });
      }
    }
  };

  const startInlineFuelerEdit = (fueler, field) => {
    if (!hasPermission("team", "edit")) return;

    setInlineFuelerEdit({
      fuelerId: fueler.id,
      field,
      value: getEditableTeamValue(fueler, field),
    });
  };

  const cancelInlineFuelerEdit = () => {
    setInlineFuelerEdit(null);
  };

  const commitInlineFuelerEdit = (fueler) => {
    if (!inlineFuelerEdit) return;

    const value = String(inlineFuelerEdit.value || "").trim();
    const field = inlineFuelerEdit.field;

    setInlineFuelerEdit(null);
    requestTeamChange({ fueler, field, newValue: value });
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Team Management</h1>
            <p className="text-gray-400">
              Team monitoring, operator Direct Refuel KPI and performance tracking
            </p>
          </div>

          {hasPermission("team", "add") && (
            <button
              onClick={() => setShowAddFueler(true)}
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 lg:px-4 py-2 rounded-lg font-semibold transition"
            >
              + Add Team Member
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
          <Card title="Total Team Members" value={formatNumber(fuelersWithKpi.length)} />
          <Card
            title="On Duty"
            value={formatNumber(
              fuelersWithKpi.filter(
                (fueler) =>
                  isSameText(fueler.status, "On Duty") ||
                  isSameText(fueler.status, "Active")
              ).length
            )}
          />
          <Card title="Direct Refuel Operations" value={formatNumber(totalOperations)} />
          <Card title="Assigned Projects" value={formatNumber(assignedProjectsCount)} />
        </div>

        <div className="bg-gray-800 rounded-2xl border border-slate-700/70 shadow-xl overflow-hidden mb-5">
          <div className="p-4 border-b border-slate-700/80 flex justify-between items-center bg-slate-900/70">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
                Team Members List
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Project and status update from dropdowns. Double click Name, Mobile, Email or Job Title to edit inline.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {visibleTeamFuelers.length} shown / {activeTeamFuelers.length} active team members
              </span>

              <div ref={fuelersSettingsRef} className="relative">
                <button
                  onClick={() => setShowFuelersSettings(!showFuelersSettings)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ☰
                </button>

                {showFuelersSettings && (
                  <div className="absolute left-0 mt-2 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                    <button
                      onClick={() => {
                        exportFuelersCSV();
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable("fuelers-table", "Team Report");
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-700/80 bg-slate-950/50 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search by employee ID, name, mobile, email, job title, project..."
                  className="w-full sm:w-[420px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                {teamSearch && (
                  <button
                    onClick={() => setTeamSearch("")}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  {selectedTeamFuelers.length} selected
                </span>
                {selectedTeamFuelers.length > 0 && (
                  <>
                    <button
                      onClick={clearTeamSelection}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={openBulkTransferModal}
                      className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400"
                    >
                      Transfer Selected
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-b-2xl">
            <table
              id="fuelers-table"
              className="min-w-[980px] lg:min-w-[1120px] xl:min-w-[1200px] w-full border-separate border-spacing-0 text-[11px] sm:text-xs lg:text-sm"
            >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
                <tr>
                  <Th>
                    <input
                      type="checkbox"
                      checked={allVisibleFuelersSelected}
                      onChange={toggleVisibleTeamSelection}
                      className="h-4 w-4 cursor-pointer accent-amber-400"
                      title="Select all visible team members"
                    />
                  </Th>
                  <Th>#</Th>
                  <Th>Team Member ID</Th>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
                  <Th>Email</Th>
                  <Th>Job Title</Th>
                  <Th>User Status</Th>
                  <Th>Project Name</Th>
                  <Th>Work Status</Th>
                </tr>
              </thead>

              <tbody>
                {visibleTeamFuelers.map((fueler, i) => {
                  const selectionKey = fueler.backendId || fueler.id;
                  const isSelected = selectedTeamMemberIds.includes(selectionKey);

                  return (
                  <tr key={makeTenantEntityKey(fueler)} className={`odd:bg-slate-900/20 even:bg-slate-800/20 hover:bg-amber-400/10 transition-colors duration-200 ${isSelected ? "bg-amber-400/10 ring-1 ring-amber-400/30" : ""}`}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTeamMemberSelection(fueler)}
                        className="h-4 w-4 cursor-pointer accent-amber-400"
                        title="Select team member"
                      />
                    </Td>
                    <Td>{i + 1}</Td>

                    <Td>
                      <button
                        onClick={() => setSelectedFuelerHistory(fueler)}
                        className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                        title="Open team member operations history"
                      >
                        {fueler.id}
                      </button>
                    </Td>

                    <Td strong>
                      {hasPermission("team", "edit") &&
                      inlineFuelerEdit?.fuelerId === fueler.id &&
                      inlineFuelerEdit?.field === "name" ? (
                        <input
                          autoFocus
                          value={inlineFuelerEdit.value}
                          onChange={(e) => setInlineFuelerEdit({ ...inlineFuelerEdit, value: e.target.value })}
                          onBlur={() => commitInlineFuelerEdit(fueler)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") cancelInlineFuelerEdit();
                          }}
                          className="w-44 rounded-lg border border-amber-400/60 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => startInlineFuelerEdit(fueler, "name")}
                          className={hasPermission("team", "edit") ? "cursor-text text-blue-300 hover:text-yellow-400" : ""}
                          title={hasPermission("team", "edit") ? "Double click to edit" : ""}
                        >
                          {fueler.name || "-"}
                        </span>
                      )}
                    </Td>

                    <Td>
                      {hasPermission("team", "edit") &&
                      inlineFuelerEdit?.fuelerId === fueler.id &&
                      inlineFuelerEdit?.field === "mobile" ? (
                        <input
                          autoFocus
                          value={inlineFuelerEdit.value}
                          onChange={(e) => setInlineFuelerEdit({ ...inlineFuelerEdit, value: e.target.value })}
                          onBlur={() => commitInlineFuelerEdit(fueler)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") cancelInlineFuelerEdit();
                          }}
                          className="w-36 rounded-lg border border-amber-400/60 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => startInlineFuelerEdit(fueler, "mobile")}
                          className={hasPermission("team", "edit") ? "cursor-text text-blue-300 hover:text-yellow-400" : ""}
                          title={hasPermission("team", "edit") ? "Double click to edit" : ""}
                        >
                          {fueler.mobile || "-"}
                        </span>
                      )}
                    </Td>

                    <Td>
                      {hasPermission("team", "edit") &&
                      inlineFuelerEdit?.fuelerId === fueler.id &&
                      inlineFuelerEdit?.field === "email" ? (
                        <input
                          autoFocus
                          value={inlineFuelerEdit.value}
                          onChange={(e) => setInlineFuelerEdit({ ...inlineFuelerEdit, value: e.target.value })}
                          onBlur={() => commitInlineFuelerEdit(fueler)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") cancelInlineFuelerEdit();
                          }}
                          className="w-48 rounded-lg border border-amber-400/60 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => startInlineFuelerEdit(fueler, "email")}
                          className={hasPermission("team", "edit") ? "cursor-text text-blue-300 hover:text-yellow-400" : ""}
                          title={hasPermission("team", "edit") ? "Double click to edit" : ""}
                        >
                          {fueler.email || "-"}
                        </span>
                      )}
                    </Td>

                    <Td>
                      {hasPermission("team", "edit") &&
                      inlineFuelerEdit?.fuelerId === fueler.id &&
                      inlineFuelerEdit?.field === "jobTitle" ? (
                        <input
                          autoFocus
                          value={inlineFuelerEdit.value}
                          onChange={(e) => setInlineFuelerEdit({ ...inlineFuelerEdit, value: e.target.value })}
                          onBlur={() => commitInlineFuelerEdit(fueler)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") cancelInlineFuelerEdit();
                          }}
                          className="w-36 rounded-lg border border-amber-400/60 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => startInlineFuelerEdit(fueler, "jobTitle")}
                          className={hasPermission("team", "edit") ? "cursor-text text-blue-300 hover:text-yellow-400" : ""}
                          title={hasPermission("team", "edit") ? "Double click to edit" : ""}
                        >
                          {fueler.jobTitle || "Operator"}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {fueler.userStatusUpdating ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                          Updating...
                        </span>
                      ) : hasPermission("team", "edit") ? (
                        <select
                          value={fueler.userStatus === "Linked" ? "Linked" : "Not Linked"}
                          onChange={(e) => handleUserLinkStatusChange(fueler, e.target.value)}
                          disabled={fueler.userStatusUpdating}
                          className={`rounded-full px-2 py-1 text-xs font-semibold outline-none cursor-pointer disabled:cursor-wait ${
                            fueler.userStatus === "Linked"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : "bg-slate-700/60 text-slate-300 border border-slate-600"
                          }`}
                        >
                          <option value="Linked">Linked</option>
                          <option value="Not Linked">Not Linked</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            fueler.userStatus === "Linked"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : "bg-slate-700/60 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {fueler.userStatus || "Not Linked"}
                        </span>
                      )}

                      {fueler.suggestedUserId && !fueler.linkedUserId && (
                        <div className="mt-1 text-[10px] text-amber-300">
                          User found by email
                        </div>
                      )}
                    </Td>

                    <Td>
                      <div className="flex flex-col gap-1">
                        {canRequestTeamProjectTransfer(fueler) ? (
                          <select
                            value={fueler.projectId || ""}
                            onChange={(e) => requestTeamChange({ fueler, field: "project", newValue: e.target.value })}
                            className="max-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-blue-200 outline-none hover:border-amber-400 cursor-pointer"
                          >
                            <option value={fueler.projectId || ""}>{fueler.projectName || "Current Project"}</option>
                            {filterActiveProjects(transferProjects)
                              .filter((project) => normalizeText(project.backendId || project.id) !== normalizeText(fueler.projectId))
                              .map((project) => (
                                <option key={makeTenantEntityKey(project, project.name)} value={project.backendId || project.id}>
                                  {project.name || project.id}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span>{fueler.projectName || "-"}</span>
                        )}

                        {fueler.pendingTransfer && (
                          <span className="inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            {String(fueler.pendingTransfer.status || "").toUpperCase() === "PARTIALLY_APPROVED"
                              ? "Transfer in progress"
                              : `Requested → ${fueler.pendingTransfer.toProjectName || "-"}`}
                          </span>
                        )}
                      </div>
                    </Td>

                    <Td>
                      {hasPermission("team", "edit") ? (
                        <select
                          value={fueler.status || "On Duty"}
                          onChange={(e) => requestTeamChange({ fueler, field: "status", newValue: e.target.value })}
                          className={`rounded-full px-2 py-1 text-xs font-semibold outline-none cursor-pointer ${getStatusBadgeClass(fueler.status)}`}
                        >
                          <option value="On Duty">On Duty</option>
                          <option value="In Vacation">In Vacation</option>
                          <option value="Retired / Resigned">Retired / Resigned</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(fueler.status)}`}>
                          {fueler.status || "On Duty"}
                        </span>
                      )}
                    </Td>


                  </tr>
                  );
                })}

                {visibleTeamFuelers.length === 0 && (
                  <tr>
                    <Td colSpan={10}>No team members found.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
                Diesel Quantity Per Operator
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total diesel quantity handled by each operator based on Direct Refuel operations only
              </p>
            </div>

            <div className="text-right text-xs text-gray-400">
              <div>Total Diesel</div>
              <div className="text-yellow-300 font-bold text-base">
                {formatNumber(totalDiesel)} L
              </div>
            </div>
          </div>

          <ChartFrame height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#ccc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="dieselQty" fill="#60a5fa" name="Diesel Qty" />
            </BarChart>
          </ChartFrame>
        </div>

        {fuelerAuditLog.length > 0 && (
          <div className="bg-gray-950 border border-gray-700 rounded-2xl p-4 mb-5">
            <h3 className="text-yellow-400 font-semibold mb-3">
              Local Team Audit Log
            </h3>

            <div className="max-h-44 overflow-auto">
              {fuelerAuditLog
                .slice()
                .reverse()
                .map((log, i) => (
                  <div
                    key={i}
                    className="text-xs text-gray-300 border-b border-gray-800 py-2"
                  >
                    <span className="text-blue-300">
                      {log.fuelerId} - {log.fuelerName}
                    </span>{" "}
                    | {log.field}: {" "}
                    <span className="text-red-300">{log.oldValue || "-"}</span>{" "}
                    → <span className="text-green-300">{log.newValue}</span>{" "}
                    | Reason: {log.reason} | By: {log.editedBy}
                  </div>
                ))}
            </div>
          </div>
        )}

        {linkUserModal && (
          <ModalPortal>
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
              <div className="bg-gray-900 text-white w-[520px] max-w-[95vw] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-yellow-400">
                    Create Linked System User
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    This will create a user account, activate login access, and link it to this employee.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Employee ID</p>
                      <p className="font-semibold text-blue-300">{linkUserModal.fueler.employeeId || linkUserModal.fueler.id}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs">Employee Name</p>
                      <p className="font-semibold">{linkUserModal.fueler.name || "-"}</p>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                      <p className="text-gray-400 text-xs">Generated Username</p>
                      <p className="font-black text-amber-300 tracking-wide">{getGeneratedUsernameForFueler(linkUserModal.fueler)}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="font-semibold">{linkUserModal.fueler.email || "-"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs">Mobile</p>
                      <p className="font-semibold">{linkUserModal.fueler.mobile || "-"}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      User Role
                    </label>
                    <select
                      value={linkUserModal.roleId}
                      onChange={(e) =>
                        setLinkUserModal((prev) => ({
                          ...prev,
                          roleId: e.target.value,
                        }))
                      }
                      disabled={savingLinkedUser || loadingTeamRoles}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
                    >
                      {loadingTeamRoles && (
                        <option value="">Loading backend roles...</option>
                      )}
                      {!loadingTeamRoles && !teamRoleOptions.length && (
                        <option value="">No backend roles available</option>
                      )}
                      {!loadingTeamRoles &&
                        teamRoleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      Temporary Password
                    </label>
                    <input
                      value={linkUserModal.password}
                      onChange={(e) =>
                        setLinkUserModal((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      disabled={savingLinkedUser}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The user will be asked to change this password after login.
                    </p>
                  </div>
                </div>

                <div className="p-5 border-t border-gray-700 flex justify-end gap-3">
                  <button
                    onClick={closeLinkUserModal}
                    disabled={savingLinkedUser}
                    className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmCreateAndLinkUser}
                    disabled={
                      savingLinkedUser ||
                      loadingTeamRoles ||
                      !linkUserModal.roleId ||
                      !teamRoleOptions.length
                    }
                    className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold disabled:opacity-60"
                  >
                    {savingLinkedUser ? "Saving..." : "Create & Link"}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}


        {bulkTransferModalOpen && (
          <ModalPortal>
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
              <div className="w-[min(760px,calc(100vw-2rem))] max-h-[92vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
                <div className="border-b border-slate-700 px-6 py-5">
                  <h2 className="text-xl font-bold text-amber-300">Bulk Team Transfer</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Submit one transfer action for the selected team members. Current projects will not change until approval is completed.
                  </p>
                </div>

                <div className="max-h-[62vh] overflow-auto px-6 py-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">Transfer To Project</label>
                    <select
                      value={bulkTransferProjectId}
                      onChange={(e) => setBulkTransferProjectId(e.target.value)}
                      disabled={savingBulkTransfer}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400 disabled:cursor-wait disabled:opacity-60"
                    >
                      <option value="">Select destination project</option>
                      {filterActiveProjects(transferProjects).map((project) => (
                        <option key={makeTenantEntityKey(project, project.name)} value={project.backendId || project.id}>
                          {project.name || project.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-slate-100">Selected Team Members</h3>
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                        {selectedTeamFuelers.length} selected
                      </span>
                    </div>

                    <div className="max-h-72 overflow-auto rounded-xl border border-slate-800">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="sticky top-0 bg-slate-800 text-slate-300">
                          <tr>
                            <Th>#</Th>
                            <Th>Employee ID</Th>
                            <Th>Name</Th>
                            <Th>Current Project</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTeamFuelers.map((fueler, index) => (
                            <tr key={fueler.backendId || fueler.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                              <Td>{index + 1}</Td>
                              <Td strong>{fueler.id}</Td>
                              <Td>{fueler.name || "-"}</Td>
                              <Td>{fueler.projectName || "-"}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-900 px-6 py-4">
                  <button
                    onClick={closeBulkTransferModal}
                    disabled={savingBulkTransfer}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkTransfer}
                    disabled={savingBulkTransfer || !bulkTransferProjectId || !selectedTeamFuelers.length}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold disabled:cursor-wait disabled:opacity-70 ${
                    pendingTeamChange.field === "retire"
                      ? "bg-red-500 text-white hover:bg-red-400"
                      : "bg-amber-500 text-black hover:bg-amber-400"
                  }`}
                  >
                    {savingBulkTransfer && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/60 border-t-transparent" />
                    )}
                    {savingBulkTransfer ? "Submitting..." : "Submit Transfer Request"}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {selectedFuelerHistory && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-gray-900 text-white w-[1180px] max-h-[92vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                    Operator Operations History
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Team Member: {" "}
                    <span className="text-blue-300 font-semibold">
                      {selectedFuelerHistory.id} - {selectedFuelerHistory.name}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Read-only view based on Direct Refuel operations only
                  </p>
                </div>

                <button
                  onClick={() => setSelectedFuelerHistory(null)}
                  className="text-gray-400 hover:text-red-400 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4 lg:p-5 border-b border-gray-700 bg-gray-950/40">
                <Card
                  title="Operator Operations"
                  value={formatNumber(selectedFuelerHistory.operationsCount)}
                />
                <Card
                  title="Diesel Quantity (L)"
                  value={formatNumber(selectedFuelerHistory.dieselQty)}
                />
                <Card
                  title="Project"
                  value={selectedFuelerHistory.projectName || "-"}
                />
              </div>

              <div className="p-5 overflow-auto max-h-[58vh]">
                <table className="min-w-[820px] lg:min-w-[960px] xl:min-w-[1050px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                  <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                    <tr>
                      <Th>#</Th>
                      <Th>Date</Th>
                      <Th>Operation ID</Th>
                      <Th>Source Station</Th>
                      <Th>Equipment / Destination</Th>
                      <Th>Diesel Qty</Th>
                      <Th>Odometer</Th>
                      <Th>Type</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {getFuelerOperations(selectedFuelerHistory.id).map((item, i) => {
                      const row = item.row;

                      return (
                        <tr key={item.originalIndex} className="hover:bg-slate-800/70 transition-colors duration-150">
                          <Td>{i + 1}</Td>
                          <Td>{dateIndex !== -1 ? formatDisplayDate(row[dateIndex]) : "-"}</Td>
                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex] || "-"
                              : item.originalIndex + 1}
                          </Td>
                          <Td>{sourceIndex !== -1 ? row[sourceIndex] || "-" : "-"}</Td>
                          <Td>
                            {destinationIndex !== -1 ? row[destinationIndex] || "-" : "-"}
                          </Td>
                          <Td>
                            {dieselIndex !== -1 ? formatNumber(row[dieselIndex]) : "-"} L
                          </Td>
                          <Td>
                            {odometerIndex !== -1 ? formatNumber(row[odometerIndex]) : "-"}
                          </Td>
                          <Td>{typeIndex !== -1 ? row[typeIndex] || "-" : "-"}</Td>
                        </tr>
                      );
                    })}

                    {getFuelerOperations(selectedFuelerHistory.id).length === 0 && (
                      <tr>
                        <Td colSpan={8}>No Direct Refuel operations found for this fueler.</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showAddFueler && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-white text-black w-[620px] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Add Team Member</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Local entry now, backend-ready structure later
                  </p>
                </div>

                <button
                  onClick={closeAddFueler}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-medium text-gray-700">Operator ID</label>
                  <input
                    type="text"
                    value={newFueler.id}
                    onChange={(e) => setNewFueler({ ...newFueler, id: e.target.value })}
                    className={`border rounded-lg p-3 w-full mt-2 ${
                      teamMemberIdDuplicateError
                        ? "border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                        : "border-gray-300"
                    }`}
                    placeholder="Example: FL-001"
                  />
                  {teamMemberIdDuplicateError && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {teamMemberIdDuplicateError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-medium text-gray-700">Team Member Name</label>
                  <input
                    type="text"
                    value={newFueler.name}
                    onChange={(e) => setNewFueler({ ...newFueler, name: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter team member name"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Mobile Number</label>
                  <input
                    type="text"
                    value={newFueler.mobile}
                    onChange={(e) => setNewFueler({ ...newFueler, mobile: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter mobile number"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newFueler.email}
                    onChange={(e) => setNewFueler({ ...newFueler, email: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Link with Users page email"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Job Title</label>
                  <input
                    type="text"
                    value={newFueler.jobTitle}
                    onChange={(e) => setNewFueler({ ...newFueler, jobTitle: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Example: Operator, Fueler, Mechanic, Manager"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Status</label>
                  <select
                    value={newFueler.status}
                    onChange={(e) => setNewFueler({ ...newFueler, status: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="In Vacation">In Vacation</option>
                    <option value="Retired / Resigned">Retired / Resigned</option>
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="font-medium text-gray-700">Project Name</label>
                <select
                  value={newFueler.projectId}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    const selectedProject = filterActiveProjects(transferProjects).find((project) =>
                      normalizeText(project.backendId || project.id) === normalizeText(projectId)
                    );

                    setNewFueler({
                      ...newFueler,
                      projectId,
                      projectName: selectedProject?.name || selectedProject?.id || "",
                    });
                  }}
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Project</option>
                  {filterActiveProjects(transferProjects).map((project) => (
                    <option key={makeTenantEntityKey(project, project.name)} value={project.backendId || project.id}>
                      {project.name || project.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
                <button
                  onClick={closeAddFueler}
                  className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveNewFueler}
                  disabled={Boolean(teamMemberIdDuplicateError) || !newFueler.id.trim()}
                  className={`px-3 lg:px-4 py-2 rounded-lg font-semibold ${
                    teamMemberIdDuplicateError || !newFueler.id.trim()
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-yellow-500 hover:bg-yellow-400 text-black"
                  }`}
                >
                  Save Team Member
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingTeamChange && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl overflow-hidden">
              <div className="border-b border-slate-700 px-6 py-5">
                <h2 className={`text-xl font-bold ${pendingTeamChange.field === "retire" ? "text-red-300" : "text-amber-300"}`}>
                  {pendingTeamChange.field === "retire" ? "Confirm Employee Retirement" : "Confirm Team Change"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {pendingTeamChange.fueler?.id} - {pendingTeamChange.fueler?.name || "Team Member"}
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-slate-200">{pendingTeamChange.message}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
                    <div className="text-xs text-red-200">Current</div>
                    <div className="mt-1 font-bold text-red-100">{pendingTeamChange.oldDisplayValue || "-"}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <div className="text-xs text-emerald-200">New</div>
                    <div className="mt-1 font-bold text-emerald-100">{pendingTeamChange.newDisplayValue || "-"}</div>
                  </div>
                </div>

                {pendingTeamChange.field === "project" && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={pendingTeamChange.effectiveDate || ""}
                      onChange={(event) =>
                        setPendingTeamChange((prev) =>
                          prev
                            ? {
                                ...prev,
                                effectiveDate: event.target.value,
                              }
                            : prev
                        )
                      }
                      max={getTodayDateInputValue()}
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Optional. Leave it empty to use the final approval date as the transfer effective date.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-900 px-6 py-4">
                <button
                  onClick={closeTeamChangeConfirmation}
                  disabled={savingTeamChange}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTeamChange}
                  disabled={savingTeamChange}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-400 disabled:cursor-wait disabled:opacity-70"
                >
                  {savingTeamChange && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/60 border-t-transparent" />
                  )}
                  {savingTeamChange
                    ? "Saving..."
                    : pendingTeamChange.field === "retire"
                    ? "Retire Employee"
                    : "Confirm Change"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
