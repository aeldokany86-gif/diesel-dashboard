import api from "./api";

export async function fetchEmployees({
  companyId = "",
  viewerUserId = "",
} = {}) {
  const response = await api.get("/employees", {
    params: {
      ...(companyId ? { companyId } : {}),
      ...(viewerUserId ? { viewerUserId } : {}),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createEmployeeRecord(payload) {
  const response = await api.post("/employees", payload);
  return response.data;
}

export async function checkEmployeeIdAvailability({
  employeeId,
  companyId = "",
} = {}) {
  const normalizedEmployeeId = String(employeeId || "").trim();

  if (!normalizedEmployeeId) {
    return {
      employeeId: "",
      available: false,
      status: "EMPTY",
    };
  }

  const response = await api.get("/employees/check-id", {
    params: {
      employeeId: normalizedEmployeeId,
      ...(companyId ? { companyId } : {}),
    },
  });

  return response.data || {
    employeeId: normalizedEmployeeId,
    available: true,
    status: "AVAILABLE",
  };
}

export async function updateEmployeeRecord(employeeId, payload) {
  const response = await api.patch(`/employees/${employeeId}`, payload);
  return response.data;
}

export async function fetchPendingEmployeeTransfers() {
  const response = await api.get("/employee-transfers/pending");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createEmployeeTransfer(payload) {
  const response = await api.post("/employee-transfers", payload);
  return response.data;
}

export async function createBulkEmployeeTransfer(payload) {
  const response = await api.post('/employee-transfers/bulk', payload);
  return response.data;
}

export async function reviewEmployeeTransfer(transferId, payload) {
  const response = await api.patch(
    `/employee-transfers/${transferId}/review`,
    payload
  );

  return response.data;
}

export async function fetchEmployeeMasterReport({ companyId } = {}) {
  if (!companyId) {
    throw new Error("Company ID is required to generate the employee report.");
  }

  const response = await api.get("/employees/report/master", {
    params: { companyId },
  });

  return {
    rows: Array.isArray(response.data?.rows) ? response.data.rows : [],
    summary: response.data?.summary || {},
  };
}

export async function fetchEmployeeTransferReport({ companyId, ...filters } = {}) {
  if (!companyId) {
    throw new Error("Company ID is required to generate the employee transfer report.");
  }

  const response = await api.get("/employee-transfers/report", {
    params: { companyId, ...filters },
  });

  return {
    rows: Array.isArray(response.data?.rows) ? response.data.rows : [],
    summary: response.data?.summary || {},
  };
}


export async function fetchEmployeeProjectAssignments(employeeId) {
  if (!employeeId) throw new Error("Employee backend ID is required.");
  const response = await api.get(`/employees/${employeeId}/project-assignments`);
  return response.data;
}

export async function addEmployeeProjectAssignment(employeeId, projectId) {
  if (!employeeId) throw new Error("Employee backend ID is required.");
  if (!projectId) throw new Error("Project ID is required.");
  const response = await api.post(`/employees/${employeeId}/project-assignments`, {
    projectId,
  });
  return response.data;
}

export async function removeEmployeeProjectAssignments(employeeId, projectIds = []) {
  if (!employeeId) throw new Error("Employee backend ID is required.");
  const normalizedProjectIds = Array.from(
    new Set((Array.isArray(projectIds) ? projectIds : []).filter(Boolean))
  );
  if (!normalizedProjectIds.length) {
    throw new Error("Select at least one additional project to remove.");
  }

  const response = await api.delete(`/employees/${employeeId}/project-assignments`, {
    data: {
      projectIds: normalizedProjectIds,
    },
  });
  return response.data;
}

export async function fetchPendingEmployeeProjectRemovalRequests(approverUserId) {
  if (!approverUserId) return [];
  const response = await api.get(
    "/employee-transfers/project-removal-requests/pending",
    { params: { approverUserId } }
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function reviewEmployeeProjectRemovalRequest(requestId, payload) {
  if (!requestId) throw new Error("Project removal request ID is required.");
  const response = await api.patch(
    `/employee-transfers/project-removal-requests/${requestId}/review`,
    payload
  );
  return response.data;
}
