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
  const response = await fetch(`${baseUrl}/uploads/operation-photo`, {
    method: "POST",
    headers: buildOperationRequestHeaders(currentUser),
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

  const response = await fetch(url, {
    method: "GET",
    headers: buildOperationRequestHeaders(currentUser),
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
