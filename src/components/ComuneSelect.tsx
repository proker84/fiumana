'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';

interface Comune {
  codice: string;
  nome: string;
  provincia: string;
}

interface ComuneSelectProps {
  value: string;
  valueCodice: string;
  provincia?: string;
  onChange: (nome: string, codice: string, provincia: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function ComuneSelect({
  value,
  valueCodice,
  provincia,
  onChange,
  placeholder = 'Cerca comune...',
  label,
  required = false,
  disabled = false,
}: ComuneSelectProps) {
  const [search, setSearch] = useState(value || '');
  const [results, setResults] = useState<Comune[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search when value changes externally
  useEffect(() => {
    if (value && value !== search) {
      setSearch(value);
    }
  }, [value]);

  // Search comuni
  useEffect(() => {
    const searchComuni = async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'comuni',
          search: search,
        });
        if (provincia) {
          params.append('provincia', provincia);
        }

        const res = await fetch(`/api/alloggiati-data?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.comuni || []);
        }
      } catch (err) {
        console.error('Error searching comuni:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchComuni, 300);
    return () => clearTimeout(debounce);
  }, [search, provincia]);

  const handleSelect = (comune: Comune) => {
    setSearch(comune.nome);
    onChange(comune.nome, comune.codice, comune.provincia);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setSearch('');
    onChange('', '', '');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        ) : search && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((comune, index) => (
            <button
              key={comune.codice}
              type="button"
              onClick={() => handleSelect(comune)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${
                index === selectedIndex ? 'bg-blue-50' : ''
              } ${index === 0 ? 'rounded-t-xl' : ''} ${index === results.length - 1 ? 'rounded-b-xl' : ''}`}
            >
              <span className="font-medium">{comune.nome}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {comune.provincia}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && search.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500">
          Nessun comune trovato
        </div>
      )}

      {/* Hidden input for codice */}
      <input type="hidden" value={valueCodice} />
    </div>
  );
}
