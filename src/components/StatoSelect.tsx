'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, X, Loader2 } from 'lucide-react';

interface Stato {
  codice: string;
  nome: string;
}

interface StatoSelectProps {
  value: string;
  onChange: (codice: string, nome: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showItalia?: boolean;
}

// Common countries for quick selection
const COMMON_COUNTRIES = [
  { codice: '100000100', nome: 'ITALIA' },
  { codice: '100000203', nome: 'AUSTRIA' },
  { codice: '100000206', nome: 'BELGIO' },
  { codice: '100000209', nome: 'FRANCIA' },
  { codice: '100000210', nome: 'GERMANIA' },
  { codice: '100000213', nome: 'PAESI BASSI' },
  { codice: '100000214', nome: 'PORTOGALLO' },
  { codice: '100000215', nome: 'REGNO UNITO' },
  { codice: '100000219', nome: 'SPAGNA' },
  { codice: '100000220', nome: 'SVIZZERA' },
  { codice: '100000233', nome: 'POLONIA' },
  { codice: '100000235', nome: 'ROMANIA' },
  { codice: '100000336', nome: 'STATI UNITI D\'AMERICA' },
  { codice: '100000602', nome: 'ARGENTINA' },
  { codice: '100000605', nome: 'BRASILE' },
  { codice: '100000701', nome: 'AUSTRALIA' },
];

export default function StatoSelect({
  value,
  onChange,
  placeholder = 'Cerca stato...',
  label,
  required = false,
  disabled = false,
  showItalia = true,
}: StatoSelectProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Stato[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedName, setSelectedName] = useState('');
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

  // Set initial name from value
  useEffect(() => {
    if (value) {
      const found = COMMON_COUNTRIES.find(c => c.codice === value);
      if (found) {
        setSelectedName(found.nome);
        setSearch(found.nome);
      }
    }
  }, [value]);

  // Search stati
  useEffect(() => {
    const searchStati = async () => {
      if (search.length < 2) {
        // Show common countries when search is empty
        setResults(COMMON_COUNTRIES);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/alloggiati-data?type=stati&search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.stati || []);
        }
      } catch (err) {
        console.error('Error searching stati:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchStati, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (stato: Stato) => {
    setSelectedName(stato.nome);
    setSearch(stato.nome);
    onChange(stato.codice, stato.nome);
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
    setSelectedName('');
    onChange('', '');
    inputRef.current?.focus();
  };

  // Quick select Italia
  const selectItalia = () => {
    const italia = { codice: '100000100', nome: 'ITALIA' };
    handleSelect(italia);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {showItalia && !value && (
        <button
          type="button"
          onClick={selectItalia}
          className="mb-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Italia
        </button>
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
          onFocus={() => {
            setIsOpen(true);
            if (!search) setResults(COMMON_COUNTRIES);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
          {results.map((stato, index) => (
            <button
              key={stato.codice}
              type="button"
              onClick={() => handleSelect(stato)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              } ${index === 0 ? 'rounded-t-xl' : ''} ${index === results.length - 1 ? 'rounded-b-xl' : ''}`}
            >
              {stato.nome}
            </button>
          ))}
        </div>
      )}

      {/* Hidden input for codice */}
      <input type="hidden" value={value} />
    </div>
  );
}
