import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

export function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  emptyText = 'Маълумот нест.',
  onChange,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  emptyText?: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => `${option.label} ${option.meta ?? ''}`.toLowerCase().includes(normalized));
  }, [options, query]);

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
            placeholder={selectedOption?.label ?? placeholder}
          />
        </div>

        <div className="mt-2 max-h-52 overflow-auto">
          {filteredOptions.length === 0 ? <p className="px-2 py-3 text-sm text-muted">{emptyText}</p> : null}
          {filteredOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition ${
                  isSelected ? 'bg-brand/10 text-brand' : 'hover:bg-panel'
                }`}
              >
                <span>
                  <span className="font-semibold">{option.label}</span>
                  {option.meta ? <span className="block text-xs text-muted">{option.meta}</span> : null}
                </span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
