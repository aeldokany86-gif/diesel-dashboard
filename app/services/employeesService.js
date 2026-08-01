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
