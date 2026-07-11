"use client";

export default function Th({ children, className = "", ...props }) {
  return (
    <th
      {...props}
      className={`px-3 py-3 text-left border-b border-r border-slate-600/60 last:border-r-0 text-[10px] font-black uppercase tracking-wide text-amber-300 whitespace-normal xl:whitespace-nowrap break-words leading-tight bg-slate-800 ${className}`}
    >
      {children}
    </th>
  );
}