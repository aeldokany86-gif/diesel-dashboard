import api from "./api";
import { buildOperationRequestHeaders } from "../lib/operationHelpers";

export async function fetchPendingOperationCorrections(currentUser = {}) {
  const response = await api.get("/operation-corrections/pending", {
    headers: buildOperationRequestHeaders(currentUser),
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createOperationCorrection(payload, currentUser = {}) {
  const response = await api.post("/operation-corrections", payload, {
    headers: buildOperationRequestHeaders(currentUser),
  });

  return response.data;
}

export async function fetchOperationCorrectionContext(
  operationId,
  currentUser = {}
) {
  if (!operationId) {
    throw new Error("Operation ID is required.");
  }

  const response = await api.get(
    `/operation-corrections/${operationId}/correction-context`,
    { headers: buildOperationRequestHeaders(currentUser) }
  );

  return response.data || {};
}

export async function reviewOperationCorrection(
  correctionId,
  action,
  note = "",
  currentUser = {}
) {
  if (!correctionId) {
    throw new Error("Operation correction ID is required.");
  }

  const response = await api.patch(
    `/operation-corrections/${correctionId}/review`,
    { action, note },
    { headers: buildOperationRequestHeaders(currentUser) }
  );

  return response.data;
}

export async function fetchOdometerCorrectionHistory(params = {}) {
  const response = await api.get(
    "/operation-corrections/reports/odometer-history",
    { params }
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchOperationCorrectionsReport(
  params = {},
  currentUser = {}
) {
  const response = await api.get(
    "/operation-corrections/reports/corrections",
    {
      params,
      headers: buildOperationRequestHeaders(currentUser),
    }
  );

  return {
    summary: response.data?.summary || {
      total: 0,
      pending: 0,
      approved: 0,
      applied: 0,
      rejected: 0,
    },
    data: Array.isArray(response.data?.data) ? response.data.data : [],
  };
}
