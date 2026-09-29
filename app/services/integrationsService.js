import api from "./api";

const WEBHOOK_EVENT_KEY_BY_TYPE = {
  "operation.completed": "operationCompleted",
  "operation.corrected": "operationCorrected",
  "inventory.adjusted": "inventoryAdjusted",
};

const WEBHOOK_EVENT_TYPE_BY_KEY = {
  operationCompleted: "operation.completed",
  operationCorrected: "operation.corrected",
  inventoryAdjusted: "inventory.adjusted",
};

export function normalizeCompanyIntegrationSettings(data = {}) {
  const webhookEvents = {
    operationCompleted: false,
    operationCorrected: false,
    inventoryAdjusted: false,
  };

  for (const event of data?.webhooks?.events || []) {
    const key = WEBHOOK_EVENT_KEY_BY_TYPE[event?.eventType];
    if (key) {
      webhookEvents[key] = Boolean(event?.enabled);
    }
  }

  return {
    company: data?.company || null,
    configured: Boolean(data?.configured),
    enabled: Boolean(data?.enabled),
    features: {
      operationsSummary: Boolean(data?.apiAccess?.operationsSummary),
      operationsDetails: Boolean(data?.apiAccess?.operationsDetails),
      costData: Boolean(data?.apiAccess?.costData),
      stockData: Boolean(data?.apiAccess?.stockRead),
      stockMovements: Boolean(data?.apiAccess?.stockMovements),
      webhooks: Boolean(data?.webhooks?.enabled),
    },
    webhookEvents,
    externalMapping: {
      enabled: Boolean(data?.externalMapping?.enabled),
      manualEnabled: Boolean(data?.externalMapping?.manualEnabled),
      importEnabled: Boolean(data?.externalMapping?.importEnabled),
    },
    clientLimit:
      Number.isInteger(Number(data?.clientLimit)) && Number(data?.clientLimit) > 0
        ? Number(data.clientLimit)
        : 5,
    createdAt: data?.createdAt || null,
    updatedAt: data?.updatedAt || null,
  };
}

export function buildCompanyIntegrationSettingsPayload(config = {}) {
  const features = config?.features || {};
  const webhookEvents = config?.webhookEvents || {};
  const externalMapping = config?.externalMapping || {};

  return {
    enabled: Boolean(config?.enabled),

    operationsSummaryEnabled: Boolean(features.operationsSummary),
    operationsDetailsEnabled: Boolean(features.operationsDetails),
    costDataEnabled: Boolean(features.costData),
    stockReadEnabled: Boolean(features.stockData),
    stockMovementsEnabled: Boolean(features.stockMovements),

    webhooksEnabled: Boolean(features.webhooks),

    externalMappingEnabled: Boolean(externalMapping.enabled),
    externalMappingManualEnabled: Boolean(externalMapping.manualEnabled),
    externalMappingImportEnabled: Boolean(externalMapping.importEnabled),

    clientLimit:
      Number.isInteger(Number(config?.clientLimit)) && Number(config?.clientLimit) > 0
        ? Number(config.clientLimit)
        : 5,

    webhookEvents: Object.entries(WEBHOOK_EVENT_TYPE_BY_KEY).map(
      ([key, eventType]) => ({
        eventType,
        enabled: Boolean(webhookEvents[key]),
      }),
    ),
  };
}

export async function fetchCompanyIntegrationSettings(companyId) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.get(
    `/integrations/companies/${companyId}/settings`,
  );

  return normalizeCompanyIntegrationSettings(response.data || {});
}

export async function updateCompanyIntegrationSettings(
  companyId,
  payload = {},
) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.patch(
    `/integrations/companies/${companyId}/settings`,
    payload,
  );

  return normalizeCompanyIntegrationSettings(response.data || {});
}

export async function fetchAuthenticatedCompanyIntegrationSettings() {
  const response = await api.get("/integrations/settings");
  return normalizeCompanyIntegrationSettings(response.data || {});
}


function normalizeIntegrationClient(client = {}) {
  return {
    id: client?.id || "",
    companyId: client?.companyId || "",
    name: client?.name || "",
    status: client?.status || "DISABLED",
    clientId: client?.clientId || "",
    keyPrefix: client?.keyPrefix || "",
    scopes: Array.isArray(client?.scopes) ? client.scopes.filter(Boolean) : [],
    createdAt: client?.createdAt || null,
    updatedAt: client?.updatedAt || null,
    lastUsedAt: client?.lastUsedAt || null,
  };
}

export async function fetchIntegrationClients() {
  const response = await api.get("/integrations/clients");
  const data = response.data || {};

  return {
    companyId: data?.companyId || "",
    clientLimit: Number(data?.clientLimit) || 0,
    usedClients: Number(data?.usedClients) || 0,
    remainingClients: Number(data?.remainingClients) || 0,
    clients: Array.isArray(data?.clients)
      ? data.clients.map(normalizeIntegrationClient)
      : [],
  };
}

export async function createIntegrationClient(payload = {}) {
  const response = await api.post("/integrations/clients", payload);
  const data = response.data || {};

  return {
    client: normalizeIntegrationClient(data),
    apiKey: data?.apiKey || "",
    apiKeyNotice: data?.apiKeyNotice || "",
  };
}

export async function updateIntegrationClient(clientId, payload = {}) {
  if (!clientId) {
    throw new Error("Integration Client ID is required.");
  }

  const response = await api.patch(
    `/integrations/clients/${clientId}`,
    payload,
  );

  return normalizeIntegrationClient(response.data || {});
}

export async function updateIntegrationClientStatus(clientId, enabled) {
  if (!clientId) {
    throw new Error("Integration Client ID is required.");
  }

  const response = await api.patch(
    `/integrations/clients/${clientId}/status`,
    { enabled: Boolean(enabled) },
  );

  return normalizeIntegrationClient(response.data || {});
}

export async function rotateIntegrationClientKey(clientId) {
  if (!clientId) {
    throw new Error("Integration Client ID is required.");
  }

  const response = await api.post(
    `/integrations/clients/${clientId}/rotate-key`,
  );
  const data = response.data || {};

  return {
    client: normalizeIntegrationClient(data),
    apiKey: data?.apiKey || "",
    apiKeyNotice: data?.apiKeyNotice || "",
  };
}

export function getExternalIntegrationApiBaseUrl() {
  const configuredBaseUrl = String(api?.defaults?.baseURL || "").trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
}

function buildExternalIntegrationUrl(endpoint, params = {}) {
  const baseUrl = getExternalIntegrationApiBaseUrl();
  const safeEndpoint = String(endpoint || "").startsWith("/")
    ? String(endpoint)
    : `/${String(endpoint || "")}`;

  const url = new URL(`${baseUrl}${safeEndpoint}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function testExternalIntegrationEndpoint({
  clientId,
  apiKey,
  endpoint,
  params = {},
} = {}) {
  const safeClientId = String(clientId || "").trim();
  const safeApiKey = String(apiKey || "").trim();
  const safeEndpoint = String(endpoint || "").trim();

  if (!safeClientId) {
    throw new Error("Integration Client ID is required.");
  }

  if (!safeApiKey) {
    throw new Error("API Key is required for this test.");
  }

  if (!safeEndpoint) {
    throw new Error("API endpoint is required.");
  }

  const response = await fetch(
    buildExternalIntegrationUrl(safeEndpoint, params),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-FFP-Client-Id": safeClientId,
        Authorization: `Bearer ${safeApiKey}`,
      },
      cache: "no-store",
    },
  );

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const backendMessage =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : "") ||
      `API request failed with status ${response.status}.`;

    const error = new Error(
      Array.isArray(backendMessage)
        ? backendMessage.join(" / ")
        : String(backendMessage),
    );

    error.status = response.status;
    error.responseData = data;
    throw error;
  }

  return {
    status: response.status,
    data,
  };
}

