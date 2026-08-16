import api from "./api";

export async function fetchCompanies(params = {}) {
  const response = await api.get("/companies", {
    params,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchPublicCompanies() {
  const response = await api.get("/companies/public");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createCompanyRecord(payload) {
  const response = await api.post("/companies", payload);
  return response.data;
}

export async function updateCompanyRecord(companyId, payload) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.patch(`/companies/${companyId}`, payload);
  return response.data;
}

export async function updateCompanyStatus(companyId, isActive) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.patch(`/companies/${companyId}/status`, {
    isActive,
  });

  return response.data;
}

export async function updateCompanyDataImportAccess(companyId, enabled) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.patch(`/companies/${companyId}/data-import-access`, {
    enabled: Boolean(enabled),
  });

  return response.data;
}




export async function updateCompanyMultiProjectAccess(companyId, enabled) {
  if (!companyId) {
    throw new Error("Company backend ID is required.");
  }

  const response = await api.patch(`/companies/${companyId}/multi-project-access`, {
    enabled: Boolean(enabled),
  });

  return response.data;
}

export async function fetchCompaniesMasterReport(params = {}) {
  const response = await api.get("/companies/reports/master", {
    params,
  });

  return {
    summary: response.data?.summary || {},
    rows: Array.isArray(response.data?.rows) ? response.data.rows : [],
  };
}

export async function fetchStationNegativeTolerance() {
  const response = await api.get("/companies/settings/station-negative-tolerance");
  return response.data || {};
}

export async function updateStationNegativeTolerance(percent) {
  const response = await api.patch(
    "/companies/settings/station-negative-tolerance",
    { percent: Number(percent) },
  );
  return response.data || {};
}
