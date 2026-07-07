import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fleetfuelpro_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getOperations(config = {}) {
  return api.get("/operations", config);
}

export function getPendingOperationApprovals(config = {}) {
  return api.get("/operations/pending-approvals", config);
}

export function createOperation(payload, config = {}) {
  return api.post("/operations", payload, config);
}

export function reviewOperation(operationId, payload, config = {}) {
  return api.patch(`/operations/${operationId}/review`, payload, config);
}

export default api;
