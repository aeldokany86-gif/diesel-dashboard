import api from "./api";

export async function login(identifier, password) {
  const response = await api.post("/auth/login", {
    identifier,
    username: identifier,
    email: identifier,
    password,
  });

  const { access_token, user } = response.data;

  localStorage.setItem("fleetfuelpro_token", access_token);

  return user;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function changePassword(currentPassword, newPassword) {
  const response = await api.patch("/auth/change-password", {
    currentPassword,
    newPassword,
  });

  return response.data;
}

export function logout() {
  localStorage.removeItem("fleetfuelpro_token");
}
