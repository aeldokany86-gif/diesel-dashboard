    import api from "./api";

    export async function fetchTelemetryDevices({ companyId, assetId, vendor, status } = {}) {
      const response = await api.get("/telemetry/devices", {
        params: { ...(companyId ? { companyId } : {}), ...(assetId ? { assetId } : {}), ...(vendor ? { vendor } : {}), ...(status ? { status } : {}) },
        headers: { "X-Skip-Action-Loading": "true" },
      });
      return Array.isArray(response.data) ? response.data : [];
    }

    export async function fetchTelemetryDevice(deviceId) {
      const response = await api.get(`/telemetry/devices/${deviceId}`, { headers: { "X-Skip-Action-Loading": "true" } });
      return response.data;
    }

    export async function fetchLatestTelemetry(deviceId) {
      const response = await api.get(`/telemetry/devices/${deviceId}/latest`, { headers: { "X-Skip-Action-Loading": "true" } });
      return response.data;
    }

export async function fetchTelemetryDeviceSensors(deviceId) {
  const response = await api.get(`/telemetry/devices/${deviceId}/sensors`, {
    headers: { "X-Skip-Action-Loading": "true" },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function updateTelemetryDeviceSensor(deviceId, sensorDefinitionId, isEnabled) {
  const response = await api.patch(
    `/telemetry/devices/${deviceId}/sensors/${sensorDefinitionId}`,
    { isEnabled },
  );
  return response.data;
}

export async function createTelemetrySensorDefinition(payload) {
  const response = await api.post("/telemetry/sensors", payload);
  return response.data;
}

    export async function fetchTelemetryAssets(companyId) {
      const response = await api.get("/assets", {
        params: companyId ? { companyId } : {},
        headers: { "X-Skip-Action-Loading": "true" },
      });
      return Array.isArray(response.data) ? response.data : [];
    }

    export async function createTelemetryDevice(payload) {
      const response = await api.post("/telemetry/devices", payload);
      return response.data;
    }

    export async function updateTelemetryDevice(deviceId, payload) {
      const response = await api.patch(`/telemetry/devices/${deviceId}`, payload);
      return response.data;
    }

    export async function assignTelemetryDevice(deviceId, payload) {
      const response = await api.post(`/telemetry/devices/${deviceId}/assign`, payload);
      return response.data;
    }

    export async function unassignTelemetryDevice(deviceId, companyId) {
      const response = await api.post(`/telemetry/devices/${deviceId}/unassign`, { companyId });
      return response.data;
    }

    export async function deleteTelemetryDevice(deviceId, companyId) {
      const response = await api.delete(`/telemetry/devices/${deviceId}`, { params: { companyId } });
      return response.data;
    }
