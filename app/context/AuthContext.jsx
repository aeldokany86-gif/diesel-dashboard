"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { getCurrentUser, logout as logoutService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();

      setCurrentUser(user);
      setPermissions(user.permissions || []);
    } catch (error) {
      logoutService();
      setCurrentUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("fleetfuelpro_token");

    if (token) {
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  function hasPermission(permission) {
    return permissions.includes(permission);
  }

  function logout() {
    logoutService();
    setCurrentUser(null);
    setPermissions([]);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        loading,
        isLoggedIn: !!currentUser,
        hasPermission,
        logout,
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