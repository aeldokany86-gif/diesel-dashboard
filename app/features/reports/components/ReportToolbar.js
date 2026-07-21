"use client";

export default function ReportToolbar({
  onOpenFilters,
  onPrint,
  onExport,
  disabled = false,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onOpenFilters}
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-extrabold text-amber-300 transition hover:bg-amber-500/20"
      >
        Filters
      </button>

      <button
        type="button"
        onClick={onPrint}
        disabled={disabled}
        className={`rounded-xl border px-4 py-2.5 text-sm font-extrabold transition ${
          disabled
            ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
            : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400 hover:bg-slate-700"
        }`}
      >
        Print
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        className={`rounded-xl border px-4 py-2.5 text-sm font-extrabold transition ${
          disabled
            ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
        }`}
      >
        Export Excel
      </button>
    </div>
  );
}
