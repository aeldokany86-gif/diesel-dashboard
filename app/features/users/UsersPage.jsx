"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ModalPortal from "../../components/ui/ModalPortal";
import { useLanguage } from "../../context/LanguageContext";

import {
  normalizeBackendRoleName,
  normalizeScopeValue,
} from "../../lib/helpers";

import {
  companyMatches,
  isPlatformAdminUser,
  isPlatformContextValue,
} from "../../lib/companyHelpers";

import {
  ROLE_PERMISSIONS,
} from "../../lib/permissionHelpers";

import {
  resolveEnumValue,
} from "../../lib/i18nMessageHelpers";

import {
  createUserRecord,
  fetchRoles,
  fetchUsers,
  resetUserPassword,
  updateUserRecord,
  updateUserStatus,
} from "../../services/usersService";

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

function makeUsernameFromUser({ id, fullName, email }) {
  const emailName = String(email || "").split("@")[0];
  const raw = emailName || fullName || id || "user";

  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "") || String(id || "user");
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

export default function UsersPage({
  users = [],
  setUsers,
  usersLoading = false,
  usersLoaded = false,
  usersLoadError = "",
  refreshUsers,
  setFuelers = () => {},
  companies = [],
  projects = [],
  currentUser,
  contextCompanyId = "",
  hasPermission = () => false,
  trackActivity = () => {},
  showToast,
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";

  const getUserStatusLabel = (status) =>
    resolveEnumValue(t, "userStatus", status, status || "-");

  const getUserRoleLabel = (roleValue) =>
    resolveEnumValue(
      t,
      "userRole",
      normalizeBackendRoleName(roleValue),
      roleValue || "-"
    );

  const userActivityI18n = (
    actionKey,
    detailsKey,
    params = {},
    actionFallback = "",
    detailsFallback = "",
    options = {}
  ) => ({
    actionKey: `notifications.activity.actions.${actionKey}`,
    actionParams: params,
    actionEnumParams: options.actionEnumParams || {},
    actionFallback,
    detailsKey: `notifications.activity.details.${detailsKey}`,
    detailsParams: params,
    detailsEnumParams: options.detailsEnumParams || {},
    detailsFallback,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState(null);
  const [backendRoles, setBackendRoles] = useState([]);
  const [savingUser, setSavingUser] = useState(false);
  const [updatingUserStatusById, setUpdatingUserStatusById] = useState({});
  const [updatingUserRoleById, setUpdatingUserRoleById] = useState({});
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPasswordResult, setTemporaryPasswordResult] = useState(null);
  const [userConfirmModal, setUserConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    confirmTone: "amber",
    onConfirm: null,
  });

  const settingsRef = useRef(null);

  const emptyUserForm = {
    fullName: "",
    email: "",
    phone: "",
    roleId: "",
    companyId: "",
    password: "",
  };

  const [userForm, setUserForm] = useState(emptyUserForm);

  useOutsideClick(settingsRef, () => setSettingsOpen(false));

  const normalizeBackendUserForState = (user = {}) => {
    const roleName =
      user.role?.name ||
      user.roleName ||
      user.role ||
      "Operator";

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
      companyId: user.companyId || user.company?.id || currentUser?.companyId || "",
      companyName: user.company?.name || user.companyName || "",
      status: isActive ? "Active" : "Inactive",
      isActive,
      passwordResetRequired: Boolean(user.mustChangePassword ?? user.passwordResetRequired),
      mustChangePassword: Boolean(user.mustChangePassword ?? user.passwordResetRequired),
      lastLogin: user.lastLoginAt || user.lastLogin || "",
      createdAt: user.createdAt || "",
      updatedAt: user.updatedAt || "",
      backendUser: true,
    };
  };

  const isPlatformUserContext = isPlatformAdminUser(currentUser);
  const canUseBackendUsersApi = ["Admin", "PlatformAdmin"].includes(currentUser?.role);

  const buildRoleOptionsFromBackendRoles = (roles = []) => {
    return roles
      .map((role) => {
        const roleName = role.name || role.roleName || role.label || role.key || role.normalizedName || "";

        return {
          id: role.id || role.roleId || roleName,
          name: roleName,
          normalizedName: normalizeBackendRoleName(roleName),
        };
      })
      .filter((role) => {
        const normalized = normalizeScopeValue(role.name);
        return (
          role.id &&
          role.name &&
          normalized !== "platform user" &&
          normalized !== "platformadmin" &&
          normalized !== "platform admin"
        );
      });
  };

  const buildRoleOptionsFromUsers = (usersList = []) => {
    const map = new Map();

    usersList.forEach((user) => {
      const roleName = user.roleName || user.role || "";
      const roleId = user.roleId || "";
      const normalizedName = normalizeBackendRoleName(roleName);

      if (!roleId || !normalizedName) return;
      if (normalizedName === "PlatformAdmin") return;

      map.set(roleId, {
        id: roleId,
        name: roleName || normalizedName,
        normalizedName,
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  };

  const backendRoleOptions = buildRoleOptionsFromBackendRoles(backendRoles);
  const userDerivedRoleOptions = buildRoleOptionsFromUsers(users);

  const mergeRequiredRoleOptions = (roles = []) => {
    const map = new Map();

    roles.forEach((role) => {
      const normalizedName = normalizeBackendRoleName(role.normalizedName || role.name || role.id);
      if (!normalizedName || normalizedName === "PlatformAdmin") return;

      map.set(normalizedName, {
        ...role,
        normalizedName,
      });
    });

    [
      { id: "Admin", name: "Admin", normalizedName: "Admin" },
      { id: "Manager", name: "Manager", normalizedName: "Manager" },
      { id: "Officer", name: "Officer", normalizedName: "Officer" },
      { id: "Operator", name: "Operator", normalizedName: "Operator" },
      { id: "Supervisor", name: "Supervisor", normalizedName: "Supervisor" },
      { id: "Top Management", name: "Top Management", normalizedName: "TopManagement" },
    ].forEach((role) => {
      if (!map.has(role.normalizedName)) {
        map.set(role.normalizedName, role);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  };

  const roleOptions = canUseBackendUsersApi
    ? mergeRequiredRoleOptions(backendRoleOptions.length ? backendRoleOptions : userDerivedRoleOptions)
    : mergeRequiredRoleOptions(
        Object.keys(ROLE_PERMISSIONS)
          .filter((role) => role !== "PlatformAdmin")
          .map((role) => ({
            id: role === "TopManagement" ? "Top Management" : role,
            name: role === "TopManagement" ? "Top Management" : role,
            normalizedName: role,
          }))
      );


  const companyOptions = companies
    .filter((company) => company?.id && !isPlatformContextValue(company.id) && !isPlatformContextValue(company.name))
    .filter((company) => normalizeScopeValue(company.status || "Active") === "active")
    .map((company) => ({
      id: company.id,
      name: company.name || company.code || company.id,
      code: company.code || "",
    }));

  const activeContextCompanyId =
    isPlatformUserContext && contextCompanyId && !isPlatformContextValue(contextCompanyId)
      ? contextCompanyId
      : "";

  const isPlatformConsoleCompanyContext =
    isPlatformUserContext &&
    !activeContextCompanyId &&
    (!currentUser?.companyId || isPlatformContextValue(currentUser.companyId));

  const effectiveUserFormCompanyId =
    userForm.companyId ||
    activeContextCompanyId ||
    (!isPlatformUserContext ? currentUser?.companyId || "" : "");

  const canChangeUserCompany = isPlatformConsoleCompanyContext && !savingUser;

  const currentUserCompanyName =
    companies.find((company) => companyMatches(company.id, currentUser?.companyId))?.name ||
    currentUser?.companyName ||
    currentUser?.companyId ||
    t("users.values.currentCompany");

  const selectedFormCompanyName =
    companyOptions.find((company) => companyMatches(company.id, effectiveUserFormCompanyId))?.name ||
    currentUserCompanyName;


  const getDefaultRoleIdFromRoles = (roles = []) => {
    const options = buildRoleOptionsFromBackendRoles(roles);
    return (
      options.find((role) => role.normalizedName === "Operator")?.id ||
      options[0]?.id ||
      ""
    );
  };

  const loadRolesForCompany = async (companyId) => {
    if (!canUseBackendUsersApi) {
      setBackendRoles([]);
      return [];
    }

    const targetCompanyId = isPlatformUserContext
      ? companyId || activeContextCompanyId || userForm.companyId || ""
      : currentUser?.companyId || companyId;

    if (!targetCompanyId) {
      setBackendRoles([]);
      return [];
    }

    try {
      const roles = await fetchRoles({
        companyId: isPlatformUserContext ? targetCompanyId : "",
        fallbackToGlobal: true,
      });

      setBackendRoles(roles);
      return roles;
    } catch (error) {
      logHandledApiIssue("Failed to load roles from backend", error);
      setBackendRoles([]);
      notifyUser(showToast, "warning", t("users.messages.loadRolesFailed"));
      return [];
    }
  };

  const refreshUsersAndRolesFromBackend = async () => {
    if (!canUseBackendUsersApi) {
      setBackendRoles([]);
      setUsers([]);
      return;
    }

    try {
      const targetCompanyId =
        isPlatformUserContext && activeContextCompanyId
          ? activeContextCompanyId
          : currentUser?.companyId || contextCompanyId || "";

      let backendUsers = [];

      if (typeof refreshUsers === "function") {
        backendUsers = await refreshUsers(targetCompanyId, {
          force: true,
          silent: true,
        });
      } else {
        backendUsers = await fetchUsers({
          companyId:
            targetCompanyId && !isPlatformContextValue(targetCompanyId)
              ? targetCompanyId
              : "",
        });

        setUsers(
          backendUsers
            .map(normalizeBackendUserForState)
            .filter((user) => user.id)
        );
      }

      // Keep Users page fast: do not fetch roles on every users refresh.
      // Inline role dropdown can use roles derived from loaded users.
      // Full role lists are loaded on demand when an Add/Create User flow needs them.
      setBackendRoles((prevRoles) => (Array.isArray(prevRoles) ? prevRoles : []));
    } catch (error) {
      logHandledApiIssue("Failed to load users and roles from backend", error);
      notifyUser(showToast, "warning", t("users.messages.loadUsersFailed"));
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = normalizeScopeValue(searchTerm);
    const userRoleName = user.roleName || user.role || "";

    if (isPlatformUserContext && activeContextCompanyId && !companyMatches(user.companyId, activeContextCompanyId)) {
      return false;
    }

    if (!isPlatformUserContext && currentUser?.companyId && !companyMatches(user.companyId, currentUser.companyId)) {
      return false;
    }

    const matchesSearch =
      !search ||
      [
        user.username,
        user.employeeId,
        user.roleName,
        user.role,
        user.email,
        user.fullName,
        userRoleName,
        user.status,
      ]
        .filter(Boolean)
        .some((value) => normalizeScopeValue(value).includes(search));

    const matchesRole =
      roleFilter === "All" ||
      user.role === roleFilter ||
      userRoleName === roleFilter ||
      normalizeBackendRoleName(userRoleName) === roleFilter;

    const matchesStatus = statusFilter === "All" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const USERS_PAGE_SIZE = 5;
  const usersTotalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PAGE_SIZE)
  );
  const safeUsersPage = Math.min(usersPage, usersTotalPages);
  const usersPageStartIndex = (safeUsersPage - 1) * USERS_PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(
    usersPageStartIndex,
    usersPageStartIndex + USERS_PAGE_SIZE
  );

  useEffect(() => {
    setUsersPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    if (usersPage > usersTotalPages) {
      setUsersPage(usersTotalPages);
    }
  }, [usersPage, usersTotalPages]);

  const activeUsersCount = users.filter((user) => user.status === "Active").length;
  const inactiveUsersCount = users.filter((user) => user.status !== "Active").length;
  const resetRequiredCount = users.filter((user) => user.passwordResetRequired || user.mustChangePassword).length;

  const openAddUserModal = async () => {
    if (!hasPermission("users", "add")) {
      notifyUser(showToast, "warning", t("users.validation.noAddPermission"));
      return;
    }

    const defaultCompanyId = isPlatformUserContext
      ? activeContextCompanyId || ""
      : currentUser?.companyId || "";

    setUserForm({
      ...emptyUserForm,
      companyId: defaultCompanyId,
      roleId: "",
      password: "User@12345",
    });
    setUserModalMode("add");
    setSettingsOpen(false);

    const roles = await loadRolesForCompany(defaultCompanyId);
    const defaultRoleId = getDefaultRoleIdFromRoles(roles);

    setUserForm((prev) => ({
      ...prev,
      roleId: defaultRoleId,
    }));
  };

  const closeUserModal = () => {
    if (savingUser) return;
    setUserModalMode(null);
    setUserForm(emptyUserForm);
  };

  const handleUserFormChange = (field, value) => {
    if (field === "companyId") {
      if (!canChangeUserCompany) return;

      setUserForm((prev) => ({
        ...prev,
        companyId: value,
        roleId: "",
      }));

      loadRolesForCompany(value).then((roles) => {
        const defaultRoleId = getDefaultRoleIdFromRoles(roles);
        setUserForm((prev) => ({
          ...prev,
          roleId: defaultRoleId,
        }));
      });

      return;
    }

    setUserForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveUser = async (event) => {
    event?.preventDefault?.();

    const resolvedCompanyId = isPlatformUserContext
      ? effectiveUserFormCompanyId
      : currentUser?.companyId || effectiveUserFormCompanyId;

    const payload = {
      fullName: userForm.fullName.trim(),
      email: userForm.email.trim().toLowerCase(),
      phone: userForm.phone.trim(),
      roleId: userForm.roleId,
    };

    if (userModalMode === "add") {
      payload.companyId = resolvedCompanyId;
    }

    if (!payload.fullName || !payload.email || !payload.roleId) {
      notifyUser(showToast, "warning", t("users.validation.requiredFields"));
      return;
    }

    if (userModalMode === "add" && !payload.companyId) {
      notifyUser(showToast, "warning", t("users.validation.companyRequired"));
      return;
    }

    if (userModalMode === "add") {
      payload.password = userForm.password.trim();

      if (!payload.password) {
        notifyUser(showToast, "warning", t("users.validation.temporaryPasswordRequired"));
        return;
      }
    }

    setSavingUser(true);

    try {
      if (userModalMode === "add") {
        const savedUserData = await createUserRecord(payload);
        const savedUser = normalizeBackendUserForState(savedUserData);

        setUsers((prev) => [
          savedUser,
          ...prev.filter((user) => user.id !== savedUser.id),
        ]);

        trackActivity(
          "Add User",
          "users",
          `${savedUser.username || savedUser.fullName || "User"} created.`,
          userActivityI18n(
            "addUser",
            "userAdded",
            { userName: savedUser.username || savedUser.fullName || "User" },
            "Add User",
            `${savedUser.username || savedUser.fullName || "User"} created.`
          )
        );
        notifyUser(showToast, "success", t("users.messages.userAdded"));
      }

      closeUserModal();
    } catch (error) {
      logHandledApiIssue("Failed to save user", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("users.messages.saveFailed");
      notifyUser(
        showToast,
        inferToastTypeFromMessage(message),
        error?.response?.data?.message
          ? t("users.messages.saveFailedWithReason", { reason: String(error.response.data.message) })
          : t("users.messages.saveFailed")
      );
    } finally {
      setSavingUser(false);
    }
  };

  const getUserRoleSelectValue = (user) => {
    if (!user) return "";

    if (user.roleId) return user.roleId;

    const normalizedUserRole = normalizeBackendRoleName(user.roleName || user.role);
    const matchedRole = roleOptions.find(
      (role) => normalizeBackendRoleName(role.normalizedName || role.name) === normalizedUserRole
    );

    return matchedRole?.id || "";
  };

  const getRoleOptionByValue = (roleValue, options = roleOptions) => {
    const normalizedRoleValue = normalizeScopeValue(roleValue);

    return (options || []).find((role) =>
      normalizeScopeValue(role.id) === normalizedRoleValue ||
      normalizeScopeValue(role.normalizedName) === normalizedRoleValue ||
      normalizeScopeValue(role.name) === normalizedRoleValue
    );
  };

  const roleOptionNeedsBackendId = (roleOption, roleValue) => {
    if (!roleOption?.id) return true;

    const normalizedId = normalizeScopeValue(roleOption.id);
    const normalizedName = normalizeScopeValue(roleOption.name);
    const normalizedSystemName = normalizeScopeValue(roleOption.normalizedName);
    const normalizedRoleValue = normalizeScopeValue(roleValue);

    return (
      normalizedId === normalizedName ||
      normalizedId === normalizedSystemName ||
      normalizedId === normalizedRoleValue
    );
  };

  const resolveUserRoleForSave = async (roleValue, user = {}) => {
    const selectedRole = getRoleOptionByValue(roleValue) || {
      id: roleValue,
      name: roleValue,
      normalizedName: normalizeBackendRoleName(roleValue),
    };

    if (!roleOptionNeedsBackendId(selectedRole, roleValue)) {
      return selectedRole;
    }

    const targetCompanyId =
      user.companyId ||
      activeContextCompanyId ||
      currentUser?.companyId ||
      contextCompanyId ||
      "";

    const roles = await loadRolesForCompany(targetCompanyId);
    const backendRoleOptions = buildRoleOptionsFromBackendRoles(roles);
    const targetNormalizedRole = normalizeBackendRoleName(
      selectedRole.normalizedName || selectedRole.name || roleValue
    );

    const backendRole = backendRoleOptions.find((role) =>
      normalizeBackendRoleName(role.normalizedName || role.name) === targetNormalizedRole
    );

    return backendRole || selectedRole;
  };

  const handleChangeUserRole = async (user, nextRoleId) => {
    if (!user?.id || !nextRoleId) return;

    if (!hasPermission("users", "edit") && !hasPermission("users", "assignRoles")) {
      notifyUser(showToast, "warning", t("users.validation.noRolePermission"));
      return;
    }

    const currentRoleId = getUserRoleSelectValue(user);
    if (String(currentRoleId) === String(nextRoleId)) return;

    setUpdatingUserRoleById((prev) => ({
      ...prev,
      [user.id]: true,
    }));

    try {
      const selectedRoleOption = await resolveUserRoleForSave(nextRoleId, user);

      const selectedRoleName = selectedRoleOption?.name || nextRoleId;
      const selectedNormalizedRole = normalizeBackendRoleName(
        selectedRoleOption?.normalizedName || selectedRoleName
      );

      const roleValueForBackend = roleOptionNeedsBackendId(selectedRoleOption, nextRoleId)
        ? selectedRoleName
        : selectedRoleOption.id;

      const savedUserData = await updateUserRecord(user.id, {
        roleId: roleValueForBackend,
        role: selectedNormalizedRole,
        roleName: selectedRoleName,
      });

      const savedUser = normalizeBackendUserForState(savedUserData);

      setUsers((prev) =>
        prev.map((item) => (item.id === savedUser.id ? savedUser : item))
      );

      trackActivity(
        "Update User Role",
        "users",
        `${savedUser.username || savedUser.fullName || "User"} role updated to ${formatRoleLabel(savedUser)}.`,
        userActivityI18n(
          "updateUserRole",
          "userRoleUpdated",
          {
            userName: savedUser.username || savedUser.fullName || "User",
            role: savedUser.roleName || savedUser.role || "Operator",
          },
          "Update User Role",
          `${savedUser.username || savedUser.fullName || "User"} role updated to ${formatRoleLabel(savedUser)}.`,
          { detailsEnumParams: { role: "userRole" } }
        )
      );
      notifyUser(showToast, "success", t("users.messages.roleUpdated"));
    } catch (error) {
      logHandledApiIssue("Failed to update user role", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("users.messages.roleUpdateFailed");
      notifyUser(showToast, inferToastTypeFromMessage(message), t("users.messages.roleUpdateFailed"));
    } finally {
      setUpdatingUserRoleById((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
    }
  };

  const askChangeUserStatus = (user) => {
    if (!hasPermission("users", "deactivate")) {
      notifyUser(showToast, "warning", t("users.validation.noStatusPermission"));
      return;
    }

    if (!user?.id) return;

    if (updatingUserStatusById[user.id]) return;

    if (user.id === currentUser?.id) {
      notifyUser(showToast, "warning", t("users.validation.cannotDeactivateSelf"));
      return;
    }

    const nextIsActive = user.status !== "Active";
    const nextStatus = nextIsActive ? "Active" : "Inactive";
    const userName = user.username || user.fullName || "-";

    setUserConfirmModal({
      open: true,
      title: nextIsActive
        ? t("users.confirm.activateTitle")
        : t("users.confirm.deactivateTitle"),
      message: nextIsActive
        ? t("users.confirm.activateMessage", { userName })
        : t("users.confirm.deactivateMessage", { userName }),
      confirmLabel: nextIsActive
        ? t("users.actions.activate")
        : t("users.actions.deactivate"),
      confirmTone: nextStatus === "Active" ? "emerald" : "red",
      onConfirm: async () => {
        const previousUser = { ...user };

        setUpdatingUserStatusById((prev) => ({
          ...prev,
          [user.id]: true,
        }));

        try {
          const updatedUserData = await updateUserStatus(
            user.id,
            nextIsActive
          );

          const updatedUser = normalizeBackendUserForState(updatedUserData);

          setUsers((prev) =>
            prev.map((item) => (item.id === updatedUser.id ? updatedUser : item))
          );

          setFuelers((prev) =>
            prev.map((fueler) => {
              const linkedUserId = fueler.linkedUserId || fueler.linkedUser?.id || "";

              if (normalizeScopeValue(linkedUserId) !== normalizeScopeValue(updatedUser.id)) {
                return fueler;
              }

              return {
                ...fueler,
                linkedUserId: updatedUser.id,
                linkedUserName: updatedUser.fullName || updatedUser.email || fueler.linkedUserName || "",
                userStatus: updatedUser.isActive ? "Linked" : "Not Linked",
                linkedUser: {
                  ...(fueler.linkedUser || {}),
                  id: updatedUser.id,
                  fullName: updatedUser.fullName || fueler.linkedUser?.fullName || "",
                  email: updatedUser.email || fueler.linkedUser?.email || "",
                  isActive: updatedUser.isActive,
                },
              };
            })
          );

          trackActivity(
            "Change User Status",
            "users",
            `${updatedUser.username || updatedUser.fullName} changed to ${updatedUser.status}.`,
            userActivityI18n(
              "changeUserStatus",
              "userStatusChanged",
              {
                userName: updatedUser.username || updatedUser.fullName || "User",
                status: updatedUser.status,
              },
              "Change User Status",
              `${updatedUser.username || updatedUser.fullName} changed to ${updatedUser.status}.`,
              { detailsEnumParams: { status: "userStatus" } }
            )
          );
          notifyUser(
            showToast,
            "success",
            t("users.messages.statusChanged", {
              status: getUserStatusLabel(updatedUser.status),
            })
          );
        } catch (error) {
          logHandledApiIssue("Failed to change user status", error);

          setUsers((prev) =>
            prev.map((item) => (item.id === previousUser.id ? previousUser : item))
          );

          notifyUser(showToast, "warning", t("users.messages.statusChangeFailed"));
        } finally {
          setUpdatingUserStatusById((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        }
      },
    });
  };

  const resetPassword = (user) => {
    if (!hasPermission("users", "resetPassword")) {
      notifyUser(showToast, "warning", t("users.validation.noResetPasswordPermission"));
      return;
    }

    if (!user?.id) return;

    setUserConfirmModal({
      open: true,
      title: t("users.confirm.resetPasswordTitle"),
      message: t("users.confirm.resetPasswordMessage", {
        userName: user.username || user.fullName || "-",
      }),
      confirmLabel: t("users.actions.resetPassword"),
      confirmTone: "amber",
      onConfirm: async () => {
        setResettingPassword(true);

        try {
          const resetResult = await resetUserPassword(user.id);
          const temporaryPassword = resetResult?.temporaryPassword || "";

          setUsers((prev) =>
            prev.map((item) =>
              item.id === user.id
                ? {
                    ...item,
                    passwordResetRequired: true,
                    mustChangePassword: true,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );

          setTemporaryPasswordResult({
            userName: user.username || user.fullName,
            temporaryPassword,
          });

          trackActivity(
            "Reset Password",
            "users",
            `${user.username || user.fullName} temporary password generated.`,
            userActivityI18n(
              "resetUserPassword",
              "userPasswordReset",
              { userName: user.username || user.fullName || "User" },
              "Reset Password",
              `${user.username || user.fullName} temporary password generated.`
            )
          );
          notifyUser(showToast, "success", t("users.messages.temporaryPasswordGenerated"));
        } catch (error) {
          logHandledApiIssue("Failed to reset password", error);
          notifyUser(showToast, "warning", t("users.messages.resetPasswordFailed"));
        } finally {
          setResettingPassword(false);
        }
      },
    });
  };

  const formatRoleLabel = (user) =>
    user.roleName || user.role || "Operator";

  const formatRoleDisplayLabel = (user) =>
    getUserRoleLabel(user.roleName || user.role || "Operator");

  const getUserCompanyName = (user = {}) => {
    if (user.companyName) return user.companyName;
    if (user.company?.name) return user.company.name;

    const matchedCompany = companies.find((company) =>
      normalizeScopeValue(company.id) === normalizeScopeValue(user.companyId) ||
      normalizeScopeValue(company.code) === normalizeScopeValue(user.companyId) ||
      normalizeScopeValue(company.name) === normalizeScopeValue(user.companyId)
    );

    return matchedCompany?.name || user.companyId || "-";
  };

  const exportUsersCSV = () => {
    const headers = [
      t("users.table.username"),
      t("users.table.employeeId"),
      t("users.table.role"),
      t("users.table.status"),
      t("users.table.passwordResetRequired"),
      t("users.table.lastLogin"),
    ];

    const rows = filteredUsers.map((user) => [
      user.username || "",
      user.employeeId || "",
      formatRoleDisplayLabel(user),
      getUserStatusLabel(user.status),
      user.passwordResetRequired || user.mustChangePassword
        ? t("common.yes")
        : t("common.no"),
      user.lastLogin || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `fleet_fuel_pro_users_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notifyUser(showToast, "success", t("users.messages.exported"));
  };

  const printUsersTable = () => {
    const rowsHtml = filteredUsers
      .map(
        (user) => `
          <tr>
            <td>${user.username || "-"}</td>
            <td>${user.employeeId || "-"}</td>
            <td>${formatRoleDisplayLabel(user)}</td>
            <td>${getUserStatusLabel(user.status)}</td>
            <td>${user.passwordResetRequired || user.mustChangePassword ? t("users.values.required") : t("common.no")}</td>
            <td>${user.lastLogin || t("users.values.never")}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      notifyUser(showToast, "warning", t("users.messages.allowPopups"));
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Fleet Fuel PRO - ${t("users.title")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; direction: ${isRtl ? "rtl" : "ltr"}; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #0f172a; color: white; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Fleet Fuel PRO - ${t("users.title")}</h1>
          <p>${t("users.print.printedOn")} ${new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-US")}</p>
          <table>
            <thead>
              <tr>
                <th>${t("users.table.username")}</th>
                <th>${t("users.table.employeeId")}</th>
                <th>${t("users.table.role")}</th>
                <th>${t("users.table.status")}</th>
                <th>${t("users.table.passwordReset")}</th>
                <th>${t("users.table.lastLogin")}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || `<tr><td colspan="6">${t("users.states.noUsersFound")}</td></tr>`}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const closeConfirmModal = () => {
    if (resettingPassword) return;

    setUserConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmLabel: "",
      confirmTone: "amber",
      onConfirm: null,
    });
  };

  const confirmButtonClass =
    userConfirmModal.confirmTone === "red"
      ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
      : userConfirmModal.confirmTone === "emerald"
      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
      : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20";

  return (
    <div
      className="bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3 mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300 mb-2">
              {t("users.eyebrow")}
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
              {t("users.title")}
            </h1>
            <p className="text-slate-400 text-sm">
              {t("users.subtitle")}
            </p>
          </div>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-950/80 hover:border-amber-400 hover:bg-slate-900 text-slate-200 hover:text-amber-300 transition flex items-center justify-center cursor-pointer"
              title={t("users.actions.settings")}
            >
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>

            {settingsOpen && (
              <div className={`absolute ${isRtl ? "left-0" : "right-0"} mt-2 w-56 rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40 z-40 overflow-hidden`}>
                {isPlatformConsoleCompanyContext && (
                  <button
                    onClick={openAddUserModal}
                    className={`w-full px-4 py-3 ${isRtl ? "text-right" : "text-left"} text-sm font-bold text-slate-200 hover:bg-slate-800/80 hover:text-amber-300 transition flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed`}
                    disabled={!hasPermission("users", "add")}
                  >
                    <span>＋</span>
                    <span>{t("users.actions.addUser")}</span>
                  </button>
                )}

                <button
                  onClick={exportUsersCSV}
                  className={`w-full px-4 py-3 ${isRtl ? "text-right" : "text-left"} text-sm font-bold text-slate-200 hover:bg-slate-800/80 hover:text-amber-300 transition flex items-center gap-3`}
                >
                  <span>⇩</span>
                  <span>{t("common.exportCsv")}</span>
                </button>

                <button
                  onClick={printUsersTable}
                  className={`w-full px-4 py-3 ${isRtl ? "text-right" : "text-left"} text-sm font-bold text-slate-200 hover:bg-slate-800/80 hover:text-amber-300 transition flex items-center gap-3`}
                >
                  <span>⎙</span>
                  <span>{t("users.actions.printTable")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">{t("users.cards.total")}</p>
            <p className="text-2xl font-black mt-2">{users.length}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">{t("users.cards.active")}</p>
            <p className="text-2xl font-black mt-2 text-emerald-300">{activeUsersCount}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">{t("users.cards.inactive")}</p>
            <p className="text-2xl font-black mt-2 text-red-300">{inactiveUsersCount}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">{t("users.cards.passwordReset")}</p>
            <p className="text-2xl font-black mt-2 text-amber-300">{resetRequiredCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 mb-4 shadow-xl backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("users.searchPlaceholder")}
              className="bg-[#080d19] border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            >
              <option value="All">{t("users.filters.allRoles")}</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.normalizedName}>{getUserRoleLabel(role.normalizedName || role.name)}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080d19] border border-slate-700 text-slate-100 px-3 py-2.5 rounded-xl w-full outline-none"
            >
              <option value="All">{t("users.filters.allStatus")}</option>
              <option value="Active">{getUserStatusLabel("Active")}</option>
              <option value="Inactive">{getUserStatusLabel("Inactive")}</option>
            </select>

            <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm">
              {t("users.currentUser")}: <span className="text-amber-300 font-bold">{currentUser?.username || currentUser?.fullName || "-"}</span>
            </div>
          </div>
        </div>


        {usersLoadError && !usersLoading && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {t("users.messages.loadUsersFailed")}
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full text-sm min-w-[920px] ${isRtl ? "text-right" : "text-left"}`}>
              <thead className="bg-slate-950 sticky top-0 z-[5]">
                <tr>
                  <th className="p-3">{t("users.table.username")}</th>
                  <th className="p-3">{t("users.table.employeeId")}</th>
                  <th className="p-3">{t("users.table.role")}</th>
                  <th className="p-3">{t("users.table.status")}</th>
                  <th className="p-3">{t("users.table.passwordReset")}</th>
                  <th className="p-3">{t("users.table.lastLogin")}</th>
                  <th className={`p-3 ${isRtl ? "text-left" : "text-right"}`}>{t("users.table.security")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-800 hover:bg-slate-800/50 transition">
                    <td className="p-3">
                      <span
                        className={`block font-black text-slate-100 ${
                          isRtl ? "text-right" : "text-left"
                        }`}
                      >
                        {user.username || "-"}
                      </span>
                      <div className="text-xs text-slate-500">
  			{user.fullName || t("users.values.unnamedUser")}
		      </div>
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">{user.employeeId || "-"}</td>
                    <td className="p-3">
                      {updatingUserRoleById[user.id] ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                          {t("users.states.updating")}
                        </span>
                      ) : (
                        <select
                          value={getUserRoleSelectValue(user)}
                          onChange={(event) => handleChangeUserRole(user, event.target.value)}
                          disabled={!hasPermission("users", "edit") && !hasPermission("users", "assignRoles")}
                          className="min-w-[150px] max-w-[190px] rounded-xl border border-slate-700 bg-[#080d19] px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!getUserRoleSelectValue(user) && (
                            <option value="" className="bg-slate-900 text-slate-100">
                              {t("users.filters.selectRole")}
                            </option>
                          )}
                          {roleOptions.map((role) => (
                            <option key={role.id} value={role.id} className="bg-slate-900 text-slate-100">
                              {getUserRoleLabel(role.normalizedName || role.name)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      {updatingUserStatusById[user.id] ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                          {t("users.states.updating")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => askChangeUserStatus(user)}
                          disabled={Boolean(updatingUserStatusById[user.id])}
                          className={`px-3 py-1 rounded-full border font-black text-xs transition cursor-pointer disabled:cursor-wait disabled:opacity-70 ${
                            user.status === "Active"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25"
                          }`}
                        >
                          {getUserStatusLabel(user.status)}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {user.passwordResetRequired || user.mustChangePassword ? t("users.values.required") : t("common.no")}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-300">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString(language === "ar" ? "ar-SA" : "en-US") : t("users.values.never")}
                    </td>
                    <td className={`p-3 ${isRtl ? "text-left" : "text-right"}`}>
                      <button
                        type="button"
                        onClick={() => resetPassword(user)}
                        disabled={!hasPermission("users", "resetPassword")}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t("users.actions.resetPassword")}
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredUsers.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {usersLoading
                        ? t("users.states.loadingUsers")
                        : usersLoaded
                          ? t("users.states.noUsersFound")
                          : t("users.states.noUserData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredUsers.length > USERS_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 border-t border-slate-700/80 px-4 py-3">
              <button
                type="button"
                onClick={() => setUsersPage((page) => Math.max(1, page - 1))}
                disabled={safeUsersPage <= 1}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-600 bg-slate-950 text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("users.pagination.previous")}
              >
                {isRtl ? "›" : "‹"}
              </button>

              <span className="min-w-[90px] text-center text-sm font-bold text-slate-300" dir="ltr">
                {safeUsersPage} / {usersTotalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setUsersPage((page) => Math.min(usersTotalPages, page + 1))
                }
                disabled={safeUsersPage >= usersTotalPages}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-600 bg-slate-950 text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("users.pagination.next")}
              >
                {isRtl ? "‹" : "›"}
              </button>
            </div>
          )}
        </div>
      </div>

      {userModalMode === "add" && (
        <ModalPortal>
          <div
            className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-100">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-100">{t("users.addModal.title")}</h2>
                  <p className="text-sm text-slate-400">
                    {isPlatformUserContext
                      ? t("users.addModal.platformSubtitle")
                      : t("users.addModal.companySubtitle")}
                  </p>
                </div>
                <button onClick={closeUserModal} className="text-slate-400 hover:text-white text-xl cursor-pointer">×</button>
              </div>

              <form onSubmit={handleSaveUser}>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t("users.fields.fullName")}</label>
                    <input
                      value={userForm.fullName}
                      onChange={(e) => handleUserFormChange("fullName", e.target.value)}
                      placeholder={t("users.placeholders.fullName")}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t("users.fields.email")}</label>
                    <input
                      value={userForm.email}
                      onChange={(e) => handleUserFormChange("email", e.target.value.toLowerCase())}
                      type="email"
                      placeholder={t("users.placeholders.email")}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t("users.fields.company")}</label>
                    {canChangeUserCompany ? (
                      <select
                        value={userForm.companyId}
                        onChange={(e) => handleUserFormChange("companyId", e.target.value)}
                        disabled={savingUser}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <option value="" className="bg-slate-900 text-slate-100">{t("users.placeholders.selectCompany")}</option>
                        {companyOptions.map((company) => (
                          <option key={company.id} value={company.id} className="bg-slate-900 text-slate-100">
                            {company.name}{company.code ? ` (${company.code})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={selectedFormCompanyName}
                        disabled
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-300 outline-none cursor-not-allowed"
                      />
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {canChangeUserCompany
                        ? t("users.addModal.platformCompanyHelp")
                        : isPlatformUserContext
                          ? t("users.addModal.contextCompanyHelp")
                          : t("users.addModal.adminCompanyHelp")}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t("users.fields.phone")}</label>
                    <input
                      value={userForm.phone}
                      onChange={(e) => handleUserFormChange("phone", e.target.value)}
                      placeholder={t("users.placeholders.phone")}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t("users.fields.role")}</label>
                    <select
                      value={userForm.roleId}
                      onChange={(e) => handleUserFormChange("roleId", e.target.value)}
                      disabled={savingUser || !effectiveUserFormCompanyId || !roleOptions.length}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      {(!effectiveUserFormCompanyId || !roleOptions.length) && (
                        <option value="" className="bg-slate-900 text-slate-100">
                          {!effectiveUserFormCompanyId
                            ? t("users.placeholders.selectCompanyFirst")
                            : t("users.states.noRolesAvailable")}
                        </option>
                      )}
                      {roleOptions.map((role) => (
                        <option key={role.id} value={role.id} className="bg-slate-900 text-slate-100">{getUserRoleLabel(role.normalizedName || role.name)}</option>
                      ))}
                    </select>
                  </div>

                  {userModalMode === "add" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">{t("users.fields.temporaryPassword")}</label>
                      <input
                        value={userForm.password}
                        onChange={(e) => handleUserFormChange("password", e.target.value)}
                        type="text"
                        placeholder={t("users.placeholders.temporaryPassword")}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-800 disabled:text-slate-500"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {t("users.addModal.passwordHelp")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingUser ? t("common.saving") : t("users.actions.addUser")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {userConfirmModal.open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#071226] shadow-2xl shadow-black/50 overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-slate-700/60">
                <h3 className="text-xl font-extrabold text-amber-300">
                  {userConfirmModal.title}
                </h3>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                  {userConfirmModal.message}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-900/40">
                <button
                  onClick={closeConfirmModal}
                  disabled={resettingPassword}
                  className="px-5 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/40 transition cursor-pointer disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>

                <button
                  onClick={async () => {
                    const action = userConfirmModal.onConfirm;
                    closeConfirmModal();

                    if (action) {
                      await action();
                    }
                  }}
                  disabled={resettingPassword}
                  className={`px-5 py-2 rounded-xl font-black transition shadow-lg cursor-pointer disabled:opacity-50 ${confirmButtonClass}`}
                >
                  {resettingPassword ? t("users.states.processing") : userConfirmModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {temporaryPasswordResult && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#071226] shadow-2xl shadow-black/50 overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-slate-700/60">
                <h3 className="text-xl font-extrabold text-amber-300">{t("users.passwordModal.title")}</h3>
                <p className="text-slate-300 text-sm mt-2">
                  {t("users.passwordModal.description", {
                    userName: temporaryPasswordResult.userName,
                  })}
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-center text-2xl font-black tracking-widest text-amber-300">
                  {temporaryPasswordResult.temporaryPassword}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-900/40">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(temporaryPasswordResult.temporaryPassword);
                    notifyUser(showToast, "success", t("users.messages.passwordCopied"));
                  }}
                  className="px-5 py-2 rounded-xl border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 transition cursor-pointer font-bold"
                >
                  {t("users.actions.copy")}
                </button>
                <button
                  onClick={() => setTemporaryPasswordResult(null)}
                  className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition cursor-pointer"
                >
                  {t("users.actions.done")}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
