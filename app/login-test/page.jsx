"use client";

import { useState } from "react";
import { login } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function LoginTestPage() {
  const [email, setEmail] = useState("admin@fleetfuelpro.com");
  const [password, setPassword] = useState("Admin@12345");
  const [message, setMessage] = useState("");

  const {
    currentUser,
    permissions,
    loading,
    isLoggedIn,
    logout,
    reloadUser,
    hasPermission,
  } = useAuth();

  async function handleLogin() {
    try {
      setMessage("Logging in...");
      await login(email, password);
      await reloadUser();
      setMessage("✅ Login success and AuthContext updated");
    } catch (error) {
      setMessage("❌ Login failed");
      console.error(error);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Fleet Fuel PRO Auth Context Test</h1>

      <p>
        Status: <strong>{isLoggedIn ? "Logged In" : "Logged Out"}</strong>
      </p>

      <div style={{ marginBottom: 12 }}>
        <input
          style={{ padding: 10, width: 320 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          style={{ padding: 10, width: 320 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
      </div>

      <button onClick={handleLogin} style={{ padding: 10, marginRight: 8 }}>
        Login
      </button>

      <button onClick={reloadUser} style={{ padding: 10, marginRight: 8 }}>
        Reload /auth/me
      </button>

      <button onClick={logout} style={{ padding: 10 }}>
        Logout
      </button>

      <p>{message}</p>

      {currentUser && (
        <>
          <h3>Current User</h3>
          <pre
            style={{
              marginTop: 10,
              padding: 20,
              background: "#111",
              color: "#0f0",
              borderRadius: 8,
              maxWidth: 900,
              overflowX: "auto",
            }}
          >
            {JSON.stringify(currentUser, null, 2)}
          </pre>

          <h3>Permission Check</h3>
          <p>
            users.read:{" "}
            <strong>{hasPermission("users.read") ? "YES" : "NO"}</strong>
          </p>
          <p>
            companies.manage:{" "}
            <strong>{hasPermission("companies.manage") ? "YES" : "NO"}</strong>
          </p>

          <h3>Permissions</h3>
          <pre
            style={{
              marginTop: 10,
              padding: 20,
              background: "#111",
              color: "#0f0",
              borderRadius: 8,
              maxWidth: 900,
              overflowX: "auto",
            }}
          >
            {JSON.stringify(permissions, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}