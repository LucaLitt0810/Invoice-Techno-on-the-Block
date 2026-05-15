'use client';

import { useMemo } from 'react';
import { DJRiderTemplateSection, DJRiderTemplateField, DJRiderValue } from '@/types';
import RiderField from './RiderField';
import RiderChangelog from './RiderChangelog';

interface RiderFormProps {
  sections: DJRiderTemplateSection[];
  fields: DJRiderTemplateField[];
  values: DJRiderValue[];
  changelog: any[];
  messages: any[];
  isAgency: boolean;
  currentUserId?: string | null;
  fieldAssignments?: Record<string, string>;
  onChange: (fieldId: string, value: string | null) => void;
  onConfirm: (valueId: string) => void;
  onSendMessage: (content: string) => Promise<void>;
}

export default function RiderForm({
  sections,
  fields,
  values,
  changelog,
  messages,
  isAgency,
  currentUserId,
  fieldAssignments,
  onChange,
  onConfirm,
  onSendMessage,
}: RiderFormProps) {
  const fieldsBySection = useMemo(() => {
    const map: Record<string, DJRiderTemplateField[]> = {};
    sections.forEach((section) => {
      map[section.id] = fields
        .filter((f) => f.section_id === section.id)
        .sort((a, b) => a.sort_order - b.sort_order);
    });
    return map;
  }, [sections, fields]);

  const getValue = (fieldId: string) => values.find((v) => v.field_id === fieldId);

  const canEditField = (fieldId: string) => {
    const assignment = fieldAssignments?.[fieldId];
    if (!assignment || assignment === 'both') return true;
    if (assignment === 'agency' && isAgency) return true;
    if (assignment === 'customer' && !isAgency) return true;
    return false;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Form */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {sections
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((section) => {
            const sectionFields = fieldsBySection[section.id] || [];
            if (sectionFields.length === 0) return null;

            return (
              <div
                key={section.id}
                className="bg-dark-800 border border-dark-500 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-dark-500">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    {section.name}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {sectionFields.map((field) => (
                    <RiderField
                      key={field.id}
                      field={field}
                      value={getValue(field.id)}
                      isAgency={isAgency}
                      canEdit={canEditField(field.id)}
                      onChange={onChange}
                      onConfirm={onConfirm}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Changelog */}
      <div className="w-full lg:w-[380px] flex-shrink-0 h-[500px] lg:h-auto">
        <RiderChangelog
          changelog={changelog}
          messages={messages}
          onSendMessage={onSendMessage}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
