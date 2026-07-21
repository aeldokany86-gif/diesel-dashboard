import api from "./api";

export async function fetchStations({ companyId = "" } = {}) {
  const response = await api.get("/stations", {
    params: companyId ? { companyId } : {},
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchStationById(stationId) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.get(`/stations/${stationId}`);
  return response.data;
}

export async function createStationRecord(payload) {
  const response = await api.post("/stations", payload);
  return response.data;
}

export async function updateStationRecord(stationId, payload) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.patch(`/stations/${stationId}`, payload);
  return response.data;
}

export async function deleteStationRecord(stationId) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.delete(`/stations/${stationId}`);
  return response.data;
}

export async function fetchPendingStationTransfers() {
  const response = await api.get("/stations/transfers/pending");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createStationTransfer(stationId, payload) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.post(`/stations/${stationId}/transfer`, payload);
  return response.data;
}

export async function reviewStationTransfer(transferId, payload) {
  if (!transferId) {
    throw new Error("Station transfer ID is required.");
  }

  const response = await api.patch(`/stations/transfers/${transferId}/review`, payload);
  return response.data;
}

export async function zeroStationBalance(stationId, payload) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.post(`/stations/${stationId}/zero-balance`, payload);
  return response.data;
}

export async function adjustStationInventory(stationId, payload) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.post(`/stations/${stationId}/adjust-inventory`, payload);
  return response.data;
}


export async function fetchStationStockMovements({
  companyId = "",
  projectId = "",
  stationId = "",
  dateFrom = "",
  dateTo = "",
  movementType = "",
  direction = "",
} = {}) {
  const response = await api.get("/stations/stock-movements", {
    params: {
      ...(companyId ? { companyId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(stationId ? { stationId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(movementType && movementType !== "all" ? { movementType } : {}),
      ...(direction && direction !== "all" ? { direction } : {}),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}
