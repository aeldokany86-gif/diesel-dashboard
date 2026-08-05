import api from "./api";

export async function updateLanguagePreference(preferredLanguage) {
  const response = await api.patch("/auth/preferences", {
    preferredLanguage,
  });

  return response.data;
}
