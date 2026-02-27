const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent";

export default function LabeledInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  small,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`${inputClass} ${className}`}
      />
      {small && <small className="text-xs text-gray-500">{small}</small>}
    </div>
  );
}
