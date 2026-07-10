"use client";

export default function StatusBadge({ status }) {
  const cleanStatus = status?.trim().toLowerCase();
  const isActive = cleanStatus === "active";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-green-500/15 text-green-400 border border-green-500/30"
          : "bg-red-500/15 text-red-400 border border-red-500/30"
      }`}
    >
      {status || "-"}
    </span>
  );
}