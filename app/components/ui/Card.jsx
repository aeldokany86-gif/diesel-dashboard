"use client";
export default function Card({ title, value }) {
  return (
    <div className="fleet-modal-panel relative bg-slate-900/80 border border-slate-700/80 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-0 overflow-hidden transition-all duration-200 hover:border-amber-400/50 hover:-translate-y-0.5">
      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-400/80" />
      <p className="text-[11px] sm:text-xs lg:text-sm text-slate-400 truncate pr-5">{title}</p>
 
      <h2 className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-slate-100 leading-tight break-words tabular-nums">
        {value}
      </h2>
    </div>
  );
}