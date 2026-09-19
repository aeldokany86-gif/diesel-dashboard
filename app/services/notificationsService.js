import api from "./api";

function normalizePriority(value) {
  const normalized = String(value || "NORMAL").trim().toUpperCase();

  if (normalized === "HIGH") return "High";
  if (normalized === "MEDIUM") return "Medium";
  if (normalized === "LOW") return "Low";
  return "Normal";
}

function normalizeCategoryDescriptor(item = {}) {
  const category = String(item.category || "").trim().toUpperCase();

  if (category === "APPROVAL") {
    return {
      category: "Approval Required",
      categoryKey: "notifications.categories.approvalRequired",
      categoryFallback: "Approval Required",
    };
  }

  if (category === "APPROVAL_RESULT") {
    return {
      category: "Approval Update",
      categoryKey: "notifications.categories.approvalUpdate",
      categoryFallback: "Approval Update",
    };
  }

  return {
    category: category || "Notification",
    categoryKey: "notifications.categories.generic",
    categoryParams: { category: category || "Notification" },
    categoryFallback: category || "Notification",
  };
}

function inferModuleDescriptor(item = {}) {
  const entityType = String(item.entityType || "").trim().toUpperCase();
  const workflowType = String(item.metadata?.workflowType || "")
    .trim()
    .toUpperCase();

  const combined = `${entityType} ${workflowType}`;

  if (combined.includes("OPERATION")) {
    return {
      module: "Operations",
      moduleKey: "notifications.modules.operations",
      moduleFallback: "Operations",
    };
  }

  if (combined.includes("ASSET")) {
    return {
      module: "Assets",
      moduleKey: "notifications.modules.assets",
      moduleFallback: "Assets",
    };
  }

  if (combined.includes("STATION")) {
    return {
      module: "Stations",
      moduleKey: "notifications.modules.stations",
      moduleFallback: "Stations",
    };
  }

  if (combined.includes("EMPLOYEE") || combined.includes("TEAM")) {
    return {
      module: "Team",
      moduleKey: "notifications.modules.team",
      moduleFallback: "Team",
    };
  }

  if (combined.includes("PROJECT")) {
    return {
      module: "Projects",
      moduleKey: "notifications.modules.projects",
      moduleFallback: "Projects",
    };
  }

  return {
    module: "Notifications",
    moduleKey: "notifications.modules.notifications",
    moduleFallback: "Notifications",
  };
}

export function mapBackendNotificationForWeb(item = {}) {
  const categoryDescriptor = normalizeCategoryDescriptor(item);
  const moduleDescriptor = inferModuleDescriptor(item);
  const backendType = String(item.type || "").trim().toUpperCase();

  return {
    ...item,
    ...categoryDescriptor,
    ...moduleDescriptor,
    backendType,
    type:
      String(item.category || "").trim().toUpperCase().startsWith("APPROVAL")
        ? "approval"
        : "notification",
    priority: normalizePriority(item.priority),
    read: Boolean(item.read ?? item.readAt),
    actionable: Boolean(item.actionable),
    route: item.route || "notifications",
  };
}

export async function fetchNotifications() {
  const response = await api.get("/notifications");
  const data = response?.data || {};
  const items = Array.isArray(data.items)
    ? data.items.map(mapBackendNotificationForWeb)
    : [];

  return {
    items,
    count: Number(data.count ?? items.length) || 0,
    unreadCount:
      Number(data.unreadCount ?? items.filter((item) => !item.read).length) || 0,
  };
}

export async function fetchUnreadNotificationCount() {
  const response = await api.get("/notifications/unread-count");
  return Number(response?.data?.count || 0);
}

export async function markNotificationReadRequest(notificationId) {
  if (!notificationId) return { ok: false };

  const response = await api.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    undefined,
    {
      headers: {
        "X-Skip-Action-Loading": "true",
      },
    }
  );

  return response?.data || { ok: true };
}

export async function markAllNotificationsReadRequest() {
  const response = await api.patch("/notifications/read-all", undefined, {
    headers: {
      "X-Skip-Action-Loading": "true",
    },
  });

  return response?.data || { ok: true };
}
