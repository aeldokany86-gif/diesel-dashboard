import api from "./api";

export function uploadOperationPhoto(formData, config = {}) {
  return api.post("/uploads/operation-photo", formData, {
    ...config,
    headers: {
      ...(config.headers || {}),
      "Content-Type": "multipart/form-data",
    },
  });
}

export function getUploadSignedUrl(path, expiresIn = 300, config = {}) {
  return api.get("/uploads/signed-url", {
    ...config,
    params: { path, expiresIn },
  });
}