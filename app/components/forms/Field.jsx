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
      <label className="font-medium text-gray-700 pt-2">
        {label}
      </label>
 
      <div className="col-span-2">
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          list={list || undefined}
          className={`w-full border rounded-lg p-2 ${
            error
              ? "border-red-500 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
              : "border-gray-300"
          } ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
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
          <p className="mt-1 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}