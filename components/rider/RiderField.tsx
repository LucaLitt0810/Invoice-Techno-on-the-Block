'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { DJRiderTemplateField, DJRiderValue } from '@/types';

interface RiderFieldProps {
  field: DJRiderTemplateField;
  value: DJRiderValue | undefined;
  isAgency: boolean;
  canEdit: boolean;
  onChange: (fieldId: string, value: string | null) => void;
  onConfirm: (valueId: string) => void;
}

export default function RiderField({ field, value, isAgency, canEdit, onChange, onConfirm }: RiderFieldProps) {
  const [localValue, setLocalValue] = useState(value?.value || '');

  useEffect(() => {
    setLocalValue(value?.value || '');
  }, [value?.value]);

  const confirmedByMe = isAgency ? value?.confirmed_by_agency : value?.confirmed_by_customer;
  const confirmedByOther = isAgency ? value?.confirmed_by_customer : value?.confirmed_by_agency;
  const isFullyConfirmed = value?.confirmed_by_agency && value?.confirmed_by_customer;

  const needsMyConfirmation = !!value?.id && value.value !== null && value.value !== '' && !confirmedByMe;

  // Entire row green with pulse ring when fully confirmed
  const rowClass = isFullyConfirmed
    ? 'bg-green-900/10 border-green-800/30 animate-pulse-ring'
    : 'bg-white/[0.02] border-white/[0.06]';

  const handleBlur = useCallback(() => {
    if (!canEdit) return;
    if (localValue !== (value?.value || '')) {
      onChange(field.id, localValue || null);
    }
  }, [localValue, value, field.id, onChange, canEdit]);

  const renderInput = () => {
    const disabled = !canEdit;
    const baseClasses =
      'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            className={`${baseClasses} min-h-[80px] resize-y`}
            placeholder={field.placeholder || ''}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
          />
        );
      case 'boolean':
        return (
          <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={localValue === 'true'}
              onChange={(e) => {
                if (disabled) return;
                const newVal = e.target.checked ? 'true' : 'false';
                setLocalValue(newVal);
                onChange(field.id, newVal);
              }}
              disabled={disabled}
            />
            <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${rowClass} transition-all duration-200`}>
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {field.placeholder && field.field_type !== 'textarea' && field.field_type !== 'text' && (
          <p className="text-xs text-gray-600 mb-1">{field.placeholder}</p>
        )}
        {renderInput()}
        {!canEdit && (
          <p className="text-xs text-gray-600 mt-1">Nur von Agency bearbeitbar</p>
        )}
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
