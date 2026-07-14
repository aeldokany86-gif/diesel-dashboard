import api from "./api";

export async function fetchAssets(params = {}) {
  const response = await api.get("/assets", {
    params,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAssetById(assetId) {
  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const response = await api.get(`/assets/${assetId}`);
  return response.data;
}

export async function createAssetRecord(payload) {
  const response = await api.post("/assets", payload);
  return response.data;
}

export async function updateAssetRecord(assetId, payload) {
  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const response = await api.patch(`/assets/${assetId}`, payload);
  return response.data;
}

export async function deleteAssetRecord(assetId) {
  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const response = await api.delete(`/assets/${assetId}`);
  return response.data;
}

export async function fetchPendingAssetTransfers() {
  const response = await api.get("/assets/transfers/pending");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createAssetTransfer(assetId, payload) {
  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const response = await api.post(`/assets/${assetId}/transfer`, payload);
  return response.data;
}

export async function reviewAssetTransfer(transferId, payload) {
  if (!transferId) {
    throw new Error("Asset transfer ID is required.");
  }

  const response = await api.patch(`/assets/transfers/${transferId}/review`, payload);
  return response.data;
}

export async function resetAssetOdometer(assetId, payload) {
  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const response = await api.post(`/assets/${assetId}/reset-odometer`, payload);
  return response.data;
}
