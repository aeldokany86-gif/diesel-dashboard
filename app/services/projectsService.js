import api from "./api";

export async function fetchProjects({ companyId = "" } = {}) {
  const response = await api.get("/projects", {
    params: companyId ? { companyId } : {},
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchProjectById(projectId) {
  if (!projectId) {
    throw new Error("Project backend ID is required.");
  }

  const response = await api.get(`/projects/${projectId}`);
  return response.data;
}

export async function createProjectRecord(payload) {
  const response = await api.post("/projects", payload);
  return response.data;
}

export async function updateProjectRecord(projectId, payload) {
  if (!projectId) {
    throw new Error("Project backend ID is required.");
  }

  const response = await api.patch(`/projects/${projectId}`, payload);
  return response.data;
}

export async function assignProjectManager(projectId, payload) {
  if (!projectId) {
    throw new Error("Project backend ID is required.");
  }

  const response = await api.patch(`/projects/${projectId}/manager`, payload);
  return response.data;
}

export async function deleteProjectRecord(projectId) {
  if (!projectId) {
    throw new Error("Project backend ID is required.");
  }

  const response = await api.delete(`/projects/${projectId}`);
  return response.data;
}

export async function updateProjectFuelPrice(projectId, payload) {
  if (!projectId) {
    throw new Error("Project backend ID is required.");
  }

  const response = await api.post(
    `/projects/${projectId}/update-fuel-price`,
    payload,
  );

  return response.data;
}
