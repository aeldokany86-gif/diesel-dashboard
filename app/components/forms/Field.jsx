"use client";

export default function Field({
  label,
  placeholder = "",
  type = "text",
  value,
  onChange,
  error = "",
  disabled = false,
  list = "",
  datalistOptions = [],
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 sm:gap-4">
      <label className="pt-2 font-medium text-slate-300">
        {label}
      </label>
 
      <div className="col-span-2">
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          list={list || undefined}
          className={`w-full rounded-lg border bg-slate-900 p-2 text-white placeholder:text-slate-500 outline-none focus:ring-2 ${
            error
              ? "border-red-500 bg-red-500/10 focus:ring-red-500/30"
              : "border-slate-700 focus:border-amber-400 focus:ring-amber-400/20"
          } ${disabled ? "bg-slate-700 text-slate-500 cursor-not-allowed opacity-70" : ""}`}
          placeholder={placeholder}
        />
        {list && Array.isArray(datalistOptions) && datalistOptions.length > 0 && (
          <datalist id={list}>
            {datalistOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
        {error && (
          <p className="mt-1 text-xs font-semibold text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
