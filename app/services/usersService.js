import api from "./api";

export async function fetchUsers({ companyId = "" } = {}) {
  const response = await api.get("/users", {
    params: companyId ? { companyId } : {},
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createUserRecord(payload) {
  const response = await api.post("/users", payload);
  return response.data;
}

export async function updateUserRecord(userId, payload) {
  const response = await api.patch(`/users/${userId}`, payload);
  return response.data;
}

export async function updateUserStatus(userId, isActive) {
  const response = await api.patch(`/users/${userId}/status`, {
    isActive,
  });

  return response.data;
}

export async function resetUserPassword(userId) {
  const response = await api.patch(`/users/${userId}/reset-password`, {});
  return response.data;
}

function getRoleName(role = {}) {
  return String(
    role.name ||
    role.roleName ||
    role.label ||
    role.key ||
    ""
  ).trim();
}

function isPlaceholderRoleId(role = {}) {
  const roleId = String(role.id || "").trim().toLowerCase();
  const roleName = getRoleName(role).toLowerCase().replace(/[\s_-]+/g, "");

  if (!roleId) return true;

  const compactRoleId = roleId.replace(/[\s_-]+/g, "");
  return compactRoleId === roleName;
}

export async function fetchRoles({ companyId = "", fallbackToGlobal = true } = {}) {
  const endpoints =
    companyId && fallbackToGlobal
      ? [`/roles?companyId=${encodeURIComponent(companyId)}`, "/roles"]
      : companyId
        ? [`/roles?companyId=${encodeURIComponent(companyId)}`]
        : ["/roles"];

  const rolesByName = new Map();
  let lastError = null;
  let successfulRequestCount = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      const roles = Array.isArray(response.data) ? response.data : [];
      successfulRequestCount += 1;

      roles.forEach((role) => {
        const normalizedName = getRoleName(role)
          .toLowerCase()
          .replace(/[\s_-]+/g, "");

        if (!normalizedName) return;

        const existingRole = rolesByName.get(normalizedName);

        if (
          !existingRole ||
          (isPlaceholderRoleId(existingRole) && !isPlaceholderRoleId(role))
        ) {
          rolesByName.set(normalizedName, role);
        }
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (!successfulRequestCount && lastError) {
    throw lastError;
  }

  return Array.from(rolesByName.values());
}
