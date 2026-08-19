import api from "./api";
import { buildOperationRequestHeaders } from "../lib/operationHelpers";

export async function uploadOperationPhotoFile({
  file,
  companyId,
  ownerType,
  ownerCode,
  operationNo,
  photoType,
  currentUser,
}) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("companyId", companyId);
  formData.append("ownerType", ownerType);
  formData.append("ownerCode", ownerCode);
  formData.append("operationNo", operationNo);
  formData.append("photoType", photoType);

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    api?.defaults?.baseURL ||
    "http://localhost:4000";

  const baseUrl = String(rawBaseUrl).replace(/\/+$/, "");
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("fleetfuelpro_token")
      : null;

  const response = await fetch(`${baseUrl}/uploads/operation-photo`, {
    method: "POST",
    headers: {
      ...buildOperationRequestHeaders(currentUser),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseBody === "string"
        ? responseBody
        : responseBody?.message || responseBody?.error || "Failed to upload operation photo.";

    throw new Error(message);
  }

  return responseBody;
}

export async function getUploadSignedUrl(path, currentUser, expiresIn = 300) {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    api?.defaults?.baseURL ||
    "http://localhost:4000";

  const baseUrl = String(rawBaseUrl).replace(/\/+$/, "");
  const url = `${baseUrl}/uploads/signed-url?path=${encodeURIComponent(path)}&expiresIn=${encodeURIComponent(expiresIn)}`;

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("fleetfuelpro_token")
      : null;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...buildOperationRequestHeaders(currentUser),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseBody === "string"
        ? responseBody
        : responseBody?.message || responseBody?.error || "Failed to load operation photo.";

    throw new Error(message);
  }

  return responseBody?.signedUrl || responseBody?.url || responseBody?.publicUrl || "";
}

export async function createOperation(payload, currentUser = {}) {
  const response = await api.post("/operations", payload, {
    headers: buildOperationRequestHeaders(currentUser),
  });

  return response.data;
}

export async function fetchOperations(currentUser = {}) {
  const response = await api.get("/operations", {
    headers: buildOperationRequestHeaders(currentUser),
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function subscribeToOperationEvents({
  currentUser = {},
  signal,
  onEvent,
} = {}) {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    api?.defaults?.baseURL ||
    "http://localhost:4000";

  const baseUrl = String(rawBaseUrl).replace(/\/+$/, "");
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("fleetfuelpro_token")
      : null;

  if (!token) {
    throw new Error("Authenticated token is required for realtime operation updates.");
  }

  const response = await fetch(`${baseUrl}/operations/events/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...buildOperationRequestHeaders(currentUser),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const message =
      typeof body === "string"
        ? body
        : body?.message || body?.error || `HTTP_${response.status}`;
    throw new Error(String(message));
  }

  if (!response.body) {
    throw new Error("Realtime operation stream is unavailable in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatchBlock = (block) => {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (!dataLines.length || eventName === "connected") return;

    const rawData = dataLines.join("\n");
    let payload = rawData;
    try {
      payload = JSON.parse(rawData);
    } catch {
      // Keep non-JSON SSE payloads readable for forward compatibility.
    }

    onEvent?.({
      event: eventName,
      data: payload,
    });
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        dispatchBlock(block);
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchOperationsSummaryReport(
  filters = {},
  currentUser = {}
) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && value !== "all"
    )
  );

  const response = await api.get("/operations/report/summary", {
    params,
    headers: buildOperationRequestHeaders(currentUser),
  });

  return {
    rows: Array.isArray(response.data?.rows) ? response.data.rows : [],
    summary: response.data?.summary || {},
  };
}

export async function fetchPendingOperationApprovals(currentUser = {}) {
  const response = await api.get("/operations/pending-approvals", {
    headers: buildOperationRequestHeaders(currentUser),
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function reviewOperation(
  operationId,
  action,
  note = "",
  currentUser = {}
) {
  if (!operationId) {
    throw new Error("Operation ID is required.");
  }

  const response = await api.patch(
    `/operations/${operationId}/review`,
    { action, note },
    { headers: buildOperationRequestHeaders(currentUser) }
  );

  return response.data;
}
