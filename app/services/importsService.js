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

export async function downloadProjectsImportTemplate(
  companyId = "",
  language = "en",
) {
  const params = {
    language: language === "ar" ? "ar" : "en",
    ...(companyId ? { companyId } : {}),
  };

  const response = await api.get("/imports/templates/projects", {
    params,
    responseType: "blob",
  });

  return response.data;
}

export async function uploadProjectsImport(file, companyId = "") {
  if (!file) {
    throw new Error("Excel file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const params = companyId ? { companyId } : {};

  const response = await api.post("/imports/projects/upload", formData, {
    params,
  });

  return response.data;
}

export async function validateProjectsImportBatch(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.post(`/imports/batches/${batchId}/validate`);
  return response.data;
}

export async function fetchProjectsImportPreview(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.get(`/imports/batches/${batchId}/preview`);
  return response.data;
}

export async function confirmProjectsImportBatch(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.post(`/imports/batches/${batchId}/confirm`);
  return response.data;
}

export async function downloadEmployeesImportTemplate(
  companyId = "",
  language = "en",
) {
  const params = {
    language: language === "ar" ? "ar" : "en",
    ...(companyId ? { companyId } : {}),
  };

  const response = await api.get("/imports/templates/employees", {
    params,
    responseType: "blob",
  });

  return response.data;
}

export async function uploadEmployeesImport(file, companyId = "") {
  if (!file) {
    throw new Error("Excel file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const params = companyId ? { companyId } : {};

  const response = await api.post("/imports/employees/upload", formData, {
    params,
  });

  return response.data;
}

export async function downloadAssetsImportTemplate(
  companyId = "",
  language = "en",
) {
  const params = {
    language: language === "ar" ? "ar" : "en",
    ...(companyId ? { companyId } : {}),
  };

  const response = await api.get("/imports/templates/assets", {
    params,
    responseType: "blob",
  });

  return response.data;
}

export async function uploadAssetsImport(file, companyId = "") {
  if (!file) {
    throw new Error("Excel file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const params = companyId ? { companyId } : {};

  const response = await api.post("/imports/assets/upload", formData, {
    params,
  });

  return response.data;
}

export async function downloadStationsImportTemplate(
  companyId = "",
  language = "en",
) {
  const params = {
    language: language === "ar" ? "ar" : "en",
    ...(companyId ? { companyId } : {}),
  };

  const response = await api.get("/imports/templates/stations", {
    params,
    responseType: "blob",
  });

  return response.data;
}

export async function uploadStationsImport(file, companyId = "") {
  if (!file) {
    throw new Error("Excel file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const params = companyId ? { companyId } : {};

  const response = await api.post("/imports/stations/upload", formData, {
    params,
  });

  return response.data;
}

export async function validateImportBatch(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.post(`/imports/batches/${batchId}/validate`);
  return response.data;
}

export async function fetchImportPreview(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.get(`/imports/batches/${batchId}/preview`);
  return response.data;
}

export async function confirmImportBatch(batchId) {
  if (!batchId) {
    throw new Error("Import batch ID is required.");
  }

  const response = await api.post(`/imports/batches/${batchId}/confirm`);
  return response.data;
}
