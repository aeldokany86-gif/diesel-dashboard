// FILE: app/page.js
// Replace only app/page.js with this content.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import api from "./services/api";

import SidebarSvgIcon from "./components/icons/SidebarSvgIcon";
import {
  LayoutDashboard,
  Truck,
  Fuel,
  Users,
  Building2,
  FileBarChart2,
  Bell,
} from "./components/icons/SidebarIcons";
import Toast from "./components/feedback/Toast";

import OperationsPage from "./features/operations/OperationsPage";
import AssetsPage from "./features/assets/AssetsPage";
import StationsPage from "./features/stations/StationsPage";
import TeamPage from "./features/team/TeamPage";
import ProjectsPage from "./features/projects/ProjectsPage";
import UsersPage from "./features/users/UsersPage";
import ApprovalsPage from "./features/approvals/ApprovalsPage";
import CompaniesPage, {
  ForcePasswordChangePage,
} from "./features/companies/CompaniesPage";
import NotificationCenterPage from "./features/notifications/NotificationCenterPage";
import AuditTimelinePage from "./features/audit/AuditTimelinePage";
import ReportsPage from "./features/reports/ReportsPage";
import DataImportCenterPage from "./features/imports/DataImportCenterPage";

import {
  normalizeSystemUserStatus,
  normalizeScopeValue,
  filterAvailableProjects,
  mapBackendAssetForState,
  mapBackendStationForState,
  mapBackendProjectForState,
  mapBackendEmployeeForState,
  normalizeBackendRoleName,
  mapBackendOperationForState,
  getHeaderIndex,
  getValue,
  formatNumber,
} from "./lib/helpers";

import {
  mapBackendAssetTransferForState,
  mapBackendStationTransferForState,
  mapBackendEmployeeTransferForState,
  getStationTransferWorkflowMessageDescriptor,
  getEmployeeTransferWorkflowMessageDescriptor,
} from "./lib/transferHelpers";

import {
  mergeOperationRequestHeaders,
  isAssetRefuelTransactionType,
} from "./lib/operationHelpers";

import {
  fetchOperations,
  fetchPendingOperationApprovals,
} from "./services/operationsService";

import { fetchPendingOperationCorrections } from "./services/operationCorrectionsService";

import {
  fetchProjects,
  fetchProjectById,
  createProjectRecord,
  createBootstrapFirstProject,
  updateProjectRecord,
  assignProjectManager,
  deleteProjectRecord,
} from "./services/projectsService";

import {
  fetchCompanies,
  fetchPublicCompanies,
} from "./services/companiesService";
import { fetchDataImportAccess } from "./services/importsService";

import {
  fetchAssets,
  fetchAssetById,
  createAssetRecord,
  deleteAssetRecord,
  fetchPendingAssetTransfers,
  reviewAssetTransfer,
  resetAssetOdometer,
  fetchAssetActionRequests,
  reviewAssetActionRequest,
} from "./services/assetsService";

import {
  fetchStations,
  fetchStationById,
  fetchPendingStationTransfers,
  reviewStationTransfer,
  zeroStationBalance,
  adjustStationInventory,
  fetchStationActionRequests,
  reviewStationActionRequest,
} from "./services/stationsService";

import {
  fetchEmployees,
  createEmployeeRecord,
  checkEmployeeIdAvailability,
  updateEmployeeRecord,
  fetchPendingEmployeeTransfers,
  createEmployeeTransfer,
  createBulkEmployeeTransfer,
  reviewEmployeeTransfer,
} from "./services/employeesService";

import {
  fetchUsers,
  createUserRecord,
  updateUserStatus,
  fetchRoles,
} from "./services/usersService";

import {
  mapBackendOperationApprovalForFrontend,
  mapBackendOperationCorrectionForFrontend,
  createApprovalRequest,
} from "./lib/approvalHelpers";

import {
  hasPermissionForUser,
  canAccessPageForUser,
  canUserViewApproval,
} from "./lib/permissionHelpers";

import { buildNotificationItems } from "./lib/notificationHelpers";

import {
  isPlatformContextValue,
  isPlatformCompany,
  getPlatformCompanyId,
  mergePlatformConsoleWithCompanies,
  normalizeCompanyForState,
  isPlatformAdminUser,
  getItemCompanyId,
  companyMatches,
  makeTenantEntityKey,
  tenantEntityMatches,
  filterDuplicateTenantEntities,
  filterByCompany,
  filterByCompanyWithProjectFallback,
} from "./lib/companyHelpers";

const OPERATION_HEADERS = [
  "operation_id",
  "transaction_datetime",
  "transaction_type",
  "source_station",
  "fueler_id",
  "destination_id",
  "diesel_quantity",
  "odometer_at_fueling",
  "station_counter",
  "external_station_name",
  "invoice_number",
  "operation_status",
  "backend_operation_id",
];

const COMPANY_CONTEXT_STORAGE_KEY = "fleetfuelpro_company_context";
const THEME_STORAGE_KEY = "fleetfuelpro_theme";

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

const NETWORK_OFFLINE_MESSAGE =
  "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE =
  "Connection to server is unavailable. Please try again.";

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

function getFriendlyApiErrorMessage(
  error,
  fallbackMessage = BACKEND_UNAVAILABLE_MESSAGE,
) {
  if (isNetworkConnectionError(error)) return NETWORK_OFFLINE_MESSAGE;

  const backendMessage =
    error?.response?.data?.message || error?.response?.data?.error;

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
  const safeMessage = getFriendlyApiErrorMessage(
    error,
    BACKEND_UNAVAILABLE_MESSAGE,
  );

  // Use warn instead of error for expected connection/backend failures so Next.js dev overlay does not block the UI.
  console.warn(`${safeLabel}: ${safeMessage}`);
}

function makeUsernameFromUser({ id, fullName, email }) {
  const emailName = String(email || "").split("@")[0];
  const raw = emailName || fullName || id || "user";

  return (
    String(raw)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "") || String(id || "user")
  );
}

function buildLegacyUserFromAuthUser(authUser) {
  if (!authUser) return null;

  const role = normalizeBackendRoleName(authUser.roleName);
  const companyId = authUser.companyId || "";

  const backendAssignedProjects = Array.isArray(authUser.assignedProjects)
    ? authUser.assignedProjects.filter(Boolean)
    : [];

  const backendManagedProjects = Array.isArray(authUser.managedProjects)
    ? authUser.managedProjects.filter(Boolean)
    : [];

  const assignedProjects = backendAssignedProjects.length
    ? backendAssignedProjects
    : ["Admin", "PlatformAdmin", "TopManagement"].includes(role)
      ? ["All"]
      : [];

  const managedProjects = backendManagedProjects.length
    ? backendManagedProjects
    : ["Admin", "PlatformAdmin", "TopManagement"].includes(role)
      ? ["All"]
      : [];

  const linkedEmployee = authUser.linkedEmployee || null;

  return {
    id: authUser.id,
    fullName: authUser.fullName,
    username:
      authUser.username ||
      makeUsernameFromUser({
        id: authUser.id,
        fullName: authUser.fullName,
        email: authUser.email,
      }),
    email: authUser.email,
    role,
    companyId,
    tenantKey: `${normalizeScopeValue(companyId) || "global"}::${normalizeScopeValue(authUser.id) || "no-id"}`,
    status: authUser.isActive === false ? "Inactive" : "Active",
    fuelerId:
      authUser.fuelerId ||
      authUser.employeeId ||
      linkedEmployee?.employeeId ||
      linkedEmployee?.id ||
      authUser.id,
    teamId:
      authUser.teamId ||
      authUser.linkedEmployeeId ||
      linkedEmployee?.id ||
      authUser.id,
    linkedEmployeeId: authUser.linkedEmployeeId || linkedEmployee?.id || "",
    employeeId: authUser.employeeId || linkedEmployee?.employeeId || "",
    linkedEmployee,
    assignedProjects,
    managedProjects,
    reportingManagerId: authUser.reportingManagerId || "",
    mobile: authUser.phone || "",
    teamProject:
      role === "PlatformAdmin"
        ? "Platform Console"
        : authUser.teamProject ||
          linkedEmployee?.projectName ||
          authUser.companyName ||
          "",
    teamStatus: authUser.teamStatus || linkedEmployee?.status || "",
    passwordResetRequired: Boolean(authUser.mustChangePassword),
    requiresFirstProject: Boolean(authUser.requiresFirstProject),
    requiredSetupStep: authUser.requiredSetupStep || null,
    lastLogin: "",
    createdAt: new Date().toISOString(),
    backendPermissions: authUser.permissions || [],
    preferredLanguage: authUser.preferredLanguage || "en",
  };
}

const BACKEND_PAGE_PERMISSION_MAP = {
  operations: "operations.read",
  assets: "assets.read",
  stations: "stations.read",
  team: "team.read",
  projects: "projects.read",
  reports: "reports.read",
  companies: "companies.read",
  notifications: null,
  auditTimeline: "audit_logs.read",
  approvals: "approvals.read",
  users: "users.read",
};

function mapLegacyPermissionToBackendPermission(module, action = "view") {
  const normalizedModule = String(module || "").trim();
  const normalizedAction = String(action || "view").trim();

  const moduleMap = {
    auditTimeline: "audit_logs",
    auditLog: "audit_logs",
    companies: "companies",
    users: "users",
    projects: "projects",
    assets: "assets",
    stations: "stations",
    team: "team",
    operations: "operations",
    approvals: "approvals",
    reports: "reports",
    settings: "settings",
  };

  const backendModule = moduleMap[normalizedModule] || normalizedModule;

  if (normalizedAction === "view") return `${backendModule}.read`;

  if (normalizedAction === "add") {
    if (backendModule === "operations") return "operations.create";
    if (backendModule === "users") return "users.create";
    return `${backendModule}.manage`;
  }

  if (normalizedAction === "edit") {
    if (backendModule === "operations") return "operations.correct";
    if (backendModule === "users") return "users.update";
    return `${backendModule}.manage`;
  }

  if (normalizedAction === "delete") return `${backendModule}.manage`;
  if (normalizedAction === "approve")
    return backendModule === "operations"
      ? "approvals.manage"
      : `${backendModule}.manage`;
  if (normalizedAction === "export")
    return backendModule === "audit_logs"
      ? "audit_logs.read"
      : "reports.export";
  if (normalizedAction === "print") return `${backendModule}.read`;
  if (normalizedAction === "deactivate") return "users.status.change";
  if (normalizedAction === "resetPassword") return "users.update";
  if (normalizedAction === "assignRoles") return "users.update";
  if (normalizedAction === "markRead") return null;

  return `${backendModule}.${normalizedAction}`;
}

function createActivityRecord({
  user,
  action,
  module,
  details,
  i18n = {},
}) {
  return {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: user?.id || "System",
    userName: user?.fullName || user?.name || "System",
    role: user?.role || "System",
    action,
    module,
    details,

    // Structured localization metadata. Existing callers remain compatible.
    actionKey: i18n.actionKey || "",
    actionParams: i18n.actionParams || {},
    actionEnumParams: i18n.actionEnumParams || {},
    actionFallback: i18n.actionFallback || action || "",
    detailsKey: i18n.detailsKey || "",
    detailsParams: i18n.detailsParams || {},
    detailsEnumParams: i18n.detailsEnumParams || {},
    detailsFallback: i18n.detailsFallback || details || "",

    createdAt: new Date().toISOString(),
  };
}

function getUserProjectScope(user) {
  if (!user || !Array.isArray(user.assignedProjects)) return [];
  return user.assignedProjects;
}

function userCanAccessAllProjects(user) {
  if (!user) return false;

  // Admin remains company-wide.
  // Managers are project-scoped unless they are explicitly assigned to All.
  // This makes approval-routing tests easier and closer to real project ownership.
  if (["PlatformAdmin", "Admin", "TopManagement"].includes(user.role))
    return true;

  const scope = getUserProjectScope(user);
  return (
    scope.includes("All") && !["Operator", "Supervisor"].includes(user.role)
  );
}

function getAssetProjectValue(assetId, assets = []) {
  const normalizedAssetId = normalizeScopeValue(assetId);

  if (!normalizedAssetId) return "";

  const asset = assets.find((item) => {
    const candidateIds = [
      item?.id,
      item?.assetId,
      item?.backendId,
      item?.assetBackendId,
      item?.equipmentNo,
      item?.equipmentNumber,
      item?.equipment_no,
      item?.equipment_number,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    return candidateIds.includes(normalizedAssetId);
  });

  return (
    asset?.project ||
    asset?.projectName ||
    asset?.projectId ||
    asset?.projectCode ||
    ""
  );
}

function getStationProjectValue(stationId, stations = []) {
  const normalizedStationId = normalizeScopeValue(stationId);

  if (!normalizedStationId) return "";

  const station = stations.find((item) => {
    const candidateIds = [
      item?.id,
      item?.stationId,
      item?.station_id,
      item?.backendId,
      item?.stationBackendId,
      item?.name,
      item?.stationName,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    return candidateIds.includes(normalizedStationId);
  });

  return (
    station?.project ||
    station?.projectName ||
    station?.projectId ||
    station?.projectCode ||
    ""
  );
}

function getRowProjectValues(row, headers, assets = [], stations = []) {
  const operation =
    row?.__operation || row?.operation || row?.backendOperation || null;

  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);

  const operationType = String(
    operation?.type || (typeIndex !== -1 ? row[typeIndex] : ""),
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  /*
    Scope by the operation's primary historical project.
    Source/destination snapshots are used together only for cross-project
    External Transfer, where both project managers must be able to see it.
  */
  const primarySnapshotValues = [
    operation?.projectIdAtOperation,
    operation?.projectNameAtOperation,
  ].filter(Boolean);

  const crossProjectSnapshotValues =
    operationType === "EXTERNAL_TRANSFER"
      ? [
          ...primarySnapshotValues,
          operation?.sourceProjectIdAtOperation,
          operation?.sourceProjectNameAtOperation,
          operation?.destinationProjectIdAtOperation,
          operation?.destinationProjectNameAtOperation,
        ].filter(Boolean)
      : primarySnapshotValues;

  if (crossProjectSnapshotValues.length) {
    return Array.from(
      new Map(
        crossProjectSnapshotValues.map((value) => [
          normalizeScopeValue(value),
          value,
        ]),
      ).values(),
    );
  }

  // Legacy fallback only for operations created before project snapshots existed.
  const explicitProject = getValue(row, headers, [
    "project",
    "Project",
    "project_id",
    "Project ID",
    "project name",
    "Project Name",
    "site",
    "Site",
  ]);

  if (explicitProject) return [explicitProject];

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

  const assetIndex = getHeaderIndex(headers, [
    "asset_id",
    "Asset ID",
    "asset id",
    "equipment_no",
    "Equipment No",
    "equipment no",
    "equipment_number",
    "Equipment Number",
    "machine_id",
    "Machine ID",
    "target_equipment",
    "Target Equipment",
  ]);

  const sourceStation = sourceIndex !== -1 ? row[sourceIndex] : "";
  const destination = destinationIndex !== -1 ? row[destinationIndex] : "";
  const assetValue = assetIndex !== -1 ? row[assetIndex] : "";

  if (isAssetRefuelTransactionType(operationType)) {
    const projectValue =
      getAssetProjectValue(assetValue, assets) ||
      getAssetProjectValue(destination, assets);

    return projectValue ? [projectValue] : [];
  }

  return [
    getStationProjectValue(sourceStation, stations),
    getStationProjectValue(destination, stations),
    getAssetProjectValue(assetValue, assets),
    getAssetProjectValue(destination, assets),
  ].filter(Boolean);
}

function getRowProjectValue(row, headers, assets = [], stations = []) {
  return getRowProjectValues(row, headers, assets, stations)[0] || "";
}

function inferRowCompanyId(
  row,
  headers,
  assets = [],
  stations = [],
  projects = [],
) {
  const explicitCompanyId =
    row?.__operation?.companyId ||
    getValue(row, headers, [
      "company_id",
      "Company ID",
      "company id",
      "company",
    ]);

  if (explicitCompanyId) return explicitCompanyId;

  const rowProjectValues = getRowProjectValues(
    row,
    headers,
    assets,
    stations,
  ).map(normalizeScopeValue);

  const matchedProject = projects.find((project) => {
    const projectValues = [
      project?.id,
      project?.backendId,
      project?.projectId,
      project?.code,
      project?.name,
      project?.projectName,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    return projectValues.some((value) => rowProjectValues.includes(value));
  });

  return matchedProject?.companyId || "";
}

function filterTransactionRowsByCompany({
  rows = [],
  headers = [],
  companyId,
  user,
  assets = [],
  stations = [],
  projects = [],
}) {
  if (isPlatformAdminUser(user) && isPlatformContextValue(companyId))
    return rows;
  if (!companyId || isPlatformContextValue(companyId)) return [];

  return rows.filter((row) =>
    companyMatches(
      inferRowCompanyId(row, headers, assets, stations, projects),
      companyId,
    ),
  );
}

export default function Home() {
  const [page, setPage] = useState("companies");
  const [theme, setTheme] = useState("light");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);

  const [assets, setAssets] = useState([]);
  const [stations, setStations] = useState([]);
  const [fuelers, setFuelers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAdminDataImportAllowed, setCompanyAdminDataImportAllowed] = useState(false);

  const [assetProjectHistory, setAssetProjectHistory] = useState([]);
  const [assetOdometerHistory, setAssetOdometerHistory] = useState([]);
  const [stationCounterResetHistory, setStationCounterResetHistory] = useState(
    [],
  );

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState("");
  const usersFetchSignatureRef = useRef("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(COMPANY_CONTEXT_STORAGE_KEY) || "";
  });
  const [selectedProjectScope, setSelectedProjectScope] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [backendAssetActionApprovals, setBackendAssetActionApprovals] = useState([]);
  const [backendStationActionApprovals, setBackendStationActionApprovals] = useState([]);
  const [backendOperationApprovals, setBackendOperationApprovals] = useState(
    [],
  );
  const [backendOperationCorrections, setBackendOperationCorrections] =
    useState([]);
  const [employeeTransferRequests, setEmployeeTransferRequests] = useState([]);
  const [assetTransferRequests, setAssetTransferRequests] = useState([]);
  const [stationTransferRequests, setStationTransferRequests] = useState([]);
  const [approvedStationStockAdjustments, setApprovedStationStockAdjustments] =
    useState([]);
  const [notificationReadMap, setNotificationReadMap] = useState({});
  const [loginPassword, setLoginPassword] = useState("");
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(false);
  const [forceCurrentPassword, setForceCurrentPassword] = useState("");
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");
  const [forcePasswordError, setForcePasswordError] = useState("");
  const [forcePasswordLoading, setForcePasswordLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState({
    active: false,
    label: "",
  });
  const actionLoadingCounterRef = useRef(0);

  const inferApiActionLabel = (config = {}) => {
    const method = String(config.method || "GET").toUpperCase();
    const url = String(config.url || "");

    if (url.includes("/auth") || url.includes("/login")) return "Signing in...";
    if (url.includes("/assets/transfers") && url.includes("/review")) {
      return method === "PATCH"
        ? "Reviewing asset transfer..."
        : "Loading asset transfer...";
    }
    if (url.includes("/stations/transfers") && url.includes("/review")) {
      return method === "PATCH"
        ? "Reviewing station transfer..."
        : "Loading station transfer...";
    }
    if (url.includes("/employee-transfers") && url.includes("/review")) {
      return method === "PATCH"
        ? "Reviewing team transfer..."
        : "Loading team transfer...";
    }
    if (url.includes("/assets") && url.includes("/reset-odometer"))
      return "Submitting odometer reset...";
    if (url.includes("/assets") && url.includes("/transfer"))
      return "Submitting asset transfer...";
    if (url.includes("/stations") && url.includes("/transfer"))
      return "Submitting station transfer...";
    if (method === "DELETE") return "Deleting...";
    if (method === "POST") return "Saving...";
    if (method === "PATCH" || method === "PUT") return "Updating...";
    return "Loading data...";
  };

  const beginActionLoading = (label = "Working...") => {
    actionLoadingCounterRef.current += 1;
    setActionLoading({
      active: true,
      label,
    });
  };

  const endActionLoading = () => {
    actionLoadingCounterRef.current = Math.max(
      0,
      actionLoadingCounterRef.current - 1,
    );

    if (actionLoadingCounterRef.current === 0) {
      setActionLoading({
        active: false,
        label: "",
      });
    }
  };

  const runWithActionLoading = async (label, actionFn) => {
    beginActionLoading(label);

    try {
      return await actionFn();
    } finally {
      endActionLoading();
    }
  };

  const {
    currentUser: backendAuthUser,
    loading: backendAuthLoading,
    isLoggedIn: backendIsLoggedIn,
    login: authenticateUser,
    logout: backendLogout,
    changePassword: changeBackendPassword,
    hasPermission: hasBackendPermission,
  } = useAuth();

  const {
    language,
    setLanguage,
    isUpdatingLanguage,
    t,
  } = useLanguage();

  const backendLegacyUser = useMemo(
    () => buildLegacyUserFromAuthUser(backendAuthUser),
    [backendAuthUser],
  );

  const currentUser = backendLegacyUser;
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      const method = String(config.method || "GET").toUpperCase();
      const explicitLabel = config?.headers?.["X-Action-Loading-Label"];
      const shouldTrackActionLoading =
        Boolean(explicitLabel) || method !== "GET";

      if (explicitLabel) {
        delete config.headers["X-Action-Loading-Label"];
      }

      if (shouldTrackActionLoading) {
        const label = explicitLabel || inferApiActionLabel(config);
        config.__fleetFuelActionLoading = true;
        beginActionLoading(label);
      }

      mergeOperationRequestHeaders(config, currentUserRef.current);

      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => {
        if (response?.config?.__fleetFuelActionLoading) {
          endActionLoading();
        }

        return response;
      },
      (error) => {
        if (error?.config?.__fleetFuelActionLoading) {
          endActionLoading();
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.body.style.cursor = actionLoading.active ? "wait" : "";

    return () => {
      document.body.style.cursor = "";
    };
  }, [actionLoading.active]);

  useEffect(() => {
    if (!actionLoading.active) return undefined;

    const safetyTimer = window.setTimeout(() => {
      actionLoadingCounterRef.current = 0;
      setActionLoading({ active: false, label: "" });
    }, 45000);

    return () => window.clearTimeout(safetyTimer);
  }, [actionLoading.active]);

  useEffect(() => {
    async function fetchProtectedCompanies() {
      if (!backendIsLoggedIn) return;
      if (!hasBackendPermission?.("companies.read")) return;

      try {
        const backendCompanies = await fetchCompanies();

        setCompanies(
          mergePlatformConsoleWithCompanies(backendCompanies)
            .map(normalizeCompanyForState)
            .filter((company) => company.id),
        );
      } catch (error) {
        console.warn("Protected companies API is not available.", error);
      }
    }

    fetchProtectedCompanies();
  }, [backendIsLoggedIn, hasBackendPermission]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedCompanyId) {
      localStorage.setItem(COMPANY_CONTEXT_STORAGE_KEY, selectedCompanyId);
    } else {
      localStorage.removeItem(COMPANY_CONTEXT_STORAGE_KEY);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!backendAuthUser) return;

    const authenticatedRole = normalizeBackendRoleName(
      backendAuthUser.roleName,
    );
    const isPlatformUser = authenticatedRole === "PlatformAdmin";

    if (isPlatformUser) {
      if (!selectedCompanyId) {
        setSelectedCompanyId(
          backendAuthUser.companyId || getPlatformCompanyId(companies),
        );
      }
      return;
    }

    const authenticatedCompanyId = backendAuthUser.companyId || "";

    if (
      authenticatedCompanyId &&
      !companyMatches(selectedCompanyId, authenticatedCompanyId)
    ) {
      setSelectedCompanyId(authenticatedCompanyId);
    }
  }, [backendAuthUser, companies, selectedCompanyId]);

  const handleLogin = async (event) => {
    event?.preventDefault?.();

    const rawLoginValue = String(loginIdentifier || "")
      .trim()
      .toLowerCase();

    if (!rawLoginValue || !loginPassword) {
      setLoginError(t("login.usernamePasswordRequired"));
      return;
    }

    try {
      const loggedUser = await authenticateUser(rawLoginValue, loginPassword);
      const isPlatformUser =
        normalizeBackendRoleName(loggedUser.roleName) === "PlatformAdmin";

      const finalCompanyId = isPlatformUser
        ? loggedUser.companyId || getPlatformCompanyId(companies)
        : loggedUser.companyId || "";

      setSelectedCompanyId(finalCompanyId);

      if (loggedUser.mustChangePassword) {
        setForcePasswordChangeOpen(true);
        setForceCurrentPassword(loginPassword || "");
        setForceNewPassword("");
        setForceConfirmPassword("");
        setForcePasswordError("");
      }

      setLoginError("");
      setLoginIdentifier("");
      setLoginPassword("");
      trackActivity(
        "Login",
        "auth",
        `${loggedUser.fullName || loggedUser.username || "User"} signed in using username.`,
      );
      return;
    } catch (error) {
      logHandledApiIssue("Backend login failed", error);
      const backendMessage = error?.response?.data?.message;
      setLoginError(
        isNetworkConnectionError(error)
          ? NETWORK_OFFLINE_MESSAGE
          : Array.isArray(backendMessage)
            ? backendMessage.join(", ")
            : backendMessage || t("login.loginFailed"),
      );
      if (isNetworkConnectionError(error)) {
        showToast?.("warning", NETWORK_OFFLINE_MESSAGE);
      }
    }
  };

  const handleForcedPasswordChange = async (event) => {
    event?.preventDefault?.();

    setForcePasswordError("");

    if (!forceCurrentPassword || !forceNewPassword || !forceConfirmPassword) {
      setForcePasswordError(
        "Current password, new password, and confirmation are required.",
      );
      return;
    }

    if (forceNewPassword.length < 8) {
      setForcePasswordError("New password must be at least 8 characters.");
      return;
    }

    if (forceNewPassword !== forceConfirmPassword) {
      setForcePasswordError("New password and confirmation do not match.");
      return;
    }

    if (forceCurrentPassword === forceNewPassword) {
      setForcePasswordError(
        "New password must be different from the temporary password.",
      );
      return;
    }

    try {
      setForcePasswordLoading(true);

      await changeBackendPassword(forceCurrentPassword, forceNewPassword);

      setForcePasswordChangeOpen(false);
      setForceCurrentPassword("");
      setForceNewPassword("");
      setForceConfirmPassword("");
      setForcePasswordError("");
      setLoginPassword("");

      showToast?.(
        "success",
        "Password changed successfully. You can now continue.",
      );
      trackActivity(
        "Change Password",
        "auth",
        `${currentUser?.fullName || "User"} changed temporary password.`,
      );
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        "Password change failed. Please check the temporary password and try again.";

      setForcePasswordError(
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage,
      );
    } finally {
      setForcePasswordLoading(false);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      trackActivity("Logout", "auth", `${currentUser.fullName} signed out.`);
    }

    backendLogout?.();
    localStorage.removeItem(COMPANY_CONTEXT_STORAGE_KEY);
    setSelectedCompanyId("");
    setLoginIdentifier("");
    setLoginPassword("");
    setPage("companies");
    setMobileSidebarOpen(false);
  };

  const hasPermission = (module, action = "view") => {
    // Users & Roles is a governance page. Keep it available only for Admin.
    if (module === "users" && currentUser?.role !== "Admin") {
      return false;
    }

    // PlatformAdmin has one narrowly scoped Team write permission:
    // create an employee. User linking is handled explicitly inside TeamPage.
    if (
      currentUser?.role === "PlatformAdmin" &&
      module === "team" &&
      action === "add"
    ) {
      return true;
    }

    if (backendIsLoggedIn) {
      const backendPermission = mapLegacyPermissionToBackendPermission(
        module,
        action,
      );
      if (!backendPermission) return true;
      return hasBackendPermission(backendPermission);
    }

    return hasPermissionForUser(currentUser, module, action);
  };

  const canAccessPage = (pageKey) => {
    // Users & Roles should not appear for Manager/Officer/Supervisor/Operator.
    // Admin and PlatformAdmin remain the only roles that can open it.
    if (pageKey === "users") {
      return currentUser?.role === "Admin";
    }

    // PlatformAdmin needs access to the Reports page for the platform-only
    // Companies Master Report even though the current platform role does not
    // carry the tenant-level reports.read permission.
    if (
      ["reports", "team"].includes(pageKey) &&
      currentUser?.role === "PlatformAdmin"
    ) {
      return true;
    }

    if (backendIsLoggedIn) {
      const requiredPermission = BACKEND_PAGE_PERMISSION_MAP[pageKey];
      if (!requiredPermission) return true;
      return hasBackendPermission(requiredPermission);
    }

    return canAccessPageForUser(currentUser, pageKey);
  };

  const getPreferredPageOrder = () => {
    if (isPlatformAdminUser(currentUser)) {
      return [
        "companies",
        "team",
        "reports",
        "notifications",
        "auditTimeline",
      ];
    }

    return [
      "users",
      "operations",
      "assets",
      "stations",
      "team",
      "projects",
      "reports",
      "notifications",
      "auditTimeline",
      "approvals",
      "companies",
    ];
  };

  const trackActivity = (action, module, details, i18n = {}) => {
    setActivityLog((prev) => [
      createActivityRecord({
        user: currentUser,
        action,
        module,
        details,
        i18n,
      }),
      ...prev,
    ]);
  };

  const submitApprovalRequest = (request) => {
    beginActionLoading("Submitting approval request...");

    try {
      const approvalRequest = createApprovalRequest({
        ...request,
        requestedBy: currentUser,
        users,
        projects,
      });

      if (
        approvalRequest?.payload?.approvalRouteStrategy === "project_manager" &&
        !(approvalRequest?.approvalRoute?.requiredApprovers || []).length
      ) {
        showToast?.(
          "warning",
          "No active project manager found for this project. Request was not submitted.",
        );
        return null;
      }

      setPendingApprovals((prev) => [approvalRequest, ...prev]);
      setActivityLog((prev) => [
        createActivityRecord({
          user: currentUser,
          action: "Submit Approval Request",
          module: request.module,
          details:
            request.details ||
            request.title ||
            "Approval request submitted.",
          i18n: {
            actionKey: "notifications.activity.actions.submitApprovalRequest",
            actionFallback: "Submit Approval Request",
            detailsKey:
              request.notificationDetailsKey ||
              "notifications.activity.details.approvalRequestSubmitted",
            detailsParams:
              request.notificationDetailsParams || {
                requestTitle:
                  request.title ||
                  request.details ||
                  "Approval request submitted.",
              },
            detailsFallback:
              request.details ||
              request.title ||
              "Approval request submitted.",
          },
        }),
        ...prev,
      ]);
      showToast?.(
        "warning",
        approvalRequest?.payload?.approvalRouteStrategy === "admin"
          ? "Request sent to Admin approval queue."
          : "Request sent to Manager approval queue.",
      );
      return approvalRequest;
    } finally {
      window.setTimeout(() => endActionLoading(), 250);
    }
  };

  const refreshBackendProjects = async (companyId = "") => {
    try {
      const backendProjects = await fetchProjects({
        companyId:
          companyId && !isPlatformContextValue(companyId) ? companyId : "",
      });
      setProjects(
        backendProjects
          .map(mapBackendProjectForState)
          .filter((project) => project.id),
      );
      return backendProjects;
    } catch (error) {
      logHandledApiIssue("Failed to refresh projects from backend", error);
      showToast?.("warning", "Projects backend API is not available.");
      return [];
    }
  };

  const handleCreateProject = async (payload) => {
    const createdProjectData = await createProjectRecord(payload);
    const createdProject = mapBackendProjectForState(createdProjectData);

    setProjects((prev) => [
      createdProject,
      ...prev.filter(
        (project) =>
          normalizeScopeValue(project.backendId || project.id) !==
          normalizeScopeValue(createdProject.backendId || createdProject.id),
      ),
    ]);

    return createdProject;
  };

  const handleCreateBootstrapFirstProject = async (payload) => {
    const result = await createBootstrapFirstProject({
      ...payload,
      companyId: currentUser?.companyId || payload.companyId,
    });

    const createdProject = mapBackendProjectForState(
      result?.project || result,
    );

    setProjects((prev) => [
      createdProject,
      ...prev.filter(
        (project) =>
          normalizeScopeValue(project.backendId || project.id) !==
          normalizeScopeValue(createdProject.backendId || createdProject.id),
      ),
    ]);

    return createdProject;
  };

  const handleBootstrapProjectCompleted = async () => {
    // Reloading forces AuthContext to call /auth/me again. The backend will now
    // return requiresFirstProject=false and the normal application can open.
    window.location.reload();
  };

  const handleUpdateProject = async (project, payload) => {
    const backendId = project?.backendId || project?.id || project;
    const updatedProjectData = await updateProjectRecord(backendId, payload);
    const updatedProject = mapBackendProjectForState(updatedProjectData);

    setProjects((prev) =>
      prev.map((item) =>
        normalizeScopeValue(item.backendId || item.id) ===
          normalizeScopeValue(backendId) ||
        normalizeScopeValue(item.id) === normalizeScopeValue(updatedProject.id)
          ? updatedProject
          : item,
      ),
    );

    return updatedProject;
  };

  const handleProjectFuelPriceUpdated = async (project) => {
    const backendId = normalizeScopeValue(project?.backendId || project?.id);
    const projectId = normalizeScopeValue(project?.id);

    if (!backendId) {
      throw new Error("Project backend ID is required.");
    }

    // Updating a historical price can reprice completed operations in the
    // backend. Refresh the shared operations state here so every consumer
    // (OperationsPage and ProjectsPage) receives the same fresh snapshot.
    const operationsRefreshPromise = fetchOperations(
      currentUserRef.current || currentUser,
    )
      .then((backendOperations) =>
        backendOperations
          .filter(
            (operation) =>
              String(operation?.status || "").toUpperCase() === "COMPLETED",
          )
          .map(mapBackendOperationForState),
      )
      .catch((error) => {
        logHandledApiIssue(
          "Fuel price was saved, but operations could not be refreshed",
          error,
        );
        showToast?.(
          "warning",
          "Fuel price was saved, but operation costs could not be refreshed automatically.",
        );
        return null;
      });

    const refreshedProjectData = await fetchProjectById(backendId);
    const refreshedProject = mapBackendProjectForState(refreshedProjectData);

    setProjects((prev) =>
      prev.map((item) => {
        const itemBackendId = normalizeScopeValue(item?.backendId || item?.id);
        const itemProjectId = normalizeScopeValue(item?.id);

        const isTargetProject =
          (backendId && itemBackendId === backendId) ||
          (projectId && itemProjectId === projectId);

        return isTargetProject ? refreshedProject : item;
      }),
    );

    const refreshedOperations = await operationsRefreshPromise;
    if (Array.isArray(refreshedOperations)) {
      setData(refreshedOperations);
    }

    return refreshedProject;
  };

  const handleAssignProjectManager = async (project, managerUserId) => {
    const backendId = project?.backendId || project?.id || project;

    if (!backendId) {
      throw new Error("Project backend ID is required.");
    }

    const updatedProjectData = await assignProjectManager(backendId, {
      managerUserId,
      requestedByUserId: backendAuthUser?.id || currentUser?.id || "",
    });

    const updatedProject = mapBackendProjectForState(updatedProjectData);

    setProjects((prev) =>
      prev.map((item) =>
        normalizeScopeValue(item.backendId || item.id) ===
          normalizeScopeValue(backendId) ||
        normalizeScopeValue(item.id) === normalizeScopeValue(updatedProject.id)
          ? updatedProject
          : item,
      ),
    );

    return updatedProject;
  };

  const handleDeleteProject = async (project) => {
    const backendId = project?.backendId || project?.id || project;
    await deleteProjectRecord(backendId);

    setProjects((prev) =>
      prev.filter(
        (item) =>
          normalizeScopeValue(item.backendId || item.id) !==
          normalizeScopeValue(backendId),
      ),
    );
  };
  const refreshBackendEmployees = async (companyId = "", viewerUserId = "") => {
    try {
      const backendEmployees = await fetchEmployees({
        companyId:
          companyId && !isPlatformContextValue(companyId) ? companyId : "",
        viewerUserId,
      });
      const mappedEmployees = backendEmployees
        .map(mapBackendEmployeeForState)
        .filter((employee) => employee.id);

      setFuelers(mappedEmployees);
      return mappedEmployees;
    } catch (error) {
      console.warn("Employees backend API is not available.", error);
      showToast?.("warning", "Employees backend API is not available.");
      return [];
    }
  };

  const refreshBackendEmployeeTransfers = async () => {
    try {
      const backendTransfers = await fetchPendingEmployeeTransfers();
      const mappedTransfers = backendTransfers
        .map(mapBackendEmployeeTransferForState)
        .filter((transfer) => transfer.id);

      setEmployeeTransferRequests(mappedTransfers);
      return mappedTransfers;
    } catch (error) {
      console.warn("Employee transfers API is not available.", error);
      setEmployeeTransferRequests([]);
      return [];
    }
  };

  const upsertAssetTransferRequest = (transfer) => {
    const mappedTransfer = {
      ...mapBackendAssetTransferForState(transfer),
      // Keep the backend batch reference so ApprovalsPage can group every
      // transfer created by one bulk action into a single approval card.
      transferBatchId:
        transfer?.transferBatchId ||
        transfer?.batchId ||
        transfer?.payload?.transferBatchId ||
        null,
    };

    if (!mappedTransfer.id) return mappedTransfer;

    setAssetTransferRequests((prev) => [
      mappedTransfer,
      ...(prev || []).filter(
        (item) =>
          normalizeScopeValue(item.id) !==
          normalizeScopeValue(mappedTransfer.id),
      ),
    ]);

    return mappedTransfer;
  };

  const refreshBackendAssetTransfers = async () => {
    try {
      const backendTransfers = await fetchPendingAssetTransfers();
      const mappedTransfers = backendTransfers
        .map((transfer) => ({
          ...mapBackendAssetTransferForState(transfer),
          // The state mapper normalizes transfer data but may omit the batch
          // reference. Preserve it explicitly for grouped approvals.
          transferBatchId:
            transfer?.transferBatchId ||
            transfer?.batchId ||
            transfer?.payload?.transferBatchId ||
            null,
        }))
        .filter((transfer) => transfer.id);

      setAssetTransferRequests(mappedTransfers);
      return mappedTransfers;
    } catch (error) {
      console.warn("Asset transfers API is not available.", error);
      setAssetTransferRequests([]);
      return [];
    }
  };

  const upsertStationTransferRequest = (transfer) => {
    const mappedTransfer = mapBackendStationTransferForState(transfer);
    if (!mappedTransfer.id) return mappedTransfer;

    setStationTransferRequests((prev) => [
      mappedTransfer,
      ...(prev || []).filter(
        (item) =>
          normalizeScopeValue(item.id) !==
          normalizeScopeValue(mappedTransfer.id),
      ),
    ]);

    return mappedTransfer;
  };

  const refreshBackendStationTransfers = async () => {
    try {
      const backendTransfers = await fetchPendingStationTransfers();
      const mappedTransfers = backendTransfers
        .map(mapBackendStationTransferForState)
        .filter((transfer) => transfer.id);

      setStationTransferRequests(mappedTransfers);
      return mappedTransfers;
    } catch (error) {
      console.warn("Station transfers API is not available.", error);
      setStationTransferRequests([]);
      return [];
    }
  };

  const mapBackendActionStatus = (status) => {
    const normalized = String(status || "").trim().toUpperCase();
    if (normalized === "APPROVED") return "Approved";
    if (normalized === "REJECTED") return "Rejected";
    if (normalized === "PROCESSING") return "Pending";
    return "Pending";
  };

  const mapBackendAssetActionForApproval = (request = {}) => {
    const asset = request.asset || {};
    const project = request.project || asset.project || {};
    const requestedBy = request.requestedBy || {};
    const reviewedBy = request.reviewedBy || {};
    const displayAssetId = asset.assetId || request.assetId || "-";
    const managerId = project.projectManagerId || asset.project?.projectManagerId || "";
    const status = mapBackendActionStatus(request.status);
    const requestedOdometer = Number(request.requestedOdometer ?? 0);

    return {
      id: `ASSET-ACTION-${request.id}`,
      backendAssetActionRequestId: request.id,
      isBackendAssetAction: true,
      type: "asset_action",
      module: "assets",
      title: `Asset ${displayAssetId} odometer reset`,
      titleKey: "workflowMessages.assets.odometerApproval.title",
      titleParams: { assetId: displayAssetId },
      titleFallback: `Asset ${displayAssetId} odometer reset`,
      details: `Asset ${displayAssetId} odometer reset request. Reason: ${request.reason || "-"}`,
      detailsKey: "workflowMessages.assets.odometerApproval.details",
      detailsParams: { assetId: displayAssetId, reason: request.reason || "-" },
      detailsFallback: `Asset ${displayAssetId} odometer reset request. Reason: ${request.reason || "-"}`,
      status,
      payload: {
        entity: "asset",
        action: "odometer_reset",
        id: displayAssetId,
        assetId: displayAssetId,
        backendAssetId: request.assetId,
        assetBackendId: request.assetId,
        backendActionRequestId: request.id,
        projectId: request.projectId,
        reason: request.reason,
        values: {
          assetId: displayAssetId,
          backendAssetId: request.assetId,
          newOdometerAfterReset: requestedOdometer,
          newReading: requestedOdometer,
          effectiveDate: request.effectiveAt,
          reason: request.reason,
        },
        changedFields: [
          {
            field: "currentOdometer",
            label: "Odometer Reset",
            labelKey: "assetWorkflows.odometer.title",
            oldValue: Number(asset.currentOdometer ?? 0),
            newValue: requestedOdometer,
            sensitive: true,
          },
        ],
      },
      changedFields: [
        {
          field: "currentOdometer",
          label: "Odometer Reset",
          labelKey: "assetWorkflows.odometer.title",
          oldValue: Number(asset.currentOdometer ?? 0),
          newValue: requestedOdometer,
          sensitive: true,
        },
      ],
      entityType: "Asset",
      entityId: displayAssetId,
      sensitivity: "Sensitive",
      riskLevel: "High",
      approvalRoute: {
        routeType: "project_manager",
        sourceProject: project.name || project.code || request.projectId || "-",
        destinationProject: project.name || project.code || request.projectId || "-",
        requiredApprovers: managerId
          ? [{
              userId: managerId,
              userName:
                companyUsers.find((user) => user.id === managerId)?.fullName ||
                companyUsers.find((user) => user.id === managerId)?.email ||
                managerId,
              role: "Manager",
              projectId: request.projectId || project.id || "-",
              approvalStage: "Project Manager",
              approvalStageKey: "approvals.stages.projectManager",
              status,
              reviewedAt: request.reviewedAt || "",
              reviewNote: request.reviewNote || "",
            }]
          : [],
        routeStatus: status,
      },
      requestedById: request.requestedByUserId || requestedBy.id || "System",
      requestedByName: requestedBy.fullName || requestedBy.email || "System",
      requestedByRole: normalizeBackendRoleName(requestedBy.role?.name || requestedBy.roleName || "Officer"),
      requestedAt: request.createdAt || new Date().toISOString(),
      reviewedBy: reviewedBy.fullName || reviewedBy.email || "",
      reviewedAt: request.reviewedAt || "",
      reviewNote: request.reviewNote || "",
    };
  };

  const mapBackendStationActionForApproval = (request = {}) => {
    const station = request.station || {};
    const project = request.project || station.project || {};
    const requestedBy = request.requestedBy || {};
    const reviewedBy = request.reviewedBy || {};
    const displayStationId = station.stationId || request.stationId || "-";
    const rawAction = String(request.actionType || "").toUpperCase();
    const action =
      rawAction === "ZERO_BALANCE"
        ? "zero_balance_adjustment"
        : rawAction === "INVENTORY_ADJUSTMENT"
          ? "stock_count_adjustment"
          : "counter_reset";
    const status = mapBackendActionStatus(request.status);
    const managerId = project.projectManagerId || station.project?.projectManagerId || "";
    const isInventory = rawAction === "INVENTORY_ADJUSTMENT";
    const requestedValue = isInventory
      ? Number(request.requestedActualStock ?? 0)
      : rawAction === "COUNTER_RESET"
        ? Number(request.requestedCounter ?? 0)
        : 0;
    const currentValue =
      rawAction === "COUNTER_RESET"
        ? Number(station.currentCounter ?? 0)
        : Number(station.currentStock ?? 0);

    const titleKey =
      rawAction === "ZERO_BALANCE"
        ? "approvals.stationZeroBalance.title"
        : rawAction === "INVENTORY_ADJUSTMENT"
          ? "approvals.stationStockAdjustment.title"
          : "approvals.defaults.requestTitle";

    return {
      id: `STATION-ACTION-${request.id}`,
      backendStationActionRequestId: request.id,
      isBackendStationAction: true,
      type: "station_action",
      module: "stations",
      title:
        rawAction === "ZERO_BALANCE"
          ? `Zero Balance Adjustment - ${displayStationId}`
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? `Inventory Adjustment - ${displayStationId}`
            : `Station Counter Reset - ${displayStationId}`,
      titleKey,
      titleParams: { stationId: displayStationId },
      titleFallback:
        rawAction === "ZERO_BALANCE"
          ? `Zero Balance Adjustment - ${displayStationId}`
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? `Inventory Adjustment - ${displayStationId}`
            : `Station Counter Reset - ${displayStationId}`,
      details:
        rawAction === "ZERO_BALANCE"
          ? `Zero-balance request submitted for station ${displayStationId}. Current stock: ${currentValue} L → 0 L. Reason: ${request.reason || "-"}`
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? `Stock adjustment request submitted for station ${displayStationId}. Current stock: ${currentValue} L → requested stock: ${requestedValue} L. Adjustment: ${requestedValue - currentValue} L. Reason: ${request.reason || "-"}`
            : `Station ${displayStationId} counter reset request. Current counter: ${currentValue} → requested counter: ${requestedValue}. Reason: ${request.reason || "-"}`,
      detailsKey:
        rawAction === "ZERO_BALANCE"
          ? "notifications.activity.details.stationZeroBalanceRequested"
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? "notifications.activity.details.stationStockAdjustmentRequested"
            : "",
      detailsParams:
        rawAction === "ZERO_BALANCE"
          ? {
              stationId: displayStationId,
              currentStock: currentValue,
              reason: request.reason || "-",
            }
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? {
                stationId: displayStationId,
                currentStock: currentValue,
                requestedStock: requestedValue,
                adjustmentQty: requestedValue - currentValue,
                reason: request.reason || "-",
              }
            : {},
      detailsFallback:
        rawAction === "ZERO_BALANCE"
          ? `Zero-balance request submitted for station ${displayStationId}. Current stock: ${currentValue} L → 0 L. Reason: ${request.reason || "-"}`
          : rawAction === "INVENTORY_ADJUSTMENT"
            ? `Stock adjustment request submitted for station ${displayStationId}. Current stock: ${currentValue} L → requested stock: ${requestedValue} L. Adjustment: ${requestedValue - currentValue} L. Reason: ${request.reason || "-"}`
            : `Station ${displayStationId} counter reset request. Current counter: ${currentValue} → requested counter: ${requestedValue}. Reason: ${request.reason || "-"}`,
      status,
      payload: {
        entity: "station",
        action,
        id: displayStationId,
        stationId: displayStationId,
        backendStationId: request.stationId,
        stationBackendId: request.stationId,
        backendActionRequestId: request.id,
        projectId: request.projectId,
        reason: request.reason,
        oldValue: currentValue,
        newValue: requestedValue,
        values: {
          action,
          stationId: displayStationId,
          backendStationId: request.stationId,
          oldValue: currentValue,
          newValue: requestedValue,
          newCounter: request.requestedCounter,
          actualStock: request.requestedActualStock,
          effectiveAt: request.effectiveAt,
          reason: request.reason,
        },
      },
      changedFields: [
        {
          field: rawAction === "COUNTER_RESET" ? "currentCounter" : "currentStock",
          label:
            rawAction === "ZERO_BALANCE"
              ? "Zero Balance"
              : rawAction === "INVENTORY_ADJUSTMENT"
                ? "Inventory Adjustment"
                : "Station Counter Reset",
          oldValue: currentValue,
          newValue: requestedValue,
          sensitive: true,
        },
      ],
      entityType: "Station",
      entityId: displayStationId,
      sensitivity: "Sensitive",
      riskLevel: "High",
      approvalRoute: {
        routeType: isInventory ? "admin" : "project_manager",
        sourceProject: project.name || project.code || request.projectId || "-",
        destinationProject: project.name || project.code || request.projectId || "-",
        requiredApprovers: isInventory
          ? []
          : managerId
            ? [{
                userId: managerId,
                userName:
                  companyUsers.find((user) => user.id === managerId)?.fullName ||
                  companyUsers.find((user) => user.id === managerId)?.email ||
                  managerId,
                role: "Manager",
                projectId: request.projectId || project.id || "-",
                approvalStage: "Project Manager",
                approvalStageKey: "approvals.stages.projectManager",
                status,
                reviewedAt: request.reviewedAt || "",
                reviewNote: request.reviewNote || "",
              }]
            : [],
        routeStatus: status,
      },
      requestedById: request.requestedByUserId || requestedBy.id || "System",
      requestedByName: requestedBy.fullName || requestedBy.email || "System",
      requestedByRole: normalizeBackendRoleName(requestedBy.role?.name || requestedBy.roleName || (isInventory ? "Manager" : "Officer")),
      requestedAt: request.createdAt || new Date().toISOString(),
      reviewedBy: reviewedBy.fullName || reviewedBy.email || "",
      reviewedAt: request.reviewedAt || "",
      reviewNote: request.reviewNote || "",
    };
  };

  const refreshBackendAssetActions = async () => {
    const userId = backendAuthUser?.id || currentUser?.id || "";
    if (!userId) {
      setBackendAssetActionApprovals([]);
      return [];
    }

    try {
      const requests = await fetchAssetActionRequests({ userId });
      const mapped = (requests || []).map(mapBackendAssetActionForApproval);
      setBackendAssetActionApprovals(mapped);
      return mapped;
    } catch (error) {
      console.warn("Asset action requests API is not available.", error);
      setBackendAssetActionApprovals([]);
      return [];
    }
  };

  const refreshBackendStationActions = async () => {
    const userId = backendAuthUser?.id || currentUser?.id || "";
    if (!userId) {
      setBackendStationActionApprovals([]);
      return [];
    }

    try {
      const requests = await fetchStationActionRequests({ userId });
      const mapped = (requests || []).map(mapBackendStationActionForApproval);
      setBackendStationActionApprovals(mapped);
      return mapped;
    } catch (error) {
      console.warn("Station action requests API is not available.", error);
      setBackendStationActionApprovals([]);
      return [];
    }
  };

  const handleCheckEmployeeIdAvailability = async ({
    employeeId,
    companyId = "",
  } = {}) => {
    return checkEmployeeIdAvailability({
      employeeId,
      companyId:
        companyId && !isPlatformContextValue(companyId)
          ? companyId
          : "",
    });
  };

  const handleCreateEmployee = async (payload) => {
    const createdEmployeeData = await createEmployeeRecord(payload);
    const createdEmployee = mapBackendEmployeeForState(createdEmployeeData);

    setFuelers((prev) => [
      createdEmployee,
      ...prev.filter(
        (employee) =>
          normalizeScopeValue(employee.backendId || employee.id) !==
            normalizeScopeValue(
              createdEmployee.backendId || createdEmployee.id,
            ) &&
          normalizeScopeValue(employee.id) !==
            normalizeScopeValue(createdEmployee.id),
      ),
    ]);

    return createdEmployee;
  };

  const handleUpdateEmployee = async (employee, payload) => {
    const backendId = employee?.backendId || employee?.id || employee;

    if (!backendId) {
      throw new Error("Employee backend ID is required.");
    }

    const updatedEmployeeData = await updateEmployeeRecord(backendId, payload);
    const updatedEmployee = mapBackendEmployeeForState(updatedEmployeeData);

    setFuelers((prev) =>
      prev.map((item) =>
        normalizeScopeValue(item.backendId || item.id) ===
          normalizeScopeValue(backendId) ||
        normalizeScopeValue(item.id) === normalizeScopeValue(updatedEmployee.id)
          ? updatedEmployee
          : item,
      ),
    );

    // Backend synchronizes User.fullName when a linked employee name changes.
    // Refresh the Users state immediately so Users & Roles and project-manager
    // selectors show the new name without a browser reload.
    if (
      updatedEmployee?.linkedUserId ||
      employee?.linkedUserId ||
      employee?.userId
    ) {
      const targetCompanyId =
        updatedEmployee?.companyId ||
        employee?.companyId ||
        currentCompanyId ||
        "";

      try {
        await refreshBackendUsers(targetCompanyId, {
          force: true,
          silent: true,
        });
      } catch (error) {
        console.warn(
          "Employee was updated, but users could not be refreshed automatically.",
          error,
        );
      }
    }

    return updatedEmployee;
  };

  const handleCreateEmployeeTransfer = async (employee, toProjectId) => {
    const employeeBackendId =
      employee?.backendId || employee?.employeeBackendId || employee?.id;
    const requestedByUserId = backendAuthUser?.id || currentUser?.id || "";

    if (!employeeBackendId) {
      throw new Error("Employee backend ID is required.");
    }

    if (!toProjectId) {
      throw new Error("Target project is required.");
    }

    if (!requestedByUserId) {
      throw new Error("Requester user ID is required.");
    }

    const createdTransferData = await createEmployeeTransfer({
      employeeId: employeeBackendId,
      toProjectId,
      requestedByUserId,
    });

    const createdTransfer =
      mapBackendEmployeeTransferForState(createdTransferData);
    const transferApproved =
      String(createdTransfer.status || "").toUpperCase() === "APPROVED";

    setEmployeeTransferRequests((prev) =>
      transferApproved
        ? prev.filter(
            (item) =>
              normalizeScopeValue(item.id) !==
              normalizeScopeValue(createdTransfer.id),
          )
        : [
            createdTransfer,
            ...prev.filter(
              (item) =>
                normalizeScopeValue(item.id) !==
                normalizeScopeValue(createdTransfer.id),
            ),
          ],
    );

    if (transferApproved) {
      applyEmployeeTransferLocally(createdTransfer);
      await refreshBackendEmployees(currentCompanyId, currentUser?.id);
    }

    await refreshBackendEmployeeTransfers();

    return createdTransfer;
  };

  const handleCreateBulkEmployeeTransfer = async (employees, toProjectId) => {
    const employeeIds = Array.from(
      new Set(
        (Array.isArray(employees) ? employees : [])
          .map(
            (employee) =>
              employee?.backendId ||
              employee?.employeeBackendId ||
              employee?.id ||
              "",
          )
          .filter(Boolean),
      ),
    );
    const requestedByUserId = backendAuthUser?.id || currentUser?.id || "";

    if (!employeeIds.length)
      throw new Error("At least one employee is required.");
    if (!toProjectId) throw new Error("Target project is required.");
    if (!requestedByUserId) throw new Error("Requester user ID is required.");

    const result = await createBulkEmployeeTransfer({
      employeeIds,
      toProjectId,
      requestedByUserId,
    });
    const mappedTransfers = (
      Array.isArray(result?.transfers) ? result.transfers : []
    )
      .map((transfer) => ({
        ...mapBackendEmployeeTransferForState(transfer),
        transferBatchId:
          transfer?.transferBatchId || result?.transferBatchId || null,
      }))
      .filter((transfer) => transfer.id);

    setEmployeeTransferRequests((prev) => {
      const mappedIds = new Set(
        mappedTransfers.map((transfer) => normalizeScopeValue(transfer.id)),
      );
      const pendingTransfers = mappedTransfers.filter((transfer) =>
        ["PENDING", "PARTIALLY_APPROVED"].includes(
          String(transfer.status || "").toUpperCase(),
        ),
      );
      return [
        ...pendingTransfers,
        ...prev.filter(
          (transfer) => !mappedIds.has(normalizeScopeValue(transfer.id)),
        ),
      ];
    });

    const approvedTransfers = mappedTransfers.filter(
      (transfer) => String(transfer.status || "").toUpperCase() === "APPROVED",
    );
    approvedTransfers.forEach(applyEmployeeTransferLocally);

    // The authoritative bulk request has already succeeded. Keep the UI fast by
    // returning immediately after the optimistic state update, then reconcile
    // employees and pending approvals in the background.
    const backgroundSyncTasks = [refreshBackendEmployeeTransfers()];

    if (approvedTransfers.length) {
      backgroundSyncTasks.push(
        refreshBackendEmployees(currentCompanyId, currentUser?.id),
      );
    }

    void Promise.allSettled(backgroundSyncTasks);

    return { ...result, transfers: mappedTransfers };
  };

  const applyEmployeeTransferLocally = (transfer) => {
    if (!transfer?.id && !transfer?.employeeBackendId && !transfer?.employeeId)
      return;

    setFuelers((prev) =>
      prev.map((employee) => {
        const sameEmployee =
          normalizeScopeValue(employee.backendId || employee.id) ===
            normalizeScopeValue(transfer.employeeBackendId) ||
          normalizeScopeValue(employee.id) ===
            normalizeScopeValue(transfer.employeeId);

        if (!sameEmployee) return employee;

        return {
          ...employee,
          projectId: transfer.toProjectId || employee.projectId,
          projectName:
            transfer.toProjectName ||
            transfer.toProjectId ||
            employee.projectName,
          project:
            transfer.toProjectName || transfer.toProjectId || employee.project,
        };
      }),
    );
  };

  const handleApproveEmployeeTransfer = async (
    transfer,
    reviewerUserId = "",
  ) => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Employee transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Approver user ID is required.");
    }

    const reviewedTransferData = await reviewEmployeeTransfer(transferId, {
      managerUserId,
      approve: true,
    });

    const reviewedTransfer =
      mapBackendEmployeeTransferForState(reviewedTransferData);

    setEmployeeTransferRequests((prev) => {
      if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
        return prev.filter(
          (item) =>
            normalizeScopeValue(item.id) !==
            normalizeScopeValue(reviewedTransfer.id),
        );
      }

      return prev.map((item) =>
        normalizeScopeValue(item.id) ===
        normalizeScopeValue(reviewedTransfer.id)
          ? reviewedTransfer
          : item,
      );
    });

    if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
      applyEmployeeTransferLocally(reviewedTransfer);
    }

    await refreshBackendEmployees(currentCompanyId, currentUser?.id);
    await refreshBackendEmployeeTransfers();

    return reviewedTransfer;
  };

  const handleRejectEmployeeTransfer = async (
    transfer,
    reason = "",
    reviewerUserId = "",
  ) => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Employee transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Reviewer user ID is required.");
    }

    const reviewedTransferData = await reviewEmployeeTransfer(transferId, {
      managerUserId,
      approve: false,
      rejectionReason: reason || "Rejected",
    });

    const reviewedTransfer =
      mapBackendEmployeeTransferForState(reviewedTransferData);

    setEmployeeTransferRequests((prev) =>
      prev.filter(
        (item) =>
          normalizeScopeValue(item.id) !==
          normalizeScopeValue(reviewedTransfer.id),
      ),
    );

    await refreshBackendEmployeeTransfers();

    return reviewedTransfer;
  };

  const refreshBackendAssets = async () => {
    try {
      const backendAssets = await fetchAssets();
      const mappedAssets = backendAssets
        .map((backendAsset) => {
          const mappedAsset = mapBackendAssetForState(backendAsset);

          return backendAsset?.deletedAt
            ? {
                ...mappedAsset,
                deletedAt: backendAsset.deletedAt,
                status: "Retired",
              }
            : mappedAsset;
        })
        .filter((asset) => asset.id);

      setAssets(mappedAssets);
      return mappedAssets;
    } catch (error) {
      console.warn("Assets backend API is not available.", error);
      showToast?.("warning", "Assets backend API is not available.");
      return [];
    }
  };

  const refreshBackendStations = async () => {
    try {
      const backendStations = await fetchStations();
      const mappedStations = backendStations
        .map(mapBackendStationForState)
        .filter((station) => station.id && !station.deletedAt);

      setStations(mappedStations);
      return mappedStations;
    } catch (error) {
      console.warn("Stations backend API is not available.", error);
      showToast?.("warning", "Stations backend API is not available.");
      return [];
    }
  };

  const replaceBackendAssetInState = (asset) => {
    const mappedAsset = mapBackendAssetForState(asset);
    if (!mappedAsset.id) return mappedAsset;

    setAssets((prev) => {
      const next = [...(prev || [])];
      const index = next.findIndex(
        (item) =>
          normalizeScopeValue(item.backendId || item.assetBackendId) ===
            normalizeScopeValue(mappedAsset.backendId) ||
          normalizeScopeValue(item.id) === normalizeScopeValue(mappedAsset.id),
      );

      if (index === -1) return [mappedAsset, ...next];

      next[index] = { ...next[index], ...mappedAsset };
      return next;
    });

    return mappedAsset;
  };

  const replaceBackendStationInState = (stationData) => {
    const mappedStation = mapBackendStationForState(stationData);
    if (!mappedStation.id) return mappedStation;

    setStations((prev) =>
      (prev || []).map((station) =>
        normalizeScopeValue(station.backendId || station.stationBackendId) ===
          normalizeScopeValue(
            mappedStation.backendId || mappedStation.stationBackendId,
          ) ||
        tenantEntityMatches(station, mappedStation.id, mappedStation.companyId)
          ? { ...station, ...mappedStation }
          : station,
      ),
    );

    return mappedStation;
  };

  const removeBackendAssetFromState = (assetOrId) => {
    const backendId =
      typeof assetOrId === "string"
        ? assetOrId
        : assetOrId?.backendId ||
          assetOrId?.assetBackendId ||
          assetOrId?.id ||
          "";

    setAssets((prev) =>
      (prev || []).filter(
        (item) =>
          normalizeScopeValue(item.backendId || item.assetBackendId) !==
            normalizeScopeValue(backendId) &&
          normalizeScopeValue(item.id) !== normalizeScopeValue(backendId),
      ),
    );
  };

  const handleApproveAssetTransfer = async (transfer, reviewerUserId = "") => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Asset transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Approver user ID is required.");
    }

    const reviewedTransferData = await reviewAssetTransfer(transferId, {
      managerUserId,
      approve: true,
    });

    const reviewedTransfer =
      mapBackendAssetTransferForState(reviewedTransferData);

    setAssetTransferRequests((prev) => {
      if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
        return (prev || []).filter(
          (item) =>
            normalizeScopeValue(item.id) !==
            normalizeScopeValue(reviewedTransfer.id),
        );
      }

      return (prev || []).map((item) =>
        normalizeScopeValue(item.id) ===
        normalizeScopeValue(reviewedTransfer.id)
          ? reviewedTransfer
          : item,
      );
    });

    if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
      try {
        const assetData = await fetchAssetById(reviewedTransfer.assetBackendId);
        replaceBackendAssetInState(assetData);
      } catch (error) {
        await refreshBackendAssets();
      }
    }

    await refreshBackendAssetTransfers();

    return reviewedTransfer;
  };

  const handleRejectAssetTransfer = async (
    transfer,
    reason = "",
    reviewerUserId = "",
  ) => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Asset transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Reviewer user ID is required.");
    }

    const reviewedTransferData = await reviewAssetTransfer(transferId, {
      managerUserId,
      approve: false,
      rejectionReason: reason || "Rejected",
    });

    const reviewedTransfer =
      mapBackendAssetTransferForState(reviewedTransferData);

    setAssetTransferRequests((prev) =>
      (prev || []).filter(
        (item) =>
          normalizeScopeValue(item.id) !==
          normalizeScopeValue(reviewedTransfer.id),
      ),
    );

    await refreshBackendAssetTransfers();

    return reviewedTransfer;
  };

  const handleApproveStationTransfer = async (
    transfer,
    reviewerUserId = "",
  ) => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Station transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Approver user ID is required.");
    }

    const reviewedTransferData = await reviewStationTransfer(transferId, {
      managerUserId,
      approve: true,
    });

    const reviewedTransfer =
      mapBackendStationTransferForState(reviewedTransferData);

    setStationTransferRequests((prev) => {
      if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
        return (prev || []).filter(
          (item) =>
            normalizeScopeValue(item.id) !==
            normalizeScopeValue(reviewedTransfer.id),
        );
      }

      return (prev || []).map((item) =>
        normalizeScopeValue(item.id) ===
        normalizeScopeValue(reviewedTransfer.id)
          ? reviewedTransfer
          : item,
      );
    });

    if (String(reviewedTransfer.status || "").toUpperCase() === "APPROVED") {
      try {
        const stationData = await fetchStationById(
          reviewedTransfer.stationBackendId,
        );
        replaceBackendStationInState(stationData);
      } catch (error) {
        try {
          const backendStations = await fetchStations({
            companyId:
              currentCompanyId && !isPlatformContextValue(currentCompanyId)
                ? currentCompanyId
                : "",
          });
          const mappedStations = backendStations.map(mapBackendStationForState);
          setStations((prev) => {
            const otherCompanies = (prev || []).filter(
              (station) =>
                !companyMatches(getItemCompanyId(station), currentCompanyId),
            );
            return filterDuplicateTenantEntities([
              ...mappedStations,
              ...otherCompanies,
            ]);
          });
        } catch (_refreshError) {
          // Keep the approval flow resilient; the next page refresh will reload stations.
        }
      }
    }

    await refreshBackendStationTransfers();

    return reviewedTransfer;
  };

  const handleRejectStationTransfer = async (
    transfer,
    reason = "",
    reviewerUserId = "",
  ) => {
    const transferId = transfer?.backendId || transfer?.id;
    const managerUserId =
      reviewerUserId || backendAuthUser?.id || currentUser?.id || "";

    if (!transferId) {
      throw new Error("Station transfer ID is required.");
    }

    if (!managerUserId) {
      throw new Error("Reviewer user ID is required.");
    }

    const reviewedTransferData = await reviewStationTransfer(transferId, {
      managerUserId,
      approve: false,
      rejectionReason: reason || "Rejected",
    });

    const reviewedTransfer =
      mapBackendStationTransferForState(reviewedTransferData);

    setStationTransferRequests((prev) =>
      (prev || []).filter(
        (item) =>
          normalizeScopeValue(item.id) !==
          normalizeScopeValue(reviewedTransfer.id),
      ),
    );

    await refreshBackendStationTransfers();

    return reviewedTransfer;
  };

  const handleApproveAssetAction = async (request, reviewNote = "") => {
    if (request?.isBackendAssetAction || request?.backendAssetActionRequestId) {
      const requestId =
        request?.backendAssetActionRequestId ||
        request?.payload?.backendActionRequestId;
      const reviewerUserId = backendAuthUser?.id || currentUser?.id || "";

      const reviewed = await reviewAssetActionRequest(requestId, {
        reviewerUserId,
        approve: true,
        reviewNote: reviewNote || "Approved",
      });

      if (reviewed?.result?.asset) {
        replaceBackendAssetInState(reviewed.result.asset);
      }
      await Promise.all([refreshBackendAssetActions(), refreshBackendAssets()]);
      return reviewed;
    }

    const payload = request?.payload || {};
    const action = payload.action || payload?.values?.action || "";
    const values = payload.values || {};

    // Add Asset approval:
    // Officer request -> Admin approval -> create asset in backend.
    // Admin-created assets are created directly from the Assets page and do not come here.
    if (action === "add") {
      const createdAsset = await createAssetRecord(values);
      replaceBackendAssetInState(createdAsset);
      await refreshBackendAssets();
      return { action: "add", asset: createdAsset };
    }

    let backendAssetId =
      payload.backendAssetId ||
      payload.assetBackendId ||
      values.backendAssetId ||
      values.assetBackendId ||
      "";

    // Delete Asset approval:
    // Officer request -> Admin approval -> soft delete from backend.
    // Admin delete from the Assets page is direct and does not come here.
    if (action === "delete") {
      const requestedAssetId =
        backendAssetId ||
        payload.id ||
        payload.assetId ||
        payload.entityId ||
        values.id ||
        values.assetId ||
        request?.entityId ||
        "";

      const matchedAsset = (assets || []).find((asset) => {
        const candidates = [
          asset.backendId,
          asset.assetBackendId,
          asset.id,
          asset.assetId,
        ].map(normalizeScopeValue);

        return candidates.includes(normalizeScopeValue(requestedAssetId));
      });

      backendAssetId =
        backendAssetId ||
        matchedAsset?.backendId ||
        matchedAsset?.assetBackendId ||
        "";

      if (!backendAssetId) {
        throw new Error("Asset backend ID is required for delete approval.");
      }

      await deleteAssetRecord(backendAssetId);
      removeBackendAssetFromState(backendAssetId);
      return { action: "delete", backendAssetId };
    }

    if (!backendAssetId) {
      throw new Error("Asset backend ID is required.");
    }

    if (action === "odometer_reset") {
      const resetResult = await resetAssetOdometer(backendAssetId, {
        newOdometer:
          Number(
            values.newOdometerAfterReset ??
              values.newOdometer ??
              values.newReading ??
              0,
          ) || 0,
        reason:
          values.reason ||
          payload.reason ||
          request.details ||
          "Odometer reset approved",
        effectiveAt: values.effectiveDate || values.effectiveAt || undefined,
        createdByUserId: backendAuthUser?.id || currentUser?.id || undefined,
      });

      if (resetResult?.asset) {
        replaceBackendAssetInState(resetResult.asset);
      }

      if (
        resetResult?.resetRecord &&
        typeof setAssetOdometerHistory === "function"
      ) {
        const record = resetResult.resetRecord;
        setAssetOdometerHistory((prev) => [
          ...(prev || []),
          {
            assetId: values.assetId || payload.id || record.assetId,
            entityId: values.assetId || payload.id || record.assetId,
            companyId: record.companyId,
            oldOdometerBeforeReset: record.oldOdometer,
            newOdometerAfterReset: record.newOdometer,
            newReading: record.newOdometer,
            effectiveDate: record.effectiveAt,
            effectiveFrom: record.effectiveAt,
            reason: record.reason,
            requestedBy: currentUser?.fullName || currentUser?.name || "System",
            requestedAt: record.createdAt || new Date().toISOString(),
            status: "Approved",
          },
        ]);
      }

      return resetResult;
    }

    throw new Error("Unsupported asset approval action.");
  };

  const handleApproveStationAction = async (request, reviewNote = "") => {
    if (request?.isBackendStationAction || request?.backendStationActionRequestId) {
      const requestId =
        request?.backendStationActionRequestId ||
        request?.payload?.backendActionRequestId;
      const reviewerUserId = backendAuthUser?.id || currentUser?.id || "";

      const reviewed = await reviewStationActionRequest(requestId, {
        reviewerUserId,
        approve: true,
        reviewNote: reviewNote || "Approved",
      });

      if (reviewed?.result?.station) {
        replaceBackendStationInState(reviewed.result.station);
      }

      await Promise.all([
        refreshBackendStationActions(),
        refreshBackendStations(currentCompanyId),
      ]);
      return reviewed;
    }

    const payload = request?.payload || {};
    const values = payload.values || {};
    const action = payload.action || values.action || "";

    if (
      !["zero_balance_adjustment", "stock_count_adjustment"].includes(action)
    ) {
      throw new Error("Unsupported station approval action.");
    }

    let backendStationId =
      payload.backendStationId ||
      payload.stationBackendId ||
      values.backendStationId ||
      values.stationBackendId ||
      "";

    const requestedStationId =
      payload.stationId ||
      payload.id ||
      values.stationId ||
      values.id ||
      request?.entityId ||
      "";

    const matchedStation = (stations || []).find((station) => {
      const candidates = [
        station.backendId,
        station.stationBackendId,
        station.id,
        station.stationId,
      ].map(normalizeScopeValue);

      return candidates.includes(normalizeScopeValue(requestedStationId));
    });

    backendStationId =
      backendStationId ||
      matchedStation?.backendId ||
      matchedStation?.stationBackendId ||
      "";

    if (!backendStationId && action === "zero_balance_adjustment") {
      throw new Error(
        "Station backend ID is required for zero balance approval.",
      );
    }

    const reason =
      payload.reason ||
      values.reason ||
      request.details ||
      (action === "zero_balance_adjustment"
        ? "Daily reconciliation after station emptying"
        : "Inventory adjustment approved by Admin");

    if (action === "zero_balance_adjustment") {
      const zeroBalanceResult = await zeroStationBalance(backendStationId, {
        reason,
        createdByUserId: backendAuthUser?.id || currentUser?.id || undefined,
      });

      if (zeroBalanceResult?.station) {
        replaceBackendStationInState(zeroBalanceResult.station);
      }

      const balanceBefore =
        Number(
          payload.oldValue ?? values.oldValue ?? payload.systemStockBefore ?? 0,
        ) || 0;

      setApprovedStationStockAdjustments((prev) => [
        ...prev,
        {
          stationId: requestedStationId,
          backendStationId,
          adjustmentQty: -balanceBefore,
          systemQty: balanceBefore,
          actualQty: 0,
          reason,
          adjustmentType: "ZERO_BALANCE_ADJUSTMENT",
          createdBy: currentUser?.fullName || currentUser?.name || "Manager",
          createdAt: new Date().toISOString(),
          source: "manager_approved_zero_balance",
        },
      ]);

      trackActivity?.(
        "Zero Balance Request Approved",
        "stations",
        `Zero balance request approved for station ${requestedStationId}. Previous stock: ${formatNumber(balanceBefore)} L. New stock: 0 L.`,
        {
          actionKey: "notifications.activity.actions.zeroBalanceRequestApproved",
          actionFallback: "Zero Balance Request Approved",
          detailsKey: "notifications.activity.details.zeroBalanceRequestApproved",
          detailsParams: {
            stationId: requestedStationId,
            previousStock: formatNumber(balanceBefore),
          },
          detailsFallback: `Zero balance request approved for station ${requestedStationId}. Previous stock: ${formatNumber(balanceBefore)} L. New stock: 0 L.`,
        },
      );

      return zeroBalanceResult;
    }

    if (!backendStationId && action === "stock_count_adjustment") {
      throw new Error(
        "Station backend ID is required for inventory adjustment approval.",
      );
    }

    const systemQty = Number(payload.oldValue ?? values.oldValue ?? 0) || 0;
    const actualQty = Number(payload.newValue ?? values.newValue ?? 0) || 0;

    const inventoryAdjustmentResult = await adjustStationInventory(
      backendStationId,
      {
        actualStock: actualQty,
        reason,
        createdByUserId: backendAuthUser?.id || currentUser?.id || undefined,
      },
    );

    const confirmedSystemQty =
      inventoryAdjustmentResult?.balanceBefore !== undefined &&
      inventoryAdjustmentResult?.balanceBefore !== null
        ? Number(inventoryAdjustmentResult.balanceBefore) || 0
        : systemQty;

    const confirmedActualQty =
      inventoryAdjustmentResult?.actualStock !== undefined &&
      inventoryAdjustmentResult?.actualStock !== null
        ? Number(inventoryAdjustmentResult.actualStock) || 0
        : actualQty;

    const adjustmentQty =
      inventoryAdjustmentResult?.adjustmentQuantity !== undefined &&
      inventoryAdjustmentResult?.adjustmentQuantity !== null
        ? Number(inventoryAdjustmentResult.adjustmentQuantity) || 0
        : confirmedActualQty - confirmedSystemQty;

    if (inventoryAdjustmentResult?.station) {
      replaceBackendStationInState(inventoryAdjustmentResult.station);
    }

    setApprovedStationStockAdjustments((prev) => [
      ...prev,
      {
        stationId: requestedStationId,
        backendStationId,
        adjustmentQty,
        systemQty: confirmedSystemQty,
        actualQty: confirmedActualQty,
        reason,
        adjustmentType: "INVENTORY_ADJUSTMENT",
        createdBy: currentUser?.fullName || currentUser?.name || "Admin",
        createdAt: new Date().toISOString(),
        source: "admin_approved_inventory_adjustment",
      },
    ]);

    trackActivity?.(
      "Inventory Adjustment Approved",
      "stations",
      `${requestedStationId} adjusted from ${formatNumber(confirmedSystemQty)} L to ${formatNumber(confirmedActualQty)} L. Difference: ${formatNumber(adjustmentQty)} L.`,
      {
        actionKey: "notifications.activity.actions.inventoryAdjustmentApproved",
        actionFallback: "Inventory Adjustment Approved",
        detailsKey: "notifications.activity.details.inventoryAdjustmentApproved",
        detailsParams: {
          stationId: requestedStationId,
          previousStock: formatNumber(confirmedSystemQty),
          actualStock: formatNumber(confirmedActualQty),
          adjustmentQty: formatNumber(adjustmentQty),
        },
        detailsFallback: `${requestedStationId} adjusted from ${formatNumber(confirmedSystemQty)} L to ${formatNumber(confirmedActualQty)} L. Difference: ${formatNumber(adjustmentQty)} L.`,
      },
    );

    return inventoryAdjustmentResult;
  };


  const handleRejectAssetAction = async (request, reviewNote = "") => {
    const requestId =
      request?.backendAssetActionRequestId ||
      request?.payload?.backendActionRequestId;
    const reviewerUserId = backendAuthUser?.id || currentUser?.id || "";

    const reviewed = await reviewAssetActionRequest(requestId, {
      reviewerUserId,
      approve: false,
      reviewNote: reviewNote || "Rejected",
    });

    await refreshBackendAssetActions();
    return reviewed;
  };

  const handleRejectStationAction = async (request, reviewNote = "") => {
    const requestId =
      request?.backendStationActionRequestId ||
      request?.payload?.backendActionRequestId;
    const reviewerUserId = backendAuthUser?.id || currentUser?.id || "";

    const reviewed = await reviewStationActionRequest(requestId, {
      reviewerUserId,
      approve: false,
      reviewNote: reviewNote || "Rejected",
    });

    await refreshBackendStationActions();
    return reviewed;
  };

  const mapBackendUserForState = (user = {}) => {
    const roleName =
      user.role?.name || user.roleName || user.role || "Operator";

    const isActive =
      user.isActive === false ||
      normalizeScopeValue(user.status) === "inactive" ||
      normalizeScopeValue(user.status) === "disabled"
        ? false
        : true;

    return {
      id: user.id,
      fullName: user.fullName || user.name || user.email || "",
      username:
        user.username ||
        makeUsernameFromUser({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        }),
      email: String(user.email || "").toLowerCase(),
      employeeId: user.employeeId || user.linkedEmployee?.employeeId || "",
      linkedEmployeeId: user.linkedEmployeeId || user.linkedEmployee?.id || "",
      phone: user.phone || "",
      mobile: user.phone || user.mobile || "",
      role: normalizeBackendRoleName(roleName),
      roleName,
      roleId: user.roleId || user.role?.id || "",
      companyId:
        user.companyId || user.company?.id || currentUser?.companyId || "",
      companyName: user.company?.name || user.companyName || "",
      status: isActive ? "Active" : "Inactive",
      isActive,
      passwordResetRequired: Boolean(
        user.mustChangePassword ?? user.passwordResetRequired,
      ),
      mustChangePassword: Boolean(
        user.mustChangePassword ?? user.passwordResetRequired,
      ),
      lastLogin: user.lastLoginAt || user.lastLogin || "",
      createdAt: user.createdAt || "",
      updatedAt: user.updatedAt || "",
      backendUser: true,
    };
  };

  const handleCreateUserFromEmployee = async (payload) => {
    const savedUserData = await createUserRecord(payload);
    const savedUser = mapBackendUserForState(savedUserData);

    setUsers((prev) => [
      savedUser,
      ...prev.filter(
        (user) =>
          normalizeScopeValue(user.id) !== normalizeScopeValue(savedUser.id),
      ),
    ]);

    return savedUser;
  };

  const handleUpdateUserStatusFromTeam = async (userId, isActive) => {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const savedUserData = await updateUserStatus(userId, isActive);
    const savedUser = mapBackendUserForState(savedUserData);

    setUsers((prev) =>
      prev.map((user) =>
        normalizeScopeValue(user.id) === normalizeScopeValue(savedUser.id)
          ? savedUser
          : user,
      ),
    );

    return savedUser;
  };

  const refreshBackendUsers = async (companyId = "", options = {}) => {
    const { force = false, silent = false } = options || {};
    const normalizedCompanyId = normalizeScopeValue(companyId);
    const signature = normalizedCompanyId || "all-companies";

    if (!force && usersFetchSignatureRef.current === signature && usersLoaded) {
      return users;
    }

    usersFetchSignatureRef.current = signature;

    if (!silent) {
      setUsersLoadError("");
    }

    setUsersLoading(true);

    try {
      const backendUsers = await fetchUsers({
        companyId:
          companyId && !isPlatformContextValue(companyId) ? companyId : "",
      });
      const mappedUsers = backendUsers
        .map(mapBackendUserForState)
        .filter((user) => user.id);

      setUsers(mappedUsers);
      setUsersLoaded(true);
      setUsersLoadError("");

      return mappedUsers;
    } catch (error) {
      console.warn("Users backend API is not available.", error);

      if (!silent) {
        setUsersLoadError(
          error?.response?.data?.message ||
            error?.message ||
            "Users backend API is not available.",
        );
      }

      return [];
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (backendAuthLoading) return;
    if (!currentUser?.id) return;

    async function fetchData() {
      try {
        const fetchBackendCompanies = async () => {
          try {
            // Platform User must load the protected companies payload so
            // platform-only fields such as dataImportEnabled are preserved
            // after reload/login. Other users continue using the public list.
            const backendCompanies = isPlatformAdminUser(currentUser)
              ? await fetchCompanies()
              : await fetchPublicCompanies();

            return mergePlatformConsoleWithCompanies(backendCompanies);
          } catch (error) {
            console.warn(
              isPlatformAdminUser(currentUser)
                ? "Protected companies API is not available. Using Platform Console fallback only."
                : "Public companies API is not available. Using Platform Console fallback only.",
              error,
            );

            return mergePlatformConsoleWithCompanies([]);
          }
        };

        const fetchBackendProjects = async () => {
          try {
            return await fetchProjects();
          } catch (error) {
            console.warn("Projects backend API is not available.", error);
            showToast?.("warning", "Projects backend API is not available.");
            return [];
          }
        };

        const fetchBackendEmployees = async () => {
          try {
            return await fetchEmployees();
          } catch (error) {
            console.warn("Employees backend API is not available.", error);
            showToast?.("warning", "Employees backend API is not available.");
            return [];
          }
        };

        const fetchBackendAssets = async () => {
          try {
            if (!canUseNetwork(showToast)) return [];
            return await fetchAssets();
          } catch (error) {
            logHandledApiIssue("Assets backend API is not available", error);
            if (isNetworkConnectionError(error)) {
              showToast?.("warning", NETWORK_OFFLINE_MESSAGE);
              return [];
            }
            showToast?.(
              "warning",
              getFriendlyApiErrorMessage(
                error,
                "Assets backend API is not available.",
              ),
            );
            return [];
          }
        };

        const fetchBackendStations = async () => {
          try {
            return await fetchStations();
          } catch (error) {
            console.warn("Stations backend API is not available.", error);
            showToast?.("warning", "Stations backend API is not available.");
            return [];
          }
        };

        const fetchBackendOperations = async () => {
          try {
            if (!canUseNetwork(showToast)) return [];
            return await fetchOperations(currentUserRef.current || currentUser);
          } catch (error) {
            logHandledApiIssue(
              "Operations backend API is not available",
              error,
            );
            if (isNetworkConnectionError(error)) {
              showToast?.("warning", NETWORK_OFFLINE_MESSAGE);
              return [];
            }
            showToast?.(
              "warning",
              getFriendlyApiErrorMessage(
                error,
                "Operations backend API is not available.",
              ),
            );
            return [];
          }
        };

        const [
          backendOperations,
          backendCompanies,
          backendProjects,
          backendEmployees,
          backendAssets,
          backendStations,
        ] = await Promise.all([
          fetchBackendOperations(),
          fetchBackendCompanies(),
          fetchBackendProjects(),
          fetchBackendEmployees(),
          fetchBackendAssets(),
          fetchBackendStations(),
        ]);

        // OPERATIONS - backend only. No CSV fallback.
        setHeaders(OPERATION_HEADERS);
        setData(
          backendOperations
            .filter(
              (operation) =>
                String(operation.status || "").toUpperCase() === "COMPLETED",
            )
            .map(mapBackendOperationForState),
        );

        // ASSETS - backend only. No CSV fallback.
        setAssets(
          backendAssets
            .map((backendAsset) => {
              const mappedAsset = mapBackendAssetForState(backendAsset);

              return backendAsset?.deletedAt
                ? {
                    ...mappedAsset,
                    deletedAt: backendAsset.deletedAt,
                    status: "Retired",
                  }
                : mappedAsset;
            })
            .filter((asset) => asset.id),
        );

        // STATIONS - backend only. No CSV fallback.
        setStations(
          backendStations
            .map(mapBackendStationForState)
            .filter((station) => station.id),
        );

        // TEAM - backend only. No CSV fallback.
        setFuelers(
          backendEmployees
            .map(mapBackendEmployeeForState)
            .filter((employee) => employee.id),
        );

        // PROJECTS - backend only. No CSV fallback.
        setProjects(
          backendProjects
            .map(mapBackendProjectForState)
            .filter((project) => project.id),
        );

        // COMPANIES - now loaded from NestJS/PostgreSQL public endpoint only.
        // Platform Console is a frontend tenant context option, not customer operational data.
        const mappedCompanies = mergePlatformConsoleWithCompanies(
          backendCompanies,
        )
          .map((company) => ({
            id: company.id,
            name: company.name || company.id,
            code: company.code || "",
            country: company.country || "",
            city: company.city || "",
            currency: company.currency || "SAR",
            timezone: company.timezone || "Asia/Riyadh",
            language: company.language || "EN-AR",
            subscriptionPlan: company.subscriptionPlan || "trial",
            status:
              company.isActive === false
                ? "Inactive"
                : company.status || "Active",
            isActive: company.isActive !== false,
            dataImportEnabled: Boolean(company.dataImportEnabled),
            isPlatformContext:
              Boolean(company.isPlatformContext) || isPlatformCompany(company),
            createdAt: company.createdAt || "",
            updatedAt: company.updatedAt || "",
          }))
          .filter((company) => company.id);

        setCompanies(mappedCompanies);
      } catch (error) {
        logHandledApiIssue("Failed to load Fleet Fuel PRO data", error);
        showToast?.(
          "warning",
          getFriendlyApiErrorMessage(
            error,
            "Failed to load Fleet Fuel PRO data.",
          ),
        );
        setHeaders([]);
        setData([]);
        setAssets([]);
        setStations([]);
        setFuelers([]);
        setProjects([]);
        setCompanies([]);
        // Keep existing users state; other pages depend on it for user-linked data.
      }
    }

    fetchData();
  }, [
    backendAuthLoading,
    currentUser?.id,
    currentUser?.role,
    currentUser?.fullName,
  ]);

  useEffect(() => {
    const firstAllowedPage = getPreferredPageOrder().find((pageKey) =>
      canAccessPage(pageKey),
    );

    if (firstAllowedPage && !canAccessPage(page)) {
      setPage(firstAllowedPage);
    }
  }, [
    page,
    currentUser?.id,
    currentUser?.role,
    backendIsLoggedIn,
    backendAuthUser?.id,
  ]);

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

  const currentCompanyId =
    currentUser?.role === "PlatformAdmin"
      ? selectedCompanyId || getPlatformCompanyId(companies)
      : currentUser?.companyId || selectedCompanyId;
  const isPlatformConsoleContext = isPlatformContextValue(currentCompanyId);
  const currentCompany = companies.find(
    (company) =>
      companyMatches(company.id, currentCompanyId) ||
      companyMatches(company.code, currentCompanyId) ||
      companyMatches(company.name, currentCompanyId),
  );

  useEffect(() => {
    let cancelled = false;

    async function checkCompanyAdminDataImportAccess() {
      if (!backendIsLoggedIn || !currentUser?.id) {
        if (!cancelled) setCompanyAdminDataImportAllowed(false);
        return;
      }

      if (currentUser.role === "PlatformAdmin") {
        if (!cancelled) setCompanyAdminDataImportAllowed(true);
        return;
      }

      if (currentUser.role !== "Admin") {
        if (!cancelled) setCompanyAdminDataImportAllowed(false);
        return;
      }

      try {
        await fetchDataImportAccess();
        if (!cancelled) setCompanyAdminDataImportAllowed(true);
      } catch (_error) {
        if (!cancelled) setCompanyAdminDataImportAllowed(false);
      }
    }

    checkCompanyAdminDataImportAccess();

    return () => {
      cancelled = true;
    };
  }, [backendIsLoggedIn, currentUser?.id, currentUser?.role, currentUser?.companyId]);

  const canOpenDataImportCenter =
    currentUser?.role === "PlatformAdmin" ||
    (currentUser?.role === "Admin" && companyAdminDataImportAllowed);

  const companyUsers = isPlatformAdminUser(currentUser)
    ? isPlatformConsoleContext
      ? users
      : users.filter((user) => companyMatches(user.companyId, currentCompanyId))
    : users.filter((user) => companyMatches(user.companyId, currentCompanyId));

  // Users & Roles page scope:
  // Platform Console shows all users across all companies.
  // Platform + selected company shows only that company's users.
  // Company Admin shows only users that belong to his own company.
  const usersPageUsers = companyUsers;

  useEffect(() => {
    if (!backendIsLoggedIn) return;
    if (!currentUser?.id) return;

    const canLoadUsers =
      ["Admin", "PlatformAdmin"].includes(currentUser?.role) ||
      hasBackendPermission?.("users.read") ||
      hasBackendPermission?.("users.status.change");

    if (!canLoadUsers) return;

    const targetCompanyId =
      isPlatformAdminUser(currentUser) && isPlatformConsoleContext
        ? ""
        : currentCompanyId;

    if (!targetCompanyId && !isPlatformAdminUser(currentUser)) return;

    refreshBackendUsers(targetCompanyId, { silent: true });
  }, [
    backendIsLoggedIn,
    currentUser?.id,
    currentUser?.role,
    currentCompanyId,
    isPlatformConsoleContext,
    hasBackendPermission,
  ]);

  useEffect(() => {
    if (!backendIsLoggedIn) return;
    if (!currentCompanyId || isPlatformContextValue(currentCompanyId)) return;
    if (!hasBackendPermission?.("team.read")) return;

    refreshBackendEmployees(
      currentCompanyId,
      currentUser?.id || backendAuthUser?.id || "",
    );
    refreshBackendEmployeeTransfers();
    refreshBackendAssetTransfers();
    refreshBackendStationTransfers();
    refreshBackendAssetActions();
    refreshBackendStationActions();
  }, [
    backendIsLoggedIn,
    currentCompanyId,
    currentUser?.id,
    backendAuthUser?.id,
    hasBackendPermission,
  ]);

  useEffect(() => {
    if (!backendIsLoggedIn || !currentUser?.id) return;

    const refreshPersistentApprovals = () => {
      refreshBackendAssetActions();
      refreshBackendStationActions();
    };

    refreshPersistentApprovals();
    const intervalId = window.setInterval(refreshPersistentApprovals, 15000);
    return () => window.clearInterval(intervalId);
  }, [backendIsLoggedIn, currentUser?.id, currentUser?.role, currentCompanyId]);

  const companyProjects = filterByCompany(
    projects,
    currentCompanyId,
    currentUser,
  );
  const companyAssets = filterByCompanyWithProjectFallback(
    assets,
    currentCompanyId,
    currentUser,
    companyProjects,
    "project",
  );
  const companyStations = filterByCompanyWithProjectFallback(
    stations,
    currentCompanyId,
    currentUser,
    companyProjects,
    "project",
  );
  const companyFuelers = filterByCompanyWithProjectFallback(
    fuelers,
    currentCompanyId,
    currentUser,
    companyProjects,
    "projectName",
  );
  const companyData = filterTransactionRowsByCompany({
    rows: data,
    headers,
    companyId: currentCompanyId,
    user: currentUser,
    assets,
    stations,
    projects,
  });

  const baseCurrentUserProjectScopeValues = useMemo(() => {
    if (!currentUser?.id) return [];

    if (
      ["PlatformAdmin", "Admin", "TopManagement"].includes(currentUser.role)
    ) {
      return ["all"];
    }

    const values = new Set();
    const addProjectValues = (project) => {
      [project?.id, project?.backendId, project?.code, project?.name]
        .filter(Boolean)
        .forEach((value) => values.add(normalizeScopeValue(value)));
    };

    if (currentUser.role === "Manager") {
      companyProjects
        .filter(
          (project) =>
            normalizeScopeValue(project.projectManagerId) ===
              normalizeScopeValue(currentUser.id) ||
            normalizeScopeValue(project.managerUserId) ===
              normalizeScopeValue(currentUser.id) ||
            normalizeScopeValue(project.managerId) ===
              normalizeScopeValue(currentUser.id) ||
            normalizeScopeValue(project.projectManager?.id) ===
              normalizeScopeValue(currentUser.id),
        )
        .forEach(addProjectValues);

      return Array.from(values).filter(Boolean);
    }

    companyFuelers
      .filter(
        (employee) =>
          normalizeScopeValue(employee.linkedUserId) ===
            normalizeScopeValue(currentUser.id) ||
          normalizeScopeValue(employee.linkedUser?.id) ===
            normalizeScopeValue(currentUser.id) ||
          (currentUser.email &&
            employee.email &&
            normalizeScopeValue(employee.email) ===
              normalizeScopeValue(currentUser.email)),
      )
      .forEach((employee) => {
        [employee.projectId, employee.projectName, employee.project]
          .filter(Boolean)
          .forEach((value) => values.add(normalizeScopeValue(value)));
      });

    return Array.from(values).filter(Boolean);
  }, [
    currentUser?.id,
    currentUser?.email,
    currentUser?.role,
    companyProjects,
    companyFuelers,
  ]);

  const projectScopeOptions = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === "PlatformAdmin") {
      return [
        {
          value: "all",
          label: "Global Access",
          project: null,
        },
      ];
    }

    if (["Admin", "TopManagement"].includes(currentUser.role)) {
      return [
        {
          value: "all",
          label: "All Projects",
          project: null,
        },
        ...companyProjects
          .filter((project) => project?.id)
          .map((project) => ({
            value: project.id || project.backendId || project.name,
            label: project.name || project.code || project.id,
            project,
          })),
      ];
    }

    const allowedProjects = companyProjects.filter((project) => {
      const projectValues = [
        project?.id,
        project?.backendId,
        project?.code,
        project?.name,
      ]
        .filter(Boolean)
        .map(normalizeScopeValue);

      return projectValues.some((value) =>
        baseCurrentUserProjectScopeValues.includes(value),
      );
    });

    const individualProjectOptions = allowedProjects.map((project) => ({
      value: project.id || project.backendId || project.name,
      label: project.name || project.code || project.id,
      project,
    }));

    if (currentUser.role === "Manager" && individualProjectOptions.length > 1) {
      return [
        ...individualProjectOptions,
        {
          value: "__all_managed_projects__",
          label: "All My Projects",
          project: null,
        },
      ];
    }

    return individualProjectOptions;
  }, [currentUser, companyProjects, baseCurrentUserProjectScopeValues]);

  useEffect(() => {
    if (!currentUser) {
      setSelectedProjectScope("");
      return;
    }

    if (!projectScopeOptions.length) {
      if (selectedProjectScope) setSelectedProjectScope("");
      return;
    }

    const selectedStillAvailable = projectScopeOptions.some(
      (option) =>
        normalizeScopeValue(option.value) ===
        normalizeScopeValue(selectedProjectScope),
    );

    if (!selectedStillAvailable) {
      setSelectedProjectScope(projectScopeOptions[0].value);
    }
  }, [
    currentUser?.id,
    currentUser?.role,
    selectedProjectScope,
    projectScopeOptions,
  ]);

  const selectedProjectScopeOption =
    projectScopeOptions.find(
      (option) =>
        normalizeScopeValue(option.value) ===
        normalizeScopeValue(selectedProjectScope),
    ) ||
    projectScopeOptions[0] ||
    null;

  const selectedProjectScopeValues = useMemo(() => {
    if (!selectedProjectScopeOption) return [];
    if (selectedProjectScopeOption.value === "all") return ["all"];

    if (selectedProjectScopeOption.value === "__all_managed_projects__") {
      return baseCurrentUserProjectScopeValues;
    }

    const project = selectedProjectScopeOption.project;

    return [
      selectedProjectScopeOption.value,
      project?.id,
      project?.backendId,
      project?.code,
      project?.name,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);
  }, [selectedProjectScopeOption, baseCurrentUserProjectScopeValues]);

  const currentUserProjectScopeValues = selectedProjectScopeValues.length
    ? selectedProjectScopeValues
    : baseCurrentUserProjectScopeValues;

  const activeOperationProjectScopeLabel =
    selectedProjectScopeOption?.label ||
    selectedProjectScopeOption?.project?.name ||
    selectedProjectScopeOption?.project?.code ||
    "All Projects";

  const currentUserCanAccessAllOperationalProjects =
    currentUserProjectScopeValues.includes("all");

  const projectMatchesCurrentScope = (project) => {
    if (currentUserCanAccessAllOperationalProjects) return true;
    if (!project?.id) return false;

    const projectValues = [
      project.id,
      project.backendId,
      project.code,
      project.name,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    return projectValues.some((value) =>
      currentUserProjectScopeValues.includes(value),
    );
  };

  const projectValueMatchesCurrentScope = (projectValue) => {
    if (currentUserCanAccessAllOperationalProjects) return true;
    if (!projectValue) return false;

    const normalizedProjectValue = normalizeScopeValue(projectValue);
    if (currentUserProjectScopeValues.includes(normalizedProjectValue))
      return true;

    const matchedProject = companyProjects.find((project) =>
      [project.id, project.backendId, project.code, project.name]
        .filter(Boolean)
        .map(normalizeScopeValue)
        .includes(normalizedProjectValue),
    );

    return matchedProject ? projectMatchesCurrentScope(matchedProject) : false;
  };

  const scopedProjects = (
    currentUserCanAccessAllOperationalProjects
      ? companyProjects
      : companyProjects.filter(projectMatchesCurrentScope)
  ).filter((project) => {
    const isHeadOffice = normalizeScopeValue(project.name) === "head office";
    if (!isHeadOffice) return true;
    return currentUser?.role === "Admin";
  });

  const availableProjectsForTransfer = filterAvailableProjects(companyProjects);

  // Enterprise transfer rule:
  // The user sees his scoped project data in tables, including historical/inactive records.
  // Project-change dropdowns must show operationally available projects only:
  // Active projects with an assigned Project Manager.
  // Projects without a manager remain visible in Projects / Sites so Admin can assign a manager,
  // but they are hidden from operational transfer and assignment dropdowns.
  const transferDestinationProjects = availableProjectsForTransfer;

  const scopedAssets = currentUserCanAccessAllOperationalProjects
    ? companyAssets
    : companyAssets.filter((asset) =>
        projectValueMatchesCurrentScope(asset.project),
      );

  const scopedStations = currentUserCanAccessAllOperationalProjects
    ? companyStations
    : companyStations.filter((station) =>
        projectValueMatchesCurrentScope(station.project),
      );

  const scopedFuelers = currentUserCanAccessAllOperationalProjects
    ? companyFuelers
    : companyFuelers.filter((fueler) =>
        projectValueMatchesCurrentScope(
          fueler.projectName || fueler.projectId || fueler.project,
        ),
      );

  const scopedTeamMembers = scopedFuelers.map((member) => {
    const explicitlyLinkedUser =
      companyUsers.find(
        (user) =>
          normalizeScopeValue(user.id) ===
          normalizeScopeValue(member.linkedUserId),
      ) || null;

    const linkedUserIsActive = explicitlyLinkedUser
      ? explicitlyLinkedUser.status === "Active"
      : member.linkedUserIsActive !== false && member.userStatus === "Linked";

    return {
      ...member,
      role:
        explicitlyLinkedUser?.role ||
        member.role ||
        member.jobTitle ||
        "Operator",
      userStatus:
        member.linkedUserId && linkedUserIsActive ? "Linked" : "Not Linked",
      linkedUserId: member.linkedUserId || "",
      linkedUserName:
        explicitlyLinkedUser?.fullName || member.linkedUserName || "",
      linkedUserIsActive,
    };
  });

  const scopedData = currentUserCanAccessAllOperationalProjects
    ? companyData
    : companyData.filter((row) =>
        getRowProjectValues(row, headers, companyAssets, companyStations).some(
          projectValueMatchesCurrentScope,
        ),
      );

  /*
    Operations dashboard metadata lookup:
    Keep operation visibility controlled by scopedData, but resolve equipment
    metadata from all company assets so historical operations still show the
    correct Equipment Type after an asset moves to another project.

    A Map keeps lookups O(1), avoiding repeated Array.find calls as the number
    of assets and operations grows.
  */
  const companyAssetLookup = useMemo(() => {
    const lookup = new Map();

    (companyAssets || []).forEach((asset) => {
      [
        asset?.id,
        asset?.assetId,
        asset?.backendId,
        asset?.assetBackendId,
        asset?.equipmentNo,
        asset?.equipmentNumber,
        asset?.equipment_no,
        asset?.equipment_number,
      ]
        .filter(Boolean)
        .forEach((value) => {
          lookup.set(normalizeScopeValue(value), asset);
        });
    });

    return lookup;
  }, [companyAssets]);

  const operationAssets = useMemo(() => {
    const visibleAssets = new Map();

    const addAsset = (asset) => {
      if (!asset) return;

      const identity = normalizeScopeValue(
        asset.backendId ||
          asset.assetBackendId ||
          asset.id ||
          asset.assetId ||
          asset.equipmentNo ||
          asset.equipmentNumber,
      );

      if (identity) {
        visibleAssets.set(identity, asset);
      }
    };

    // Keep assets already inside the selected project scope.
    (scopedAssets || []).forEach(addAsset);

    const destinationIndex = getHeaderIndex(headers, [
      "destination_id",
      "Destination ID",
      "destination id",
      "destination",
    ]);

    const assetIndex = getHeaderIndex(headers, [
      "asset_id",
      "Asset ID",
      "asset id",
      "equipment_no",
      "Equipment No",
      "equipment no",
      "equipment_number",
      "Equipment Number",
      "machine_id",
      "Machine ID",
      "target_equipment",
      "Target Equipment",
    ]);

    (scopedData || []).forEach((row) => {
      const operation = row?.__operation || {};
      const candidateValues = [
        operation?.assetId,
        operation?.asset?.id,
        operation?.asset?.assetId,
        assetIndex !== -1 ? row?.[assetIndex] : "",
        destinationIndex !== -1 ? row?.[destinationIndex] : "",
      ]
        .filter(Boolean)
        .map(normalizeScopeValue);

      candidateValues.forEach((candidate) => {
        addAsset(companyAssetLookup.get(candidate));
      });
    });

    return Array.from(visibleAssets.values());
  }, [scopedAssets, scopedData, headers, companyAssetLookup]);

  const loadPendingBackendOperationApprovals = async () => {
    if (!currentUser?.id || currentUser.status !== "Active") {
      setBackendOperationApprovals([]);
      return;
    }

    if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser.role)) {
      setBackendOperationApprovals([]);
      return;
    }

    try {
      const pendingApprovals =
        await fetchPendingOperationApprovals(currentUser);
      setBackendOperationApprovals(pendingApprovals);
    } catch (error) {
      setBackendOperationApprovals([]);
      console.warn("Failed to load backend operation approvals.", error);
    }
  };

  useEffect(() => {
    loadPendingBackendOperationApprovals();
  }, [currentUser?.id, currentUser?.role, currentUser?.status]);

  const loadPendingBackendOperationCorrections = async () => {
    if (!currentUser?.id || currentUser.status !== "Active") {
      setBackendOperationCorrections([]);
      return;
    }

    if (!["Manager", "Admin", "PlatformAdmin"].includes(currentUser.role)) {
      setBackendOperationCorrections([]);
      return;
    }

    try {
      const pendingCorrections =
        await fetchPendingOperationCorrections(currentUser);
      setBackendOperationCorrections(pendingCorrections);
    } catch (error) {
      setBackendOperationCorrections([]);
      console.warn("Failed to load backend operation corrections.", error);
    }
  };

  useEffect(() => {
    loadPendingBackendOperationCorrections();
  }, [currentUser?.id, currentUser?.role, currentUser?.status]);

  const refreshOperationsWorkspace = async () => {
    if (!currentUser?.id || currentUser.status !== "Active") return;

    const refreshCompletedOperations = async () => {
      try {
        const backendOperations = await fetchOperations(currentUser);
        const completedOperations = backendOperations
          .filter(
            (operation) =>
              String(operation?.status || "").toUpperCase() === "COMPLETED",
          )
          .map(mapBackendOperationForState);

        setData(completedOperations);
        return completedOperations;
      } catch (error) {
        console.warn("Failed to refresh backend operations.", error);
        return [];
      }
    };

    await Promise.all([
      refreshCompletedOperations(),
      refreshBackendAssets(),
      refreshBackendStations(),
      loadPendingBackendOperationApprovals(),
      loadPendingBackendOperationCorrections(),
    ]);
  };

  const backendOperationApprovalRequests = backendOperationApprovals
    .map((item) =>
      mapBackendOperationApprovalForFrontend(
        item,
        currentUser,
        companyAssets,
        companyStations,
        t,
      ),
    )
    .filter(Boolean);

  const backendOperationCorrectionRequests = backendOperationCorrections
    .map((item) =>
      mapBackendOperationCorrectionForFrontend(
        item,
        currentUser,
        companyAssets,
        companyStations,
        t,
      ),
    )
    .filter(Boolean);

  const employeeTransferApprovals = employeeTransferRequests
    .filter((transfer) =>
      ["PENDING", "PARTIALLY_APPROVED"].includes(
        String(transfer.status || "").toUpperCase(),
      ),
    )
    .map((transfer) => {
      const requestedBy =
        companyUsers.find((user) => user.id === transfer.requestedByUserId) ||
        currentUser;
      const isManagerTransfer = Boolean(transfer.isManagerTransfer);

      const requiredApprovers = (transfer.approvals || [])
        .filter((approval) => ["Pending", "Approved"].includes(approval.status))
        .map((approval) => {
          const approverUser = companyUsers.find(
            (user) => user.id === approval.approverUserId,
          );
          return {
            userId: approval.approverUserId,
            userName:
              approverUser?.fullName ||
              approverUser?.email ||
              approval.approverUserId,
            role: isManagerTransfer ? "Admin" : "Manager",
            projectId: approval.projectId || "-",
            approvalStage: approval.approvalStage || "Project Manager",
            status: approval.status || "Pending",
            reviewedAt: approval.reviewedAt || "",
            reviewNote: approval.note || "",
          };
        });

      const employeeDisplayId =
        transfer.employeeId || transfer.employeeBackendId || "-";
      const employeeDisplayName =
        transfer.employeeName || employeeDisplayId;
      const fromProject =
        transfer.fromProjectName || transfer.fromProjectId || "-";
      const toProject =
        transfer.toProjectName || transfer.toProjectId || "-";
      const employeeTransferMessage =
        getEmployeeTransferWorkflowMessageDescriptor(transfer, "pending");

      return {
        id: `EMP-TRANSFER-${transfer.id}`,
        type: "employee_transfer",
        module: "team",
        transferBatchId: transfer.transferBatchId || null,
        title: `${isManagerTransfer ? "Manager / Top Management Transfer" : "Team Transfer"}: ${employeeDisplayName}`,
        titleKey: isManagerTransfer
          ? "approvals.employeeTransfer.managerTitle"
          : "approvals.employeeTransfer.title",
        titleParams: {
          employeeId: employeeDisplayId,
          employeeName: employeeDisplayName,
        },
        titleFallback: `${isManagerTransfer ? "Manager / Top Management Transfer" : "Team Transfer"}: ${employeeDisplayName}`,
        payload: {
          transfer,
          employeeTransferId: transfer.id,
          transferBatchId: transfer.transferBatchId || null,
          employeeId: employeeDisplayId,
          employeeName: employeeDisplayName,
          fromProject,
          toProject,
        },
        details: employeeTransferMessage.fallback,
        detailsKey: employeeTransferMessage.key,
        detailsParams: employeeTransferMessage.params,
        detailsFallback: employeeTransferMessage.fallback,
        status: "Pending",
        changedFields: [
          {
            field: "project",
            label: "Project Transfer",
            labelKey: "approvals.fields.employeeProjectTransfer",
            labelFallback: "Project Transfer",
            oldValue: fromProject,
            newValue: toProject,
            sensitive: true,
          },
        ],
        entityType: "Team Member",
        entityId: transfer.employeeId || transfer.employeeBackendId || "-",
        sensitivity: "Sensitive",
        riskLevel: "High",
        approvalRoute: {
          routeType: isManagerTransfer
            ? "admin_manager_transfer"
            : "dual_project_manager",
          sourceProject:
            transfer.fromProjectName || transfer.fromProjectId || "-",
          destinationProject:
            transfer.toProjectName || transfer.toProjectId || "-",
          requiredApprovers,
          routeStatus: "Pending",
        },
        requestedById:
          requestedBy?.id || transfer.requestedByUserId || "System",
        requestedByName: requestedBy?.fullName || requestedBy?.name || "System",
        requestedByRole: requestedBy?.role || "System",
        requestedAt: transfer.createdAt || new Date().toISOString(),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: "",
      };
    });

  const assetTransferApprovals = assetTransferRequests
    .filter((transfer) =>
      ["PENDING", "PARTIALLY_APPROVED"].includes(
        String(transfer.status || "").toUpperCase(),
      ),
    )
    .map((transfer) => {
      const requestedBy =
        companyUsers.find((user) => user.id === transfer.requestedByUserId) ||
        currentUser;
      const assetDisplayId =
        transfer.assetName ||
        transfer.assetId ||
        transfer.assetBackendId ||
        "Asset";
      const fromProjectDisplay =
        transfer.fromProjectName || transfer.fromProjectId || "-";
      const toProjectDisplay =
        transfer.toProjectName || transfer.toProjectId || "-";

      const requiredApprovers = (transfer.approvals || [])
        .filter((approval) => ["Pending", "Approved"].includes(approval.status))
        .map((approval) => {
          const approverUser = companyUsers.find(
            (user) => user.id === approval.approverUserId,
          );
          const rawStage = approval.approvalStage || "Project Manager";
          const normalizedStage = String(rawStage).trim().toLowerCase();
          const stageKey =
            normalizedStage.includes("source")
              ? "approvals.stages.sourceProjectManager"
              : normalizedStage.includes("destination")
                ? "approvals.stages.destinationProjectManager"
                : "approvals.stages.projectManager";

          return {
            userId: approval.approverUserId,
            userName:
              approverUser?.fullName ||
              approverUser?.email ||
              approval.approverUserId,
            role: "Manager",
            projectId: approval.projectId || "-",
            approvalStage: rawStage,
            approvalStageKey: stageKey,
            approvalStageFallback: rawStage,
            status: approval.status || "Pending",
            reviewedAt: approval.reviewedAt || "",
            reviewNote: approval.note || "",
          };
        });

      return {
        id: `ASSET-TRANSFER-${transfer.id}`,
        type: "asset_transfer",
        module: "assets",
        transferBatchId: transfer.transferBatchId || null,
        title: `Asset Transfer: ${assetDisplayId}`,
        titleKey: "approvals.assetTransfer.title",
        titleParams: { assetId: assetDisplayId },
        titleFallback: `Asset Transfer: ${assetDisplayId}`,
        payload: {
          transfer,
          assetTransferId: transfer.id,
          transferBatchId: transfer.transferBatchId || null,
        },
        details: `Transfer ${assetDisplayId} from ${fromProjectDisplay} to ${toProjectDisplay}.`,
        detailsKey: "approvals.assetTransfer.details",
        detailsParams: {
          assetId: assetDisplayId,
          fromProject: fromProjectDisplay,
          toProject: toProjectDisplay,
        },
        detailsFallback: `Transfer ${assetDisplayId} from ${fromProjectDisplay} to ${toProjectDisplay}.`,
        status: "Pending",
        changedFields: [
          {
            field: "project",
            label: "Asset Project Transfer",
            labelKey: "approvals.fields.assetProjectTransfer",
            labelFallback: "Asset Project Transfer",
            oldValue: fromProjectDisplay,
            newValue: toProjectDisplay,
            sensitive: true,
          },
        ],
        entityType: "Asset",
        entityId: transfer.assetId || transfer.assetBackendId || "-",
        sensitivity: "Sensitive",
        riskLevel: "High",
        approvalRoute: {
          routeType: "dual_project_manager",
          sourceProject: fromProjectDisplay,
          destinationProject: toProjectDisplay,
          requiredApprovers,
          routeStatus: "Pending",
        },
        requestedById:
          requestedBy?.id || transfer.requestedByUserId || "System",
        requestedByName: requestedBy?.fullName || requestedBy?.name || "System",
        requestedByRole: requestedBy?.role || "System",
        requestedAt: transfer.createdAt || new Date().toISOString(),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: "",
      };
    });

  const stationTransferApprovals = stationTransferRequests
    .filter((transfer) =>
      ["PENDING", "PARTIALLY_APPROVED"].includes(
        String(transfer.status || "").toUpperCase(),
      ),
    )
    .map((transfer) => {
      const requestedBy =
        companyUsers.find((user) => user.id === transfer.requestedByUserId) ||
        currentUser;
      const requiredApprovers = (transfer.approvals || [])
        .filter((approval) => ["Pending", "Approved"].includes(approval.status))
        .map((approval) => {
          const approverUser = companyUsers.find(
            (user) => user.id === approval.approverUserId,
          );
          return {
            userId: approval.approverUserId,
            userName:
              approverUser?.fullName ||
              approverUser?.email ||
              approval.approverUserId,
            role: "Manager",
            projectId: approval.projectId || "-",
            approvalStage: approval.approvalStage || "Project Manager",
            status: approval.status || "Pending",
            reviewedAt: approval.reviewedAt || "",
            reviewNote: approval.note || "",
          };
        });

      const stationDisplayId =
        transfer.stationId ||
        transfer.stationName ||
        transfer.stationBackendId ||
        "-";
      const fromProject =
        transfer.fromProjectName || transfer.fromProjectId || "-";
      const toProject =
        transfer.toProjectName || transfer.toProjectId || "-";
      const transferMessage = getStationTransferWorkflowMessageDescriptor(
        transfer,
        "pending",
      );

      return {
        id: `STATION-TRANSFER-${transfer.id}`,
        type: "station_transfer",
        module: "stations",
        title: `Station Transfer: ${stationDisplayId}`,
        titleKey: "approvals.stationTransfer.title",
        titleParams: { stationId: stationDisplayId },
        titleFallback: `Station Transfer: ${stationDisplayId}`,
        payload: {
          transfer,
          stationTransferId: transfer.id,
          stationId: stationDisplayId,
          fromProject,
          toProject,
        },
        details: transferMessage.fallback,
        detailsKey: transferMessage.key,
        detailsParams: transferMessage.params,
        detailsFallback: transferMessage.fallback,
        status: "Pending",
        changedFields: [
          {
            field: "project",
            label: "Station Project Transfer",
            labelKey: "approvals.fields.stationProjectTransfer",
            labelFallback: "Station Project Transfer",
            oldValue: fromProject,
            newValue: toProject,
            sensitive: true,
          },
        ],
        entityType: "Station",
        entityId: transfer.stationId || transfer.stationBackendId || "-",
        sensitivity: "Sensitive",
        riskLevel: "High",
        approvalRoute: {
          routeType: "dual_project_manager",
          sourceProject:
            transfer.fromProjectName || transfer.fromProjectId || "-",
          destinationProject:
            transfer.toProjectName || transfer.toProjectId || "-",
          requiredApprovers,
          routeStatus: "Pending",
        },
        requestedById:
          requestedBy?.id || transfer.requestedByUserId || "System",
        requestedByName: requestedBy?.fullName || requestedBy?.name || "System",
        requestedByRole: requestedBy?.role || "System",
        requestedAt: transfer.createdAt || new Date().toISOString(),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: "",
      };
    });

  const allApprovalRequests = [
    ...pendingApprovals,
    ...backendAssetActionApprovals,
    ...backendStationActionApprovals,
    ...backendOperationApprovalRequests,
    ...backendOperationCorrectionRequests,
    ...employeeTransferApprovals,
    ...assetTransferApprovals,
    ...stationTransferApprovals,
  ];

  const notifications = buildNotificationItems({
    approvals: allApprovalRequests,
    activityLog,
    currentUser,
    readMap: notificationReadMap,
  });

  const unreadNotificationCount = notifications.filter(
    (item) => !item.read,
  ).length;
  const routedPendingApprovalCount = allApprovalRequests.filter(
    (item) =>
      item.status === "Pending" && canUserViewApproval(currentUser, item),
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
          setData={setData}
          assets={operationAssets}
          stations={scopedStations}
          allStations={companyStations}
          fuelers={scopedTeamMembers}
          literPrice={literPrice}
          getLiterPriceByDate={getLiterPriceByDate}
          currency={currency}
          assetProjectHistory={assetProjectHistory}
          assetOdometerHistory={assetOdometerHistory}
          stationCounterResetHistory={stationCounterResetHistory}
          currentUser={currentUser}
          activeProjectScopeLabel={activeOperationProjectScopeLabel}
          activeProjectScopeValues={currentUserProjectScopeValues}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          submitApprovalRequest={submitApprovalRequest}
          projects={companyProjects}
          showToast={showToast}
          onOperationsWorkspaceRefresh={refreshOperationsWorkspace}
        />
      );
    }

    if (page === "assets") {
      return (
        <AssetsPage
          assets={scopedAssets}
          setAssets={setAssets}
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
          onAssetTransferCreated={upsertAssetTransferRequest}
          onAssetActionRequestCreated={refreshBackendAssetActions}
          runWithActionLoading={runWithActionLoading}
        />
      );
    }

    if (page === "stations") {
      return (
        <StationsPage
          stations={scopedStations}
          setStations={setStations}
          projects={scopedProjects}
          transferProjects={transferDestinationProjects}
          data={scopedData}
          headers={headers}
          showToast={showToast}
          literPrice={literPrice}
          priceHistory={priceHistory}
          stationCounterResetHistory={stationCounterResetHistory}
          setStationCounterResetHistory={setStationCounterResetHistory}
          setPriceHistory={setPriceHistory}
          getLiterPriceByDate={getLiterPriceByDate}
          currency={currency}
          currentUser={currentUser}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          submitApprovalRequest={submitApprovalRequest}
          onStationTransferCreated={upsertStationTransferRequest}
          onStationActionRequestCreated={refreshBackendStationActions}
          externalStockAdjustments={approvedStationStockAdjustments}
        />
      );
    }
    if (page === "team") {
      return (
        <TeamPage
          fuelers={scopedTeamMembers}
          users={companyUsers}
          projects={scopedProjects}
          transferProjects={transferDestinationProjects}
          data={scopedData}
          headers={headers}
          showToast={showToast}
          currentUser={currentUser}
          hasPermission={hasPermission}
          submitApprovalRequest={submitApprovalRequest}
          onCreateEmployee={handleCreateEmployee}
          onCheckEmployeeIdAvailability={handleCheckEmployeeIdAvailability}
          onUpdateEmployee={handleUpdateEmployee}
          onCreateEmployeeTransfer={handleCreateEmployeeTransfer}
          onCreateBulkEmployeeTransfer={handleCreateBulkEmployeeTransfer}
          onCreateUserFromEmployee={handleCreateUserFromEmployee}
          onUpdateUserStatus={handleUpdateUserStatusFromTeam}
          onLoadRoles={fetchRoles}
          pendingEmployeeTransfers={employeeTransferRequests}
          companies={companies}
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
          currentCompany={currentCompany}
          currentCompanyId={currentCompanyId}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          submitApprovalRequest={submitApprovalRequest}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onAssignProjectManager={handleAssignProjectManager}
          onProjectFuelPriceUpdated={handleProjectFuelPriceUpdated}
          users={companyUsers}
          theme={theme}
        />
      );
    }

    if (page === "dataImport") {
      if (!canOpenDataImportCenter) {
        return (
          <div className="min-h-screen p-6 text-slate-100">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 font-bold">
              {t("dataImport.messages.notAvailable")}
            </div>
          </div>
        );
      }

      return (
        <DataImportCenterPage
          currentUser={currentUser}
          companies={companies}
          contextCompanyId={selectedCompanyId}
          showToast={showToast}
          onProjectsImported={(companyId) => refreshBackendProjects(companyId)}
          onEmployeesImported={(companyId) =>
            refreshBackendEmployees(companyId, currentUser?.id || "")
          }
          onAssetsImported={() => refreshBackendAssets()}
          onStationsImported={() => refreshBackendStations()}
        />
      );
    }

    if (page === "reports") {
      return (
        <ReportsPage
          data={scopedData}
          headers={headers}
          projects={scopedProjects}
          assets={scopedAssets}
          stations={scopedStations}
          assetTransferRequests={assetTransferRequests}
          currency={currency}
          currentUser={currentUser}
          currentCompany={currentCompany}
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
          approvals={allApprovalRequests}
          activityLog={activityLog}
          currentUser={currentUser}
          hasPermission={hasPermission}
        />
      );
    }

    if (page === "approvals") {
      return (
        <ApprovalsPage
          approvals={allApprovalRequests}
          setApprovals={setPendingApprovals}
          currentUser={currentUser}
          hasPermission={hasPermission}
          setData={setData}
          trackActivity={trackActivity}
          showToast={showToast}
          onApproveEmployeeTransfer={handleApproveEmployeeTransfer}
          onRejectEmployeeTransfer={handleRejectEmployeeTransfer}
          onApproveAssetTransfer={handleApproveAssetTransfer}
          onRejectAssetTransfer={handleRejectAssetTransfer}
          onApproveStationTransfer={handleApproveStationTransfer}
          onRejectStationTransfer={handleRejectStationTransfer}
          onApproveAssetAction={handleApproveAssetAction}
          onRejectAssetAction={handleRejectAssetAction}
          onApproveStationAction={handleApproveStationAction}
          onRejectStationAction={handleRejectStationAction}
          onOperationApprovalReviewed={loadPendingBackendOperationApprovals}
          onOperationCorrectionReviewed={loadPendingBackendOperationCorrections}
          onOperationsWorkspaceRefresh={refreshOperationsWorkspace}
          runWithActionLoading={runWithActionLoading}
        />
      );
    }

    if (page === "companies") {
      return (
        <CompaniesPage
          companies={companies}
          setCompanies={setCompanies}
          currentUser={currentUser}
          contextCompanyId={selectedCompanyId}
          showToast={showToast}
        />
      );
    }

    if (page === "users") {
      return (
        <UsersPage
          users={usersPageUsers}
          setUsers={setUsers}
          usersLoading={usersLoading}
          usersLoaded={usersLoaded}
          usersLoadError={usersLoadError}
          refreshUsers={refreshBackendUsers}
          setFuelers={setFuelers}
          companies={companies}
          projects={filterAvailableProjects(companyProjects)}
          currentUser={currentUser}
          contextCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
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

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOffline = () => {
      setIsOnline(false);
      showToast("warning", NETWORK_OFFLINE_MESSAGE);
    };

    const handleOnline = () => {
      setIsOnline(true);
      showToast("success", "Internet connection restored.");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const sidebarItems = [
    { key: "operations", label: t("sidebar.operations"), Icon: LayoutDashboard },
    { key: "assets", label: t("sidebar.assets"), Icon: Truck },
    { key: "stations", label: t("sidebar.stations"), Icon: Fuel },
    { key: "team", label: t("sidebar.team"), Icon: Users },
    { key: "projects", label: t("sidebar.projects"), Icon: Building2 },
    { key: "reports", label: t("sidebar.reports"), Icon: FileBarChart2 },
    { key: "companies", label: t("sidebar.companies"), Icon: Building2 },
    { key: "notifications", label: t("sidebar.notifications"), Icon: Bell },
    { key: "auditTimeline", label: t("sidebar.auditTimeline"), Icon: FileBarChart2 },
    { key: "approvals", label: t("sidebar.approvals"), Icon: FileBarChart2 },
    { key: "users", label: t("sidebar.usersRoles"), Icon: Users },
  ].filter((item) => canAccessPage(item.key));

  const currentUserProjectSectionLabel =
    currentUser?.role === "PlatformAdmin" ? t("sidebar.access") : t("sidebar.projectScope");

  const currentUserProjectLabel =
    selectedProjectScopeOption?.label ||
    (currentUser?.role === "PlatformAdmin"
      ? t("sidebar.globalAccess")
      : currentUser?.role === "Admin"
        ? t("sidebar.allProjects")
        : t("sidebar.noProjectAssigned"));

  const projectScopeDropdownDisabled =
    !projectScopeOptions.length ||
    currentUser?.role === "PlatformAdmin" ||
    (!["Admin", "TopManagement", "Manager"].includes(currentUser?.role) &&
      projectScopeOptions.length <= 1);

  const sidebarContentCollapsed = sidebarCollapsed && !mobileSidebarOpen;

  if (backendAuthLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-8 py-7 shadow-2xl text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src={
                theme === "dark"
                  ? "/icons/fleet-fuel-pro-dark.png"
                  : "/icons/fleet-fuel-pro-light.png"
              }
              alt="Fleet Fuel PRO"
              className="h-12 w-auto object-contain"
              draggable={false}
            />

            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide">
                Fleet Fuel PRO
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {t("common.systemName")}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400 animate-pulse">
            {t("common.loadingSystem")}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-[999998] bg-red-600 text-white text-center text-sm font-semibold py-2 shadow-lg">
            {NETWORK_OFFLINE_MESSAGE}
          </div>
        )}
        <LoginPage
          users={users}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
          loginIdentifier={loginIdentifier}
          setLoginIdentifier={setLoginIdentifier}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          loginError={loginError}
          handleLogin={handleLogin}
          theme={theme}
          setTheme={setTheme}
          actionLoading={actionLoading}
        />
        {toast && <Toast type={toast.type} message={toast.message} />}
      </>
    );
  }

  if (currentUser?.passwordResetRequired || forcePasswordChangeOpen) {
    return (
      <ForcePasswordChangePage
        theme={theme}
        currentUser={currentUser}
        currentPassword={forceCurrentPassword}
        setCurrentPassword={setForceCurrentPassword}
        newPassword={forceNewPassword}
        setNewPassword={setForceNewPassword}
        confirmPassword={forceConfirmPassword}
        setConfirmPassword={setForceConfirmPassword}
        error={forcePasswordError}
        loading={forcePasswordLoading}
        onSubmit={handleForcedPasswordChange}
        onLogout={handleLogout}
      />
    );
  }

  if (
    currentUser?.requiresFirstProject &&
    currentUser?.requiredSetupStep === "CREATE_FIRST_PROJECT"
  ) {
    return (
      <>
        <ProjectsPage
          projects={[]}
          assets={[]}
          stations={[]}
          fuelers={[]}
          data={[]}
          headers={[]}
          showToast={showToast}
          currency={currentCompany?.currency || "SAR"}
          currentUser={currentUser}
          currentCompany={currentCompany}
          currentCompanyId={currentUser.companyId}
          hasPermission={hasPermission}
          trackActivity={trackActivity}
          onCreateProject={handleCreateBootstrapFirstProject}
          users={[]}
          theme={theme}
          bootstrapFirstProject
          onBootstrapCancel={handleLogout}
          onBootstrapCompleted={handleBootstrapProjectCompleted}
        />
        {toast && <Toast type={toast.type} message={toast.message} />}
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        [data-theme="dark"] {
          --chart-axis-color: #cbd5e1;
        }

        [data-theme="light"] {
          --chart-axis-color: #334155;
        }

        [data-theme="dark"] select option {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }

        [data-theme="light"] .theme-main-bg {
          background:
            radial-gradient(
              circle at top left,
              rgba(245, 158, 11, 0.1),
              transparent 34%
            ),
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
        [data-theme="light"] .bg-slate-950\/50,
        [data-theme="light"] .bg-slate-900,
        [data-theme="light"] .bg-slate-900\/80,
        [data-theme="light"] .bg-slate-900\/70,
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

        [data-theme="light"] .bg-slate-700 {
          background-color: #e2e8f0 !important;
          color: #64748b !important;
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

        [data-theme="light"] select option {
          background-color: #ffffff !important;
          color: #0f172a !important;
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
          background-color: rgba(5, 150, 105, 0.1) !important;
        }

        [data-theme="light"] .bg-red-500\/15 {
          background-color: rgba(220, 38, 38, 0.1) !important;
        }

        [data-theme="light"] .bg-blue-500\/15 {
          background-color: rgba(30, 58, 138, 0.1) !important;
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

        /* Settings dropdown clipping fix */
        .fleet-page-shell,
        .settings-layer-safe {
          overflow: visible;
        }

        /* Mobile sidebar drawer */
        .fleet-mobile-topbar {
          display: none;
        }

        @media (max-width: 1023px) {
          .fleet-mobile-topbar {
            display: flex;
          }

          .fleet-mobile-sidebar {
            width: min(288px, 86vw) !important;
            max-width: 86vw;
          }

          .theme-main-bg {
            width: 100%;
          }
        }

        /* Sidebar internal scrolling */
        .fleet-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(245, 158, 11, 0.55) transparent;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.55);
          border-radius: 999px;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.8);
        }

        @media (max-width: 1023px) {
          .fleet-sidebar-scroll {
            padding-bottom: 1rem;
          }
        }

        /* Settings menu direction safety */
        .settings-layer-safe [class*="absolute left-0"] {
          max-width: calc(100vw - 1.5rem);
        }

        /* Portal modal top layer fix */
        .fleet-portal-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 100000 !important;
        }

        .fleet-portal-modal-panel {
          position: relative !important;
          z-index: 100001 !important;
        }
      `}</style>

      <div
        data-theme={theme}
        className="min-h-screen bg-[#070b14] flex overflow-hidden text-slate-100"
      >
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close mobile sidebar overlay"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-[10030] bg-black/65 backdrop-blur-sm lg:hidden"
          />
        )}

        <div
          className={`fleet-mobile-sidebar ${sidebarContentCollapsed ? "lg:w-20" : "lg:w-64"} fixed lg:sticky lg:top-0 inset-y-0 left-0 z-[10040] h-screen max-h-screen overflow-hidden shrink-0 bg-[#050814] text-white border-r border-slate-800/80 shadow-2xl p-4 flex flex-col transition-all duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden absolute top-3 right-3 h-9 w-9 rounded-xl border border-slate-700 bg-slate-900 text-slate-300"
            aria-label="Close sidebar menu"
          >
            ×
          </button>

          <div className="fleet-sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1">
          <div className="flex flex-col items-center mb-5">
            <img
              src={
                theme === "dark"
                  ? "/icons/fleet-fuel-pro-dark.png"
                  : "/icons/fleet-fuel-pro-light.png"
              }
              alt="Fleet Fuel PRO"
              className={`${sidebarContentCollapsed ? "w-12" : "w-28"} h-auto object-contain mb-3 select-none transition-all duration-300`}
              draggable={false}
            />

            {!sidebarContentCollapsed && (
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.22em] text-center">
                {t("common.systemName")}
              </p>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarContentCollapsed)}
            className="mb-4 w-full hidden lg:flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 text-slate-400 hover:bg-slate-800/70 hover:text-white border border-slate-800/80"
            title={
              sidebarContentCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <span>{sidebarContentCollapsed ? "»" : "«"}</span>
            {!sidebarContentCollapsed && <span>Collapse</span>}
          </button>

          <ul className="space-y-2">
            {sidebarItems.map(({ key, label, Icon }) => (
              <li key={key}>
                <button
                  onClick={() => {
                    setPage(key);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center ${sidebarContentCollapsed ? "justify-center px-3" : "gap-3 text-left px-4"} py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ${page === key ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/15" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"}`}
                  title={label}
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarContentCollapsed && (
                    <span className="flex items-center gap-2">
                      <span>{label}</span>
                      {key === "notifications" &&
                        unreadNotificationCount > 0 && (
                          <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {unreadNotificationCount}
                          </span>
                        )}
                      {key === "approvals" &&
                        routedPendingApprovalCount > 0 && (
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

          {!sidebarContentCollapsed && currentUser && (
            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                {t("sidebar.signedInAs")}
              </p>
              <p className="login-text text-sm font-bold text-slate-100 truncate">
                {currentUser.fullName}
              </p>
              <p className="text-xs text-amber-300 mt-0.5">
                {currentUser.role}
              </p>
              <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                  {currentUserProjectSectionLabel}
                </p>
                <select
                  value={selectedProjectScopeOption?.value || ""}
                  onChange={(event) =>
                    setSelectedProjectScope(event.target.value)
                  }
                  disabled={projectScopeDropdownDisabled}
                  className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-semibold text-slate-100 outline-none transition ${
                    projectScopeDropdownDisabled
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer hover:border-amber-400/70 focus:border-amber-400"
                  }`}
                  title={currentUserProjectLabel}
                >
                  {projectScopeOptions.length ? (
                    projectScopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value="">{t("sidebar.noProjectAssigned")}</option>
                  )}
                </select>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                >
                  {t("sidebar.logout")}
                </button>
              </div>
            </div>
          )}

          </div>

          <div className="shrink-0 pt-4 border-t border-slate-800/80">
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu((prev) => !prev);
                  setActiveSettingsSection(null);
                }}
                className={`w-full flex items-center ${sidebarContentCollapsed ? "justify-center px-3" : "justify-between gap-3 px-4"} py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 text-slate-300 hover:bg-slate-800/70 hover:text-white`}
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
                  {!sidebarContentCollapsed && <span>{t("common.settings")}</span>}
                </span>
                {!sidebarContentCollapsed && (
                  <span className="text-xs text-slate-500">{language.toUpperCase()}</span>
                )}
              </button>

              {showSettingsMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-full bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[999999]">
                  {!activeSettingsSection ? (
                    <>
                      <button type="button" onClick={() => setActiveSettingsSection("theme")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors">
                        <span>{t("common.theme")}</span><span className="text-slate-500">›</span>
                      </button>
                      <button type="button" onClick={() => setActiveSettingsSection("language")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 border-t border-slate-700 hover:bg-slate-800 transition-colors">
                        <span>{t("common.language")}</span><span className="text-slate-500">›</span>
                      </button>
                      {canOpenDataImportCenter && (
                        <button
                          type="button"
                          onClick={() => {
                            setPage("dataImport");
                            setShowSettingsMenu(false);
                            setActiveSettingsSection(null);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 border-t border-slate-700 hover:bg-slate-800 transition-colors"
                        >
                          <span>{t("dataImport.title")}</span>
                          <span className="text-slate-500">›</span>
                        </button>
                      )}
                    </>
                  ) : activeSettingsSection === "theme" ? (
                    <>
                      <button type="button" onClick={() => setActiveSettingsSection(null)} className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-900"><span>‹</span><span>{t("common.theme")}</span></button>
                      <button onClick={() => { setTheme("dark"); setShowSettingsMenu(false); setActiveSettingsSection(null); }} className={`w-full text-start px-4 py-3 text-sm transition-colors ${theme === "dark" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{t("common.darkTheme")}</button>
                      <button onClick={() => { setTheme("light"); setShowSettingsMenu(false); setActiveSettingsSection(null); }} className={`w-full text-start px-4 py-3 text-sm border-t border-slate-700 transition-colors ${theme === "light" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{t("common.lightTheme")}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setActiveSettingsSection(null)} className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-900"><span>‹</span><span>{t("common.language")}</span></button>
                      <button type="button" disabled={isUpdatingLanguage} onClick={async () => { try { await setLanguage("en"); setShowSettingsMenu(false); setActiveSettingsSection(null); } catch (error) { showToast?.("error", getFriendlyApiErrorMessage(error, t("common.languageSaveFailed"))); } }} className={`w-full text-start px-4 py-3 text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${language === "en" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{isUpdatingLanguage && language !== "en" ? t("common.saving") : t("common.english")}</button>
                      <button type="button" disabled={isUpdatingLanguage} onClick={async () => { try { await setLanguage("ar"); setShowSettingsMenu(false); setActiveSettingsSection(null); } catch (error) { showToast?.("error", getFriendlyApiErrorMessage(error, t("common.languageSaveFailed"))); } }} className={`w-full text-start px-4 py-3 text-sm border-t border-slate-700 transition-colors disabled:cursor-wait disabled:opacity-60 ${language === "ar" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{isUpdatingLanguage && language !== "ar" ? t("common.saving") : t("common.arabic")}</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="theme-main-bg flex-1 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_34%),#0b1220]">
          <div className="fleet-mobile-topbar lg:hidden sticky top-0 z-[10010] items-center justify-between gap-3 px-3 py-3 border-b border-slate-800 bg-[#050814]/95 backdrop-blur text-white">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-amber-300 shadow-lg"
              aria-label="Open sidebar menu"
            >
              ☰
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <img
                src={
                  theme === "dark"
                    ? "/icons/fleet-fuel-pro-dark.png"
                    : "/icons/fleet-fuel-pro-light.png"
                }
                alt="Fleet Fuel PRO"
                className="h-8 w-auto object-contain shrink-0"
                draggable={false}
              />
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-100 truncate">
                  Fleet Fuel PRO
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 truncate">
                  {currentUser?.role || "User"} • {currentUserProjectLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSettingsMenu((prev) => !prev);
                setActiveSettingsSection(null);
              }}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 shadow-lg"
              aria-label={t("common.settings")}
            >
              ⚙
            </button>
          </div>

          {showSettingsMenu && (
            <div className="lg:hidden fixed end-3 top-[62px] z-[10020] w-52 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {!activeSettingsSection ? (
                <>
                  <button type="button" onClick={() => setActiveSettingsSection("theme")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"><span>{t("common.theme")}</span><span className="text-slate-500">›</span></button>
                  <button type="button" onClick={() => setActiveSettingsSection("language")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 border-t border-slate-700 hover:bg-slate-800 transition-colors"><span>{t("common.language")}</span><span className="text-slate-500">›</span></button>
                  {canOpenDataImportCenter && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage("dataImport");
                        setShowSettingsMenu(false);
                        setActiveSettingsSection(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 border-t border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      <span>{t("dataImport.title")}</span><span className="text-slate-500">›</span>
                    </button>
                  )}
                </>
              ) : activeSettingsSection === "theme" ? (
                <>
                  <button type="button" onClick={() => setActiveSettingsSection(null)} className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-900"><span>‹</span><span>{t("common.theme")}</span></button>
                  <button onClick={() => { setTheme("dark"); setShowSettingsMenu(false); setActiveSettingsSection(null); }} className={`w-full text-start px-4 py-3 text-sm transition-colors ${theme === "dark" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{t("common.darkTheme")}</button>
                  <button onClick={() => { setTheme("light"); setShowSettingsMenu(false); setActiveSettingsSection(null); }} className={`w-full text-start px-4 py-3 text-sm border-t border-slate-700 transition-colors ${theme === "light" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{t("common.lightTheme")}</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setActiveSettingsSection(null)} className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-900"><span>‹</span><span>{t("common.language")}</span></button>
                  <button type="button" disabled={isUpdatingLanguage} onClick={async () => { try { await setLanguage("en"); setShowSettingsMenu(false); setActiveSettingsSection(null); } catch (error) { showToast?.("error", getFriendlyApiErrorMessage(error, t("common.languageSaveFailed"))); } }} className={`w-full text-start px-4 py-3 text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${language === "en" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{isUpdatingLanguage && language !== "en" ? t("common.saving") : t("common.english")}</button>
                  <button type="button" disabled={isUpdatingLanguage} onClick={async () => { try { await setLanguage("ar"); setShowSettingsMenu(false); setActiveSettingsSection(null); } catch (error) { showToast?.("error", getFriendlyApiErrorMessage(error, t("common.languageSaveFailed"))); } }} className={`w-full text-start px-4 py-3 text-sm border-t border-slate-700 transition-colors disabled:cursor-wait disabled:opacity-60 ${language === "ar" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-200 hover:bg-slate-800"}`}>{isUpdatingLanguage && language !== "ar" ? t("common.saving") : t("common.arabic")}</button>
                </>
              )}
            </div>
          )}

          {renderPage()}
          {!isOnline && (
            <div className="fixed top-0 left-0 right-0 z-[999998] bg-red-600 text-white text-center text-sm font-semibold py-2 shadow-lg">
              {NETWORK_OFFLINE_MESSAGE}
            </div>
          )}
          {toast && <Toast type={toast.type} message={toast.message} />}
        </div>
      </div>
    </>
  );
}

function LoginPage({
  users = [],
  companies = [],
  selectedCompanyId = "",
  setSelectedCompanyId,
  loginIdentifier,
  setLoginIdentifier,
  loginPassword = "",
  setLoginPassword,
  loginError,
  handleLogin,
  theme,
  setTheme,
  actionLoading = { active: false, label: "" },
}) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldsReady, setLoginFieldsReady] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const loginCompanies = useMemo(
    () =>
      mergePlatformConsoleWithCompanies(companies).filter(
        (company, index, list) =>
          company?.id &&
          normalizeSystemUserStatus(company.status || "Active") === "Active" &&
          list.findIndex(
            (item) =>
              normalizeScopeValue(item.id) === normalizeScopeValue(company.id),
          ) === index,
      ),
    [companies],
  );


  useEffect(() => {
    const email = String(loginIdentifier || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      setSelectedCompanyId?.("");
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get(
          `/auth/login-company?email=${encodeURIComponent(email)}`,
        );

        if (cancelled) return;

        const info = response?.data || {};
        const isPlatformUser = Boolean(info.isPlatformUser);
        const nextCompanyId = isPlatformUser
          ? selectedCompanyId || getPlatformCompanyId(loginCompanies)
          : info.companyId || "";

        setSelectedCompanyId?.(nextCompanyId);
      } catch (error) {
        if (cancelled) return;

        setSelectedCompanyId?.("");
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loginIdentifier]);

  return (
    <>
      <style jsx global>{`
        [data-theme="light"] .theme-main-bg {
          background:
            radial-gradient(
              circle at top left,
              rgba(245, 158, 11, 0.1),
              transparent 34%
            ),
            #f4f7fb !important;
        }

        [data-theme="light"] .login-surface,
        [data-theme="light"] .login-card {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: rgba(203, 213, 225, 0.95) !important;
        }

        [data-theme="light"] .login-muted {
          color: #64748b !important;
        }

        [data-theme="light"] .login-title,
        [data-theme="light"] .login-text {
          color: #0f172a !important;
        }

        [data-theme="light"] .login-input {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }

        [data-theme="light"] .login-soft {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        [data-theme="light"] .login-theme-button {
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          background-color: #ffffff !important;
        }

        [data-theme="light"] .login-theme-button:hover {
          border-color: #f59e0b !important;
          color: #b45309 !important;
        }

        /* Projects page polish */
        [data-theme="light"] .project-card-print {
          background: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 18px 35px rgba(15, 23, 42, 0.1) !important;
        }

        [data-theme="light"] .project-card-print .project-title {
          color: #1d4ed8 !important;
        }

        [data-theme="light"] .project-card-print .project-title:hover {
          color: #b45309 !important;
        }

        [data-theme="light"] .project-card-print .project-id,
        [data-theme="light"] .project-card-print .label {
          color: #64748b !important;
        }

        [data-theme="light"] .project-card-print .value {
          color: #0f172a !important;
        }

        [data-theme="light"] .project-card-print .metric {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75) !important;
        }

        [data-theme="light"] .project-card-print .text-slate-400,
        [data-theme="light"] .project-card-print .text-slate-500,
        [data-theme="light"] .project-card-print .text-gray-400 {
          color: #64748b !important;
        }

        [data-theme="light"] .project-card-print .text-slate-300,
        [data-theme="light"] .project-card-print .text-slate-100,
        [data-theme="light"] .project-card-print .text-white {
          color: #0f172a !important;
        }

        [data-theme="light"] .project-card-print .border-slate-700\/80,
        [data-theme="light"] .project-card-print .border-gray-700 {
          border-color: #cbd5e1 !important;
        }


        /* Station cards theme alignment */
        .station-card-print {
          isolation: isolate;
        }

        .station-card-print::before {
          content: "";
          position: absolute;
          inset-inline: 0;
          top: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            rgba(245, 158, 11, 0.95),
            rgba(59, 130, 246, 0.55),
            transparent
          );
          pointer-events: none;
          z-index: 1;
        }

        [data-theme="light"] .station-card-print {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #f8fafc 100%
          ) !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 18px 35px rgba(15, 23, 42, 0.1) !important;
        }

        [data-theme="light"] .station-card-print .station-title {
          color: #1e3a8a !important;
        }

        [data-theme="light"] .station-card-print .station-title:hover {
          color: #b45309 !important;
        }

        [data-theme="light"] .station-card-print .station-metric {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85) !important;
        }

        [data-theme="light"] .station-card-print .station-counter-digit {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #b45309 !important;
          box-shadow:
            inset 0 1px 2px rgba(15, 23, 42, 0.08),
            0 1px 2px rgba(15, 23, 42, 0.05) !important;
          text-shadow: none !important;
        }

        [data-theme="light"] .station-card-print .station-lifetime {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        [data-theme="light"] .station-card-print .station-lifetime .text-amber-300 {
          color: #b45309 !important;
        }

        /* Global clickable cursor */
        button,
        a,
        select,
        summary,
        [role="button"],
        input[type="button"],
        input[type="submit"],
        input[type="checkbox"],
        input[type="radio"],
        .cursor-clickable,
        .project-title,
        .project-card-print button {
          cursor: pointer !important;
        }

        button:disabled,
        select:disabled,
        input:disabled {
          cursor: not-allowed !important;
        }

        /* Project cards theme fix */
        [data-theme="light"] .project-card-print {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #f8fafc 100%
          ) !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 18px 35px rgba(15, 23, 42, 0.1) !important;
        }

        [data-theme="light"] .project-card-print::before {
          background: linear-gradient(
            90deg,
            rgba(245, 158, 11, 0.95),
            rgba(59, 130, 246, 0.55),
            transparent
          ) !important;
        }

        [data-theme="light"] .project-card-print .project-title {
          color: #1e3a8a !important;
        }

        [data-theme="light"] .project-card-print .project-title:hover {
          color: #b45309 !important;
        }

        [data-theme="light"] .project-card-print .project-id,
        [data-theme="light"] .project-card-print .label {
          color: #64748b !important;
        }

        [data-theme="light"] .project-card-print .value,
        [data-theme="light"] .project-card-print .font-bold,
        [data-theme="light"] .project-card-print .font-extrabold {
          color: #0f172a !important;
        }

        [data-theme="light"] .project-card-print .metric {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85) !important;
        }

        [data-theme="light"] .project-card-print .text-slate-500,
        [data-theme="light"] .project-card-print .text-slate-400,
        [data-theme="light"] .project-card-print .text-gray-400 {
          color: #64748b !important;
        }

        [data-theme="light"] .project-card-print .text-slate-300,
        [data-theme="light"] .project-card-print .text-slate-200,
        [data-theme="light"] .project-card-print .text-slate-100,
        [data-theme="light"] .project-card-print .text-white {
          color: #0f172a !important;
        }

        [data-theme="light"] .project-card-print .border-slate-700\/80,
        [data-theme="light"] .project-card-print .border-gray-700,
        [data-theme="light"] .project-card-print .border-slate-700 {
          border-color: #cbd5e1 !important;
        }
      `}</style>

      {actionLoading.active && (
        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-start justify-center pt-5">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-slate-950/95 px-5 py-3 shadow-2xl shadow-black/40 text-amber-200">
            <span className="h-4 w-4 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin" />
            <span className="text-sm font-black tracking-wide">
              {actionLoading.label || "Working..."}
            </span>
          </div>
        </div>
      )}

      <div
        data-theme={theme}
        className="theme-main-bg min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-4xl grid lg:grid-cols-[0.95fr_1.05fr] overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/30">
          <section className="login-surface relative overflow-hidden border-b border-slate-800 p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex h-full min-h-[360px] flex-col justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <img
                    src={
                      theme === "dark"
                        ? "/icons/fleet-fuel-pro-dark.png"
                        : "/icons/fleet-fuel-pro-light.png"
                    }
                    alt="Fleet Fuel PRO"
                    className="h-auto w-24 object-contain"
                    draggable={false}
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">
                      {t("login.secureWorkspace")}
                    </p>
                    <h1 className="login-title mt-1 text-3xl font-black text-white">
                      Fleet Fuel PRO
                    </h1>
                  </div>
                </div>

                <div className="mt-10">
                  <h2 className="login-text text-2xl font-black text-slate-100">
                    {t("login.heroTitle")}
                  </h2>
                  <p className="login-muted mt-4 max-w-md text-sm leading-7 text-slate-400">
                    {t("login.heroDescription")}
                  </p>
                </div>
              </div>

              <div className="login-soft mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    ✓
                  </span>
                  <div>
                    <p className="login-text text-sm font-bold text-slate-100">
                      {t("login.protectedAccess")}
                    </p>
                    <p className="login-muted mt-1 text-xs leading-5 text-slate-500">
                      {t("login.protectedDescription")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <form
            onSubmit={handleLogin}
            autoComplete="on"
            className="login-card bg-slate-900/95 p-7 sm:p-10"
          >
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="login-muted text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {t("login.accountAccess")}
                </p>
                <h3 className="login-title mt-1 text-3xl font-black text-white">
                  {t("login.welcomeBack")}
                </h3>
                <p className="login-muted mt-2 text-sm text-slate-500">
                  {t("login.enterCredentials")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="login-theme-button shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
              >
                {theme === "dark" ? t("login.light") : t("login.dark")}
              </button>
            </div>

            <label className="block">
              <span className="login-muted text-xs font-bold text-slate-400">
                {t("login.username")}
              </span>
              <input
                name="username"
                value={loginIdentifier}
                onFocus={() => setLoginFieldsReady(true)}
                onMouseDown={() => setLoginFieldsReady(true)}
                onChange={(e) => {
                  setLoginIdentifier(e.target.value.toLowerCase());
                  setLoginPassword?.("");
                }}
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                readOnly={!loginFieldsReady}
                className="login-input mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
              <p className="login-muted mt-2 text-[11px] text-slate-500">
                {t("login.usernameHelp")}
              </p>
            </label>

            <label className="mt-5 block">
              <div className="flex items-center justify-between gap-3">
                <span className="login-muted text-xs font-bold text-slate-400">
                  {t("login.password")}
                </span>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-bold text-amber-300 transition hover:text-amber-200 hover:underline"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>

              <div className="relative mt-2">
                <input
                  name="password"
                  value={loginPassword}
                  onFocus={() => setLoginFieldsReady(true)}
                  onMouseDown={() => setLoginFieldsReady(true)}
                  onChange={(e) => setLoginPassword?.(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  readOnly={!loginFieldsReady}
                  className="login-input w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-4 pr-14 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-slate-400 transition hover:text-amber-300"
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.7a2 2 0 002.7 2.7" />
                      <path d="M9.9 4.3A10.6 10.6 0 0112 4c5 0 8.5 4 9.5 6-.4.9-1.2 2.1-2.4 3.2" />
                      <path d="M6.2 6.2C4.4 7.5 3.2 9.1 2.5 10c1 2 4.5 6 9.5 6 1.1 0 2.1-.2 3-.5" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {loginError && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={actionLoading.active}
              className="mt-7 w-full rounded-2xl bg-amber-400 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading.active ? t("login.signingIn") : t("login.signIn")}
            </button>

            <p className="login-muted mt-5 text-center text-xs leading-5 text-slate-500">
              {t("login.accessProblems")}
            </p>
          </form>
        </div>
      </div>

      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="login-card w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
                  {t("login.accountRecovery")}
                </p>
                <h3 className="login-title mt-1 text-2xl font-black text-white">
                  {t("login.forgotPasswordTitle")}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-red-400 hover:text-red-300"
                aria-label={t("login.closeRecovery")}
              >
                ×
              </button>
            </div>

            <p className="login-muted mt-5 text-sm leading-6 text-slate-300">
              {t("login.recoveryMessage")}
            </p>

            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="mt-6 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
