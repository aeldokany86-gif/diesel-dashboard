import api from "./api";

export async function login(identifier, password) {
  const response = await api.post("/auth/login", {
    identifier,
    username: identifier,
    email: identifier, // Platform Console / backward compatibility only
    password,
  });

  const { access_token, user } = response.data;

  localStorage.setItem("fleetfuelpro_token", access_token);
  localStorage.setItem("fleetfuelpro_user", JSON.stringify(user));

  return user;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export function logout() {
  localStorage.removeItem("fleetfuelpro_token");
  localStorage.removeItem("fleetfuelpro_user");
}
