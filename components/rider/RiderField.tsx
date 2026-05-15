'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { DJRiderTemplateField, DJRiderValue } from '@/types';

interface RiderFieldProps {
  field: DJRiderTemplateField;
  value: DJRiderValue | undefined;
  isAgency: boolean;
  onChange: (fieldId: string, value: string | null) => void;
  onConfirm: (valueId: string) => void;
}

export default function RiderField({ field, value, isAgency, onChange, onConfirm }: RiderFieldProps) {
  const [localValue, setLocalValue] = useState(value?.value || '');

  useEffect(() => {
    setLocalValue(value?.value || '');
  }, [value?.value]);

  // Confirmation state from THIS user's perspective
  const confirmedByMe = isAgency ? value?.confirmed_by_agency : value?.confirmed_by_customer;
  const confirmedByOther = isAgency ? value?.confirmed_by_customer : value?.confirmed_by_agency;
  const isFullyConfirmed = value?.confirmed_by_agency && value?.confirmed_by_customer;

  // Show clickable checkmark if value exists but not yet confirmed by me
  const needsMyConfirmation = !!value?.id && value.value !== null && value.value !== '' && !confirmedByMe;

  const bgClass = isFullyConfirmed
    ? 'bg-teal-900/20 border-teal-800/40'
    : confirmedByMe
    ? 'bg-[#111] border-white/5'
    : 'bg-[#111] border-white/5';

  const handleBlur = useCallback(() => {
    if (localValue !== (value?.value || '')) {
      onChange(field.id, localValue || null);
    }
  }, [localValue, value, field.id, onChange]);

  const renderInput = () => {
    const baseClasses =
      'w-full bg-dark-900 border border-dark-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            className={`${baseClasses} min-h-[80px] resize-y`}
            placeholder={field.placeholder || ''}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center cursor-pointer gap-2">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localValue === 'true'}
              onChange={(e) => {
                const newVal = e.target.checked ? 'true' : 'false';
                setLocalValue(newVal);
                onChange(field.id, newVal);
              }}
            />
            <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="text-sm text-gray-400">{localValue === 'true' ? 'Ja' : 'Nein'}</span>
          </label>
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={baseClasses}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className={baseClasses}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            className={baseClasses}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className={baseClasses}
            placeholder={field.placeholder || ''}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            className={baseClasses}
            placeholder={field.placeholder || ''}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
      default:
        return (
          <input
            type="text"
            className={baseClasses}
            placeholder={field.placeholder || ''}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
          />
        );
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgClass} transition-colors`}>
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {field.placeholder && field.field_type !== 'textarea' && field.field_type !== 'text' && (
          <p className="text-xs text-gray-600 mb-1">{field.placeholder}</p>
        )}
        {renderInput()}
      </div>
      <div className="flex-shrink-0 pt-6">
        {needsMyConfirmation ? (
          <button
            onClick={() => onConfirm(value!.id)}
            className="text-gray-500 hover:text-teal-400 transition-colors"
            title="Bestätigen"
          >
            <CheckCircleIcon className="h-6 w-6" />
          </button>
        ) : confirmedByMe ? (
          <span className="text-teal-400" title="Bestätigt">
            <CheckCircleSolid className="h-6 w-6" />
          </span>
        ) : (
          <span className="text-gray-700" title="Noch nicht bestätigt">
            <CheckCircleIcon className="h-6 w-6" />
          </span>
        )}
      </div>
    </div>
  );
}
