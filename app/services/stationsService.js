import api from "./api";

export async function fetchStations({
  companyId = "",
  includeDeleted = false,
} = {}) {
  const response = await api.get("/stations", {
    params: {
      ...(companyId ? { companyId } : {}),
      ...(includeDeleted ? { includeDeleted: true } : {}),
    },
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

export async function resetStationCounter(stationId, payload) {
  if (!stationId) {
    throw new Error("Station backend ID is required.");
  }

  const response = await api.post(
    `/stations/${stationId}/reset-counter`,
    payload
  );

  return response.data;
}

export async function fetchPendingStationTransfers() {
  const response = await api.get("/stations/transfers/pending");
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchStationTransferReport({
  companyId = "",
  fromProjectId = "",
  toProjectId = "",
  stationId = "",
  status = "ALL",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const response = await api.get("/stations/transfers/report", {
    params: {
      ...(companyId ? { companyId } : {}),
      ...(fromProjectId ? { fromProjectId } : {}),
      ...(toProjectId ? { toProjectId } : {}),
      ...(stationId ? { stationId } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    },
  });

  return response.data || {
    summary: {
      totalTransfers: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    rows: [],
  };
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

export async function fetchStationCounterMeterHistory({
  companyId = "",
  projectId = "",
  stationId = "",
  dateFrom = "",
  dateTo = "",
  eventType = "ALL",
} = {}) {
  const response = await api.get("/stations/counter-meter-history", {
    params: {
      ...(companyId ? { companyId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(stationId ? { stationId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(eventType && eventType !== "ALL" ? { eventType } : {}),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}
