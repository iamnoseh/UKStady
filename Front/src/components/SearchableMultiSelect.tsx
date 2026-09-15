import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { SelectOption } from './SearchableSelect';

export function SearchableMultiSelect({
  label,
  values,
  options,
  placeholder,
  emptyText = 'Маълумот нест.',
  onChange,
}: {
  label?: string;
  values: string[];
  options: SelectOption[];
  placeholder: string;
  emptyText?: string;
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selectedValues = new Set(values);
  const selectedOptions = options.filter((option) => selectedValues.has(option.value));

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => `${option.label} ${option.meta ?? ''}`.toLowerCase().includes(normalized));
  }, [options, query]);

  function toggleValue(value: string) {
    onChange(selectedValues.has(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  return (
    <div>
      {label ? <span className="text-sm font-semibold">{label}</span> : null}
      <div className="mt-2 rounded-lg border border-line bg-white p-2 focus-within:border-brand">
        <div className="flex h-9 items-center gap-2 rounded-md bg-panel px-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder={placeholder}
          />
        </div>

        {selectedOptions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <span key={option.value} className="inline-flex h-8 items-center gap-2 rounded-md bg-brand/10 px-2 text-sm font-semibold text-brand">
                {option.label}
                <button type="button" onClick={() => toggleValue(option.value)} className="grid h-5 w-5 place-items-center rounded hover:bg-brand/10">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2 max-h-56 overflow-auto">
          {filteredOptions.length === 0 ? <p className="px-2 py-3 text-sm text-muted">{emptyText}</p> : null}
          {filteredOptions.map((option) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <label
                key={option.value}
                className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition ${
                  isSelected ? 'bg-brand/10 text-brand' : 'hover:bg-panel'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 accent-[#7c4dff]"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{option.label}</span>
                  {option.meta ? <span className="block text-xs text-muted">{option.meta}</span> : null}
                </span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
