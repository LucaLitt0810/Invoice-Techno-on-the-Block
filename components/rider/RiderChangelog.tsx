'use client';

import { useState, useRef, useEffect } from 'react';
import { DJRiderChangelog, DJRiderMessage } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  UserCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface RiderChangelogProps {
  changelog: DJRiderChangelog[];
  messages: DJRiderMessage[];
  onSendMessage: (content: string) => Promise<void>;
}

type ActivityItem =
  | { type: 'changelog'; data: DJRiderChangelog; timestamp: string }
  | { type: 'message'; data: DJRiderMessage; timestamp: string };

export default function RiderChangelog({ changelog, messages, onSendMessage }: RiderChangelogProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'participants' | 'files'>('activity');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine and sort
  const combined: ActivityItem[] = [
    ...changelog.map((c) => ({ type: 'changelog' as const, data: c, timestamp: c.created_at })),
    ...messages.map((m) => ({ type: 'message' as const, data: m, timestamp: m.created_at })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [changelog.length, messages.length]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    setSending(true);
    try {
      await onSendMessage(messageInput);
      setMessageInput('');
    } finally {
      setSending(false);
    }
  };

  const getUserName = (user?: { email: string; user_metadata?: { first_name?: string; last_name?: string } }) => {
    const first = user?.user_metadata?.first_name || '';
    const last = user?.user_metadata?.last_name || '';
    return `${first} ${last}`.trim() || user?.email || 'Unbekannt';
  };

  return (
    <div className="flex flex-col h-full bg-dark-800 border border-dark-500 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-dark-500">
        {[
          { key: 'activity', label: 'Activity' },
          { key: 'participants', label: 'Participants' },
          { key: 'files', label: 'Files' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'activity' && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {combined.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-8">No activity yet</p>
              )}
              {combined.map((item, idx) => {
                if (item.type === 'message') {
                  const msg = item.data;
                  return (
                    <div key={`msg-${idx}`} className="flex gap-2">
                      <UserCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-300">
                            {getUserName(msg.user)}
                          </span>
                          <span className="text-xs text-gray-600">
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                const log = item.data;
                const isConfirmed = log.status === 'confirmed';

                return (
                  <div key={`log-${idx}`} className="flex gap-2">
                    {isConfirmed ? (
                      <CheckCircleSolid className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <PencilIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-300">
                          {isConfirmed
                            ? `${getUserName(log.confirmed_by_user)} hat bestätigt`
                            : `${getUserName(log.changed_by_user)} hat geändert`}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      </div>
                      {log.field && (
                        <p className="text-xs text-gray-500 mt-0.5">{log.field.label}</p>
                      )}
                      {!isConfirmed && (
                        <div className="mt-1 text-xs">
                          <span className="text-gray-600 line-through">{log.old_value || '-'}</span>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="text-white">{log.new_value || '-'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isConfirmed ? (
                        <CheckCircleSolid className="h-5 w-5 text-teal-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-gray-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="border-t border-dark-500 p-3">
              <div className="flex gap-2">
                <textarea
                  className="flex-1 bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none h-20"
                  placeholder="Write a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'participants' && (
          <div className="p-4">
            <p className="text-sm text-gray-500">Participants will be shown here.</p>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-4">
            <p className="text-sm text-gray-500">Files will be shown here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
