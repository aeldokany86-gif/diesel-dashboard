import api from "./api";

export async function fetchDataImportAccess(companyId = "") {
  const params = companyId ? { companyId } : {};
  const response = await api.get("/imports/access", { params });
  return response.data;
}

export async function fetchImportBatch(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.get(`/imports/batches/${batchId}`);
  return response.data;
}
