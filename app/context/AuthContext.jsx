"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  changePassword as changePasswordService,
  getCurrentUser,
  login as loginService,
  logout as logoutService,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  function applyAuthenticatedUser(user) {
    setCurrentUser(user || null);
    setPermissions(user?.permissions || []);
    return user || null;
  }

  function updateCurrentUser(updates) {
    setCurrentUser((previousUser) => {
      if (!previousUser) return previousUser;

      const nextUser = {
        ...previousUser,
        ...(typeof updates === "function"
          ? updates(previousUser)
          : updates || {}),
      };

      setPermissions(nextUser?.permissions || []);
      return nextUser;
    });
  }

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();
      return applyAuthenticatedUser(user);
    } catch (error) {
      logoutService();
      applyAuthenticatedUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function login(identifier, password) {
    const user = await loginService(identifier, password);
    return applyAuthenticatedUser(user);
  }

  async function changePassword(currentPassword, newPassword) {
    const result = await changePasswordService(currentPassword, newPassword);

    if (result?.user) {
      applyAuthenticatedUser(result.user);
    }

    return result;
  }

  useEffect(() => {
    const token = localStorage.getItem("fleetfuelpro_token");

    if (token) {
      loadCurrentUser().catch(() => {
        // Invalid or expired token is handled inside loadCurrentUser.
      });
    } else {
      setLoading(false);
    }
  }, []);

  function hasPermission(permission) {
    return permissions.includes(permission);
  }

  function logout() {
    logoutService();
    applyAuthenticatedUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        loading,
        isLoggedIn: Boolean(currentUser),
        hasPermission,
        login,
        logout,
        changePassword,
        updateCurrentUser,
        reloadUser: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
