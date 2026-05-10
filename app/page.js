"use client";
 
import React, { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"; 

function SidebarSvgIcon({ children, size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function LayoutDashboard({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </SidebarSvgIcon>
  );
}

function Truck({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </SidebarSvgIcon>
  );
}

function Fuel({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M7 9h7" />
      <path d="M16 8h2l2 2v8a2 2 0 0 1-2 2h-1" />
      <path d="M9 21h4" />
    </SidebarSvgIcon>
  );
}

function Users({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c.8-3.2 3-5 6-5s5.2 1.8 6 5" />
      <path d="M16 11a2.5 2.5 0 0 0 0-5" />
      <path d="M18 20c-.3-1.8-1.2-3.1-2.6-4" />
    </SidebarSvgIcon>
  );
}

function Building2({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 8h2a2 2 0 0 1 2 2v11" />
      <path d="M8 7h4" />
      <path d="M8 11h4" />
      <path d="M8 15h4" />
      <path d="M3 21h18" />
    </SidebarSvgIcon>
  );
}

function FileBarChart2({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 17v-4" />
      <path d="M12 17v-7" />
      <path d="M15 17v-2" />
    </SidebarSvgIcon>
  );
}


function ChartFrame({ children, height = 260 }) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!frameRef.current) return;

    const updateSize = () => {
      const nextWidth = frameRef.current?.clientWidth || 800;
      setWidth(Math.max(320, Math.floor(nextWidth)));
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(frameRef.current);

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <div ref={frameRef} className="fleet-chart-frame">
      {width > 0
        ? React.cloneElement(children, {
            width,
            height,
          })
        : null}
    </div>
  );
}

function Bell({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </SidebarSvgIcon>
  );
}
const TRANSACTIONS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=836310880&single=true&output=csv";
 
const ASSETS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=477887446&single=true&output=csv";
 
const STATIONS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=123801173&single=true&output=csv";
 
const FUELERS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=1883723917&single=true&output=csv";
 
const PROJECTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=2050998594&single=true&output=csv";


// ======================================================
// USERS, ROLES & PERMISSIONS - ENTERPRISE READY LAYER
// ======================================================
const ROLE_PERMISSIONS = {
  Admin: {
    operations: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
    assets: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
    stations: { view: true, add: true, edit: true, delete: true, approve: true, adjustInventory: true, updatePrice: true, export: true, print: true },
    fuelers: { view: true, add: true, edit: true, delete: true, approve: true, export: true, print: true },
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
    stations: { view: true, add: true, edit: true, delete: false, approve: true, adjustInventory: true, updatePrice: false, export: true, print: true },
    fuelers: { view: true, add: true, edit: true, delete: false, approve: true, export: true, print: true },
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
    assets: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    stations: { view: true, add: true, edit: true, delete: false, approve: false, adjustInventory: true, updatePrice: false, export: true, print: true },
    fuelers: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    projects: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    reports: { view: true, export: true, print: true },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: true, export: false },
    auditLog: { view: true, export: false },
  },

  Supervisor: {
    // Supervisor is site-limited in Phase 2.
    // He can access Operations only, and can edit operations inside his assigned project scope.
    operations: { view: true, add: true, edit: true, delete: false, approve: false, export: true, print: true },
    assets: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    stations: { view: false, add: false, edit: false, delete: false, approve: false, adjustInventory: false, updatePrice: false, export: false, print: false },
    fuelers: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
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
    fuelers: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    projects: { view: false, add: false, edit: false, delete: false, approve: false, export: false, print: false },
    reports: { view: false, export: false, print: false },
    users: { view: false, add: false, edit: false, deactivate: false, resetPassword: false, assignRoles: false },
    approvals: { view: false, approve: false, reject: false },
    notifications: { view: true, markRead: true },
    auditTimeline: { view: false, export: false },
    auditLog: { view: false, export: false },
  },
};

const INITIAL_USERS = [
  {
    id: "USR-001",
    fullName: "Amr Eldokany",
    username: "amr",
    email: "amr@fleetfuel.local",
    role: "Admin",
    status: "Active",
    assignedProjects: ["All"],
    managedProjects: ["All"],
    reportingManagerId: "",
    mobile: "",
    passwordResetRequired: false,
    lastLogin: "2026-05-10T08:00:00.000Z",
    createdAt: "2026-05-10T08:00:00.000Z",
  },
  {
    id: "USR-002",
    fullName: "KAFD Project Manager",
    username: "manager.kafd",
    email: "manager.kafd@fleetfuel.local",
    role: "Manager",
    status: "Active",
    assignedProjects: ["KAFD", "kafd", "الكافد", "كافد"],
    managedProjects: ["KAFD", "kafd", "الكافد", "كافد"],
    reportingManagerId: "",
    mobile: "",
    passwordResetRequired: true,
    lastLogin: "",
    createdAt: "2026-05-10T08:10:00.000Z",
  },
  {
    id: "USR-006",
    fullName: "Qiddiya Project Manager",
    username: "manager.qiddiya",
    email: "manager.qiddiya@fleetfuel.local",
    role: "Manager",
    status: "Active",
    assignedProjects: ["Qiddiya", "qiddiya", "القادسية", "قدية"],
    managedProjects: ["Qiddiya", "qiddiya", "القادسية", "قدية"],
    reportingManagerId: "",
    mobile: "",
    passwordResetRequired: true,
    lastLogin: "",
    createdAt: "2026-05-10T08:12:00.000Z",
  },
  {
    id: "USR-003",
    fullName: "KAFD Fleet Officer",
    username: "officer.kafd",
    email: "officer.kafd@fleetfuel.local",
    role: "Officer",
    status: "Active",
    assignedProjects: ["KAFD", "kafd", "الكافد", "كافد"],
    managedProjects: [],
    reportingManagerId: "USR-002",
    mobile: "",
    passwordResetRequired: true,
    lastLogin: "",
    createdAt: "2026-05-10T08:15:00.000Z",
  },
  {
    id: "USR-005",
    fullName: "KAFD Site Supervisor",
    username: "supervisor.kafd",
    email: "supervisor.kafd@fleetfuel.local",
    role: "Supervisor",
    status: "Active",
    assignedProjects: ["KAFD", "kafd", "الكافد", "كافد"],
    managedProjects: [],
    reportingManagerId: "USR-002",
    mobile: "",
    passwordResetRequired: true,
    lastLogin: "",
    createdAt: "2026-05-10T08:20:00.000Z",
  },
  {
    id: "USR-004",
    fullName: "KAFD Fuel Operator",
    username: "operator.kafd",
    email: "operator.kafd@fleetfuel.local",
    role: "Operator",
    status: "Active",
    assignedProjects: ["KAFD", "kafd", "الكافد", "كافد"],
    managedProjects: [],
    reportingManagerId: "USR-002",
    mobile: "",
    passwordResetRequired: true,
    lastLogin: "",
    createdAt: "2026-05-10T08:30:00.000Z",
  },
];

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || {};
}

function hasPermissionForUser(user, module, action = "view") {
  if (!user || user.status !== "Active") return false;
  return Boolean(getRolePermissions(user.role)?.[module]?.[action]);
}

function canAccessPageForUser(user, pageKey) {
  return hasPermissionForUser(user, pageKey, "view");
}

function createActivityRecord({ user, action, module, details }) {
  return {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: user?.id || "System",
    userName: user?.fullName || user?.name || "System",
    role: user?.role || "System",
    action,
    module,
    details,
    createdAt: new Date().toISOString(),
  };
}

function normalizeApprovalValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function makeFieldLabel(field) {
  return String(field || "Field")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isSensitiveApprovalField(field) {
  const sensitiveFields = [
    "project",
    "capacity",
    "fuelTank",
    "fuelTankCapacity",
    "odometer",
    "dieselQuantity",
    "openingBalance",
    "price",
    "status",
    "delete",
  ];

  return sensitiveFields.some((item) =>
    String(field || "").toLowerCase().includes(String(item).toLowerCase())
  );
}

function buildApprovalChangedFields({ type, payload = {} }) {
  if (Array.isArray(payload.changedFields)) {
    return payload.changedFields.map((item) => ({
      field: item.field,
      label: item.label || makeFieldLabel(item.field),
      oldValue: normalizeApprovalValue(item.oldValue),
      newValue: normalizeApprovalValue(item.newValue),
      sensitive: item.sensitive ?? isSensitiveApprovalField(item.field),
    }));
  }

  if (payload.field) {
    return [
      {
        field: payload.field,
        label: makeFieldLabel(payload.field),
        oldValue: normalizeApprovalValue(payload.oldValue),
        newValue: normalizeApprovalValue(payload.newValue),
        sensitive: isSensitiveApprovalField(payload.field),
      },
    ];
  }

  if (payload.action === "delete") {
    return [
      {
        field: "delete",
        label: "Delete Request",
        oldValue: normalizeApprovalValue(payload.id),
        newValue: "Requested Deletion",
        sensitive: true,
      },
    ];
  }

  if (type === "operation_external_supply" && payload.operation) {
    const operation = payload.operation;
    return [
      {
        field: "transactionType",
        label: "Operation Type",
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.transactionType),
        sensitive: true,
      },
      {
        field: "sourceStation",
        label: "Source Station",
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.sourceStation),
        sensitive: false,
      },
      {
        field: "destinationId",
        label: "Destination",
        oldValue: "-",
        newValue: normalizeApprovalValue(operation.destinationId),
        sensitive: false,
      },
      {
        field: "dieselQuantity",
        label: "Diesel Quantity",
        oldValue: "-",
        newValue: `${normalizeApprovalValue(operation.dieselQuantity)} L`,
        sensitive: true,
      },
    ];
  }

  return [];
}

function inferApprovalEntity({ type, payload = {} }) {
  if (payload.entity || payload.id) {
    return {
      entityType: payload.entity || payload.entityType || "Record",
      entityId: payload.id || payload.entityId || "-",
    };
  }

  if (type === "operation_external_supply" && payload.operation) {
    return {
      entityType: "Operation",
      entityId: payload.operation.operationId || "New Operation",
    };
  }

  return {
    entityType: payload.entityType || "Request",
    entityId: payload.entityId || "-",
  };
}

function getProjectScopeValues(user, key = "managedProjects") {
  if (!user || !Array.isArray(user[key])) return [];
  return user[key];
}

function projectMatchesScope(projectValue, scopeValue, projects = []) {
  if (!projectValue || !scopeValue) return false;
  if (scopeValue === "All") return true;

  const normalizedProjectValue = normalizeScopeValue(projectValue);
  const normalizedScopeValue = normalizeScopeValue(scopeValue);

  if (normalizedProjectValue === normalizedScopeValue) return true;

  const matchedProject = projects.find((project) => {
    const projectId = normalizeScopeValue(project.id);
    const projectName = normalizeScopeValue(project.name);
    return projectId === normalizedProjectValue || projectName === normalizedProjectValue;
  });

  if (!matchedProject) return false;

  return (
    normalizeScopeValue(matchedProject.id) === normalizedScopeValue ||
    normalizeScopeValue(matchedProject.name) === normalizedScopeValue
  );
}

function findManagerForProject(projectValue, users = [], projects = []) {
  const activeManagers = users.filter((user) => user.role === "Manager" && user.status === "Active");

  if (!activeManagers.length) {
    return users.find((user) => user.role === "Admin" && user.status === "Active") || null;
  }

  if (!projectValue || projectValue === "-") {
    return activeManagers.find((user) => getProjectScopeValues(user).includes("All")) || activeManagers[0];
  }

  return (
    activeManagers.find((manager) =>
      getProjectScopeValues(manager).some((projectScope) => projectMatchesScope(projectValue, projectScope, projects))
    ) ||
    activeManagers.find((user) => getProjectScopeValues(user).includes("All")) ||
    activeManagers[0]
  );
}

function getReportingManagerForUser(user, users = [], projects = [], fallbackProject = "") {
  const directManager = users.find(
    (item) => item.id === user?.reportingManagerId && item.role === "Manager" && item.status === "Active"
  );

  return directManager || findManagerForProject(fallbackProject, users, projects);
}

function extractApprovalProjects({ payload = {}, changedFields = [] }) {
  const projectField = changedFields.find((field) =>
    ["project", "projectName", "assignedProject", "project_id"].includes(field.field)
  );

  if (projectField) {
    return {
      sourceProject: projectField.oldValue && projectField.oldValue !== "-" ? projectField.oldValue : "",
      destinationProject: projectField.newValue && projectField.newValue !== "-" ? projectField.newValue : "",
      isTransfer: Boolean(projectField.oldValue && projectField.newValue && projectField.oldValue !== projectField.newValue),
    };
  }

  const valuesProject = payload?.values?.project || payload?.values?.projectName || payload?.project || payload?.projectName || "";

  return {
    sourceProject: valuesProject,
    destinationProject: valuesProject,
    isTransfer: false,
  };
}

function buildApprovalRoute({ requestedBy, users = [], projects = [], payload = {}, changedFields = [] }) {
  const { sourceProject, destinationProject, isTransfer } = extractApprovalProjects({ payload, changedFields });

  if (isTransfer && sourceProject && destinationProject) {
    const sourceManager = findManagerForProject(sourceProject, users, projects);
    const destinationManager = findManagerForProject(destinationProject, users, projects);

    const approvers = [
      sourceManager && {
        userId: sourceManager.id,
        userName: sourceManager.fullName,
        role: "Manager",
        projectId: sourceProject,
        approvalStage: "Source Project Manager",
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      },
      destinationManager && {
        userId: destinationManager.id,
        userName: destinationManager.fullName,
        role: "Manager",
        projectId: destinationProject,
        approvalStage: "Destination Project Manager",
        status: "Pending",
        reviewedAt: "",
        reviewNote: "",
      },
    ]
      .filter(Boolean)
      .filter((approver, index, list) =>
        list.findIndex((item) => item.userId === approver.userId && item.approvalStage === approver.approvalStage) === index
      );

    return {
      routeType: "dual_project_manager",
      sourceProject,
      destinationProject,
      requiredApprovers: approvers,
      routeStatus: "Pending",
    };
  }

  const projectForApproval = destinationProject || sourceProject || payload?.project || payload?.projectName || "";

  // Some approvals must be routed to the manager responsible for a specific project,
  // not only to the requester's direct reporting manager.
  // Example: External Supply is diesel coming from an external supplier into a station,
  // so the approval must go to the destination station project manager.
  const manager =
    payload?.approvalRouteStrategy === "project_manager"
      ? findManagerForProject(projectForApproval, users, projects)
      : getReportingManagerForUser(requestedBy, users, projects, projectForApproval);

  return {
    routeType: payload?.approvalRouteStrategy === "project_manager" ? "single_project_manager" : "single_manager",
    sourceProject: projectForApproval,
    destinationProject: projectForApproval,
    requiredApprovers: manager
      ? [
          {
            userId: manager.id,
            userName: manager.fullName,
            role: "Manager",
            projectId: projectForApproval || "-",
            approvalStage: "Direct Manager",
            status: "Pending",
            reviewedAt: "",
            reviewNote: "",
          },
        ]
      : [],
    routeStatus: "Pending",
  };
}

function isApprovalFullyApproved(request) {
  const approvers = request?.approvalRoute?.requiredApprovers || [];
  return approvers.length > 0 && approvers.every((approver) => approver.status === "Approved");
}

function canUserViewApproval(user, request) {
  if (!user || !request) return false;
  if (user.role === "Admin") return true;
  if (request.requestedById === user.id) return true;

  const approvers = request.approvalRoute?.requiredApprovers || [];
  return approvers.some((approver) => approver.userId === user.id);
}

function canUserReviewApproval(user, request) {
  if (!hasPermissionForUser(user, "approvals", "approve")) return false;
  if (user?.role === "Admin") return true;

  const approvers = request?.approvalRoute?.requiredApprovers || [];
  return approvers.some((approver) => approver.userId === user?.id && approver.status === "Pending");
}

function createApprovalRequest({ type, module, title, payload, requestedBy, details, users = [], projects = [] }) {
  const changedFields = buildApprovalChangedFields({ type, payload });
  const sensitive = changedFields.some((item) => item.sensitive);
  const entityInfo = inferApprovalEntity({ type, payload });
  const approvalRoute = buildApprovalRoute({ requestedBy, users, projects, payload, changedFields });

  return {
    id: `APR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    module,
    title,
    payload,
    details,
    status: "Pending",
    changedFields,
    entityType: entityInfo.entityType,
    entityId: entityInfo.entityId,
    sensitivity: sensitive ? "Sensitive" : "Normal",
    riskLevel: sensitive ? "High" : "Standard",
    approvalRoute,
    requestedById: requestedBy?.id || "System",
    requestedByName: requestedBy?.fullName || requestedBy?.name || "System",
    requestedByRole: requestedBy?.role || "System",
    requestedAt: new Date().toISOString(),
    reviewedBy: "",
    reviewedAt: "",
    reviewNote: "",
  };
}


function formatNotificationDate(rawDate) {
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

function getNotificationPriority(item) {
  if (!item) return "Normal";
  if (item.status === "Pending" && item.sensitivity === "Sensitive") return "High";
  if (item.status === "Pending") return "Medium";
  if (item.status === "Rejected") return "High";
  return "Normal";
}

function buildNotificationItems({ approvals = [], activityLog = [], currentUser, readMap = {} }) {
  const isManagerial = ["Admin", "Manager"].includes(currentUser?.role);
  const visibleApprovals = approvals.filter((item) => canUserViewApproval(currentUser, item));

  const approvalNotifications = visibleApprovals.map((item) => {
    const needsDecision = isManagerial && item.status === "Pending";
    const isOwnRequest = item.requestedById === currentUser?.id;
    const title = needsDecision
      ? `Approval required: ${item.title}`
      : isOwnRequest
      ? `Your request is ${item.status}: ${item.title}`
      : `${item.status}: ${item.title}`;

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
  });

  const visibleActivities = activityLog
    .filter((item) => isManagerial || item.userId === currentUser?.id)
    .slice(0, 12)
    .map((item) => ({
      id: `NTF-ACT-${item.id}`,
      sourceId: item.id,
      type: "activity",
      category: "Activity",
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


function buildAuditTimelineItems({ approvals = [], activityLog = [], currentUser }) {
  const canViewCompanyWide = ["Admin", "Manager", "Officer"].includes(currentUser?.role);
  if (!canViewCompanyWide) return [];

  const visibleApprovals = approvals.filter((item) => canUserViewApproval(currentUser, item));

  const activityEvents = activityLog
    .filter((item) => currentUser?.role === "Admin" || item.userId === currentUser?.id || ["Manager", "Officer"].includes(currentUser?.role))
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

function exportAuditTimelineCSV(timelineItems = []) {
  const headers = [
    "Date",
    "Source",
    "Module",
    "Status",
    "Actor",
    "Role",
    "Entity Type",
    "Entity ID",
    "Risk",
    "Title",
    "Description",
    "Changed Fields",
  ];

  const rows = timelineItems.map((item) => [
    formatNotificationDate(item.createdAt),
    item.source,
    item.module,
    item.status,
    item.actorName,
    item.actorRole,
    item.entityType,
    item.entityId,
    item.riskLevel,
    item.title,
    item.description,
    (item.changedFields || [])
      .map((field) => `${field.label || field.field}: ${field.oldValue} -> ${field.newValue}`)
      .join(" | "),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `audit_timeline_${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getAllowedTransactionTypesForUser(user) {
  if (!user || user.status !== "Active") return [];
  if (user.role === "Operator") return ["Direct_Refuel"];
  if (user.role === "Officer") return [];

  // External_Transfer is a cross-project diesel transfer.
  // It must be available only for Manager and Admin.
  if (["Admin", "Manager"].includes(user.role)) {
    return ["Direct_Refuel", "Internal_Transfer", "External_Supply", "External_Transfer"];
  }

  if (user.role === "Supervisor") {
    return ["Direct_Refuel", "Internal_Transfer", "External_Supply"];
  }

  return ["Direct_Refuel"];
}

function shouldExternalSupplyRequireApproval(user) {
  if (!user) return true;
  return !["Admin", "Manager"].includes(user.role);
}

function isOfficerUser(user) {
  return user?.role === "Officer";
}

function getUserProjectScope(user) {
  if (!user || !Array.isArray(user.assignedProjects)) return [];
  return user.assignedProjects;
}

function normalizeScopeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function userCanAccessAllProjects(user) {
  if (!user) return false;

  // Admin remains company-wide.
  // Managers are project-scoped unless they are explicitly assigned to All.
  // This makes approval-routing tests easier and closer to real project ownership.
  if (user.role === "Admin") return true;

  const scope = getUserProjectScope(user);
  return scope.includes("All") && user.role !== "Operator" && user.role !== "Supervisor";
}

function isProjectAllowedForUser(user, projectValue, projects = []) {
  if (userCanAccessAllProjects(user)) return true;

  const scope = getUserProjectScope(user);
  if (!scope.length || !projectValue) return false;

  const normalizedScope = scope.map(normalizeScopeValue);
  const normalizedProjectValue = normalizeScopeValue(projectValue);

  if (normalizedScope.includes(normalizedProjectValue)) return true;

  const matchedProject = projects.find((project) => {
    const projectId = normalizeScopeValue(project.id);
    const projectName = normalizeScopeValue(project.name);
    return projectId === normalizedProjectValue || projectName === normalizedProjectValue;
  });

  if (!matchedProject) return false;

  return (
    normalizedScope.includes(normalizeScopeValue(matchedProject.id)) ||
    normalizedScope.includes(normalizeScopeValue(matchedProject.name))
  );
}

function getAssetProjectValue(assetId, assets = []) {
  const asset = assets.find((item) => normalizeScopeValue(item.id) === normalizeScopeValue(assetId));
  return asset?.project || "";
}

function getStationProjectValue(stationId, stations = []) {
  const station = stations.find((item) => normalizeScopeValue(item.id) === normalizeScopeValue(stationId));
  return station?.project || "";
}

function getRowProjectValue(row, headers, assets = [], stations = []) {
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
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

  const operationType = typeIndex !== -1 ? row[typeIndex] : "";
  const sourceStation = sourceIndex !== -1 ? row[sourceIndex] : "";
  const destination = destinationIndex !== -1 ? row[destinationIndex] : "";

  if (isSameText(operationType, "Direct_Refuel")) {
    return getAssetProjectValue(destination, assets);
  }

  return (
    getStationProjectValue(sourceStation, stations) ||
    getStationProjectValue(destination, stations) ||
    getAssetProjectValue(destination, assets)
  );
}

function filterDataByUserProjectScope({ user, data, headers, assets, stations, projects }) {
  if (userCanAccessAllProjects(user)) return data;

  return data.filter((row) => {
    const rowProject = getRowProjectValue(row, headers, assets, stations);
    return isProjectAllowedForUser(user, rowProject, projects);
  });
}

function filterMasterDataByUserProjectScope({ user, items, projects, projectKey = "project" }) {
  if (userCanAccessAllProjects(user)) return items;

  return items.filter((item) =>
    isProjectAllowedForUser(user, item?.[projectKey], projects)
  );
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
 
export default function Home() {
  const [page, setPage] = useState("operations");
  const [theme, setTheme] = useState("dark");
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
 
  const [assets, setAssets] = useState([]);
  const [stations, setStations] = useState([]);
  const [fuelers, setFuelers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [assetProjectHistory, setAssetProjectHistory] = useState([]);
  const [assetOdometerHistory, setAssetOdometerHistory] = useState([]);

  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState("USR-001");
  const [activityLog, setActivityLog] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notificationReadMap, setNotificationReadMap] = useState({});

  const currentUser =
    users.find((user) => user.id === currentUserId && user.status === "Active") ||
    users.find((user) => user.status === "Active") ||
    users[0];

  const hasPermission = (module, action = "view") =>
    hasPermissionForUser(currentUser, module, action);

  const canAccessPage = (pageKey) =>
    canAccessPageForUser(currentUser, pageKey);

  const trackActivity = (action, module, details) => {
    setActivityLog((prev) => [
      createActivityRecord({ user: currentUser, action, module, details }),
      ...prev,
    ]);
  };

  const submitApprovalRequest = (request) => {
    const approvalRequest = createApprovalRequest({ ...request, requestedBy: currentUser, users, projects });
    setPendingApprovals((prev) => [approvalRequest, ...prev]);
    setActivityLog((prev) => [
      createActivityRecord({
        user: currentUser,
        action: "Submit Approval Request",
        module: request.module,
        details: request.title || request.details || "Approval request submitted.",
      }),
      ...prev,
    ]);
    showToast?.("warning", "Request sent to Manager approval queue.");
    return approvalRequest;
  };
 
  useEffect(() => {
    async function fetchData() {
      // TRANSACTIONS
      const trxRes = await fetch(TRANSACTIONS_CSV);
      const trxText = await trxRes.text();
      const trxRows = trxText.split("\n").map((row) => row.split(","));
 
      setHeaders(trxRows[0]);
      setData(trxRows.slice(1));
 
      // ASSETS
      const assetsRes = await fetch(ASSETS_CSV);
      const assetsText = await assetsRes.text();
      const assetRows = assetsText.split("\n").map((row) => row.split(","));
      const assetHeaders = assetRows[0];
 
      const mappedAssets = assetRows
        .slice(1)
        .map((row) => ({
          id: getValue(row, assetHeaders, ["asset_id", "id"]),
          type: getValue(row, assetHeaders, ["asset_type", "type"]),
          category: getValue(row, assetHeaders, ["asset_category", "category"]),
          odometer: getValue(row, assetHeaders, [
            "current_odometer",
            "odometer",
          ]),
          fuelTank: getValue(row, assetHeaders, [
            "fuel_tank_capacity",
            "tank_capacity",
          ]),
          project: getValue(row, assetHeaders, [
            "project_id",
            "project",
            "project_name",
          ]),
          status: getValue(row, assetHeaders, ["status"]),
        }))
        .filter((asset) => asset.id);
 
      setAssets(mappedAssets);
 
      // STATIONS
      const stationsRes = await fetch(STATIONS_CSV);
      const stationsText = await stationsRes.text();
 
      const stationRows = stationsText
        .split("\n")
        .map((row) => row.split(","));
 
      const stationHeaders = stationRows[0];
 
      const mappedStations = stationRows
        .slice(1)
        .map((row) => ({
          id: getValue(row, stationHeaders, ["station_id"]),
          type: getValue(row, stationHeaders, ["station_type"]),
          capacity: parseFloat(
            getValue(row, stationHeaders, ["station_capacity"])
          ),
          project: getValue(row, stationHeaders, ["project_id"]),
          status: getValue(row, stationHeaders, ["status"]),
          openingBalance: parseFloat(
            getValue(row, stationHeaders, ["opening_balance"])
          ),
        }))
        .filter((station) => station.id);
 
      setStations(mappedStations);
	// FUELERS
const fuelersRes = await fetch(FUELERS_CSV);
const fuelersText = await fuelersRes.text();
 
const fuelerRows = fuelersText
  .split("\n")
  .map((row) => row.split(","));
 
const fuelerHeaders = fuelerRows[0];
 
const mappedFuelers = fuelerRows
  .slice(1)
  .map((row) => ({
    id: getValue(row, fuelerHeaders, ["fueler_id", "id"]),
    name: getValue(row, fuelerHeaders, ["fueler_name", "name"]),
    mobile: getValue(row, fuelerHeaders, ["mobile", "phone", "mobile_no"]),
    projectName: getValue(row, fuelerHeaders, [
      "project_name",
      "project",
      "project name",
    ]),
    status: getValue(row, fuelerHeaders, ["status"]) || "On Duty",
  }))
  .filter((fueler) => fueler.id);
 
setFuelers(mappedFuelers);
 
// PROJECTS
const projectsRes = await fetch(PROJECTS_CSV);
const projectsText = await projectsRes.text();
 
const projectRows = projectsText
  .split("\n")
  .map((row) => row.split(","));
 
const projectHeaders = projectRows[0];
 
const mappedProjects = projectRows
  .slice(1)
  .map((row) => ({
    id: getValue(row, projectHeaders, ["project_id", "id"]),
    name: getValue(row, projectHeaders, ["project_name", "name"]),
    status: getValue(row, projectHeaders, ["status"]),
  }))
  .filter((project) => project.id);
 
setProjects(mappedProjects);
    }
 
    fetchData();
  }, []);

  useEffect(() => {
    if (!canAccessPage(page)) {
      const firstAllowedPage = [
        "operations",
        "assets",
        "stations",
        "fuelers",
        "projects",
        "reports",
        "notifications",
        "auditTimeline",
        "approvals",
        "users",
      ].find((pageKey) => canAccessPage(pageKey));

      if (firstAllowedPage) {
        setPage(firstAllowedPage);
      }
    }
  }, [page, currentUserId, users]);
 
  const [priceHistory, setPriceHistory] = useState([
    {
      price: 2.33,
      effectiveFrom: "2000-01-01T00:00",
      createdBy: "System",
      createdAt: "2000-01-01T00:00:00.000Z",
    },
  ]);

  const currency = "SAR";

  const getLiterPriceByDate = (transactionDate) => {
    const date = transactionDate ? new Date(transactionDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return priceHistory[priceHistory.length - 1]?.price || 2.33;
    }

    const validPrices = priceHistory
      .filter((item) => new Date(item.effectiveFrom) <= date)
      .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

    return validPrices[0]?.price || 2.33;
  };

  const literPrice = getLiterPriceByDate(new Date().toISOString());

  const scopedProjects = userCanAccessAllProjects(currentUser)
    ? projects
    : projects.filter((project) =>
        isProjectAllowedForUser(currentUser, project.id, projects) ||
        isProjectAllowedForUser(currentUser, project.name, projects)
      );

  // Enterprise transfer rule:
  // The user sees only his scoped project data in tables,
  // but Officer must be able to request transfer to any project.
  // This affects only project-change dropdowns, not page visibility or data scope.
  const transferDestinationProjects =
    currentUser?.role === "Officer" ? projects : scopedProjects;

  const scopedAssets = filterMasterDataByUserProjectScope({
    user: currentUser,
    items: assets,
    projects,
    projectKey: "project",
  });

  const scopedStations = filterMasterDataByUserProjectScope({
    user: currentUser,
    items: stations,
    projects,
    projectKey: "project",
  });

  const scopedFuelers = userCanAccessAllProjects(currentUser)
    ? fuelers
    : fuelers.filter((fueler) =>
        isProjectAllowedForUser(currentUser, fueler.projectName, projects)
      );

  const scopedData = filterDataByUserProjectScope({
    user: currentUser,
    data,
    headers,
    assets,
    stations,
    projects,
  });

  const notifications = buildNotificationItems({
    approvals: pendingApprovals,
    activityLog,
    currentUser,
    readMap: notificationReadMap,
  });

  const unreadNotificationCount = notifications.filter((item) => !item.read).length;
  const routedPendingApprovalCount = pendingApprovals.filter(
    (item) => item.status === "Pending" && canUserViewApproval(currentUser, item)
  ).length;

  const markNotificationRead = (notificationId) => {
    setNotificationReadMap((prev) => ({ ...prev, [notificationId]: true }));
  };

  const markAllNotificationsRead = () => {
    setNotificationReadMap((prev) => {
      const next = { ...prev };
      notifications.forEach((item) => {
        next[item.id] = true;
      });
      return next;
    });
  };
 
  const renderPage = () => {
    if (page === "operations") {
      return (
        <OperationsPage
          data={scopedData}
          headers={headers}
          assets={scopedAssets}
          stations={scopedStations}
          allStations={stations}
          fuelers={scopedFuelers}
          literPrice={literPrice}
          getLiterPriceByDate={getLiterPriceByDate}
          currency={currency}
          assetProjectHistory={assetProjectHistory}
          currentUser={currentUser}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          submitApprovalRequest={submitApprovalRequest}
          projects={projects}
        />
      );
    }
 
    if (page === "assets") {
      return (
        <AssetsPage
          assets={scopedAssets}
          projects={scopedProjects}
          transferProjects={transferDestinationProjects}
          showToast={showToast}
          data={scopedData}
          headers={headers}
          assetProjectHistory={assetProjectHistory}
          setAssetProjectHistory={setAssetProjectHistory}
          assetOdometerHistory={assetOdometerHistory}
          setAssetOdometerHistory={setAssetOdometerHistory}
          currentUser={currentUser}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          submitApprovalRequest={submitApprovalRequest}
        />
      );
    }
 
    if (page === "stations") {
      return (
      <StationsPage
  stations={scopedStations}
  projects={scopedProjects}
  transferProjects={transferDestinationProjects}
  data={scopedData}
  headers={headers}
  showToast={showToast}
  literPrice={literPrice}
  priceHistory={priceHistory}
  setPriceHistory={setPriceHistory}
  getLiterPriceByDate={getLiterPriceByDate}
  currency={currency}
  currentUser={currentUser}
  hasPermission={hasPermission}
  trackActivity={trackActivity}
  submitApprovalRequest={submitApprovalRequest}
/>
      );
    }
    if (page === "fuelers") {
  return (
    <FuelersPage
      fuelers={scopedFuelers}
      projects={scopedProjects}
      transferProjects={transferDestinationProjects}
      data={scopedData}
      headers={headers}
      showToast={showToast}
      currency={currency}
      getLiterPriceByDate={getLiterPriceByDate}
      currentUser={currentUser}
      hasPermission={hasPermission}
      trackActivity={trackActivity}
      submitApprovalRequest={submitApprovalRequest}
    />
  );
}
 
if (page === "projects") {
  return (
    <ProjectsPage
      projects={scopedProjects}
      assets={scopedAssets}
      stations={scopedStations}
      fuelers={scopedFuelers}
      data={scopedData}
      headers={headers}
      showToast={showToast}
      currency={currency}
      getLiterPriceByDate={getLiterPriceByDate}
      assetProjectHistory={assetProjectHistory}
      currentUser={currentUser}
      hasPermission={hasPermission}
      trackActivity={trackActivity}
      submitApprovalRequest={submitApprovalRequest}
    />
  );
}

if (page === "notifications") {
  return (
    <NotificationCenterPage
      notifications={notifications}
      currentUser={currentUser}
      markNotificationRead={markNotificationRead}
      markAllNotificationsRead={markAllNotificationsRead}
      setPage={setPage}
    />
  );
}

if (page === "auditTimeline") {
  return (
    <AuditTimelinePage
      approvals={pendingApprovals}
      activityLog={activityLog}
      currentUser={currentUser}
      hasPermission={hasPermission}
    />
  );
}

if (page === "approvals") {
  return (
    <ApprovalsPage
      approvals={pendingApprovals}
      setApprovals={setPendingApprovals}
      currentUser={currentUser}
      hasPermission={hasPermission}
      setData={setData}
      trackActivity={trackActivity}
      showToast={showToast}
    />
  );
}

if (page === "users") {
  return (
    <UsersPage
      users={users}
      setUsers={setUsers}
      projects={projects}
      currentUser={currentUser}
      currentUserId={currentUserId}
      setCurrentUserId={setCurrentUserId}
      hasPermission={hasPermission}
      activityLog={activityLog}
      setActivityLog={setActivityLog}
      trackActivity={trackActivity}
      showToast={showToast}
    />
  );
}
     return (
      <div className="bg-gray-900 min-h-screen text-white p-6">
        <h2 className="text-xl sm:text-2xl font-bold">{page} Page</h2>
      </div>
    );
  };
 const [toast, setToast] = useState(null);

const showToast = (type, message) => {
  setToast({ type, message });

  setTimeout(() => {
    setToast(null);
  }, 3000);
};

const sidebarItems = [
  { key: "operations", label: "Operations", Icon: LayoutDashboard },
  { key: "assets", label: "Assets", Icon: Truck },
  { key: "stations", label: "Stations", Icon: Fuel },
  { key: "fuelers", label: "Fuelers", Icon: Users },
  { key: "projects", label: "Projects / Sites", Icon: Building2 },
  { key: "reports", label: "Reports", Icon: FileBarChart2 },
  { key: "notifications", label: "Notifications", Icon: Bell },
  { key: "auditTimeline", label: "Audit Timeline", Icon: FileBarChart2 },
  { key: "approvals", label: "Approvals", Icon: FileBarChart2 },
  { key: "users", label: "Users & Roles", Icon: Users },
].filter((item) => canAccessPage(item.key));

  return (
    <>
      <style jsx global>{`
        [data-theme="light"] {
          color-scheme: light;
        }

        [data-theme="light"] .theme-main-bg {
          background:
            radial-gradient(circle at top left, rgba(245, 158, 11, 0.10), transparent 34%),
            #f4f7fb !important;
        }

        [data-theme="light"] .bg-\[\#070b14\] {
          background: #f4f7fb !important;
        }

        [data-theme="light"] .bg-\[\#050814\] {
          background: #ffffff !important;
          color: #0f172a !important;
          border-color: rgba(203, 213, 225, 0.95) !important;
        }

        [data-theme="light"] .bg-\[\#080d19\],
        [data-theme="light"] .bg-slate-950,
        [data-theme="light"] .bg-slate-900,
        [data-theme="light"] .bg-slate-900\/80,
        [data-theme="light"] .bg-slate-900\/60,
        [data-theme="light"] .bg-slate-800,
        [data-theme="light"] .bg-slate-800\/80,
        [data-theme="light"] .bg-gray-900,
        [data-theme="light"] .bg-gray-800,
        [data-theme="light"] .bg-gray-700 {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .border-slate-800\/80,
        [data-theme="light"] .border-slate-700\/80,
        [data-theme="light"] .border-slate-700,
        [data-theme="light"] .border-gray-700 {
          border-color: rgba(203, 213, 225, 0.95) !important;
        }

        [data-theme="light"] .text-slate-100,
        [data-theme="light"] .text-slate-200,
        [data-theme="light"] .text-white {
          color: #0f172a !important;
        }

        [data-theme="light"] .text-slate-300,
        [data-theme="light"] .text-slate-400,
        [data-theme="light"] .text-gray-400,
        [data-theme="light"] .text-slate-500 {
          color: #64748b !important;
        }

        [data-theme="light"] .text-amber-300,
        [data-theme="light"] .text-amber-400,
        [data-theme="light"] .text-yellow-400 {
          color: #d97706 !important;
        }

        [data-theme="light"] table tbody tr {
          background-color: #ffffff !important;
        }

        [data-theme="light"] table tbody tr:nth-child(even) {
          background-color: #f8fafc !important;
        }

        [data-theme="light"] table tbody tr:hover {
          background-color: #fff7ed !important;
        }

        [data-theme="light"] thead,
        [data-theme="light"] .sticky.top-0 {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        [data-theme="light"] input,
        [data-theme="light"] select,
        [data-theme="light"] textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }

        [data-theme="light"] .shadow-black\/10,
        [data-theme="light"] .shadow-2xl,
        [data-theme="light"] .shadow-xl {
          box-shadow: 0 16px 35px rgba(15, 23, 42, 0.08) !important;
        }

        /* Light theme enterprise refinements */
        [data-theme="light"] .text-blue-300,
        [data-theme="light"] .hover\:text-yellow-400:hover {
          color: #1e3a8a !important;
        }

        [data-theme="light"] .text-green-300,
        [data-theme="light"] .text-emerald-300,
        [data-theme="light"] .text-emerald-400 {
          color: #047857 !important;
        }

        [data-theme="light"] .text-red-300,
        [data-theme="light"] .text-red-400 {
          color: #b91c1c !important;
        }

        [data-theme="light"] .text-yellow-300,
        [data-theme="light"] .text-amber-300 {
          color: #b45309 !important;
        }

        [data-theme="light"] .bg-amber-400 {
          background-color: #f59e0b !important;
        }

        [data-theme="light"] .hover\:bg-amber-300:hover {
          background-color: #fbbf24 !important;
        }

        [data-theme="light"] .text-slate-950 {
          color: #0f172a !important;
        }

        [data-theme="light"] .hover\:bg-slate-800\/70:hover,
        [data-theme="light"] .hover\:bg-slate-800:hover {
          background-color: #e2e8f0 !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .bg-red-500\/10 {
          background-color: rgba(220, 38, 38, 0.08) !important;
        }

        [data-theme="light"] .hover\:bg-red-500\/20:hover {
          background-color: rgba(220, 38, 38, 0.14) !important;
        }

        [data-theme="light"] .border-red-500\/35 {
          border-color: rgba(220, 38, 38, 0.35) !important;
        }

        [data-theme="light"] .border-emerald-500\/30 {
          border-color: rgba(5, 150, 105, 0.35) !important;
        }

        [data-theme="light"] .bg-emerald-500\/15 {
          background-color: rgba(5, 150, 105, 0.10) !important;
        }

        [data-theme="light"] .bg-red-500\/15 {
          background-color: rgba(220, 38, 38, 0.10) !important;
        }

        [data-theme="light"] .bg-blue-500\/15 {
          background-color: rgba(30, 58, 138, 0.10) !important;
        }

        [data-theme="light"] .border-blue-500\/30 {
          border-color: rgba(30, 58, 138, 0.28) !important;
        }

        [data-theme="light"] .text-blue-400,
        [data-theme="light"] .text-cyan-300,
        [data-theme="light"] .text-cyan-400 {
          color: #1d4ed8 !important;
        }

        [data-theme="light"] .shadow-amber-500\/15,
        [data-theme="light"] .shadow-amber-500\/20 {
          box-shadow: 0 12px 24px rgba(245, 158, 11, 0.16) !important;
        }

        [data-theme="light"] .backdrop-blur {
          background-color: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(10px);
        }

        [data-theme="light"] .rounded-2xl,
        [data-theme="light"] .rounded-xl {
          border-color: rgba(203, 213, 225, 0.9);
        }

        [data-theme="light"] td {
          color: #334155 !important;
        }

        [data-theme="light"] th {
          color: #92400e !important;
        }

        [data-theme="light"] button {
          color: inherit;
        }

        [data-theme="light"] .bg-slate-950.border,
        [data-theme="light"] .bg-slate-900.border {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }

        [data-theme="light"] .bg-slate-950.border button,
        [data-theme="light"] .bg-slate-900.border button {
          color: #0f172a !important;
        }

        [data-theme="light"] .bg-slate-950.border button:hover,
        [data-theme="light"] .bg-slate-900.border button:hover {
          background-color: #f1f5f9 !important;
        }



        /* Responsive step 3 safeguards */
        .theme-main-bg {
          min-width: 0;
        }

        .theme-main-bg > div {
          min-width: 0;
        }

        table {
          max-width: none;
        }

        /* Modal layering fix */
        .fleet-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998 !important;
        }

        .fleet-modal-panel {
          position: relative;
          z-index: 9999 !important;
        }

        .fleet-sticky-layer {
          z-index: 5 !important;
        }

      `}</style>

      <div data-theme={theme} className="min-h-screen bg-[#070b14] flex overflow-hidden text-slate-100">
      <div className={`${sidebarCollapsed ? "w-20" : "w-64"} shrink-0 bg-[#050814] text-white border-r border-slate-800/80 shadow-2xl p-4 hidden lg:flex lg:flex-col transition-all duration-300`}>
        <div className="flex flex-col items-center mb-5">
          <img
            src={theme === "dark" ? "/icons/fleet-fuel-pro-dark.png" : "/icons/fleet-fuel-pro-light.png"}
            alt="Fleet Fuel PRO"
            className={`${sidebarCollapsed ? "w-12" : "w-28"} h-auto object-contain mb-3 select-none transition-all duration-300`}
            draggable={false}
          />

          {!sidebarCollapsed && (
            <p className="text-[11px] text-slate-500 uppercase tracking-[0.22em] text-center">
              Fleet Fuel Management System
            </p>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mb-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 text-slate-400 hover:bg-slate-800/70 hover:text-white border border-slate-800/80"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span>{sidebarCollapsed ? "»" : "«"}</span>
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
 
        <ul className="space-y-2">
          {sidebarItems.map(({ key, label, Icon }) => (
            <li key={key}>
              <button
                onClick={() => setPage(key)}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-3" : "gap-3 text-left px-4"} py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ${page === key ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/15" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"}`}
                title={label}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex items-center gap-2">
                    <span>{label}</span>
                    {key === "notifications" && unreadNotificationCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                        {unreadNotificationCount}
                      </span>
                    )}
                    {key === "approvals" && routedPendingApprovalCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                        {routedPendingApprovalCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {!sidebarCollapsed && currentUser && (
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Signed in as</p>
            <p className="text-sm font-bold text-slate-100 truncate">{currentUser.fullName}</p>
            <p className="text-xs text-amber-300 mt-0.5">{currentUser.role}</p>

            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">
                Dev User Switcher
              </p>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              >
                {users
                  .filter((u) => u.status === "Active")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-800/80">
          <div className="relative">
            <button
              onClick={() => setShowThemeSettings(!showThemeSettings)}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-3" : "justify-between gap-3 px-4"} py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 text-slate-300 hover:bg-slate-800/70 hover:text-white`}
            >
              <span className="flex flex-wrap items-center gap-3">
                <SidebarSvgIcon size={18} className="shrink-0">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </SidebarSvgIcon>
                {!sidebarCollapsed && <span>Settings</span>}
              </span>
              {!sidebarCollapsed && <span className="text-xs text-slate-500">Theme</span>}
            </button>

            {showThemeSettings && (
              <div className="absolute left-0 bottom-full mb-2 w-full bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[9999]">
                <button
                  onClick={() => {
                    setTheme("dark");
                    setShowThemeSettings(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    theme === "dark"
                      ? "bg-amber-400 text-slate-950 font-bold"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Dark Theme
                </button>

                <button
                  onClick={() => {
                    setTheme("light");
                    setShowThemeSettings(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm border-t border-slate-700 transition-colors ${
                    theme === "light"
                      ? "bg-amber-400 text-slate-950 font-bold"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Light Theme
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
 
      <div className="theme-main-bg flex-1 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_34%),#0b1220]">
        {renderPage()}
	{toast && <Toast type={toast.type} message={toast.message} />}
      </div>
    </div>
    </>
  );
}
 
// IMPORTANT:
// Add these components to your Recharts import in app/page.js:
// BarChart, Bar, PieChart, Pie, Cell, Legend

function OperationsPage({
  data,
  headers,
  assets,
  stations,
  allStations = [],
  fuelers,
  literPrice = 2.33,
  getLiterPriceByDate,
  currency = "SAR",
  assetProjectHistory = [],
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
  projects = [],
}) {
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [stationMeterPhoto, setStationMeterPhoto] = useState(null);
  const [assetPhoto, setAssetPhoto] = useState(null);
  const [assetMeterPhoto, setAssetMeterPhoto] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentTypeSearch, setEquipmentTypeSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [showEquipmentTypeDropdown, setShowEquipmentTypeDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Table export menus
  const [showEquipmentSummarySettings, setShowEquipmentSummarySettings] =
    useState(false);
  const [showEquipmentTypeSettings, setShowEquipmentTypeSettings] =
    useState(false);
  const [showDailyConsumptionSettings, setShowDailyConsumptionSettings] =
    useState(false);

  const dateFilterRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentTypeDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const equipmentSummarySettingsRef = useRef(null);
  const equipmentTypeSettingsRef = useRef(null);
  const dailyConsumptionSettingsRef = useRef(null);

  useOutsideClick(dateFilterRef, () => setShowDateFilter(false));
  useOutsideClick(equipmentDropdownRef, () => setShowEquipmentDropdown(false));
  useOutsideClick(equipmentTypeDropdownRef, () =>
    setShowEquipmentTypeDropdown(false)
  );
  useOutsideClick(projectDropdownRef, () => setShowProjectDropdown(false));
  useOutsideClick(equipmentSummarySettingsRef, () =>
    setShowEquipmentSummarySettings(false)
  );
  useOutsideClick(equipmentTypeSettingsRef, () =>
    setShowEquipmentTypeSettings(false)
  );
  useOutsideClick(dailyConsumptionSettingsRef, () =>
    setShowDailyConsumptionSettings(false)
  );

  // Operation review / edit
  const [selectedEquipmentHistory, setSelectedEquipmentHistory] = useState(null);
  const [editedRows, setEditedRows] = useState({});
  const [localAddedRows, setLocalAddedRows] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [editCell, setEditCell] = useState(null);


  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
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
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
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

  const getAsset = (assetId) => assets.find((a) => a.id === assetId);
  const getStation = (stationId) => stations.find((s) => s.id === stationId);
  const getFueler = (fuelerId) => fuelers.find((f) => f.id === fuelerId);

  const getAssetProjectByDate = (assetId, transactionDate) => {
    const asset = getAsset(assetId);

    const operationDate = parseOperationDate(transactionDate);

    if (!assetId || !operationDate) {
      return asset?.project || "-";
    }

    const history = assetProjectHistory
      .filter((item) => item.assetId === assetId)
      .filter((item) => item.effectiveDate)
      .sort(
        (a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate)
      );

    if (history.length === 0) {
      return asset?.project || "-";
    }

    let project = history[0]?.oldProject || asset?.project || "-";

    history.forEach((item) => {
      const effectiveDate = new Date(item.effectiveDate);

      if (
        !Number.isNaN(effectiveDate.getTime()) &&
        effectiveDate <= operationDate
      ) {
        project = item.newProject || project;
      }
    });

    return project || asset?.project || "-";
  };

  const destinationOptions =
    transactionType === "Direct_Refuel"
      ? assets.map((a) => a.id)
      : transactionType === "Internal_Transfer"
      ? stations.map((s) => s.id)
      : transactionType === "External_Supply"
      ? stations.map((s) => s.id)
      : [];

  const closeForm = () => {
    setShowForm(false);
    setTransactionType("");
    setStationMeterPhoto(null);
    setAssetPhoto(null);
    setAssetMeterPhoto(null);
  };

  const saveNewOperation = (operation) => {
    const newRow = Array(headers.length).fill("");

    if (operationIdIndex !== -1) newRow[operationIdIndex] = operation.operationId;
    if (dateIndex !== -1) newRow[dateIndex] = operation.transactionDate;
    if (typeIndex !== -1) newRow[typeIndex] = operation.transactionType;
    if (sourceIndex !== -1) newRow[sourceIndex] = operation.sourceStation;
    if (fuelerIndex !== -1) newRow[fuelerIndex] = operation.fuelerId;
    if (destinationIndex !== -1) newRow[destinationIndex] = operation.destinationId;
    if (dieselIndex !== -1) newRow[dieselIndex] = String(operation.dieselQuantity);
    if (odometerIndex !== -1) newRow[odometerIndex] = String(operation.odometer || "");

    const requiresApproval =
      isSameText(operation.transactionType, "External_Supply") &&
      shouldExternalSupplyRequireApproval(currentUser);

    if (requiresApproval) {
      const destinationStationForApproval = getStation(operation.destinationId);
      const destinationProjectForApproval = destinationStationForApproval?.project || "";

      submitApprovalRequest({
        type: "operation_external_supply",
        module: "operations",
        title: `External Supply ${operation.operationId} pending approval`,
        details: `${operation.dieselQuantity} L from external supplier to ${operation.destinationId}`,
        payload: {
          operation,
          row: newRow,
          project: destinationProjectForApproval,
          projectName: destinationProjectForApproval,
          approvalRouteStrategy: "project_manager",
          approvalRouteReason: "External Supply approval is routed to the destination station project manager.",
        },
      });
      alert("External Supply saved as Pending Manager Approval.");
      closeForm();
      return;
    }

    setLocalAddedRows((prev) => [...prev, newRow]);
    trackActivity("Add Operation", "operations", `${operation.transactionType} ${operation.operationId} added.`);
    alert("Operation added successfully (local mode).");

    closeForm();
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

  const printTable = (tableId, title = "Table Report") => {
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

  const exportEquipmentSummaryCSV = () => {
    exportRowsToCSV(
      "equipment_consumption_summary",
      [
        "#",
        "Equipment No.",
        "Project",
        "Equipment Type",
        "Last Odometer",
        "Fuel Consumption",
        "Total Cost",
        "Distance",
        "Efficiency",
      ],
      equipmentSummary.map((item, i) => [
        i + 1,
        item.equipmentNo,
        item.project,
        item.equipmentType,
        item.lastOdometer,
        item.fuelConsumption,
        item.totalCost,
        item.distance,
        item.efficiency,
      ])
    );

    setShowEquipmentSummarySettings(false);
  };

  const exportEquipmentTypeSummaryCSV = () => {
    exportRowsToCSV(
      "consumption_by_equipment_type",
      ["#", "Equipment Type", "Qty Liters", "Total Cost"],
      equipmentTypeConsumptionSummary.map((item, i) => [
        i + 1,
        item.equipmentType,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowEquipmentTypeSettings(false);
  };

  const exportDailyConsumptionCSV = () => {
    exportRowsToCSV(
      "daily_consumption",
      ["#", "Date", "Qty Liters", "Total Cost"],
      dailyConsumptionSummary.map((item, i) => [
        i + 1,
        item.dateKey,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowDailyConsumptionSettings(false);
  };

  const formatDateKey = (year, monthIndex, day) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };

  const parseOperationDate = (rawDate) => {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatDisplayDate = (rawDate) => {
    const d = parseOperationDate(rawDate);
    if (!d) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMonthName = (monthIndex) => {
    return new Date(2026, monthIndex, 1).toLocaleString("en-US", {
      month: "short",
    }).toUpperCase();
  };

  const getDaysInMonth = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const moveMonth = (calendar, direction) => {
    if (calendar === "start") {
      let newMonth = startMonth + direction;
      let newYear = startYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setStartMonth(newMonth);
      setStartYear(newYear);
    }

    if (calendar === "end") {
      let newMonth = endMonth + direction;
      let newYear = endYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setEndMonth(newMonth);
      setEndYear(newYear);
    }
  };

  const renderCalendarDays = (year, monthIndex, selectedDate, onSelect) => {
    const days = getDaysInMonth(year, monthIndex);
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-[11px] text-gray-400 py-1">
            {day}
          </div>
        ))}

        {blanks.map((blank) => (
          <div key={`blank-${blank}`} />
        ))}

        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const dateKey = formatDateKey(year, monthIndex, day);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={day}
              onClick={() => onSelect(dateKey)}
              className={`w-8 h-8 rounded-full text-sm transition ${
                isSelected
                  ? "bg-yellow-500 text-black font-bold"
                  : "hover:bg-gray-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };

  const applyEditsToRow = (row, originalIndex) => {
    const updates = editedRows[originalIndex];
    if (!updates) return row;

    const newRow = [...row];

    if (updates.destinationId !== undefined && destinationIndex !== -1) {
      newRow[destinationIndex] = updates.destinationId;
    }

    if (updates.dieselQuantity !== undefined && dieselIndex !== -1) {
      newRow[dieselIndex] = updates.dieselQuantity;
    }

    if (updates.odometer !== undefined && odometerIndex !== -1) {
      newRow[odometerIndex] = updates.odometer;
    }

    if (updates.sourceStation !== undefined && sourceIndex !== -1) {
      newRow[sourceIndex] = updates.sourceStation;
    }

    if (updates.fuelerId !== undefined && fuelerIndex !== -1) {
      newRow[fuelerIndex] = updates.fuelerId;
    }

    return newRow;
  };

  const combinedData = [...data, ...localAddedRows];

  const workingData = combinedData.map((row, originalIndex) => ({
    row: applyEditsToRow(row, originalIndex),
    originalIndex,
  }));

  const directRefuelData = workingData.filter(
    (item) => isSameText(item.row[typeIndex], "Direct_Refuel")
  );

  const dateFilteredData = directRefuelData.filter((item) => {
    const rawDate = item.row[dateIndex];
    const operationDate = parseOperationDate(rawDate);

    if (!operationDate) return false;

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);

      if (operationDate < from) return false;
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      if (operationDate > to) return false;
    }

    return true;
  });

  const equipmentTypeOptions = [
    ...new Set(
      dateFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const project = getAssetProjectByDate(equipmentNo, item.row[dateIndex]);

          if (
            selectedProject.length > 0 &&
            !selectedProject.includes(project)
          ) {
            return false;
          }

          return true;
        })
        .map((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          return asset?.type;
        })
        .filter(Boolean)
    ),
  ];

  const equipmentOptions = [
    ...new Set(
      dateFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          const equipmentType = asset?.type || "";

          if (
            selectedEquipmentType.length > 0 &&
            !selectedEquipmentType.includes(equipmentType)
          ) {
            return false;
          }

          const project = getAssetProjectByDate(equipmentNo, item.row[dateIndex]);

          if (
            selectedProject.length > 0 &&
            !selectedProject.includes(project)
          ) {
            return false;
          }

          return true;
        })
        .map((item) => item.row[destinationIndex])
        .filter(Boolean)
    ),
  ];

  const projectOptions = [
    ...new Set(
      dateFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          const equipmentType = asset?.type || "";

          if (
            selectedEquipmentType.length > 0 &&
            !selectedEquipmentType.includes(equipmentType)
          ) {
            return false;
          }

          if (
            selectedEquipment.length > 0 &&
            !selectedEquipment.includes(equipmentNo)
          ) {
            return false;
          }

          return true;
        })
        .map((item) =>
          getAssetProjectByDate(item.row[destinationIndex], item.row[dateIndex])
        )
        .filter((project) => project && project !== "-")
    ),
  ];

  const visibleEquipmentOptions = equipmentOptions.filter((equipment) =>
    equipment.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const visibleEquipmentTypeOptions = equipmentTypeOptions.filter((type) =>
    type.toLowerCase().includes(equipmentTypeSearch.toLowerCase())
  );

  const visibleProjectOptions = projectOptions.filter((project) =>
    project.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const toggleEquipmentSelection = (equipment) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((item) => item !== equipment)
        : [...prev, equipment]
    );
  };

  const toggleEquipmentTypeSelection = (type) => {
    setSelectedEquipmentType((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    );

    setSelectedEquipment([]);
  };

  const toggleProjectSelection = (project) => {
    setSelectedProject((prev) =>
      prev.includes(project)
        ? prev.filter((item) => item !== project)
        : [...prev, project]
    );
  };

  const getEquipmentFilterLabel = () => {
    if (selectedEquipment.length === 0) return "All Equipment";
    if (selectedEquipment.length === 1) return selectedEquipment[0];
    return `${selectedEquipment.length} Equipment Selected`;
  };

  const getEquipmentTypeFilterLabel = () => {
    if (selectedEquipmentType.length === 0) return "All Equipment Types";
    if (selectedEquipmentType.length === 1) return selectedEquipmentType[0];
    return `${selectedEquipmentType.length} Types Selected`;
  };

  const getProjectFilterLabel = () => {
    if (selectedProject.length === 0) return "All Projects";
    if (selectedProject.length === 1) return selectedProject[0];
    return `${selectedProject.length} Projects Selected`;
  };

  const filteredDirectRefuelData = dateFilteredData.filter((item) => {
    const equipmentNo = item.row[destinationIndex];
    const asset = getAsset(equipmentNo);
    const equipmentType = asset?.type || "";

    if (
      selectedEquipment.length > 0 &&
      !selectedEquipment.includes(equipmentNo)
    )
      return false;

    if (
      selectedEquipmentType.length > 0 &&
      !selectedEquipmentType.includes(equipmentType)
    )
      return false;

    const project = getAssetProjectByDate(equipmentNo, item.row[dateIndex]);

    if (
      selectedProject.length > 0 &&
      !selectedProject.includes(project)
    )
      return false;

    return true;
  });

  const totalDiesel = filteredDirectRefuelData.reduce((sum, item) => {
    return sum + (parseFloat(item.row[dieselIndex]) || 0);
  }, 0);

  const getOperationLiterPrice = (item) => {
    return getLiterPriceByDate
      ? getLiterPriceByDate(item.row[dateIndex])
      : literPrice;
  };

  const totalCost = filteredDirectRefuelData.reduce((sum, item) => {
    const diesel = parseFloat(item.row[dieselIndex]) || 0;
    return sum + diesel * getOperationLiterPrice(item);
  }, 0);

  const dailyData = filteredDirectRefuelData.reduce((acc, item) => {
    const operationDate = parseOperationDate(item.row[dateIndex]);
    const date = operationDate
      ? operationDate.toISOString().split("T")[0]
      : "No Date";

    const diesel = parseFloat(item.row[dieselIndex]) || 0;
    const found = acc.find((d) => d.date === date);

    if (found) found.value += diesel;
    else acc.push({ date, value: diesel });

    return acc;
  }, []);

  const dailyConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const operationDate = parseOperationDate(item.row[dateIndex]);
      const dateKey = operationDate
        ? operationDate.toISOString().split("T")[0]
        : "No Date";

      const diesel = parseFloat(item.row[dieselIndex]) || 0;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[dateKey].qtyLiters += diesel;
      acc[dateKey].totalCost += diesel * getOperationLiterPrice(item);

      return acc;
    }, {})
  ).sort((a, b) => {
    if (a.dateKey === "No Date") return 1;
    if (b.dateKey === "No Date") return -1;
    return new Date(b.dateKey) - new Date(a.dateKey);
  });

  const equipmentTypeConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];
      const asset = getAsset(equipmentNo);
      const equipmentType = asset?.type || "Unknown";

      const diesel = parseFloat(row[dieselIndex]) || 0;

      if (!acc[equipmentType]) {
        acc[equipmentType] = {
          equipmentType,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[equipmentType].qtyLiters += diesel;
      acc[equipmentType].totalCost += diesel * getOperationLiterPrice(item);

      return acc;
    }, {})
  ).sort((a, b) => b.qtyLiters - a.qtyLiters);

  const equipmentSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];

      if (!equipmentNo) return acc;

      const asset = getAsset(equipmentNo);
      const diesel = parseFloat(row[dieselIndex]) || 0;
      const odometer = parseFloat(row[odometerIndex]) || 0;

      if (!acc[equipmentNo]) {
        acc[equipmentNo] = {
          equipmentNo,
          project: getAssetProjectByDate(equipmentNo, row[dateIndex]),
          equipmentType: asset?.type || "-",
          fuelConsumption: 0,
          totalCost: 0,
          firstOdometer: odometer,
          lastOdometer: odometer,
        };
      }

      acc[equipmentNo].fuelConsumption += diesel;
      acc[equipmentNo].totalCost += diesel * getOperationLiterPrice(item);

      if (odometer < acc[equipmentNo].firstOdometer) {
        acc[equipmentNo].firstOdometer = odometer;
      }

      if (odometer > acc[equipmentNo].lastOdometer) {
        acc[equipmentNo].lastOdometer = odometer;
      }

      return acc;
    }, {})
  ).map((item) => {
    const distance = item.lastOdometer - item.firstOdometer;

    const efficiency =
      distance > 0 ? (item.fuelConsumption / distance).toFixed(2) : "-";

    return {
      ...item,
      distance,
      efficiency,
      totalCost: item.totalCost,
    };
  });

  const topEquipmentConsumptionChartData = equipmentSummary
    .slice()
    .sort((a, b) => b.fuelConsumption - a.fuelConsumption)
    .slice(0, 10)
    .map((item) => ({
      equipmentNo: item.equipmentNo,
      qtyLiters: Number(item.fuelConsumption) || 0,
    }));

  const equipmentTypeRatioChartData = equipmentTypeConsumptionSummary.map(
    (item) => ({
      name: item.equipmentType,
      value: Number(item.qtyLiters) || 0,
    })
  );

  const equipmentTypeRatioTotal = equipmentTypeRatioChartData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  const chartColors = [
    "#60a5fa",
    "#f59e0b",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#facc15",
    "#22d3ee",
    "#fb7185",
    "#818cf8",
    "#c084fc",
    "#94a3b8",
    "#f97316",
  ];

  const getEquipmentHistory = (equipmentNo) => {
    return filteredDirectRefuelData
      .filter((item) => item.row[destinationIndex] === equipmentNo)
      .sort((a, b) => {
        const da = parseOperationDate(a.row[dateIndex])?.getTime() || 0;
        const db = parseOperationDate(b.row[dateIndex])?.getTime() || 0;
        return db - da;
      });
  };

  const getLastOdometerForEquipment = (equipmentNo, excludeOriginalIndex = null) => {
    const readings = directRefuelData
      .filter((item) => {
        if (item.originalIndex === excludeOriginalIndex) return false;
        return item.row[destinationIndex] === equipmentNo;
      })
      .map((item) => parseFloat(item.row[odometerIndex]) || 0)
      .filter((value) => value > 0);

    if (readings.length === 0) return 0;

    return Math.max(...readings);
  };

  const openCellEdit = (item, field) => {
    if (!hasPermission("operations", "edit")) return;

    const row = item.row;
    const currentValue =
      field === "equipment"
        ? row[destinationIndex]
        : field === "diesel"
        ? row[dieselIndex]
        : field === "odometer"
        ? row[odometerIndex]
        : field === "station"
        ? row[sourceIndex]
        : field === "fueler"
        ? row[fuelerIndex]
        : "";

    setEditCell({
      originalIndex: item.originalIndex,
      row,
      field,
      oldValue: currentValue || "",
      newValue: currentValue || "",
      reason: "",
      password: "",
    });
  };

  const closeEditCell = () => {
    setEditCell(null);
  };

  const saveCellEdit = () => {
    if (!editCell) return;

    if (!editCell.reason.trim()) {
      alert("Please enter edit reason.");
      return;
    }

    if (!editCell.password.trim()) {
      alert("Please enter admin password.");
      return;
    }

    if (!String(editCell.newValue).trim()) {
      alert("Please enter a new value.");
      return;
    }

    const row = editCell.row;
    const field = editCell.field;

    let updates = {};
    let fieldLabel = "";

    if (field === "equipment") {
      const newEquipment = editCell.newValue;
      const asset = getAsset(newEquipment);

      if (!asset) {
        alert("Please select a valid equipment.");
        return;
      }

      updates.destinationId = newEquipment;
      fieldLabel = "Equipment";
    }

    if (field === "diesel") {
      const qty = Number(editCell.newValue);

      if (!qty || qty <= 0) {
        alert("Diesel quantity must be greater than 0.");
        return;
      }

      updates.dieselQuantity = String(qty);
      fieldLabel = "Diesel Quantity";
    }

    if (field === "odometer") {
      const newOdometer = Number(editCell.newValue);
      const equipmentNo = row[destinationIndex];

      if (!newOdometer || newOdometer <= 0) {
        alert("Please enter a valid odometer.");
        return;
      }

      const lastOdometer = getLastOdometerForEquipment(
        equipmentNo,
        editCell.originalIndex
      );

      if (lastOdometer > 0 && newOdometer < lastOdometer) {
        alert(
          `Odometer cannot be less than last recorded odometer (${formatNumber(
            lastOdometer
          )}).`
        );
        return;
      }

      updates.odometer = String(newOdometer);
      fieldLabel = "Odometer";
    }

    if (field === "station") {
      const newStation = editCell.newValue;
      const station = getStation(newStation);

      if (!station) {
        alert("Please select a valid station.");
        return;
      }

      if (station.status?.trim().toLowerCase() !== "active") {
        alert("Selected station must be active.");
        return;
      }

      updates.sourceStation = newStation;
      fieldLabel = "Source Station";
    }

    if (field === "fueler") {
      const newFueler = editCell.newValue;
      const fueler = getFueler(newFueler);

      if (!fueler) {
        alert("Please select a valid fueler.");
        return;
      }

      const fuelerStatus = fueler.status?.trim().toLowerCase();
      if (fuelerStatus !== "on duty" && fuelerStatus !== "active") {
        alert("Selected fueler must be On Duty.");
        return;
      }

      updates.fuelerId = newFueler;
      fieldLabel = "Fueler";
    }

    setEditedRows((prev) => ({
      ...prev,
      [editCell.originalIndex]: {
        ...prev[editCell.originalIndex],
        ...updates,
      },
    }));

    setAuditLog((prev) => [
      ...prev,
      {
        operationId:
          operationIdIndex !== -1 ? row[operationIdIndex] : editCell.originalIndex + 1,
        rowIndex: editCell.originalIndex,
        field: fieldLabel,
        oldValue: editCell.oldValue,
        newValue: editCell.newValue,
        reason: editCell.reason,
        editedBy: currentUser?.fullName || currentUser?.name || "System",
        editedAt: new Date().toISOString(),
      },
    ]);

    trackActivity("Edit Operation", "operations", `${fieldLabel} changed from ${editCell.oldValue} to ${editCell.newValue}.`);

    closeEditCell();
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="fleet-page-shell relative isolate w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">Diesel Dashboard</h1>
          <p className="text-slate-400 text-sm">Fuel transactions monitoring</p>
          {isOfficerUser(currentUser) && (
            <p className="mt-2 inline-flex rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs text-blue-300 font-semibold">
              Officer access: Operations page is read-only.
            </p>
          )}
        </div>

        {hasPermission("operations", "add") && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            + Add Operation
          </button>
        )}
      </div>

      <div className="relative z-[80] bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl shadow-black/10 backdrop-blur">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:flex 2xl:flex-wrap gap-3 items-center">
          <div ref={dateFilterRef} className="relative z-[90]">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 flex justify-between items-center text-[12px] lg:text-sm"
            >
              <span>
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "End"}`
                  : "Select date range"}
              </span>
              <span>▾</span>
            </button>

            {showDateFilter && (
              <div className="absolute left-0 mt-3 bg-white text-slate-950 border border-slate-200 rounded-2xl z-[9999] w-[min(650px,calc(100vw-2rem))] shadow-2xl overflow-hidden">
                <div className="bg-slate-800 text-white p-3 flex justify-end border-b border-slate-700">
                  <button className="border border-gray-500 px-3 lg:px-4 py-2 rounded-lg text-sm">
                    Auto date range ▾
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 p-3 sm:p-5">
                  <div>
                    <p className="text-sm font-semibold mb-3">Start Date</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("start", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(startMonth)} {startYear}
                      </span>
                      <button onClick={() => moveMonth("start", 1)}>›</button>
                    </div>

                    {renderCalendarDays(startYear, startMonth, fromDate, setFromDate)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">End Date</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("end", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(endMonth)} {endYear}
                      </span>
                      <button onClick={() => moveMonth("end", 1)}>›</button>
                    </div>

                    {renderCalendarDays(endYear, endMonth, toDate, setToDate)}
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t">
                  <button
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg text-sm"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={equipmentDropdownRef} className="relative z-[90]">
            <button
              onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-left text-[12px] lg:text-sm"
            >
              {getEquipmentFilterLabel()} ▾
            </button>

            {showEquipmentDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />

                <button
                  onClick={() => {
                    setSelectedEquipment([]);
                    setEquipmentSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Equipment Selection
                </button>

                <div className="max-h-56 overflow-auto">
                  {visibleEquipmentOptions.map((equipment) => (
                    <button
                      key={equipment}
                      onClick={() => toggleEquipmentSelection(equipment)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipment.includes(equipment)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipment.includes(equipment) ? "✓" : ""}
                      </span>

                      <span>{equipment}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentDropdown(false);
                    setEquipmentSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div ref={equipmentTypeDropdownRef} className="relative z-[90]">
            <button
              onClick={() =>
                setShowEquipmentTypeDropdown(!showEquipmentTypeDropdown)
              }
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-left text-[12px] lg:text-sm"
            >
              {getEquipmentTypeFilterLabel()} ▾
            </button>

            {showEquipmentTypeDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={equipmentTypeSearch}
                  onChange={(e) => setEquipmentTypeSearch(e.target.value)}
                  placeholder="Search type..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />

                <button
                  onClick={() => {
                    setSelectedEquipmentType([]);
                    setSelectedEquipment([]);
                    setEquipmentTypeSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Type Selection
                </button>

                <div className="max-h-56 overflow-auto">
                  {visibleEquipmentTypeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleEquipmentTypeSelection(type)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipmentType.includes(type)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipmentType.includes(type) ? "✓" : ""}
                      </span>

                      <span>{type}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentTypeDropdown(false);
                    setEquipmentTypeSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div ref={projectDropdownRef} className="relative z-[90]">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 lg:px-4 py-2.5 rounded-xl w-full min-w-0 2xl:min-w-[220px] shadow-inner transition-all duration-200 text-left text-[12px] lg:text-sm"
            >
              {getProjectFilterLabel()} ▾
            </button>

            {showProjectDropdown && (
              <div className="absolute mt-2 bg-slate-950 border border-slate-700 rounded-xl p-3 z-[9999] w-[280px] shadow-2xl">
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search project..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mb-2 text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />

                <button
                  onClick={() => {
                    setSelectedProject([]);
                    setProjectSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-amber-300"
                >
                  Clear Project Selection
                </button>

                <div className="max-h-56 overflow-auto">
                  {visibleProjectOptions.map((project) => (
                    <button
                      key={project}
                      onClick={() => toggleProjectSelection(project)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-800 rounded cursor-pointer transition"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedProject.includes(project)
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedProject.includes(project) ? "✓" : ""}
                      </span>

                      <span>{project}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    setProjectSearch("");
                  }}
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg py-2 font-bold transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setSelectedEquipment([]);
              setSelectedEquipmentType([]);
              setSelectedProject([]);
              setEquipmentSearch("");
              setEquipmentTypeSearch("");
              setProjectSearch("");
            }}
            className="w-full 2xl:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/35 px-3 lg:px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="relative z-0 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
        <Card title="Total Quantity (L)" value={formatNumber(totalDiesel)} />

        <Card
          title={`Total Cost (${currency})`}
          value={formatNumber(totalCost)}
        />

        <Card
          title="Direct Refuel Operations"
          value={formatNumber(filteredDirectRefuelData.length)}
        />

        <Card
          title="Active Equipment"
          value={formatNumber(equipmentSummary.length)}
        />
      </div>

      <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden mb-4 border border-slate-700/80">
        <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
          <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
            Equipment Consumption Summary
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-400">
              {equipmentSummary.length} records
            </span>

            <div ref={equipmentSummarySettingsRef} className="relative">
              <button
                onClick={() =>
                  setShowEquipmentSummarySettings(
                    !showEquipmentSummarySettings
                  )
                }
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                ⋮
              </button>

              {showEquipmentSummarySettings && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                  <button
                    onClick={exportEquipmentSummaryCSV}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={() => {
                      printTable(
                        "equipment-summary-table",
                        "Equipment Consumption Summary"
                      );
                      setShowEquipmentSummarySettings(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                  >
                    Print
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-0 w-full max-h-[360px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
          <table
              id="equipment-summary-table"
              className="min-w-[980px] lg:min-w-[1100px] xl:min-w-[1180px] 2xl:min-w-[1350px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
            >
            <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
              <tr>
                <Th>#</Th>
                <Th>Equipment No.</Th>
                <Th>Project</Th>
                <Th>Equipment Type</Th>
                <Th>Last Odometer</Th>
                <Th>Fuel Consumption</Th>
                <Th>Total Cost</Th>
                <Th>Distance</Th>
                <Th>Efficiency</Th>
              </tr>
            </thead>

            <tbody>
              {equipmentSummary.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/70 transition-colors duration-150">
                  <Td>{i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedEquipmentHistory(item)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {item.equipmentNo}
                    </button>
                  </Td>

                  <Td>{item.project}</Td>
                  <Td>{item.equipmentType}</Td>
                  <Td>{formatNumber(item.lastOdometer)}</Td>
                  <Td>{formatNumber(item.fuelConsumption)}</Td>
                  <Td>
                    {formatNumber(item.totalCost)} {currency}
                  </Td>
                  <Td>{formatNumber(item.distance)}</Td>
                  <Td>{item.efficiency}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fleet-chart-grid grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80">
          <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
            <div>
              <h2 className="fleet-chart-title text-base font-extrabold text-amber-300">
                Consumed Quantity per Equipment Type
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Quantity and cost grouped by equipment type
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {equipmentTypeConsumptionSummary.length} types
              </span>

              <div ref={equipmentTypeSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowEquipmentTypeSettings(!showEquipmentTypeSettings)
                  }
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showEquipmentTypeSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                    <button
                      onClick={exportEquipmentTypeSummaryCSV}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "equipment-type-table",
                          "Consumed Quantity per Equipment Type"
                        );
                        setShowEquipmentTypeSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-0 w-full max-h-[320px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
            <table
                id="equipment-type-table"
                className="min-w-[560px] lg:min-w-[620px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
              >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                <tr>
                  <Th>#</Th>
                  <Th>Equipment Type</Th>
                  <Th>Qty Liters</Th>
                  <Th>Total Cost</Th>
                </tr>
              </thead>

              <tbody>
                {equipmentTypeConsumptionSummary.map((item, i) => (
                  <tr key={item.equipmentType} className="hover:bg-slate-800/70 transition-colors duration-150">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.equipmentType}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80">
          <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/60">
            <div>
              <h2 className="fleet-chart-title text-base font-extrabold text-amber-300">
                Daily Consumption
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Daily quantity and cost based on selected filters
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {dailyConsumptionSummary.length} days
              </span>

              <div ref={dailyConsumptionSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowDailyConsumptionSettings(
                      !showDailyConsumptionSettings
                    )
                  }
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showDailyConsumptionSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                    <button
                      onClick={exportDailyConsumptionCSV}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "daily-consumption-table",
                          "Daily Consumption"
                        );
                        setShowDailyConsumptionSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-0 w-full max-h-[320px] overflow-auto overflow-x-auto [scrollbar-color:#334155_transparent]">
            <table
                id="daily-consumption-table"
                className="min-w-[560px] lg:min-w-[620px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm"
              >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                <tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Qty Liters</Th>
                  <Th>Total Cost</Th>
                </tr>
              </thead>

              <tbody>
                {dailyConsumptionSummary.map((item, i) => (
                  <tr key={item.dateKey} className="hover:bg-slate-800/70 transition-colors duration-150">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.dateKey}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fleet-chart-card relative z-0 bg-slate-900/80 p-3 sm:p-4 rounded-2xl mb-4 border border-slate-700/80 shadow-xl shadow-black/10 overflow-hidden">
        <h3 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
          Consumed Quantity Over Time
        </h3>

        <div className="h-[260px] sm:h-[300px] xl:h-[340px]">
          <ChartFrame height={260}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="#ccc" />
            <Tooltip />

            <Line type="monotone" dataKey="value" stroke="#60a5fa" />
          </LineChart>
          </ChartFrame>
        </div>
      </div>

      <div className="fleet-chart-grid grid grid-cols-1 xl:grid-cols-2 gap-4 2xl:gap-5 mb-5">
        <div className="fleet-chart-card relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80 p-3 lg:p-4">
          <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
            Consumed Quantity Per Equipment No.
          </h2>

          <div className="h-[300px] sm:h-[340px] xl:h-[360px]">
            <ChartFrame height={260}>
              <BarChart data={topEquipmentConsumptionChartData}>
              <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
            </BarChart>
            </ChartFrame>
          </div>
        </div>

        <div className="fleet-chart-card relative z-0 bg-slate-900/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden border border-slate-700/80 p-3 lg:p-4">
          <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
            Consumed Quantity Ratio per Asset Type
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_230px] gap-4 items-center">
            <div className="h-[300px] sm:h-[340px] xl:h-[360px]">
              <ChartFrame height={260}>
                <PieChart>
                <Pie
  data={equipmentTypeRatioChartData}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  innerRadius={55}
  outerRadius={85}
  paddingAngle={2}
  labelLine={false}
  label={false}
>
                  {equipmentTypeRatioChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name) => {
                    const percentage =
                      equipmentTypeRatioTotal > 0
                        ? ((Number(value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                        : "0.0";

                    return [`${percentage}%`, name];
                  }}
                />
              </PieChart>
              </ChartFrame>
            </div>

            <div className="max-h-[310px] overflow-y-auto pr-2 xl:border-l border-gray-700 xl:pl-3">
              {equipmentTypeRatioChartData.map((item, index) => {
                const percentage =
                  equipmentTypeRatioTotal > 0
                    ? ((Number(item.value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gray-700/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{
                          backgroundColor: chartColors[index % chartColors.length],
                        }}
                      />

                      <span className="truncate text-gray-200">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-yellow-300 shrink-0">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedEquipmentHistory && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-slate-950 text-white w-full max-w-[min(1150px,calc(100vw-2rem))] max-h-[92vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                  Equipment Operations History
                </h2>
                <p className="text-gray-400 mt-1">
                  Equipment:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedEquipmentHistory.equipmentNo}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedEquipmentHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-3 sm:p-5 overflow-auto max-h-[68vh]">
              <table className="min-w-[850px] lg:min-w-[980px] xl:min-w-[1100px] 2xl:min-w-[1180px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                  <tr>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Operation ID</Th>
                    <Th>Project</Th>
                    <Th>Station</Th>
                    <Th>Fueler</Th>
                    <Th>Equipment</Th>
                    <Th>Liters</Th>
                    <Th>Odometer</Th>
                  </tr>
                </thead>

                <tbody>
                  {getEquipmentHistory(selectedEquipmentHistory.equipmentNo).map(
                    (item, i) => {
                      const row = item.row;

                      return (
                        <tr
                          key={item.originalIndex}
                          className="hover:bg-slate-800/70 transition-colors duration-150"
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex]
                              : item.originalIndex + 1}
                          </Td>

                          <Td>
                            {getAssetProjectByDate(
                              row[destinationIndex],
                              row[dateIndex]
                            )}
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "station")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[sourceIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "fueler")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[fuelerIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "equipment")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[destinationIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "diesel")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[dieselIndex])}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "odometer")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[odometerIndex])}
                            </button>
                          </Td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>

              {auditLog.length > 0 && (
                <div className="mt-6 bg-gray-950 border border-gray-700 rounded-2xl p-4">
                  <h3 className="text-yellow-400 font-semibold mb-3">
                    Local Audit Log
                  </h3>

                  <div className="max-h-44 overflow-auto">
                    {auditLog
                      .slice()
                      .reverse()
                      .map((log, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-300 border-b border-gray-800 py-2"
                        >
                          <span className="text-blue-300">
                            Operation {log.operationId}
                          </span>{" "}
                          | {log.field}:{" "}
                          <span className="text-red-300">{log.oldValue}</span>{" "}
                          →{" "}
                          <span className="text-green-300">{log.newValue}</span>{" "}
                          | Reason: {log.reason} | By: {log.editedBy}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editCell && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10010] p-3">
          <div className="bg-white text-black w-[min(560px,calc(100vw-2rem))] rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">
                Edit{" "}
                {editCell.field === "equipment"
                  ? "Equipment"
                  : editCell.field === "diesel"
                  ? "Diesel Quantity"
                  : editCell.field === "odometer"
                  ? "Odometer"
                  : editCell.field === "station"
                  ? "Source Station"
                  : "Fueler"}
              </h2>

              <button
                onClick={closeEditCell}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Old Value</p>
              <p className="text-xl font-bold">{editCell.oldValue || "-"}</p>
            </div>

            <div className="mb-4">
              <label className="font-medium text-gray-700">New Value</label>

              {editCell.field === "equipment" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Equipment</option>
                  {assets
                    .filter((asset) => asset.status?.toLowerCase() !== "retired")
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.id} - {asset.type || "-"}
                      </option>
                    ))}
                </select>
              ) : editCell.field === "station" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Station</option>
                  {stations
                    .filter((station) => !isSameText(station.id, "External_Supply"))
                    .map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.id} - {station.status || "-"}
                      </option>
                    ))}
                </select>
              ) : editCell.field === "fueler" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Fueler</option>
                  {fuelers
                    .filter((fueler) => {
                      const status = String(fueler.status || "On Duty").trim().toLowerCase();
                      return status === "on duty" || status === "active";
                    })
                    .map((fueler) => (
                      <option key={fueler.id} value={fueler.id}>
                        {fueler.id} - {fueler.name || "-"} - {fueler.status || "On Duty"}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                  placeholder="Enter new value"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="font-medium text-gray-700">Edit Reason</label>
              <textarea
                value={editCell.reason}
                onChange={(e) =>
                  setEditCell({ ...editCell, reason: e.target.value })
                }
                className="border rounded-lg p-3 w-full mt-2 h-24"
                placeholder="Enter correction reason..."
              />
            </div>

            <div className="mb-5">
              <label className="font-medium text-gray-700">Admin Password</label>
              <input
                type="password"
                value={editCell.password}
                onChange={(e) =>
                  setEditCell({ ...editCell, password: e.target.value })
                }
                className="border rounded-lg p-3 w-full mt-2"
                placeholder="Enter admin password"
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={closeEditCell}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={saveCellEdit}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <AddOperationModal
          closeForm={closeForm}
          fuelers={fuelers}
          stations={stations}
          allStations={allStations}
          assets={assets}
          projects={projects}
          currentUser={currentUser}
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          stationMeterPhoto={stationMeterPhoto}
          setStationMeterPhoto={setStationMeterPhoto}
          assetPhoto={assetPhoto}
          setAssetPhoto={setAssetPhoto}
          assetMeterPhoto={assetMeterPhoto}
          setAssetMeterPhoto={setAssetMeterPhoto}
          getLastOdometerForEquipment={getLastOdometerForEquipment}
          onSaveOperation={saveNewOperation}
        />
      )}
      </div>
    </div>
  );
}
function AssetsPage({
  assets,
  projects = [],
  transferProjects = projects,
  showToast,
  data = [],
  headers = [],
  assetProjectHistory = [],
  setAssetProjectHistory,
  assetOdometerHistory = [],
  setAssetOdometerHistory,
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

const [showAssetSettings, setShowAssetSettings] = useState(false);
const [showExportMenu, setShowExportMenu] = useState(false);
const assetSettingsRef = useRef(null);

useOutsideClick(assetSettingsRef, () => {
  setShowAssetSettings(false);
  setShowExportMenu(false);
});

  const [selectedAsset, setSelectedAsset] = useState(null);

  const [localAssetUpdates, setLocalAssetUpdates] = useState({});

  const [projectTargetAsset, setProjectTargetAsset] = useState(null);
  const [selectedProjectValue, setSelectedProjectValue] = useState("");
  const [projectEffectiveDate, setProjectEffectiveDate] = useState("");
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  const [showProjectPassword, setShowProjectPassword] = useState(false);
  const [projectPassword, setProjectPassword] = useState("");

  const [deleteTargetAsset, setDeleteTargetAsset] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const [odometerTargetAsset, setOdometerTargetAsset] = useState(null);
  const [oldOdometerBeforeReset, setOldOdometerBeforeReset] = useState("");
  const [newOdometer, setNewOdometer] = useState("");
  const [odometerEffectiveDate, setOdometerEffectiveDate] = useState("");
  const [odometerReason, setOdometerReason] = useState("");
  const [showOdometerConfirm, setShowOdometerConfirm] = useState(false);
  const [showOdometerPassword, setShowOdometerPassword] = useState(false);
  const [odometerPassword, setOdometerPassword] = useState("");

  const displayAssets = assets.map((asset) => ({
    ...asset,
    status: localAssetUpdates[asset.id]?.status || asset.status,
    project: localAssetUpdates[asset.id]?.project || asset.project,
    odometer: localAssetUpdates[asset.id]?.odometer ?? asset.odometer,
  }));

  const activeAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "active"
  );

  const inactiveAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "inactive"
  );

  const retiredAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "retired"
  );

  const visibleAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() !== "retired"
  );

  const projectOptions =
    transferProjects.length > 0
      ? transferProjects.map((p) => p.name || p.id).filter(Boolean)
      : [...new Set(visibleAssets.map((a) => a.project).filter(Boolean))];

  const filteredAssets = visibleAssets.filter((asset) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const searchableText = [
      asset.id,
      asset.project,
      asset.type,
      asset.category,
      asset.odometer,
      asset.fuelTank,
      asset.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);
  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);

  const consumptionByAsset = data.reduce((acc, row) => {
    if (typeIndex === -1 || dieselIndex === -1 || destinationIndex === -1) {
      return acc;
    }

    if (!isSameText(row[typeIndex], "Direct_Refuel")) {
      return acc;
    }

    const assetId = row[destinationIndex];
    const dieselQty = parseFloat(row[dieselIndex]) || 0;

    if (!assetId) {
      return acc;
    }

    acc[assetId] = (acc[assetId] || 0) + dieselQty;
    return acc;
  }, {});

  const assetConsumptionChartData = filteredAssets
    .map((asset) => ({
      equipmentNo: asset.id,
      qtyLiters: Number(consumptionByAsset[asset.id]) || 0,
    }))
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const assetConsumptionChartWidth = Math.max(
    assetConsumptionChartData.length * 85,
    900
  );

  const changeAssetStatus = (asset) => {
    const currentStatus = asset.status?.trim().toLowerCase();
    const newStatus = currentStatus === "active" ? "Inactive" : "Active";

    const confirmed = confirm(
      `Are you sure you want to change ${asset.id} status to ${newStatus}?`
    );

    if (!confirmed) return;

    setLocalAssetUpdates((prev) => ({
      ...prev,
      [asset.id]: {
        ...prev[asset.id],
        status: newStatus,
      },
    }));

    trackActivity?.("Change Asset Status", "assets", `${asset.id} status changed to ${newStatus}.`);
    showToast
      ? showToast("success", `Asset status changed to ${newStatus}.`)
      : alert(`Asset status changed to ${newStatus}.`);
  };

  const openProjectChange = (asset) => {
    setProjectTargetAsset(asset);
    setSelectedProjectValue(asset.project || "");
    setProjectEffectiveDate("");
  };

  const resetProjectWorkflow = () => {
    setProjectTargetAsset(null);
    setSelectedProjectValue("");
    setShowProjectConfirm(false);
    setShowProjectPassword(false);
    setProjectPassword("");
  };

  const proceedProjectConfirm = () => {
    if (!selectedProjectValue) {
      showToast
        ? showToast("warning", "Please select a project.")
        : alert("Please select a project.");
      return;
    }

    if (!projectEffectiveDate) {
      showToast
        ? showToast("warning", "Please select project effective date.")
        : alert("Please select project effective date.");
      return;
    }

    setShowProjectConfirm(true);
  };

  const proceedProjectPassword = () => {
    setShowProjectConfirm(false);
    setShowProjectPassword(true);
  };

  const confirmProjectUpdate = () => {
    if (!projectPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    const projectHistoryRecord = {
      assetId: projectTargetAsset.id,
      oldProject: projectTargetAsset.project || "-",
      newProject: selectedProjectValue,
      effectiveDate: projectEffectiveDate,
      changedBy: "Amr",
      changedAt: new Date().toISOString(),
      status: "Local",
    };

    if (setAssetProjectHistory) {
      setAssetProjectHistory((prev) => [...prev, projectHistoryRecord]);
    }

    if (isOfficerUser(currentUser)) {
      submitApprovalRequest({
        type: "master_data_change",
        module: "assets",
        title: `Asset ${projectTargetAsset.id} project change`,
        details: `Project change from ${projectTargetAsset.project || "-"} to ${selectedProjectValue}`,
        payload: { entity: "asset", id: projectTargetAsset.id, field: "project", oldValue: projectTargetAsset.project, newValue: selectedProjectValue },
      });
      resetProjectWorkflow();
      return;
    }

    setLocalAssetUpdates((prev) => ({
      ...prev,
      [projectTargetAsset.id]: {
        ...prev[projectTargetAsset.id],
        project: selectedProjectValue,
      },
    }));

    setProjectTargetAsset(null);
    setSelectedProjectValue("");
    setProjectEffectiveDate("");
    setShowProjectConfirm(false);
    setShowProjectPassword(false);
    setProjectPassword("");

    showToast
      ? showToast("success", "Asset project updated successfully.")
      : alert("Asset project updated successfully.");
  };

  const proceedDeleteConfirm = () => {
    if (!deleteReason) {
      showToast
        ? showToast("warning", "Please enter deletion reason.")
        : alert("Please enter deletion reason.");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const proceedDeletePassword = () => {
    setShowDeleteConfirm(false);
    setShowDeletePassword(true);
  };

  const confirmDeleteRequest = () => {
    if (!deletePassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    submitApprovalRequest({
      type: "master_data_change",
      module: "assets",
      title: `Asset ${deleteTargetAsset?.id} deletion request`,
      details: deleteReason,
      payload: { entity: "asset", action: "delete", id: deleteTargetAsset?.id, reason: deleteReason },
    });

    setDeleteTargetAsset(null);
    setDeleteReason("");
    setDeletePassword("");
    setShowDeleteConfirm(false);
    setShowDeletePassword(false);

    showToast
      ? showToast(
          "success",
          "Asset deletion request submitted for manager approval."
        )
      : alert("Asset deletion request submitted for manager approval.");
  };

  const proceedOdometerConfirm = () => {
    const oldReading = Number(oldOdometerBeforeReset);
    const newReading = Number(newOdometer);

    if (oldOdometerBeforeReset === "" || Number.isNaN(oldReading) || oldReading < 0) {
      showToast
        ? showToast("warning", "Please enter valid old odometer before reset.")
        : alert("Please enter valid old odometer before reset.");
      return;
    }

    if (newOdometer === "" || Number.isNaN(newReading) || newReading < 0) {
      showToast
        ? showToast("warning", "Please enter valid new odometer after reset.")
        : alert("Please enter valid new odometer after reset.");
      return;
    }

    if (!odometerEffectiveDate) {
      showToast
        ? showToast("warning", "Please select odometer reset effective date.")
        : alert("Please select odometer reset effective date.");
      return;
    }

    if (!odometerReason) {
      showToast
        ? showToast("warning", "Please enter reset reason.")
        : alert("Please enter reset reason.");
      return;
    }

    setShowOdometerConfirm(true);
  };

  const proceedOdometerPassword = () => {
    setShowOdometerConfirm(false);
    setShowOdometerPassword(true);
  };

  const confirmOdometerRequest = () => {
    if (!odometerPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    const oldReading = Number(oldOdometerBeforeReset) || 0;
    const newReading = Number(newOdometer) || 0;

    const odometerHistoryRecord = {
      assetId: odometerTargetAsset.id,
      oldOdometerBeforeReset: oldReading,
      newOdometerAfterReset: newReading,
      effectiveDate: odometerEffectiveDate,
      odometerOffset: oldReading,
      actualOdometerAfterReset: oldReading + newReading,
      reason: odometerReason,
      requestedBy: "Amr",
      requestedAt: new Date().toISOString(),
      status: "Pending Approval",
    };

    if (setAssetOdometerHistory) {
      setAssetOdometerHistory((prev) => [...prev, odometerHistoryRecord]);
    }

    submitApprovalRequest({
      type: "master_data_change",
      module: "assets",
      title: `Asset ${odometerTargetAsset?.id} odometer reset`,
      details: odometerReason,
      payload: { entity: "asset", action: "odometer_reset", values: odometerHistoryRecord },
    });

    setOdometerTargetAsset(null);
    setOldOdometerBeforeReset("");
    setNewOdometer("");
    setOdometerEffectiveDate("");
    setOdometerReason("");
    setOdometerPassword("");
    setShowOdometerConfirm(false);
    setShowOdometerPassword(false);

    showToast
      ? showToast(
          "success",
          "Odometer reset request submitted for manager approval."
        )
      : alert("Odometer reset request submitted for manager approval.");
  };

const exportAssetsToCSV = () => {
  const csvHeaders = [
    "Asset ID",
    "Project",
    "Asset Type",
    "Category",
    "Current Odometer",
    "Fuel Tank Capacity",
    "Status",
  ];

  const csvRows = filteredAssets.map((asset) => [
    asset.id || "",
    asset.project || "",
    asset.type || "",
    asset.category || "",
    asset.odometer || "",
    asset.fuelTank || "",
    asset.status || "",
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const today = new Date().toISOString().split("T")[0];

  link.href = url;
  link.download = `assets_export_${today}.csv`;
  link.click();

  URL.revokeObjectURL(url);

  showToast
    ? showToast("success", "Assets data exported successfully.")
    : alert("Assets data exported successfully.");
};

const exportAssetsToPDF = () => {
  showToast
    ? showToast("warning", "PDF export will be added in the next step.")
    : alert("PDF export will be added in the next step.");
};

const escapePrintValue = (value) => {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const printAssetsReport = () => {
  const reportDate = new Date().toLocaleString();

  const tableRowsHtml = filteredAssets
    .map(
      (asset, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapePrintValue(asset.id)}</td>
          <td>${escapePrintValue(asset.project)}</td>
          <td>${escapePrintValue(asset.type)}</td>
          <td>${escapePrintValue(asset.category)}</td>
          <td>${escapePrintValue(formatNumber(asset.odometer))}</td>
          <td>${escapePrintValue(formatNumber(asset.fuelTank))} L</td>
          <td>${escapePrintValue(asset.status)}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "", "width=1400,height=900");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Assets Report</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 10px;
          }

          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }

          h2 {
            margin: 26px 0 12px;
            font-size: 18px;
          }

          .meta {
            margin-bottom: 18px;
            font-size: 12px;
            color: #555;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th, td {
            border: 1px solid #bbb;
            padding: 6px 8px;
            text-align: left;
          }

          th {
            background: #f0f0f0;
            font-weight: bold;
          }

          tr:nth-child(even) {
            background: #fafafa;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>

      <body>
        <h1>Assets Report</h1>
        <div class="meta">
          Generated at: ${reportDate} | Total Assets: ${filteredAssets.length}
        </div>

        <h2>Assets List</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Asset ID</th>
              <th>Project</th>
              <th>Asset Type</th>
              <th>Category</th>
              <th>Current Odometer</th>
              <th>Fuel Tank Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex justify-between items-center mb-4 gap-4">
  <div>
    <h1 className="text-xl sm:text-2xl font-bold">Assets</h1>
    <p className="text-gray-400">Fleet master data</p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <input
      type="text"
      placeholder="Search by asset ID, type, project, status..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white w-[380px] focus:outline-none focus:border-yellow-400"
    />

    <div ref={assetSettingsRef} className="relative">
      <button
        onClick={() => setShowAssetSettings(!showAssetSettings)}
        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 lg:px-4 py-2 lg:py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
      >
        ⋮
      </button>

      {showAssetSettings && (
        <div className="absolute right-0 mt-3 w-56 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-40">
          <button
            onClick={() => {
              setShowAssetSettings(false);
              setShowForm(true);
            }}
            className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white"
          >
            <span className="text-green-400 text-lg">＋</span>
            Add Asset
          </button>

          <button
            onClick={() => {
              setShowAssetSettings(false);
              setShowExportMenu(false);
              printAssetsReport();
            }}
            className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white border-t border-gray-700"
          >
            <span className="text-yellow-400 text-lg">⎙</span>
            Print Assets Report
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center justify-between w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white border-t border-gray-700"
          >
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-blue-400 text-lg">⇩</span>
              Export
            </span>

            <span className="text-gray-400">›</span>
          </button>

          {showExportMenu && (
            <div className="bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToCSV();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                Export CSV
              </button>

              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToPDF();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
        <Card title="Total Assets" value={visibleAssets.length} />
        <Card title="Active Assets" value={activeAssets.length} />
        <Card title="Inactive Assets" value={inactiveAssets.length} />
        <Card title="Retired Assets" value={retiredAssets.length} />
      </div>


      <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-4 border border-slate-700/70">
        <div className="p-3 sm:p-4 border-b border-slate-700/80 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between sm:items-center bg-slate-900/70">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Assets List
            </h2>
            <p className="text-sm text-slate-400">Fleet operational assets</p>
          </div>

          <span className="text-sm text-slate-400">
            {filteredAssets.length} assets
          </span>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-b-2xl">
          <table className="min-w-[760px] lg:min-w-[980px] w-full border-separate border-spacing-0 text-[11px] sm:text-xs lg:text-sm">
            <thead className="bg-slate-800 sticky top-0 z-[1] shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
              <tr>
                <Th>#</Th>
                <Th>Asset ID</Th>
                <Th>Project</Th>
                <Th>Asset Type</Th>
                <Th>Category</Th>
                <Th>Current Odometer</Th>
                <Th>Fuel Tank Capacity</Th>
                <Th>Status</Th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset, i) => (
                <tr
                  key={asset.id}
                  className="odd:bg-slate-900/20 even:bg-slate-800/20 hover:bg-amber-400/10 transition-colors duration-200"
                >
                  <Td>{i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {asset.id}
                    </button>
                  </Td>

                  <Td>
                    <button
                      onClick={() => openProjectChange(asset)}
                      className="hover:text-yellow-400 transition cursor-pointer"
                    >
                      {asset.project || "-"}
                    </button>
                  </Td>

                  <Td>{asset.type || "-"}</Td>
                  <Td>{asset.category || "-"}</Td>
                  <Td>{formatNumber(asset.odometer)}</Td>
                  <Td>{formatNumber(asset.fuelTank)} L</Td>

                  <Td>
                    <button
                      onClick={() => changeAssetStatus(asset)}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={asset.status} />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <h2 className="fleet-chart-title text-base sm:text-lg font-extrabold text-amber-300 mb-3">
          Consumed Quantity Per Equipment No.
        </h2>

        <div className="overflow-x-auto overflow-y-hidden pb-2">
          <div style={{ width: `${assetConsumptionChartWidth}px`, height: "340px" }}>
            <ChartFrame height={260}>
              <BarChart data={assetConsumptionChartData}>
                <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} minTickGap={16} />
                <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
              </BarChart>
            </ChartFrame>
          </div>
        </div>
      </div>

      {showForm && (
        <GenericModal
          title="Add Asset"
          closeForm={() => setShowForm(false)}
          saveText="Save Asset"
        >
          <Field label="Asset ID" placeholder="1-316" />
          <Field label="Project" placeholder="Project name / ID" />
          <Field label="Asset Type" placeholder="Excavator / Truck / Loader" />
          <Field label="Category" placeholder="Heavy Equipment" />
          <Field label="Current Odometer" placeholder="Current reading" />
          <Field label="Fuel Tank Capacity" placeholder="Liters" />

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-medium text-gray-700">Status</label>
            <select className="col-span-2 border rounded-lg p-2">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </GenericModal>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-gray-800 text-white w-[560px] rounded-3xl shadow-2xl border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold text-blue-200">
                    {selectedAsset.id}
                  </h2>

                  <button
                    onClick={() => setDeleteTargetAsset(selectedAsset)}
                    className="text-gray-400 hover:text-red-400 transition text-lg cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>

                <p className="text-gray-400 mt-1">Asset Details</p>
              </div>

              <button
                onClick={() => setSelectedAsset(null)}
                className="text-gray-400 hover:text-red-400 text-2xl transition"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs text-gray-400">Project</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedAsset.project || "-"}
                  </p>
                </div>

                <StatusBadge status={selectedAsset.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                <div>
                  <p className="text-xs text-gray-400">Asset Type</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.type || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.category || "-"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">Current Odometer</p>

                    <button
                      onClick={() => {
                        setOdometerTargetAsset(selectedAsset);
                        setOldOdometerBeforeReset(selectedAsset.odometer || "");
                        setNewOdometer("0");
                        setOdometerEffectiveDate("");
                        setOdometerReason("");
                      }}
                      className="text-gray-400 hover:text-yellow-400 transition text-sm cursor-pointer"
                    >
                      ✏️
                    </button>
                  </div>

                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(selectedAsset.odometer)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Fuel Tank Capacity</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(selectedAsset.fuelTank)} L
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                onClick={() => setSelectedAsset(null)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-900 text-white px-6 py-2 rounded-xl text-sm shadow-[0_3px_0_#111827] active:shadow-none active:translate-y-[3px] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {projectTargetAsset && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">Change Project</h2>

            <p className="text-sm text-gray-500 mb-4">
              Asset: <strong>{projectTargetAsset.id}</strong>
            </p>

            <select
              value={selectedProjectValue}
              onChange={(e) => setSelectedProjectValue(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
            >
              <option value="">Select Project</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Effective Date
            </label>
            <input
              type="date"
              value={projectEffectiveDate}
              onChange={(e) => setProjectEffectiveDate(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
            />

            <p className="text-xs text-gray-500 mb-5 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              Operations before this date will remain assigned to the old project. Operations on or after this date will be assigned to the new project when project history is connected.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setProjectTargetAsset(null);
                  setSelectedProjectValue("");
                  setProjectEffectiveDate("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectConfirm}
                className="bg-gray-800 text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectConfirm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirm Project Change
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>Asset:</strong> {projectTargetAsset.id}
              </p>
              <p>
                <strong>Old Project:</strong> {projectTargetAsset.project || "-"}
              </p>
              <p>
                <strong>New Project:</strong> {selectedProjectValue}
              </p>
              <p>
                <strong>Effective Date:</strong> {projectEffectiveDate}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowProjectConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectPassword && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={projectPassword}
              onChange={(e) => setProjectPassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProjectPassword(false);
                  setProjectPassword("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmProjectUpdate}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-red-600">
              Delete Asset
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{deleteTargetAsset.id}</strong>
            </p>

            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter deletion reason..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetAsset(null);
                  setDeleteReason("");
                }}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeleteConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Asset Deletion
            </h2>

            <p className="mb-6">
              Are you sure you want to submit deletion request for:
              <strong> {deleteTargetAsset?.id}</strong> ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeletePassword}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePassword && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter admin password"
              className="border rounded-lg p-3 w-full mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeletePassword(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteRequest}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}

      {odometerTargetAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-yellow-600">
              Odometer Reset
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{odometerTargetAsset.id}</strong>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Odometer Before Reset
            </label>
            <input
              type="number"
              value={oldOdometerBeforeReset}
              onChange={(e) => setOldOdometerBeforeReset(e.target.value)}
              placeholder="Reading before computer / meter replacement"
              className="border rounded-xl p-3 w-full mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Odometer After Reset
            </label>
            <input
              type="number"
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              placeholder="Usually 0 after reset"
              className="border rounded-xl p-3 w-full mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Effective Date
            </label>
            <input
              type="date"
              value={odometerEffectiveDate}
              onChange={(e) => setOdometerEffectiveDate(e.target.value)}
              className="border rounded-xl p-3 w-full mb-4"
            />

            <textarea
              value={odometerReason}
              onChange={(e) => setOdometerReason(e.target.value)}
              placeholder="Enter reset reason, e.g. computer / meter replaced..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOdometerTargetAsset(null);
                  setOldOdometerBeforeReset("");
                  setNewOdometer("");
                  setOdometerEffectiveDate("");
                  setOdometerReason("");
                }}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedOdometerConfirm}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Odometer Reset
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-6 space-y-1">
              <p>
                <strong>Asset:</strong> {odometerTargetAsset?.id}
              </p>
              <p>
                <strong>Old Odometer Before Reset:</strong> {formatNumber(oldOdometerBeforeReset)}
              </p>
              <p>
                <strong>New Odometer After Reset:</strong> {formatNumber(newOdometer)}
              </p>
              <p>
                <strong>Effective Date:</strong> {odometerEffectiveDate}
              </p>
              <p>
                <strong>Actual Odometer After Reset:</strong> {formatNumber((Number(oldOdometerBeforeReset) || 0) + (Number(newOdometer) || 0))}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerConfirm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedOdometerPassword}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerPassword && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={odometerPassword}
              onChange={(e) => setOdometerPassword(e.target.value)}
              placeholder="Enter admin password"
              className="border rounded-lg p-3 w-full mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerPassword(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmOdometerRequest}
                className="bg-yellow-500 text-black px-3 lg:px-4 py-2 rounded-lg"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
function StationsPage({
  stations,
  projects = [],
  transferProjects = projects,
  data,
  headers,
  showToast,
  literPrice,
  priceHistory = [],
  setPriceHistory,
  getLiterPriceByDate,
  currency,
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
}) {
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState("All");
  const stationSettingsRef = useRef(null);

  useOutsideClick(stationSettingsRef, () => {
    setShowSettings(false);
    setShowExportMenu(false);
  });

  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedStationHistory, setSelectedStationHistory] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [localAdjustments, setLocalAdjustments] = useState([]);

  const [showLiterPrice, setShowLiterPrice] = useState(false);
  const [newLiterPrice, setNewLiterPrice] = useState("");
  const [effectiveDatetime, setEffectiveDatetime] = useState("");
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [showPricePassword, setShowPricePassword] = useState(false);
  const [pricePassword, setPricePassword] = useState("");


  const countryFlag = "🇸🇦";

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
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
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
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

  const getStationOperations = (stationId) => {
    return data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter((item) => {
        const row = item.row;
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const destination = row[destinationIndex];

        return (
          (isSameText(type, "Direct_Refuel") &&
            isSameText(source, stationId)) ||
          (isSameText(type, "Internal_Transfer") &&
            (isSameText(source, stationId) ||
              isSameText(destination, stationId))) ||
          (isSameText(type, "External_Supply") &&
            isSameText(destination, stationId))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.row[dateIndex]).getTime() || 0;
        const dateB = new Date(b.row[dateIndex]).getTime() || 0;
        return dateB - dateA;
      });
  };

  const getStationOperationDirection = (row, stationId) => {
    const type = row[typeIndex];
    const source = row[sourceIndex];
    const destination = row[destinationIndex];

    if (isSameText(type, "Direct_Refuel") && isSameText(source, stationId)) {
      return "Out";
    }

    if (isSameText(type, "Internal_Transfer") && isSameText(source, stationId)) {
      return "Out";
    }

    if (
      isSameText(type, "Internal_Transfer") &&
      isSameText(destination, stationId)
    ) {
      return "In";
    }

    if (isSameText(type, "External_Supply") && isSameText(destination, stationId)) {
      return "In";
    }

    return "-";
  };

  const calculateStationBalance = (station) => {
    let currentStock = station.openingBalance || 0;

    data.forEach((row) => {
      const type = row[typeIndex];
      const source = row[sourceIndex];
      const destination = row[destinationIndex];
      const qty = parseFloat(row[dieselIndex]) || 0;

      if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(destination, station.id)) currentStock += qty;
      if (isSameText(type, "External_Supply") && isSameText(destination, station.id)) currentStock += qty;
    });

    localAdjustments.forEach((adj) => {
      if (isSameText(adj.stationId, station.id)) {
        currentStock += adj.adjustmentQty;
      }
    });

    return currentStock;
  };

  const realStations = stations.filter(
    (station) => !isSameText(station.id, "External_Supply")
  );

  const stationsWithBalance = realStations.map((station) => {
    const currentStock = calculateStationBalance(station);

    const percentage =
      station.capacity > 0
        ? Math.max(0, Math.min(100, (currentStock / station.capacity) * 100))
        : 0;

    return {
      ...station,
      currentStock,
      percentage,
    };
  });

  const projectOptions = [
    "All",
    ...new Set(realStations.map((station) => station.project).filter(Boolean)),
  ];

  const transferProjectOptions =
    transferProjects.length > 0
      ? transferProjects.map((project) => project.name || project.id).filter(Boolean)
      : [...new Set(realStations.map((station) => station.project).filter(Boolean))];

  const filteredStations =
    selectedProject === "All"
      ? stationsWithBalance
      : stationsWithBalance.filter((station) => station.project === selectedProject);

  const stationConsumptionChartData = filteredStations
    .map((station) => {
      const totalConsumed = data.reduce((sum, row) => {
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const qty = parseFloat(row[dieselIndex]) || 0;

        if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) {
          return sum + qty;
        }

        return sum;
      }, 0);

      return {
        stationId: station.id,
        qtyLiters: totalConsumed,
      };
    })
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const openInventoryAdjustment = () => {
    setShowSettings(false);
    setShowExportMenu(false);
    setSelectedStation(null);
    setShowConfirm(true);
  };

  const proceedToPassword = () => {
    if (!selectedStation) {
      showToast
        ? showToast("warning", "Please select a station first.")
        : alert("Please select a station first.");
      return;
    }

    setShowConfirm(false);
    setShowPassword(true);
  };

  const confirmZeroBalance = () => {
    if (!adminPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    const adjustmentQty = -selectedStation.currentStock;

    setLocalAdjustments([
      ...localAdjustments,
      {
        stationId: selectedStation.id,
        adjustmentQty,
        reason: "Inventory Adjustment",
        createdBy: currentUser?.fullName || currentUser?.name || "System",
        createdAt: new Date().toISOString(),
      },
    ]);

    setShowPassword(false);
    setSelectedStation(null);
    setAdminPassword("");

    showToast
      ? showToast("success", "Inventory Adjustment completed successfully.")
      : alert("Inventory Adjustment completed successfully.");
  };

  const proceedLiterPriceConfirm = () => {
    if (!newLiterPrice || Number(newLiterPrice) <= 0) {
      showToast
        ? showToast("warning", "Please enter a valid liter price.")
        : alert("Please enter a valid liter price.");
      return;
    }

    if (!effectiveDatetime) {
      showToast
        ? showToast("warning", "Please select effective date and time.")
        : alert("Please select effective date and time.");
      return;
    }

    setShowLiterPrice(false);
    setShowPriceConfirm(true);
  };

  const proceedLiterPricePassword = () => {
    setShowPriceConfirm(false);
    setShowPricePassword(true);
  };

  const confirmLiterPriceUpdate = () => {
    if (!pricePassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    if (setPriceHistory) {
      setPriceHistory((prev) =>
        [
          ...prev,
          {
            price: Number(newLiterPrice),
            effectiveFrom: effectiveDatetime,
            createdBy: currentUser?.fullName || currentUser?.name || "System",
            createdAt: new Date().toISOString(),
          },
        ].sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom))
      );
    }

    setShowPricePassword(false);
    setPricePassword("");
    setNewLiterPrice("");
    setEffectiveDatetime("");

    showToast
      ? showToast("success", "Liter price updated successfully.")
      : alert("Liter price updated successfully.");
  };

  const exportStationsToCSV = () => {
    const csvHeaders = [
      "Station ID",
      "Project",
      "Capacity",
      "Current Stock",
      "Tank Level",
      "Status",
      "Liter Price",
    ];

    const csvRows = filteredStations.map((station) => [
      station.id || "",
      station.project || "",
      station.capacity || "",
      station.currentStock || "",
      `${Number(station.percentage || 0).toFixed(1)}%`,
      station.status || "",
      `${literPrice} ${currency}/L`,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
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
    link.download = `stations_export_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    showToast
      ? showToast("success", "Stations data exported successfully.")
      : alert("Stations data exported successfully.");
  };

  const exportStationsToPDF = () => {
    showToast
      ? showToast("warning", "PDF export will be added later.")
      : alert("PDF export will be added later.");
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Fuel Stations</h1>
          <p className="text-gray-400">Fuel stock management</p>
        </div>

        <div ref={stationSettingsRef} className="relative">
         <button
  onClick={(e) => {
    e.stopPropagation();
    setShowSettings(!showSettings);

    if (showSettings) {
      setShowExportMenu(false);
    }
  }}
  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
>
  ⋮
</button>

          {showSettings && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-3 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-40 backdrop-blur-xl"
            >
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowForm(true);
                }}
                className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white"
              >
                <span className="text-green-400 text-lg">＋</span>
                Add Station
              </button>

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowEdit(true);
                }}
                className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-slate-800 transition text-white"
              >
                <span className="text-blue-400 text-lg">✎</span>
                Edit Station
              </button>

              {hasPermission("stations", "adjustInventory") && (
                <button
                  onClick={openInventoryAdjustment}
                  className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-red-900/30 transition text-red-400"
                >
                  <span className="text-lg">⚠</span>
                  Inventory Adjustment
                </button>
              )}

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowLiterPrice(true);
                }}
                className="flex items-center justify-between w-full px-5 py-4 hover:bg-yellow-500/10 transition text-white border-t border-gray-700"
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-lg">{countryFlag}</span>
                  Liter Price
                </span>

                <span className="text-xs text-gray-400">
                  {literPrice} {currency}/L
                </span>
              </button>

              <div className="border-t border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu((prev) => !prev);
                  }}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-slate-800 transition text-white"
                >
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-blue-400 text-lg">⇩</span>
                    Export
                  </span>

                  <span className="text-gray-400">›</span>
                </button>

                {showExportMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-950 border-t border-gray-700"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToCSV();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToPDF();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-gray-900 border border-gray-700 hover:border-yellow-400 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-xl w-full sm:min-w-[240px] outline-none text-[12px] lg:text-sm"
          >
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {project === "All" ? "All Projects" : project}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSelectedProject("All")}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/35 px-3 lg:px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Card title="Total Stations" value={filteredStations.length} />

        <Card
          title="Total Capacity"
          value={formatNumber(
            filteredStations.reduce((sum, s) => sum + (s.capacity || 0), 0)
          )}
        />

        <Card
          title="Current Stock"
          value={formatNumber(
            filteredStations.reduce(
              (sum, s) => sum + (s.currentStock || 0),
              0
            )
          )}
        />
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Stations Stock
            </h2>
            <p className="text-sm text-slate-400">
              Live stock overview by station
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {filteredStations.length} stations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div
              key={station.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-lg hover:border-yellow-400/60 hover:shadow-yellow-400/10 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <button
                    onClick={() => setSelectedStationHistory(station)}
                    className="text-xl font-bold text-blue-200 hover:text-yellow-400 transition cursor-pointer"
                  >
                    {station.id}
                  </button>
                  <p className="text-sm text-slate-400">
                    Project: {station.project || "-"}
                  </p>
                </div>

                <StatusBadge status={station.status} />
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-5">
                <div>
                  <p className="text-xs text-gray-400">Capacity</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(station.capacity)} L
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Current Stock</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(station.currentStock)} L
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-3">Tank Level</p>
                <FuelLevelIcon percentage={station.percentage} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
              Total Consumption per Station
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Direct refuel quantity grouped by source station
            </p>
          </div>

          <span className="text-sm text-slate-400">
            {selectedProject === "All" ? "All Projects" : selectedProject}
          </span>
        </div>

        <ChartFrame height={260}>
          <BarChart
            data={stationConsumptionChartData}
            barCategoryGap="35%"
          >
            <XAxis
              dataKey="stationId"
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <YAxis
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <Tooltip />

            <Bar
              dataKey="qtyLiters"
              fill="#facc15"
              name="Qty Liters"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ChartFrame>
      </div>

      {selectedStationHistory && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
          <div className="bg-slate-950 text-white w-full max-w-[min(1150px,calc(100vw-2rem))] max-h-[92vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                  Station Operations History
                </h2>

                <p className="text-gray-400 mt-1">
                  Station:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedStationHistory.id}
                  </span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Direct refuel, internal transfers, and external supply related to this station
                </p>
              </div>

              <button
                onClick={() => setSelectedStationHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-3 sm:p-5 overflow-auto max-h-[68vh]">
              <table className="min-w-[820px] lg:min-w-[960px] xl:min-w-[1050px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                  <tr>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Operation ID</Th>
                    <Th>Type</Th>
                    <Th>Direction</Th>
                    <Th>Source</Th>
                    <Th>Destination</Th>
                    <Th>Fueler</Th>
                    <Th>Qty Liters</Th>
                  </tr>
                </thead>

                <tbody>
                  {getStationOperations(selectedStationHistory.id).length === 0 ? (
                    <tr>
                      <Td colSpan={9}>
                        <span className="text-gray-400">
                          No operations found for this station.
                        </span>
                      </Td>
                    </tr>
                  ) : (
                    getStationOperations(selectedStationHistory.id).map((item, i) => {
                      const row = item.row;
                      const direction = getStationOperationDirection(
                        row,
                        selectedStationHistory.id
                      );

                      return (
                        <tr
                          key={item.originalIndex}
                          className="hover:bg-slate-800/70 transition-colors duration-150"
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex] || "-"
                              : item.originalIndex + 1}
                          </Td>

                          <Td>{row[typeIndex] || "-"}</Td>

                          <Td>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                direction === "In"
                                  ? "bg-green-500/15 text-green-300 border border-green-500/30"
                                  : direction === "Out"
                                  ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                  : "bg-gray-500/15 text-gray-300 border border-gray-500/30"
                              }`}
                            >
                              {direction}
                            </span>
                          </Td>

                          <Td>{row[sourceIndex] || "-"}</Td>
                          <Td>{row[destinationIndex] || "-"}</Td>
                          <Td>{fuelerIndex !== -1 ? row[fuelerIndex] || "-" : "-"}</Td>
                          <Td>{formatNumber(row[dieselIndex])}</Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Add Station</h2>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Station ID" placeholder="Main_Station" />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Station Type</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Main</option>
                  <option>Sub</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Project</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option value="">Select Project</option>
                  {transferProjectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Capacity" placeholder="Liters" />
              <Field label="Opening Balance" placeholder="Liters" />

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Status</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-lg">
                Save Station
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Edit Station</h2>
              <button onClick={() => setShowEdit(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Select Station</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Select Station</option>
                  {realStations.map((s) => (
                    <option key={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Project</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option value="">Select New Project</option>
                  {transferProjectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Status</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[560px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Inventory Adjustment
            </h2>

            <div className="mb-4">
              <label className="font-medium">Select Station</label>
              <select
                className="border rounded-lg p-2 w-full mt-2"
                value={selectedStation?.id || ""}
                onChange={(e) => {
                  const station = stationsWithBalance.find(
                    (s) => s.id === e.target.value
                  );
                  setSelectedStation(station);
                }}
              >
                <option value="">Select Station</option>
                {stationsWithBalance.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </div>

            {selectedStation && (
              <div className="bg-gray-100 p-4 rounded mb-4">
                <p>
                  <strong>Current Balance:</strong>{" "}
                  {formatNumber(selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Adjustment Qty:</strong>{" "}
                  {formatNumber(-selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Final Balance:</strong> 0 L
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedStation(null);
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedToPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassword && selectedStation && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPassword(false);
                  setSelectedStation(null);
                  setAdminPassword("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmZeroBalance}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {showLiterPrice && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl sm:text-2xl font-bold">Liter Price</h2>

              <button onClick={() => setShowLiterPrice(false)}>
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-100 p-4 rounded-lg flex justify-between">
                <span>{countryFlag} Current Liter Price</span>
                <strong>
                  {literPrice} {currency}/L
                </strong>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">
                  New Liter Price
                </label>

                <input
                  type="number"
                  value={newLiterPrice}
                  onChange={(e) => setNewLiterPrice(e.target.value)}
                  className="col-span-2 border rounded-lg p-2"
                  placeholder="Enter new price"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">
                  Effective Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={effectiveDatetime}
                  onChange={(e) => setEffectiveDatetime(e.target.value)}
                  className="col-span-2 border rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowLiterPrice(false)}
                className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedLiterPriceConfirm}
                className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceConfirm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirm Liter Price Update
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>Current Price:</strong> {literPrice} {currency}/L
              </p>
              <p>
                <strong>New Price:</strong> {newLiterPrice} {currency}/L
              </p>
              <p>
                <strong>Effective From:</strong> {effectiveDatetime}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPriceConfirm(false);
                  setNewLiterPrice("");
                  setEffectiveDatetime("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedLiterPricePassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPricePassword && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <p className="text-gray-600 mb-4">
              Please enter your password to confirm liter price update.
            </p>

            <input
              type="password"
              value={pricePassword}
              onChange={(e) => setPricePassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPricePassword(false);
                  setPricePassword("");
                  setNewLiterPrice("");
                  setEffectiveDatetime("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmLiterPriceUpdate}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function FuelLevelIcon({ percentage }) {
  const level = Math.max(0, Math.min(100, Number(percentage) || 0));

  const color =
    level < 30
      ? "text-red-500"
      : level < 60
      ? "text-yellow-400"
      : "text-green-500";

  const bgColor =
    level < 30
      ? "bg-red-500/10"
      : level < 60
      ? "bg-yellow-400/10"
      : "bg-green-500/10";

  const glow =
    level < 30
      ? "shadow-red-500/40"
      : level < 60
      ? "shadow-yellow-400/40"
      : "shadow-green-500/40";

  const size =
    level < 30
      ? "text-2xl"
      : level < 60
      ? "text-3xl"
      : "text-4xl";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`${bgColor} ${glow} shadow-lg rounded-full w-14 h-14 flex items-center justify-center transition-all duration-500`}
      >
        <span className={`${color} ${size} transition-all duration-500`}>
          ⛽
        </span>
      </div>

      <div>
        <p className={`${color} font-bold text-sm`}>
          {level.toFixed(1)}%
        </p>

        <p className="text-xs text-gray-400">
          {level < 30 ? "Low" : level < 60 ? "Medium" : "Good"}
        </p>
      </div>
    </div>
  );
}
 

function FuelersPage({
  fuelers = [],
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
}) {
  const [localFuelers, setLocalFuelers] = useState([]);
  const [localFuelerUpdates, setLocalFuelerUpdates] = useState({});
  const [editFueler, setEditFueler] = useState(null);
  const [showAddFueler, setShowAddFueler] = useState(false);
  const [selectedFuelerHistory, setSelectedFuelerHistory] = useState(null);
  const [fuelerAuditLog, setFuelerAuditLog] = useState([]);
  const [showFuelersSettings, setShowFuelersSettings] = useState(false);

  const fuelersSettingsRef = useRef(null);

  useOutsideClick(fuelersSettingsRef, () => {
    setShowFuelersSettings(false);
  });

  const [newFueler, setNewFueler] = useState({
    id: "",
    name: "",
    mobile: "",
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
    "Fueler ID",
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

  const displayFuelers = masterFuelers.map((fueler) => ({
    ...fueler,
    ...localFuelerUpdates[fueler.id],
    mobile: localFuelerUpdates[fueler.id]?.mobile || fueler.mobile || "-",
    projectName:
      localFuelerUpdates[fueler.id]?.projectName ||
      fueler.projectName ||
      fueler.project ||
      "-",
    status: localFuelerUpdates[fueler.id]?.status || fueler.status || "On Duty",
  }));

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

  const chartData = fuelersWithKpi
    .map((fueler) => ({
      name: fueler.name || fueler.id,
      dieselQty: Number(fueler.dieselQty) || 0,
    }))
    .sort((a, b) => b.dieselQty - a.dieselQty);

  const totalOperations = fuelersWithKpi.reduce(
    (sum, fueler) => sum + fueler.operationsCount,
    0
  );

  const totalDiesel = fuelersWithKpi.reduce(
    (sum, fueler) => sum + fueler.dieselQty,
    0
  );

  const assignedProjectsCount = new Set(
    fuelersWithKpi
      .map((fueler) => fueler.projectName)
      .filter((projectName) => projectName && projectName !== "-")
  ).size;

  const getStatusBadgeClass = (status) => {
    const value = String(status || "").toLowerCase();

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

  const printTable = (tableId, title = "Fuelers Report") => {
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
      "fuelers_report",
      [
        "#",
        "Fueler ID",
        "Name",
        "Mobile",
        "Project Name",
        "Status",
        "Direct Refuel Operations",
        "Diesel Qty (L)",
      ],
      fuelersWithKpi.map((fueler, i) => [
        i + 1,
        fueler.id,
        fueler.name || "-",
        fueler.mobile || "-",
        fueler.projectName || "-",
        fueler.status || "On Duty",
        fueler.operationsCount,
        fueler.dieselQty,
      ])
    );
  };

  const resetNewFueler = () => {
    setNewFueler({
      id: "",
      name: "",
      mobile: "",
      projectName: "",
      status: "On Duty",
    });
  };

  const closeAddFueler = () => {
    setShowAddFueler(false);
    resetNewFueler();
  };

  const saveNewFueler = () => {
    const fuelerId = newFueler.id.trim();
    const fuelerName = newFueler.name.trim();
    const mobile = newFueler.mobile.trim();

    if (!fuelerId) {
      alert("Please enter Fueler ID.");
      return;
    }

    if (!fuelerName) {
      alert("Please enter Fueler Name.");
      return;
    }

    if (!mobile) {
      alert("Please enter Mobile Number.");
      return;
    }

    const idExists = masterFuelers.some(
      (fueler) => normalizeText(fueler.id) === normalizeText(fuelerId)
    );

    if (idExists) {
      alert("Fueler ID already exists.");
      return;
    }

    if (isOfficerUser(currentUser)) {
      submitApprovalRequest({
        type: "master_data_change",
        module: "fuelers",
        title: `New fueler ${fuelerId}`,
        details: `Officer requested new fueler ${fuelerName}`,
        payload: { entity: "fueler", action: "add", values: { ...newFueler, id: fuelerId, name: fuelerName, mobile } },
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
        projectName: newFueler.projectName || "-",
        status: newFueler.status || "On Duty",
        createdLocally: true,
      },
    ]);

    if (showToast) {
      showToast("success", "Fueler added locally.");
    }

    closeAddFueler();
  };

  const openFuelerEdit = (fueler, field) => {
    const oldValue =
      field === "mobile"
        ? fueler.mobile || ""
        : field === "status"
        ? fueler.status || "On Duty"
        : fueler.projectName || "";

    setEditFueler({
      fuelerId: fueler.id,
      fuelerName: fueler.name,
      field,
      oldValue,
      newValue: oldValue,
      reason: "",
      password: "",
    });
  };

  const closeFuelerEdit = () => {
    setEditFueler(null);
  };

  const saveFuelerEdit = () => {
    if (!editFueler) return;

    if (!String(editFueler.newValue).trim()) {
      alert("Please enter a new value.");
      return;
    }

    if (editFueler.field !== "status" && !editFueler.reason.trim()) {
      alert("Please enter edit reason.");
      return;
    }

    if (!editFueler.password.trim()) {
      alert("Please enter admin password.");
      return;
    }

    const updateKey =
      editFueler.field === "mobile"
        ? "mobile"
        : editFueler.field === "status"
        ? "status"
        : "projectName";

    const fieldLabel =
      editFueler.field === "mobile"
        ? "Mobile"
        : editFueler.field === "status"
        ? "Status"
        : "Project";

    setLocalFuelerUpdates((prev) => ({
      ...prev,
      [editFueler.fuelerId]: {
        ...prev[editFueler.fuelerId],
        [updateKey]: editFueler.newValue,
      },
    }));

    setFuelerAuditLog((prev) => [
      ...prev,
      {
        fuelerId: editFueler.fuelerId,
        fuelerName: editFueler.fuelerName,
        field: fieldLabel,
        oldValue: editFueler.oldValue,
        newValue: editFueler.newValue,
        reason: editFueler.field === "status" ? "Status update" : editFueler.reason,
        editedBy: "Amr",
        editedAt: new Date().toISOString(),
      },
    ]);

    if (showToast) {
      showToast("success", `${fieldLabel} updated locally.`);
    }

    closeFuelerEdit();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start xl:items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Fuelers Management</h1>
            <p className="text-gray-400">
              Fuelers monitoring, Direct Refuel KPI and performance tracking
            </p>
          </div>

          <button
            onClick={() => setShowAddFueler(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 lg:px-4 py-2 rounded-lg font-semibold transition"
          >
            + Add Fueler
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-4">
          <Card title="Total Fuelers" value={formatNumber(fuelersWithKpi.length)} />
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
                Fuelers List
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Mobile, project, and status changes are saved locally and ready for backend integration
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">
                {fuelersWithKpi.length} fuelers
              </span>

              <div ref={fuelersSettingsRef} className="relative">
                <button
                  onClick={() => setShowFuelersSettings(!showFuelersSettings)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showFuelersSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                    <button
                      onClick={() => {
                        exportFuelersCSV();
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable("fuelers-table", "Fuelers Report");
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-b-2xl">
            <table
              id="fuelers-table"
              className="min-w-[900px] lg:min-w-[1050px] xl:min-w-[1150px] w-full border-separate border-spacing-0 text-[11px] sm:text-xs lg:text-sm"
            >
              <thead className="bg-slate-800 sticky top-0 z-[1] shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
                <tr>
                  <Th>#</Th>
                  <Th>Fueler ID</Th>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
                  <Th>Project Name</Th>
                  <Th>Status</Th>
                  <Th>KPI Operations</Th>
                  <Th>Diesel Qty</Th>
                </tr>
              </thead>

              <tbody>
                {fuelersWithKpi.map((fueler, i) => (
                  <tr key={fueler.id} className="odd:bg-slate-900/20 even:bg-slate-800/20 hover:bg-amber-400/10 transition-colors duration-200">
                    <Td>{i + 1}</Td>

                    <Td>
                      <button
                        onClick={() => setSelectedFuelerHistory(fueler)}
                        className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                        title="Open fueler operations history"
                      >
                        {fueler.id}
                      </button>
                    </Td>

                    <Td strong>{fueler.name || "-"}</Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "mobile")}
                        className="text-blue-300 hover:text-yellow-400 transition cursor-pointer"
                      >
                        {fueler.mobile || "-"}
                      </button>
                    </Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "project")}
                        className="text-blue-300 hover:text-yellow-400 transition cursor-pointer"
                      >
                        {fueler.projectName || "-"}
                      </button>
                    </Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "status")}
                        className={`px-2 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${getStatusBadgeClass(
                          fueler.status
                        )}`}
                      >
                        {fueler.status || "On Duty"}
                      </button>
                    </Td>

                    <Td>{formatNumber(fueler.operationsCount)}</Td>
                    <Td>{formatNumber(fueler.dieselQty)} L</Td>
                  </tr>
                ))}

                {fuelersWithKpi.length === 0 && (
                  <tr>
                    <Td colSpan={8}>No fuelers found.</Td>
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
                Diesel Quantity Per Fueler
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total diesel quantity handled by each fueler based on Direct Refuel operations only
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
              Local Fuelers Audit Log
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

        {selectedFuelerHistory && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-gray-900 text-white w-[1180px] max-h-[92vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                    Fueler Operations History
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Fueler: {" "}
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
                  title="Fueler Operations"
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
                  <h2 className="text-xl sm:text-2xl font-bold">Add Fueler</h2>
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
                  <label className="font-medium text-gray-700">Fueler ID</label>
                  <input
                    type="text"
                    value={newFueler.id}
                    onChange={(e) => setNewFueler({ ...newFueler, id: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Example: FL-001"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Fueler Name</label>
                  <input
                    type="text"
                    value={newFueler.name}
                    onChange={(e) => setNewFueler({ ...newFueler, name: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter fueler name"
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
                  value={newFueler.projectName}
                  onChange={(e) => setNewFueler({ ...newFueler, projectName: e.target.value })}
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Project</option>
                  {transferProjects.map((project) => (
                    <option key={project.id || project.name} value={project.name || project.id}>
                      {project.name || project.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={closeAddFueler}
                  className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveNewFueler}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 lg:px-4 py-2 rounded-lg font-semibold"
                >
                  Save Fueler
                </button>
              </div>
            </div>
          </div>
        )}

        {editFueler && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-white text-black w-[min(560px,calc(100vw-2rem))] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Edit {editFueler.field === "mobile"
                      ? "Mobile"
                      : editFueler.field === "status"
                      ? "Status"
                      : "Project"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Fueler: {editFueler.fuelerId} - {editFueler.fuelerName}
                  </p>
                </div>

                <button
                  onClick={closeFuelerEdit}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Old Value</p>
                <p className="text-xl font-bold">{editFueler.oldValue || "-"}</p>
              </div>

              <div className="mb-4">
                <label className="font-medium text-gray-700">New Value</label>

                {editFueler.field === "project" ? (
                  <select
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="">Select Project</option>
                    {transferProjects.map((project) => (
                      <option key={project.id || project.name} value={project.name || project.id}>
                        {project.name || project.id}
                      </option>
                    ))}
                  </select>
                ) : editFueler.field === "status" ? (
                  <select
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="In Vacation">In Vacation</option>
                    <option value="Retired / Resigned">Retired / Resigned</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter mobile number"
                  />
                )}
              </div>

              {editFueler.field !== "status" && (
                <div className="mb-4">
                  <label className="font-medium text-gray-700">Edit Reason</label>
                  <textarea
                    value={editFueler.reason}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, reason: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2 h-24"
                    placeholder="Enter correction reason..."
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="font-medium text-gray-700">Admin Password</label>
                <input
                  type="password"
                  value={editFueler.password}
                  onChange={(e) =>
                    setEditFueler({ ...editFueler, password: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                  placeholder="Enter admin password"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={closeFuelerEdit}
                  className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveFuelerEdit}
                  className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectsPage({
  projects = [],
  assets = [],
  stations = [],
  fuelers = [],
  data = [],
  headers = [],
  showToast,
  currency = "SAR",
  getLiterPriceByDate,
  assetProjectHistory = [],
  currentUser,
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOperationSearch, setProjectOperationSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localProjects, setLocalProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    id: "",
    name: "",
    status: "Active",
    location: "",
    approvalStatus: "Pending Approval",
  });

  const [statusEdit, setStatusEdit] = useState(null);
  const settingsRef = useRef(null);

  useOutsideClick(settingsRef, () => setShowSettings(false));

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "id",
  ]);

  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
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

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
  ]);

  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);

  const baseProjects = projects.map((project) => ({
    ...project,
    approvalStatus: project.approvalStatus || "Approved",
  }));

  const allProjects = Object.values(
    [...baseProjects, ...localProjects].reduce((acc, project) => {
      if (!project?.id) return acc;
      acc[normalizeText(project.id)] = project;
      return acc;
    }, {})
  );

  const matchProject = (value, project) => {
    return isSameText(value, project.id) || isSameText(value, project.name);
  };

  const getProjectAssets = (project) => {
    return assets.filter((asset) => {
      const currentProject = getAssetProjectByDate(
        asset.id,
        new Date().toISOString()
      );

      return matchProject(currentProject, project);
    });
  };

  const getProjectStations = (project) => {
    return stations.filter((station) => matchProject(station.project, project));
  };

  const getProjectFuelers = (project) => {
    return fuelers.filter((fueler) => matchProject(fueler.projectName, project));
  };

  const parseProjectDate = (rawDate) => {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatProjectDate = (rawDate) => {
    const d = parseProjectDate(rawDate);
    if (!d) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAssetProjectByDate = (assetId, transactionDate) => {
    const asset = assets.find((item) => item.id === assetId);
    const operationDate = parseProjectDate(transactionDate);

    if (!assetId || !operationDate) {
      return asset?.project || "-";
    }

    const history = assetProjectHistory
      .filter((item) => item.assetId === assetId)
      .filter((item) => item.effectiveDate)
      .sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

    if (history.length === 0) {
      return asset?.project || "-";
    }

    let project = history[0]?.oldProject || asset?.project || "-";

    history.forEach((item) => {
      const effectiveDate = new Date(item.effectiveDate);

      if (
        !Number.isNaN(effectiveDate.getTime()) &&
        effectiveDate <= operationDate
      ) {
        project = item.newProject || project;
      }
    });

    return project || asset?.project || "-";
  };

  const getDirectRefuelOperations = (project) => {
    return data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter((item) => {
        const row = item.row;
        const operationType = typeIndex !== -1 ? row[typeIndex] : "";
        const destination = destinationIndex !== -1 ? row[destinationIndex] : "";
        const transactionDate = dateIndex !== -1 ? row[dateIndex] : "";
        const assetProjectAtOperation = getAssetProjectByDate(
          destination,
          transactionDate
        );

        return (
          isSameText(operationType, "Direct_Refuel") &&
          matchProject(assetProjectAtOperation, project)
        );
      })
      .sort((a, b) => {
        const da = dateIndex !== -1 ? parseProjectDate(a.row[dateIndex])?.getTime() || 0 : 0;
        const db = dateIndex !== -1 ? parseProjectDate(b.row[dateIndex])?.getTime() || 0 : 0;
        return db - da;
      });
  };

  const getFilteredProjectOperations = (project) => {
    const search = projectOperationSearch.trim().toLowerCase();
    const operations = getDirectRefuelOperations(project);

    if (!search) return operations;

    return operations.filter((item) => {
      const row = item.row;
      const searchableValues = [
        operationIdIndex !== -1 ? row[operationIdIndex] : item.originalIndex + 1,
        dateIndex !== -1 ? row[dateIndex] : "",
        sourceIndex !== -1 ? row[sourceIndex] : "",
        fuelerIndex !== -1 ? row[fuelerIndex] : "",
        destinationIndex !== -1 ? row[destinationIndex] : "",
        dieselIndex !== -1 ? row[dieselIndex] : "",
        odometerIndex !== -1 ? row[odometerIndex] : "",
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  };

  const getOperationLiterPrice = (row) => {
    const date = dateIndex !== -1 ? row[dateIndex] : "";
    return getLiterPriceByDate ? getLiterPriceByDate(date) : 2.33;
  };

  const getProjectDieselQuantity = (project) => {
    return getDirectRefuelOperations(project).reduce((sum, item) => {
      const diesel = dieselIndex !== -1 ? parseFloat(item.row[dieselIndex]) || 0 : 0;
      return sum + diesel;
    }, 0);
  };

  const getProjectDieselCost = (project) => {
    return getDirectRefuelOperations(project).reduce((sum, item) => {
      const diesel = dieselIndex !== -1 ? parseFloat(item.row[dieselIndex]) || 0 : 0;
      return sum + diesel * getOperationLiterPrice(item.row);
    }, 0);
  };

  const projectSummary = allProjects.map((project) => {
    const assignedAssets = getProjectAssets(project);
    const assignedStations = getProjectStations(project);
    const assignedFuelers = getProjectFuelers(project);
    const directRefuelOperations = getDirectRefuelOperations(project);
    const dieselQty = getProjectDieselQuantity(project);
    const dieselCost = getProjectDieselCost(project);

    return {
      ...project,
      assignedAssetsCount: assignedAssets.length,
      assignedStationsCount: assignedStations.length,
      assignedFuelersCount: assignedFuelers.length,
      operationsCount: directRefuelOperations.length,
      dieselQty,
      dieselCost,
    };
  });

  const filteredProjects = projectSummary.filter((project) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      String(project.id || "").toLowerCase().includes(search) ||
      String(project.name || "").toLowerCase().includes(search) ||
      String(project.status || "").toLowerCase().includes(search);

    return matchesSearch;
  });

  const activeProjects = projectSummary.filter((p) => isSameText(p.status, "Active")).length;
  const inactiveProjects = projectSummary.filter((p) => !isSameText(p.status, "Active")).length;
  const totalDiesel = projectSummary.reduce((sum, project) => sum + project.dieselQty, 0);
  const totalCost = projectSummary.reduce((sum, project) => sum + project.dieselCost, 0);

  const closeForm = () => {
    setShowForm(false);
    setNewProject({
      id: "",
      name: "",
      status: "Active",
      location: "",
      approvalStatus: "Pending Approval",
    });
  };

  const saveProject = () => {
    if (!newProject.id.trim()) {
      alert("Please enter Project ID.");
      return;
    }

    if (!newProject.name.trim()) {
      alert("Please enter Project Name.");
      return;
    }

    const duplicated = allProjects.some((project) => isSameText(project.id, newProject.id));
    if (duplicated) {
      alert("Project ID already exists.");
      return;
    }

    setLocalProjects((prev) => [
      ...prev,
      {
        ...newProject,
        source: "Local Pending Add",
        createdAt: new Date().toISOString(),
      },
    ]);

    showToast?.("success", "Project saved locally and ready for backend submission.");
    closeForm();
  };

  const openStatusEdit = (project) => {
    setStatusEdit({
      id: project.id,
      name: project.name,
      oldStatus: project.status || "Inactive",
      newStatus: isSameText(project.status, "Active") ? "Inactive" : "Active",
      reason: "",
      password: "",
    });
  };

  const saveStatusEdit = () => {
    if (!statusEdit) return;

    if (!statusEdit.reason.trim()) {
      alert("Please enter status change reason.");
      return;
    }

    if (!statusEdit.password.trim()) {
      alert("Please enter admin password.");
      return;
    }

    setLocalProjects((prev) => {
      const exists = prev.some((project) => isSameText(project.id, statusEdit.id));

      if (exists) {
        return prev.map((project) =>
          isSameText(project.id, statusEdit.id)
            ? {
                ...project,
                status: statusEdit.newStatus,
                approvalStatus: "Approved",
                statusChangeReason: statusEdit.reason,
                statusChangedAt: new Date().toISOString(),
              }
            : project
        );
      }

      const baseProject = allProjects.find((project) => isSameText(project.id, statusEdit.id));

      return [
        ...prev,
        {
          ...baseProject,
          status: statusEdit.newStatus,
          approvalStatus: "Approved",
          source: "Local Status Update",
          statusChangeReason: statusEdit.reason,
          statusChangedAt: new Date().toISOString(),
        },
      ];
    });

    trackActivity?.("Change Project Status", "projects", `${statusEdit.id} status changed to ${statusEdit.newStatus}.`);
    showToast?.("success", "Project status changed directly.");
    setStatusEdit(null);
  };

  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportProjectsCSV = () => {
    exportRowsToCSV(
      "projects_cards_summary",
      [
        "#",
        "Project ID",
        "Project Name",
        "Status",
        "Approval Status",
        "Assigned Assets",
        "Assigned Stations",
        "Assigned Fuelers",
        "Direct Refuel Operations",
        "Diesel Qty",
        "Total Cost",
      ],
      filteredProjects.map((project, i) => [
        i + 1,
        project.id,
        project.name,
        project.status,
        project.approvalStatus,
        project.assignedAssetsCount,
        project.assignedStationsCount,
        project.assignedFuelersCount,
        project.operationsCount,
        project.dieselQty,
        project.dieselCost,
      ])
    );

    setShowSettings(false);
  };

  const printProjectsCards = () => {
    const cardsElement = document.getElementById("projects-cards-print-area");
    if (!cardsElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>Projects / Sites Cards</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
            h2 { margin-bottom: 8px; font-size: 22px; }
            .report-meta { margin-bottom: 18px; font-size: 12px; color: #555; }
            .print-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .project-card-print { border: 1px solid #ccc; border-radius: 14px; padding: 14px; break-inside: avoid; }
            .project-title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .project-id { font-size: 12px; color: #555; margin-bottom: 12px; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
            .metric { background: #f3f4f6; border-radius: 10px; padding: 8px; }
            .label { font-size: 11px; color: #666; }
            .value { font-size: 15px; font-weight: bold; margin-top: 3px; }
          </style>
        </head>
        <body>
          <h2>Projects / Sites Cards</h2>
          <div class="report-meta">Generated at: ${new Date().toLocaleString()}</div>
          ${cardsElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setShowSettings(false);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Projects / Sites</h1>
            <p className="text-gray-400">Project cards, direct refuel tracking, and site assignment overview</p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="h-[48px] flex-1 lg:flex-none bg-gray-800 border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none text-white placeholder:text-slate-400 px-3 lg:px-4 rounded-xl min-w-0 lg:w-full sm:w-[320px] text-[12px] lg:text-sm transition-all"
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="h-[48px] shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 lg:px-4 rounded-xl transition"
              >
                Clear
              </button>
            )}

            <div ref={settingsRef} className="relative shrink-0">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="h-[48px] w-[48px] flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 rounded-xl transition"
                title="Projects settings"
              >
                ⋮
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setShowSettings(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                  >
                    + Add Project
                  </button>

                  <button
                    onClick={exportProjectsCSV}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={printProjectsCards}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                  >
                    Print Cards
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          <Card title="Total Projects" value={formatNumber(projectSummary.length)} />
          <Card title="Active Projects" value={formatNumber(activeProjects)} />
          <Card title="Inactive Projects" value={formatNumber(inactiveProjects)} />
          <Card title="Total Quantity (L)" value={formatNumber(totalDiesel)} />
          <Card title={`Total Cost (${currency})`} value={formatNumber(totalCost)} />
        </div>

        <div className="bg-gray-800 rounded-2xl shadow overflow-hidden border border-gray-700 mb-4">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-amber-300">Projects Cards</h2>
              <p className="text-xs text-gray-400 mt-1">
                {filteredProjects.length} cards shown from {projectSummary.length} projects
              </p>
            </div>
          </div>

          <div id="projects-cards-print-area" className="print-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="project-card-print bg-gray-900 border border-gray-700 hover:border-yellow-400 rounded-2xl p-4 shadow-xl transition"
              >
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setProjectOperationSearch("");
                      }}
                      className="project-title text-left text-base sm:text-lg font-bold text-blue-300 hover:text-yellow-400 transition block truncate"
                    >
                      {project.name || project.id}
                    </button>
                    <p className="project-id text-xs text-gray-400 mt-1">Project ID: {project.id}</p>
                  </div>

                  <button
                    onClick={() => openStatusEdit(project)}
                    title="Click to change status"
                    className="rounded-full transition hover:scale-105"
                  >
                    <StatusBadge status={project.status || "Inactive"} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Assets</p>
                    <p className="value text-xl font-bold text-white mt-1">{formatNumber(project.assignedAssetsCount)}</p>
                  </div>

                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Stations</p>
                    <p className="value text-xl font-bold text-white mt-1">{formatNumber(project.assignedStationsCount)}</p>
                  </div>

                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Fuelers</p>
                    <p className="value text-xl font-bold text-white mt-1">{formatNumber(project.assignedFuelersCount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Direct Refuel</p>
                    <p className="value text-xl font-bold text-yellow-300 mt-1">{formatNumber(project.operationsCount)}</p>
                  </div>

                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Qty Liters</p>
                    <p className="value text-xl font-bold text-green-300 mt-1">{formatNumber(project.dieselQty)}</p>
                  </div>

                  <div className="metric bg-gray-800 rounded-xl p-2 lg:p-3 border border-gray-700 min-w-0">
                    <p className="label text-[11px] text-gray-400">Cost</p>
                    <p className="value text-base sm:text-lg font-bold text-blue-300 mt-1">{formatNumber(project.dieselCost)}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center text-xs text-gray-400 border-t border-gray-700 pt-3">
                  <span>Approval: {project.approvalStatus || "Approved"}</span>
                  <span>{currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProject && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-gray-900 text-white w-[1200px] max-h-[90vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                    Project Direct Refuel Operations
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Project: <span className="text-blue-300 font-semibold">{selectedProject.name || selectedProject.id}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectOperationSearch("");
                  }}
                  className="text-gray-400 hover:text-red-400 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 p-3 sm:p-4 lg:p-5 border-b border-gray-800">
                <Card title="Assets" value={formatNumber(selectedProject.assignedAssetsCount)} />
                <Card title="Stations" value={formatNumber(selectedProject.assignedStationsCount)} />
                <Card title="Fuelers" value={formatNumber(selectedProject.assignedFuelersCount)} />
                <Card title="Direct Refuel" value={formatNumber(selectedProject.operationsCount)} />
                <Card title="Qty Liters" value={formatNumber(selectedProject.dieselQty)} />
              </div>

              <div className="p-5 overflow-auto max-h-[62vh]">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-5 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      Direct Refuel Operations Table
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {getFilteredProjectOperations(selectedProject).length} shown from {getDirectRefuelOperations(selectedProject).length} operations
                    </p>
                  </div>

                  <input
                    value={projectOperationSearch}
                    onChange={(e) => setProjectOperationSearch(e.target.value)}
                    placeholder="Search by operation, equipment, station, fueler..."
                    className="bg-gray-900 border border-gray-700 focus:border-yellow-400 outline-none rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-white w-full sm:min-w-[280px] lg:min-w-[360px] text-[12px] lg:text-sm"
                  />
                </div>

                <table className="min-w-[860px] lg:min-w-[980px] xl:min-w-[1100px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                  <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                    <tr>
                      <Th>#</Th>
                      <Th>Date</Th>
                      <Th>Operation ID</Th>
                      <Th>Station</Th>
                      <Th>Fueler</Th>
                      <Th>Equipment</Th>
                      <Th>Liters</Th>
                      <Th>Odometer</Th>
                      <Th>Cost</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {getFilteredProjectOperations(selectedProject).map((item, i) => {
                      const row = item.row;
                      const diesel = dieselIndex !== -1 ? parseFloat(row[dieselIndex]) || 0 : 0;
                      const cost = diesel * getOperationLiterPrice(row);

                      return (
                        <tr key={item.originalIndex} className="hover:bg-slate-800/70 transition-colors duration-150">
                          <Td>{i + 1}</Td>
                          <Td>{dateIndex !== -1 ? formatProjectDate(row[dateIndex]) : "-"}</Td>
                          <Td>{operationIdIndex !== -1 ? row[operationIdIndex] : item.originalIndex + 1}</Td>
                          <Td>{sourceIndex !== -1 ? row[sourceIndex] || "-" : "-"}</Td>
                          <Td>{fuelerIndex !== -1 ? row[fuelerIndex] || "-" : "-"}</Td>
                          <Td strong>{destinationIndex !== -1 ? row[destinationIndex] || "-" : "-"}</Td>
                          <Td>{formatNumber(diesel)}</Td>
                          <Td>{odometerIndex !== -1 ? formatNumber(row[odometerIndex]) : "-"}</Td>
                          <Td>{formatNumber(cost)} {currency}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {getFilteredProjectOperations(selectedProject).length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No matching Direct Refuel operations found for this project.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {statusEdit && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10010] p-3">
            <div className="bg-white text-black w-[520px] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <h2 className="text-xl sm:text-2xl font-bold">Change Project Status</h2>
                <button
                  onClick={() => setStatusEdit(null)}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Project</p>
                <p className="text-base sm:text-lg font-bold">{statusEdit.name || statusEdit.id}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {statusEdit.oldStatus} → <span className="font-bold">{statusEdit.newStatus}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="font-medium text-gray-700">Status Change Reason</label>
                <textarea
                  value={statusEdit.reason}
                  onChange={(e) => setStatusEdit({ ...statusEdit, reason: e.target.value })}
                  className="border rounded-lg p-3 w-full mt-2 h-24"
                  placeholder="Enter reason for changing project status..."
                />
              </div>

              <div className="mb-5">
                <label className="font-medium text-gray-700">Admin Password</label>
                <input
                  type="password"
                  value={statusEdit.password}
                  onChange={(e) => setStatusEdit({ ...statusEdit, password: e.target.value })}
                  className="border rounded-lg p-3 w-full mt-2"
                  placeholder="Enter admin password"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => setStatusEdit(null)}
                  className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveStatusEdit}
                  className="bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg"
                >
                  Save Status Change
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <GenericModal title="Add Project" closeForm={closeForm} saveText="Save Project" onSave={saveProject}>
            <Field
              label="Project ID"
              value={newProject.id}
              onChange={(e) => setNewProject({ ...newProject, id: e.target.value })}
              placeholder="Example: PRJ-001"
            />

            <Field
              label="Project Name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="Example: NEOM Site A"
            />

            <SelectField
              label="Status"
              value={newProject.status}
              onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
              options={["Active", "Inactive"]}
              placeholder="Select status"
            />

            <Field
              label="Location"
              value={newProject.location}
              onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
              placeholder="Optional"
            />
          </GenericModal>
        )}
      </div>
    </div>
  );
}

function AddOperationModal({
  closeForm,
  fuelers,
  stations,
  allStations = [],
  assets = [],
  projects = [],
  currentUser,
  transactionType,
  setTransactionType,
  stationMeterPhoto,
  setStationMeterPhoto,
  assetPhoto,
  setAssetPhoto,
  assetMeterPhoto,
  setAssetMeterPhoto,
  getLastOdometerForEquipment,
  onSaveOperation,
}) {
  const [sourceStation, setSourceStation] = useState("");
  const [fuelerId, setFuelerId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [dieselQuantity, setDieselQuantity] = useState("");
  const [odometer, setOdometer] = useState("");

  const [transactionTypeSearch, setTransactionTypeSearch] = useState("");
  const [sourceStationSearch, setSourceStationSearch] = useState("");
  const [fuelerSearch, setFuelerSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  const isOperator = currentUser?.role === "Operator";
  const userProjectScope = getUserProjectScope(currentUser);
  const isAllProjectsUser = userCanAccessAllProjects(currentUser);

  const isItemInUserProject = (projectValue) => {
    return isAllProjectsUser || isProjectAllowedForUser(currentUser, projectValue, projects);
  };

  const allowedTransactionTypes = getAllowedTransactionTypesForUser(currentUser);
  const transactionTypesForAdd = allowedTransactionTypes.includes("External_Transfer")
    ? allowedTransactionTypes
    : ["Admin", "Manager"].includes(currentUser?.role)
    ? [...allowedTransactionTypes, "External_Transfer"]
    : allowedTransactionTypes;

  const currentProjectStations = stations.filter((station) => {
    const status = String(station.status || "Active").trim().toLowerCase();

    return (
      station.id &&
      !isSameText(station.id, "External_Supply") &&
      isItemInUserProject(station.project) &&
      status === "active"
    );
  });

  const otherProjectStations = (allStations.length ? allStations : stations).filter((station) => {
    const status = String(station.status || "Active").trim().toLowerCase();

    return (
      station.id &&
      !isSameText(station.id, "External_Supply") &&
      !isItemInUserProject(station.project) &&
      status === "active"
    );
  });

  const currentProjectAssets = assets.filter((asset) => {
    const status = String(asset.status || "").trim().toLowerCase();
    return asset.id && isItemInUserProject(asset.project) && status === "active";
  });

  const currentProjectFuelers = fuelers.filter((fueler) => {
    const status = String(fueler.status || "On Duty").trim().toLowerCase();

    return (
      fueler.id &&
      isItemInUserProject(fueler.projectName) &&
      (status === "on duty" || status === "active")
    );
  });

  const operatorFueler =
    currentProjectFuelers.find((fueler) =>
      normalizeScopeValue(fueler.id) === normalizeScopeValue(currentUser?.fuelerId)
    ) ||
    currentProjectFuelers.find((fueler) =>
      normalizeScopeValue(fueler.name) === normalizeScopeValue(currentUser?.fullName)
    ) ||
    currentProjectFuelers[0];

  useEffect(() => {
    if (isOperator && operatorFueler?.id) {
      setFuelerId(operatorFueler.id);
    }
  }, [isOperator, operatorFueler?.id]);

  const sourceStationDisabled = transactionType === "External_Supply";

  const sourceStationOptions =
    transactionType === "External_Supply"
      ? []
      : currentProjectStations.map((station) => station.id);

  const destinationOptions =
    transactionType === "Direct_Refuel"
      ? currentProjectAssets.map((asset) => asset.id)
      : transactionType === "Internal_Transfer"
      ? currentProjectStations
          .filter((station) => station.id !== sourceStation)
          .map((station) => station.id)
      : transactionType === "External_Supply"
      ? currentProjectStations.map((station) => station.id)
      : transactionType === "External_Transfer"
      ? otherProjectStations.map((station) => station.id)
      : [];

  const selectedAsset = assets.find((asset) => asset.id === destinationId);
  const tankCapacity = Number(selectedAsset?.fuelTank) || 0;
  const selectedSourceStation = stations.find((station) => station.id === sourceStation);
  const selectedDestinationStation = (allStations.length ? allStations : stations).find(
    (station) => station.id === destinationId
  );

  const lastOdometer =
    transactionType === "Direct_Refuel" && destinationId
      ? getLastOdometerForEquipment?.(destinationId) || 0
      : 0;

  const resetAfterTransactionTypeChange = (nextType) => {
    setSourceStation("");
    setDestinationId("");
    setDieselQuantity("");
    setOdometer("");
    setSourceStationSearch("");
    setDestinationSearch("");

    if (!isOperator) {
      setFuelerId("");
      setFuelerSearch("");
    }

    if (nextType === "External_Supply") {
      setSourceStation("");
    }
  };

  const resetAfterSourceStationChange = () => {
    setDestinationId("");
    setDieselQuantity("");
    setOdometer("");
    setDestinationSearch("");
  };

  const handleDestinationChange = (value) => {
    setDestinationId(value);

    if (transactionType === "Direct_Refuel") {
      const lastReading = getLastOdometerForEquipment?.(value) || 0;
      setOdometer(lastReading ? String(lastReading) : "");
    } else {
      setOdometer("");
    }
  };

  const handleSave = () => {
    if (!transactionType) {
      alert("Please select transaction type.");
      return;
    }

    if (!transactionTypesForAdd.includes(transactionType)) {
      alert("You are not allowed to add this transaction type.");
      return;
    }

    if (transactionType !== "External_Supply" && !sourceStation) {
      alert("Please select source station.");
      return;
    }

    if (!fuelerId) {
      alert("Please select fueler.");
      return;
    }

    if (!destinationId) {
      alert("Please select destination.");
      return;
    }

    const qty = Number(dieselQuantity);

    if (!qty || qty <= 0) {
      alert("Diesel quantity must be greater than 0.");
      return;
    }

    if (
      transactionType === "Direct_Refuel" &&
      tankCapacity > 0 &&
      qty > tankCapacity
    ) {
      alert(
        `Diesel quantity cannot exceed tank capacity (${formatNumber(tankCapacity)} L).`
      );
      return;
    }

    if (transactionType === "Direct_Refuel") {
      const newOdometer = Number(odometer);

      if (!newOdometer || newOdometer <= 0) {
        alert("Please enter valid odometer / hour meter.");
        return;
      }

      if (lastOdometer > 0 && newOdometer < lastOdometer) {
        alert(
          `Odometer / hour meter cannot be less than last reading (${formatNumber(lastOdometer)}).`
        );
        return;
      }
    }

    if (!stationMeterPhoto || !assetPhoto || !assetMeterPhoto) {
      alert("All 3 photos are required.");
      return;
    }

    onSaveOperation?.({
      operationId: `OP-${Date.now()}`,
      transactionDate: new Date().toISOString(),
      transactionType,
      sourceStation: transactionType === "External_Supply" ? "" : sourceStation,
      fuelerId,
      destinationId,
      dieselQuantity: qty,
      odometer: transactionType === "Direct_Refuel" ? Number(odometer) : "",
      photos: {
        stationMeterPhoto,
        assetPhoto,
        assetMeterPhoto,
      },
    });
  };

  return (
    <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-black w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-2xl font-bold">Add Diesel Operation</h2>
            <p className="text-sm text-gray-500 mt-1">
              User project scope controls stations, fuelers, and destinations
            </p>
          </div>

          <button
            onClick={closeForm}
            className="text-2xl text-gray-500 hover:text-red-500 cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 gap-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-3 text-sm">
            User Project Scope:{" "}
            <span className="font-bold">
              {isAllProjectsUser ? "All Projects" : userProjectScope.join(", ") || "-"}
            </span>
          </div>

          <SearchableSelectField
            label="Transaction Type"
            value={transactionType}
            onChange={(value) => {
              setTransactionType(value);
              resetAfterTransactionTypeChange(value);
            }}
            options={transactionTypesForAdd}
            placeholder="Select Transaction Type"
            searchValue={transactionTypeSearch}
            setSearchValue={setTransactionTypeSearch}
          />

          <SearchableSelectField
            label="Source Station"
            value={transactionType === "External_Supply" ? "" : sourceStation}
            onChange={(value) => {
              setSourceStation(value);
              resetAfterSourceStationChange();
            }}
            options={sourceStationOptions}
            placeholder={
              transactionType === "External_Supply"
                ? "External Supply - No source station"
                : transactionType
                ? "Select Source Station"
                : "Select Transaction Type First"
            }
            searchValue={sourceStationSearch}
            setSearchValue={setSourceStationSearch}
            disabled={!transactionType || sourceStationDisabled}
          />

          {transactionType !== "External_Supply" && sourceStation && (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
              <label className="font-medium text-gray-700">Source Project</label>
              <div className="col-span-2 bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-gray-800 font-semibold">
                {selectedSourceStation?.project || "-"}
              </div>
            </div>
          )}

          <SearchableSelectField
            label="Fueler"
            value={fuelerId}
            onChange={(value) => setFuelerId(value)}
            options={currentProjectFuelers.map((fueler) => fueler.id)}
            placeholder={
              isOperator
                ? operatorFueler?.id || "Operator fueler is not linked"
                : "Select Fueler"
            }
            searchValue={fuelerSearch}
            setSearchValue={setFuelerSearch}
            disabled={isOperator}
          />

          <SearchableSelectField
            label="Destination"
            value={destinationId}
            onChange={(value) => handleDestinationChange(value)}
            options={destinationOptions}
            placeholder={
              !transactionType
                ? "Select Transaction Type First"
                : transactionType === "Direct_Refuel"
                ? "Search / Select Active Asset in Your Project"
                : transactionType === "External_Transfer"
                ? "Search / Select Station from Other Projects"
                : "Search / Select Destination Station"
            }
            searchValue={destinationSearch}
            setSearchValue={setDestinationSearch}
            disabled={
              !transactionType ||
              (transactionType !== "External_Supply" && !sourceStation)
            }
          />

          {transactionType === "External_Transfer" && destinationId && (
            <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
              <label className="font-medium text-gray-700">Destination Project</label>
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-gray-800 font-semibold">
                {selectedDestinationStation?.project || "-"}
              </div>
            </div>
          )}

          {transactionType === "Direct_Refuel" && destinationId && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">
                  Last Odometer / Hour Meter
                </label>
                <div className="col-span-2 bg-gray-100 border rounded-lg p-2 text-gray-700">
                  {lastOdometer > 0 ? formatNumber(lastOdometer) : "-"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
                <label className="font-medium text-gray-700">Tank Capacity</label>
                <div className="col-span-2 bg-gray-100 border rounded-lg p-2 text-gray-700">
                  {tankCapacity > 0 ? `${formatNumber(tankCapacity)} L` : "-"}
                </div>
              </div>
            </>
          )}

          <Field
            label="Diesel Quantity"
            value={dieselQuantity}
            onChange={(e) => setDieselQuantity(e.target.value)}
            type="number"
            placeholder="Enter quantity in liters"
          />

          <Field
            label="Odometer / Hour Meter"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            type="number"
            placeholder={
              transactionType === "Direct_Refuel"
                ? "New reading must be >= last reading"
                : "Not required for this transaction type"
            }
          />

          <div className="border-t pt-4">
            <h3 className="text-lg font-bold italic underline mb-3">
              Required Photos
            </h3>

            <ImageField
              label="Station Meter Photo *"
              preview={stationMeterPhoto}
              setPreview={setStationMeterPhoto}
            />

            <ImageField
              label="Equipment / Destination Photo *"
              preview={assetPhoto}
              setPreview={setAssetPhoto}
            />

            <ImageField
              label="Equipment Meter Photo *"
              preview={assetMeterPhoto}
              setPreview={setAssetMeterPhoto}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <button
            onClick={closeForm}
            className="bg-gray-200 px-4 py-2 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer"
          >
            Save Operation
          </button>
        </div>
      </div>
    </div>
  );
}


function SearchableSelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  searchValue,
  setSearchValue,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useOutsideClick(dropdownRef, () => setOpen(false));

  const filteredOptions = (options || []).filter((item) =>
    String(item || "")
      .toLowerCase()
      .includes(String(searchValue || "").toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
      <label className="font-medium text-gray-700">{label}</label>

      <div ref={dropdownRef} className="col-span-2 relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
          className={`w-full border rounded-lg p-3 text-left flex justify-between items-center ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white hover:border-yellow-500 cursor-pointer"
          }`}
        >
          <span className={value ? "text-black" : "text-gray-400"}>
            {value || placeholder}
          </span>

          <span className="text-gray-500">▾</span>
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-2xl z-[80] p-3">
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full border rounded-lg p-2 mb-2"
              autoFocus
            />

            <div className="max-h-56 overflow-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setSearchValue("");
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-100 cursor-pointer ${
                      value === item ? "bg-yellow-200 font-bold" : ""
                    }`}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <div className="text-sm text-red-500 px-3 py-2">
                  No matching results found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function GenericModal({ title, closeForm, saveText, onSave, children }) {
  return (
    <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          <button onClick={closeForm} className="text-gray-500 hover:text-black text-xl">×</button>
        </div>
 
        <div className="grid grid-cols-1 gap-4">
          {children}
        </div>
 
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button onClick={closeForm} className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg">Cancel</button>
          <button onClick={onSave} className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-lg">{saveText}</button>
        </div>
      </div>
    </div>
  );
}
 
function SelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
      <label className="font-medium text-gray-700">{label}</label>

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`col-span-2 border rounded-lg p-2 ${
          disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
        }`}
      >
        <option value="">{placeholder}</option>

        {(options || []).map((item, i) => (
          <option key={i} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
 
function ImageField({ label, preview, setPreview }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 sm:gap-4 mb-4">
      <label className="font-medium text-gray-700">{label}</label>
      <div className="col-span-2">
        <input
          type="file"
          accept="image/*"
          className="border rounded-lg p-2 w-full"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
        {preview && (
          <img
            src={preview}
            alt={label}
            className="mt-3 w-32 h-32 object-cover rounded-lg border"
          />
        )}
      </div>
    </div>
  );
}
 
function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isSameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function getHeaderIndex(headers, possibleNames) {
  const cleanHeaders = headers.map((header) => normalizeHeader(header));

  for (const name of possibleNames) {
    const index = cleanHeaders.indexOf(normalizeHeader(name));

    if (index !== -1) return index;
  }

  return -1;
}

function getValue(row, headers, possibleNames) {
  const index = getHeaderIndex(headers, possibleNames);

  return index !== -1 ? row[index] : "";
}
 
function formatNumber(value) {
  const number = Number(value);
 
  if (isNaN(number)) return value || "-";
 
  return number.toLocaleString("en-US");
}
 
function Th({ children, className = "", ...props }) {
  return (
    <th
      {...props}
      className={`px-3 py-3 text-left border-b border-r border-slate-600/60 last:border-r-0 text-[10px] font-black uppercase tracking-wide text-amber-300 whitespace-normal xl:whitespace-nowrap break-words leading-tight bg-slate-800 ${className}`}
    >
      {children}
    </th>
  );
}
 
function Td({ children, strong = false, className = "", ...props }) {
  return (
    <td
      {...props}
      className={`px-3 py-2.5 border-b border-r border-slate-700/45 last:border-r-0 whitespace-normal xl:whitespace-nowrap break-words leading-tight max-w-[260px] ${
        strong
          ? "font-bold text-sky-200"
          : "text-slate-100"
      } ${className}`}
    >
      {children}
    </td>
  );
}
 
function Field({
  label,
  placeholder = "",
  type = "text",
  value,
  onChange,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-2 sm:gap-4">
      <label className="font-medium text-gray-700">
        {label}
      </label>
 
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="col-span-2 border rounded-lg p-2"
        placeholder={placeholder}
      />
    </div>
  );
}
 
function Card({ title, value }) {
  return (
    <div className="fleet-modal-panel relative bg-slate-900/80 border border-slate-700/80 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-0 overflow-hidden transition-all duration-200 hover:border-amber-400/50 hover:-translate-y-0.5">
      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-400/80" />
      <p className="text-[11px] sm:text-xs lg:text-sm text-slate-400 truncate pr-5">{title}</p>
 
      <h2 className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-slate-100 leading-tight break-words tabular-nums">
        {value}
      </h2>
    </div>
  );
}




function AuditTimelinePage({
  approvals = [],
  activityLog = [],
  currentUser,
  hasPermission = () => false,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterModule, setFilterModule] = useState("All");
  const [filterRisk, setFilterRisk] = useState("All");
  const [search, setSearch] = useState("");

  const timelineItems = buildAuditTimelineItems({ approvals, activityLog, currentUser });

  const moduleOptions = ["All", ...new Set(timelineItems.map((item) => item.module).filter(Boolean))];
  const statusOptions = ["All", ...new Set(timelineItems.map((item) => item.status).filter(Boolean))];
  const riskOptions = ["All", ...new Set(timelineItems.map((item) => item.riskLevel).filter(Boolean))];

  const filteredTimeline = timelineItems.filter((item) => {
    const haystack = [
      item.title,
      item.description,
      item.module,
      item.status,
      item.actorName,
      item.actorRole,
      item.entityType,
      item.entityId,
      item.riskLevel,
      ...(item.changedFields || []).flatMap((field) => [field.label, field.oldValue, field.newValue]),
    ]
      .join(" ")
      .toLowerCase();

    if (filterStatus !== "All" && item.status !== filterStatus) return false;
    if (filterModule !== "All" && item.module !== filterModule) return false;
    if (filterRisk !== "All" && item.riskLevel !== filterRisk) return false;
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: timelineItems.length,
    pending: timelineItems.filter((item) => item.status === "Pending").length,
    approved: timelineItems.filter((item) => item.status === "Approved").length,
    rejected: timelineItems.filter((item) => item.status === "Rejected").length,
    high: timelineItems.filter((item) => item.riskLevel === "High").length,
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Pending") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    if (status === "Approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (status === "Rejected") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  };

  const getRiskBadgeClass = (risk) => {
    if (risk === "High") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="fleet-page-shell relative isolate w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">Enterprise Audit Timeline</h1>
            <p className="text-slate-400 text-sm">Trace actions, approvals, review decisions, risk, and field-level changes.</p>
          </div>

          <button
            onClick={() => exportAuditTimelineCSV(filteredTimeline)}
            disabled={!hasPermission("auditTimeline", "export") || filteredTimeline.length === 0}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            Export Timeline CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Total Events", value: counts.total },
            { label: "Pending", value: counts.pending },
            { label: "Approved", value: counts.approved },
            { label: "Rejected", value: counts.rejected },
            { label: "High Risk", value: counts.high },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl shadow-black/10">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl shadow-black/10 backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timeline..."
              className="bg-[#080d19] border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 py-2.5 rounded-xl outline-none"
            />

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {statusOptions.map((item) => <option key={item}>{item}</option>)}
            </select>

            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {moduleOptions.map((item) => <option key={item}>{item}</option>)}
            </select>

            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl outline-none">
              {riskOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          {filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No timeline events found.</div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredTimeline.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 ${item.status === "Rejected" ? "bg-red-400" : item.status === "Approved" ? "bg-emerald-400" : item.status === "Pending" ? "bg-amber-400" : "bg-blue-400"}`} />
                        <div className="w-px flex-1 bg-slate-700 mt-2" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
                          <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${getRiskBadgeClass(item.riskLevel)}`}>{item.riskLevel}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-300">{item.module}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-100">{item.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {formatNotificationDate(item.createdAt)} · {item.actorName} · {item.actorRole}
                        </p>
                      </div>
                    </div>

                    <div className="xl:text-right min-w-[180px]">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.entityType}</p>
                      <p className="text-sm font-bold text-amber-300 break-words">{item.entityId}</p>
                      <button onClick={() => setSelectedEvent(item)} className="mt-2 text-xs text-blue-300 hover:text-yellow-400 transition-colors">
                        View details
                      </button>
                    </div>
                  </div>

                  {(item.changedFields || []).length > 0 && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 pl-6">
                      {item.changedFields.slice(0, 4).map((field, index) => (
                        <div key={`${item.id}-${field.field}-${index}`} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1">{field.label || makeFieldLabel(field.field)}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-300 line-through break-all">{field.oldValue}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-300 font-bold break-all">{field.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">Timeline Event</p>
                <h2 className="text-xl font-black text-slate-100">{selectedEvent.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{formatNotificationDate(selectedEvent.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  ["Status", selectedEvent.status],
                  ["Module", selectedEvent.module],
                  ["Risk", selectedEvent.riskLevel],
                  ["Sensitivity", selectedEvent.sensitivity],
                  ["Actor", selectedEvent.actorName],
                  ["Role", selectedEvent.actorRole],
                  ["Entity Type", selectedEvent.entityType],
                  ["Entity ID", selectedEvent.entityId],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 break-words">{value || "-"}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">Description</p>
                <p className="text-sm text-slate-100 leading-6">{selectedEvent.description}</p>
              </div>

              {(selectedEvent.changedFields || []).length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-3">Changed Fields</p>
                  <div className="space-y-2">
                    {selectedEvent.changedFields.map((field, index) => (
                      <div key={`${field.field}-${index}`} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-bold text-slate-100">{field.label || makeFieldLabel(field.field)}</p>
                          {field.sensitive && <span className="text-[10px] bg-red-500/15 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5">Sensitive</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-red-300 mb-1">Old Value</p>
                            <p className="text-slate-100 break-words">{field.oldValue}</p>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300 mb-1">New Value</p>
                            <p className="text-slate-100 break-words">{field.newValue}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationCenterPage({
  notifications = [],
  currentUser,
  markNotificationRead = () => {},
  markAllNotificationsRead = () => {},
  setPage = () => {},
}) {
  const [filter, setFilter] = useState("All");
  const [selectedNotification, setSelectedNotification] = useState(null);

  const counts = {
    all: notifications.length,
    unread: notifications.filter((item) => !item.read).length,
    approvals: notifications.filter((item) => item.type === "approval").length,
    high: notifications.filter((item) => item.priority === "High").length,
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.read;
    if (filter === "Approvals") return item.type === "approval";
    if (filter === "High Priority") return item.priority === "High";
    return true;
  });

  const openNotification = (item) => {
    markNotificationRead(item.id);
    setSelectedNotification(item);
  };

  const goToSource = (item) => {
    markNotificationRead(item.id);
    if (item.route === "approvals" && ["Admin", "Manager"].includes(currentUser?.role)) {
      setPage("approvals");
      return;
    }
    if (["operations", "assets", "stations", "fuelers", "projects", "reports"].includes(item.route)) {
      setPage(item.route);
    }
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "bg-red-500/15 text-red-300 border-red-500/30";
    if (priority === "Medium") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-4 text-[12px] lg:text-[13px]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">Notification Center</h1>
            <p className="text-slate-400 text-sm">Operational alerts, approval updates, and activity notifications</p>
          </div>

          <button
            onClick={markAllNotificationsRead}
            disabled={counts.unread === 0}
            className={`px-4 py-2.5 rounded-xl font-bold border transition ${
              counts.unread === 0
                ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/15"
            }`}
          >
            Mark all as read
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Notifications", value: counts.all },
            { label: "Unread", value: counts.unread },
            { label: "Approval Updates", value: counts.approvals },
            { label: "High Priority", value: counts.high },
          ].map((card) => (
            <div key={card.label} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
              <p className="text-2xl font-black text-amber-300 mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {["All", "Unread", "Approvals", "High Priority"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                filter === item
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">
              No notifications found.
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 shadow-xl transition ${
                  item.read ? "border-slate-800/80 opacity-80" : "border-amber-400/50 shadow-amber-500/10"
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                  <button onClick={() => openNotification(item)} className="flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {!item.read && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                      <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {item.category}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getPriorityClass(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.module}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-100 break-words">{item.title}</h2>
                    <p className="text-sm text-slate-400 mt-1 break-words">{item.message}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatNotificationDate(item.createdAt)}</p>
                  </button>

                  <div className="w-full xl:w-[190px] flex xl:flex-col gap-2">
                    <button
                      onClick={() => openNotification(item)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 rounded-xl font-bold border border-slate-700"
                    >
                      View
                    </button>
                    {item.actionable && (
                      <button
                        onClick={() => goToSource(item)}
                        className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 rounded-xl font-black"
                      >
                        Open Approval
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedNotification && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">{selectedNotification.category}</p>
                <h2 className="text-xl font-black text-slate-100">{selectedNotification.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{formatNotificationDate(selectedNotification.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-4 py-2 font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">Message</p>
                <p className="text-slate-100 text-sm leading-6">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Status</p>
                  <p className="text-sm font-bold text-slate-100">{selectedNotification.status}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity</p>
                  <p className="text-sm font-bold text-slate-100">{selectedNotification.entityType || "-"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Entity ID</p>
                  <p className="text-sm font-bold text-amber-300 break-words">{selectedNotification.entityId || "-"}</p>
                </div>
              </div>

              {selectedNotification.actionable && (
                <button
                  onClick={() => goToSource(selectedNotification)}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-3 rounded-xl font-black"
                >
                  Open Related Approval
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalsPage({
  approvals = [],
  setApprovals,
  currentUser,
  hasPermission = () => false,
  setData,
  trackActivity = () => {},
  showToast,
}) {
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [reviewNotes, setReviewNotes] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);

  const visibleApprovals = approvals.filter((item) => {
    if (!canUserViewApproval(currentUser, item)) return false;
    return selectedStatus === "All" ? true : item.status === selectedStatus;
  });

  const approveRequest = (request) => {
    if (!canUserReviewApproval(currentUser, request)) return;

    if (request.status !== "Pending") {
      showToast?.("warning", "This request has already been reviewed.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || "Approved";
    const routeApprovers = request.approvalRoute?.requiredApprovers || [];
    const currentStage =
      currentUser?.role === "Admin"
        ? routeApprovers.find((approver) => approver.status === "Pending")
        : routeApprovers.find((approver) => approver.userId === currentUser?.id && approver.status === "Pending");

    const updatedApprovers = routeApprovers.map((approver) => {
      const shouldApprove = currentUser?.role === "Admin"
        ? approver.userId === currentStage?.userId && approver.approvalStage === currentStage?.approvalStage
        : approver.userId === currentUser?.id && approver.status === "Pending";

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

    const fullyApproved = updatedApprovers.length > 0 && updatedApprovers.every((approver) => approver.status === "Approved");

    if (fullyApproved && request.type === "operation_external_supply" && request.payload?.row) {
      setData?.((prev) => [...prev, request.payload.row]);
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
  };

  const rejectRequest = (request) => {
    if (!canUserReviewApproval(currentUser, request) && currentUser?.role !== "Admin") return;

    if (request.status !== "Pending") {
      showToast?.("warning", "This request has already been reviewed.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const note = reviewNotes[request.id] || "Rejected";

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
                      <p className="text-xs text-slate-500 mt-1">
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

function UsersPage({
  users,
  setUsers,
  projects = [],
  currentUser,
  currentUserId,
  setCurrentUserId,
  hasPermission = () => false,
  activityLog = [],
  setActivityLog,
  trackActivity = () => {},
  showToast,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showActivity, setShowActivity] = useState(false);

  const emptyForm = {
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    role: "Operator",
    status: "Active",
    assignedProjects: ["All"],
    passwordResetRequired: true,
  };

  const [form, setForm] = useState(emptyForm);

  const roleOptions = Object.keys(ROLE_PERMISSIONS);
  const activeProjects = projects.filter((project) => project.id);
  const isRestrictedScopeRole = ["Operator", "Supervisor"].includes(form.role);

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      user.fullName?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search);

    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    const matchesStatus = statusFilter === "All" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const openAddUser = () => {
    if (!hasPermission("users", "add")) return;
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditUser = (user) => {
    if (!hasPermission("users", "edit")) return;
    setEditingUser(user);
    setForm({
      fullName: user.fullName || "",
      username: user.username || "",
      email: user.email || "",
      mobile: user.mobile || "",
      role: user.role || "Operator",
      status: user.status || "Active",
      assignedProjects: user.assignedProjects?.length ? user.assignedProjects : ["All"],
      passwordResetRequired: Boolean(user.passwordResetRequired),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const toggleProjectScope = (projectId) => {
    setForm((prev) => {
      if (projectId === "All") {
        return { ...prev, assignedProjects: ["All"] };
      }

      const withoutAll = (prev.assignedProjects || []).filter((item) => item !== "All");
      const exists = withoutAll.includes(projectId);
      const nextProjects = exists
        ? withoutAll.filter((item) => item !== projectId)
        : [...withoutAll, projectId];

      return {
        ...prev,
        assignedProjects: nextProjects.length ? nextProjects : ["All"],
      };
    });
  };

  const saveUser = () => {
    if (!form.fullName.trim()) {
      showToast?.("warning", "Please enter full name.");
      return;
    }

    if (!form.username.trim()) {
      showToast?.("warning", "Please enter username.");
      return;
    }

    if (!form.email.trim()) {
      showToast?.("warning", "Please enter email.");
      return;
    }

    if (["Operator", "Supervisor"].includes(form.role)) {
      const assignedProjects = (form.assignedProjects || []).filter((item) => item !== "All");

      if (assignedProjects.length === 0) {
        showToast?.("warning", "Operator and Supervisor users must be assigned to at least one specific project.");
        return;
      }
    }

    const duplicateUsername = users.some(
      (user) =>
        user.username?.toLowerCase() === form.username.trim().toLowerCase() &&
        user.id !== editingUser?.id
    );

    if (duplicateUsername) {
      showToast?.("error", "Username already exists.");
      return;
    }

    if (editingUser) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                ...form,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.fullName || "System",
              }
            : user
        )
      );

      trackActivity("Update User", "users", `${form.fullName} updated.`);
      showToast?.("success", "User updated successfully.");
      closeForm();
      return;
    }

    const newUser = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      ...form,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.fullName || "System",
      lastLogin: "",
    };

    setUsers((prev) => [...prev, newUser]);
    trackActivity("Add User", "users", `${newUser.fullName} created with ${newUser.role} role.`);
    showToast?.("success", "User added successfully.");
    closeForm();
  };

  const toggleUserStatus = (user) => {
    if (!hasPermission("users", "deactivate")) return;

    if (user.id === currentUser?.id) {
      showToast?.("warning", "You cannot deactivate the currently signed-in user.");
      return;
    }

    const newStatus = user.status === "Active" ? "Inactive" : "Active";

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );

    trackActivity("Change User Status", "users", `${user.fullName} changed to ${newStatus}.`);
    showToast?.("success", `User changed to ${newStatus}.`);
  };

  const resetPassword = (user) => {
    if (!hasPermission("users", "resetPassword")) return;

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? { ...item, passwordResetRequired: true, updatedAt: new Date().toISOString() }
          : item
      )
    );

    trackActivity("Reset Password", "users", `${user.fullName} marked for password reset.`);
    showToast?.("success", "Password reset required flag enabled.");
  };

  const loginAsUser = (user) => {
    if (user.status !== "Active") {
      showToast?.("warning", "Inactive users cannot sign in.");
      return;
    }

    setCurrentUserId(user.id);
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, lastLogin: new Date().toISOString() } : item
      )
    );

    setActivityLog?.((prev) => [
      createActivityRecord({
        user,
        action: "Switch Session",
        module: "authentication",
        details: `Local test session switched to ${user.fullName}.`,
      }),
      ...prev,
    ]);

    showToast?.("success", `Signed in locally as ${user.fullName}.`);
  };

  const formatProjectScope = (scope = []) => {
    if (!scope.length || scope.includes("All")) return "All Projects";
    return scope.join(", ");
  };

  return (
    <div className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">Users & Roles</h1>
            <p className="text-slate-400 text-sm">Enterprise access control, project scope, and activity tracking</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl font-bold transition"
            >
              {showActivity ? "Hide Activity" : "View Activity"}
            </button>

            {hasPermission("users", "add") && (
              <button
                onClick={openAddUser}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                + Add User
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Total Users</p>
            <p className="text-2xl font-black mt-2">{users.length}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Active</p>
            <p className="text-2xl font-black mt-2 text-emerald-300">{users.filter((u) => u.status === "Active").length}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Inactive</p>
            <p className="text-2xl font-black mt-2 text-red-300">{users.filter((u) => u.status === "Inactive").length}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Roles</p>
            <p className="text-2xl font-black mt-2 text-amber-300">{roleOptions.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            >
              <option value="All">All Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm">
              Current: <span className="text-amber-300 font-bold">{currentUser?.fullName}</span>
            </div>
          </div>
        </div>

        {showActivity && (
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 mb-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black">Recent Activity</h2>
              <span className="text-xs text-slate-400">Local mode / backend-ready audit feed</span>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 sticky top-0 z-[5]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLog.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-slate-400">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    activityLog.slice(0, 30).map((item) => (
                      <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                        <td className="p-3 whitespace-nowrap">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
                        <td className="p-3">{item.userName}</td>
                        <td className="p-3">{item.module}</td>
                        <td className="p-3 font-bold text-amber-300">{item.action}</td>
                        <td className="p-3 text-slate-300">{item.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[1050px]">
              <thead className="bg-slate-950 sticky top-0 z-[5]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Project Scope</th>
                  <th className="p-3">Password Reset</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-800 hover:bg-slate-800/50 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{user.fullName}</div>
                      <div className="text-xs text-slate-400">@{user.username} • {user.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/20 font-bold">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg border font-bold ${user.status === "Active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3 max-w-[250px] truncate">{formatProjectScope(user.assignedProjects)}</td>
                    <td className="p-3">{user.passwordResetRequired ? "Required" : "No"}</td>
                    <td className="p-3 whitespace-nowrap">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => loginAsUser(user)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold"
                        >
                          Login Test
                        </button>

                        {hasPermission("users", "edit") && (
                          <button
                            onClick={() => openEditUser(user)}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold"
                          >
                            Edit
                          </button>
                        )}

                        {hasPermission("users", "resetPassword") && (
                          <button
                            onClick={() => resetPassword(user)}
                            className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-bold"
                          >
                            Reset
                          </button>
                        )}

                        {hasPermission("users", "deactivate") && (
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/35 text-red-300 text-xs font-bold"
                          >
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">{editingUser ? "Edit User" : "Add User"}</h2>
                <p className="text-sm text-slate-400">Local user profile now, backend user account later.</p>
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Username</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Mobile</label>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm({
                      ...form,
                      role: nextRole,
                      assignedProjects: ["Operator", "Supervisor"].includes(nextRole)
                        ? (form.assignedProjects || []).filter((item) => item !== "All")
                        : (form.assignedProjects?.length ? form.assignedProjects : ["All"]),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400"
                >
                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-amber-400">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-2">Project Scope</label>
                {isRestrictedScopeRole && (
                  <p className="text-xs text-amber-300 mb-2">
                    Operator and Supervisor must be linked to specific projects only. All Projects is disabled for these roles.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {!isRestrictedScopeRole && (
                    <button
                      type="button"
                      onClick={() => toggleProjectScope("All")}
                      className={`text-left rounded-xl border p-3 transition ${form.assignedProjects.includes("All") ? "bg-amber-400 text-slate-950 border-amber-400 font-bold" : "bg-slate-900 border-slate-700 hover:border-amber-400"}`}
                    >
                      All Projects
                    </button>
                  )}

                  {activeProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => toggleProjectScope(project.id)}
                      className={`text-left rounded-xl border p-3 transition ${form.assignedProjects.includes(project.id) ? "bg-amber-400 text-slate-950 border-amber-400 font-bold" : "bg-slate-900 border-slate-700 hover:border-amber-400"}`}
                    >
                      <div>{project.id}</div>
                      <div className="text-xs opacity-80">{project.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="md:col-span-2 flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-3">
                <input
                  type="checkbox"
                  checked={form.passwordResetRequired}
                  onChange={(e) => setForm({ ...form, passwordResetRequired: e.target.checked })}
                />
                <span>Require password reset on next login</span>
              </label>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold">Cancel</button>
              <button onClick={saveUser} className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black">Save User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ type, message }) {
  const styles = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500 text-black",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl text-white font-medium transition-all duration-300 ${
        styles[type] || "bg-gray-700"
      }`}
    >
      <span className="mr-2">{icons[type]}</span>
      {message}
    </div>
  );
}
function StatusBadge({ status }) {
  const cleanStatus = status?.trim().toLowerCase();

  const isActive = cleanStatus === "active";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-green-500/15 text-green-400 border border-green-500/30"
          : "bg-red-500/15 text-red-400 border border-red-500/30"
      }`}
    >
      {status || "-"}
    </span>
  );
}