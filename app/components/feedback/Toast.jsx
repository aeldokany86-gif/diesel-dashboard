"use client";

import { createPortal } from "react-dom";

export default function Toast({ type, message }) {
  const styles = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500 text-black",
  };

  const icons = {
    success: "✔",
    error: "✖",
    warning: "⚠",
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed top-6 right-6 z-[999999] px-5 py-3 rounded-xl shadow-2xl text-white font-medium transition-all duration-300 ${
        styles[type] || "bg-gray-700"
      }`}
    >
      <span className="mr-2">{icons[type]}</span>
      {message}
    </div>,
    document.body
  );
}