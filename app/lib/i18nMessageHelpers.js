const ENUM_ALIASES = {
  assetStatus: { active: "active", inactive: "inactive", retired: "retired" },
  stationStatus: { active: "active", inactive: "inactive", retired: "retired" },
  employeeStatus: {
    active: "onDuty",
    "on duty": "onDuty",
    onduty: "onDuty",
    "in vacation": "onLeave",
    "on leave": "onLeave",
    onleave: "onLeave",
    retired: "retired",
    resigned: "retired",
    "retired / resigned": "retired",
  },
  projectStatus: { active: "active", inactive: "inactive", ended: "ended" },
  userStatus: {
    active: "active",
    inactive: "inactive",
    disabled: "disabled",
    linked: "linked",
    "not linked": "notLinked",
    notlinked: "notLinked",
  },
  userRole: {
    admin: "admin",
    manager: "manager",
    officer: "officer",
    operator: "operator",
    supervisor: "supervisor",
    "top management": "topManagement",
    topmanagement: "topManagement",
    platformadmin: "platformAdmin",
    "platform admin": "platformAdmin",
    "platform user": "platformAdmin",
  },
  companyStatus: { active: "active", inactive: "inactive" },
  approvalStatus: {
    pending: "pending",
    "pending approval": "pending",
    pendingapproval: "pending",
    approved: "approved",
    rejected: "rejected",
    reviewed: "reviewed",
    info: "info",
  },
  transferStatus: {
    pending: "pending",
    "pending approval": "pending",
    pendingapproval: "pending",
    "partially approved": "partiallyApproved",
    partiallyapproved: "partiallyApproved",
    partially_approved: "partiallyApproved",
    approved: "approved",
    rejected: "rejected",
    completed: "completed",
    applied: "applied",
  },
  priority: { high: "high", medium: "medium", normal: "normal", low: "low" },
  risk: { high: "high", standard: "standard", medium: "medium", low: "low" },
  sensitivity: { sensitive: "sensitive", normal: "normal" },
  operationType: {
    direct_refuel: "directRefuel",
    "direct refuel": "directRefuel",
    directrefuel: "directRefuel",
    external_direct_refuel: "externalDirectRefuel",
    "external direct refuel": "externalDirectRefuel",
    externaldirectrefuel: "externalDirectRefuel",
    internal_transfer: "internalTransfer",
    "internal transfer": "internalTransfer",
    internaltransfer: "internalTransfer",
    external_supply: "externalSupply",
    "external supply": "externalSupply",
    externalsupply: "externalSupply",
    external_transfer: "externalTransfer",
    "external transfer": "externalTransfer",
    externaltransfer: "externalTransfer",
  },
  stationType: { main: "main", sub: "sub" },
};

function normalizeEnumLookupValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-]+/g, "_")
    .replace(/\s+/g, " ");
}

export function normalizeEnumValue(group, value) {
  const groupMap = ENUM_ALIASES[group] || {};
  const raw = normalizeEnumLookupValue(value);
  if (!raw) return "";

  return (
    groupMap[raw] ||
    groupMap[raw.replace(/ /g, "")] ||
    groupMap[raw.replace(/ /g, "_")] ||
    ""
  );
}

export function getEnumTranslationKey(group, value) {
  const token = normalizeEnumValue(group, value);
  return token ? `enumValues.${group}.${token}` : "";
}

export function createEnumI18nMessage(group, value, fallback = "") {
  return createI18nMessage(
    getEnumTranslationKey(group, value),
    {},
    fallback || String(value ?? ""),
  );
}

export function resolveEnumValue(t, group, value, fallback = "") {
  const safeFallback = fallback || String(value ?? "") || "-";
  const key = getEnumTranslationKey(group, value);

  if (!key || typeof t !== "function") return safeFallback;

  const translated = t(key);
  return translated && translated !== key ? translated : safeFallback;
}

function resolveEnumParams(t, params = {}, enumParams = {}) {
  if (!enumParams || typeof enumParams !== "object") return params || {};

  return Object.entries(params || {}).reduce((acc, [name, value]) => {
    const enumGroup = enumParams[name];
    acc[name] = enumGroup
      ? resolveEnumValue(t, enumGroup, value, value)
      : value;
    return acc;
  }, {});
}

export function createI18nMessage(
  key,
  params = {},
  fallback = "",
  options = {},
) {
  return {
    key: String(key || ""),
    params: params && typeof params === "object" ? params : {},
    enumParams:
      options?.enumParams && typeof options.enumParams === "object"
        ? options.enumParams
        : {},
    fallback: String(fallback || ""),
  };
}

export function resolveI18nMessage(t, message, fallback = "") {
  if (!message) return String(fallback || "");
  if (typeof message === "string") return message || String(fallback || "");

  const key = String(
    message.key ||
      message.messageKey ||
      message.titleKey ||
      "",
  );

  const rawParams =
    message.params ||
    message.messageParams ||
    message.titleParams ||
    {};

  const enumParams =
    message.enumParams ||
    message.messageEnumParams ||
    message.titleEnumParams ||
    {};

  const params = resolveEnumParams(t, rawParams, enumParams);

  const safeFallback = String(
    message.fallback ||
      message.messageFallback ||
      message.titleFallback ||
      fallback ||
      "",
  );

  if (!key || typeof t !== "function") return safeFallback;

  const translated = t(key, params);
  return translated && translated !== key ? translated : safeFallback || key;
}

export function resolveRecordMessage(t, record, field, fallback = "") {
  const key = record?.[`${field}Key`];
  const params = record?.[`${field}Params`] || {};
  const enumParams = record?.[`${field}EnumParams`] || {};
  const storedFallback =
    record?.[`${field}Fallback`] ??
    record?.[field] ??
    fallback;

  return resolveI18nMessage(
    t,
    { key, params, enumParams, fallback: storedFallback },
    storedFallback,
  );
}
