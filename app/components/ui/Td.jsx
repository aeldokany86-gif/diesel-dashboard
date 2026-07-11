"use client";

export default function Td({
  children,
  strong = false,
  className = "",
  ...props
}) {
  return (
    <td
      {...props}
      className={`px-3 py-2.5 border-b border-r border-slate-700/45 last:border-r-0 whitespace-normal xl:whitespace-nowrap break-words leading-tight max-w-[260px] ${
        strong
          ? "font-bold text-sky-200"
          : "text-slate-100"
      } ${className}`}
    >
      {children}
    </td>
  );
}