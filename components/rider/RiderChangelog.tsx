'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DJRiderChangelog, DJRiderMessage } from '@/types';
import { formatDistanceToNow, format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  UserCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ClockIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface RiderChangelogProps {
  changelog: DJRiderChangelog[];
  messages: DJRiderMessage[];
  onSendMessage: (content: string) => Promise<void>;
  currentUserId?: string | null;
}

type ActivityItem =
  | { type: 'changelog'; data: DJRiderChangelog; timestamp: string }
  | { type: 'message'; data: DJRiderMessage; timestamp: string };

interface GroupedItem {
  userId: string | null;
  userName: string;
  timestamp: string;
  items: ActivityItem[];
}

export default function RiderChangelog({
  changelog,
  messages,
  onSendMessage,
  currentUserId,
}: RiderChangelogProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'chat'>('activity');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(false);

  // Combine
  const allItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [
      ...changelog.map((c) => ({ type: 'changelog' as const, data: c, timestamp: c.created_at })),
      ...messages.map((m) => ({ type: 'message' as const, data: m, timestamp: m.created_at })),
    ];
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [changelog, messages]);

  // Stats
  const stats = useMemo(() => {
    const pending = changelog.filter((c) => c.status === 'pending').length;
    const confirmed = changelog.filter((c) => c.status === 'confirmed').length;
    const msgCount = messages.length;
    return { pending, confirmed, msgCount };
  }, [changelog, messages]);

  // Filtered items by tab
  const visibleItems = useMemo(() => {
    if (activeTab === 'chat') return allItems.filter((i) => i.type === 'message');
    return allItems;
  }, [allItems, activeTab]);

  // Group consecutive items by same user within 10 minutes
  const grouped = useMemo(() => {
    const groups: GroupedItem[] = [];
    let current: GroupedItem | null = null;

    for (const item of visibleItems) {
      const userId = item.type === 'message' ? item.data.user_id : item.data.changed_by;
      const userName = getUserName(
        item.type === 'message'
          ? (item.data as any).user
          : (item.data as any).changed_by_user
      );

      if (
        current &&
        current.userId === userId &&
        differenceInMinutes(new Date(item.timestamp), new Date(current.timestamp)) < 10
      ) {
        current.items.push(item);
      } else {
        current = { userId, userName, timestamp: item.timestamp, items: [item] };
        groups.push(current);
      }
    }
    return groups;
  }, [visibleItems]);

  // Auto-scroll: only scroll to bottom for own new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    if (shouldScrollToBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      shouldScrollToBottom.current = false;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    shouldScrollToBottom.current = true;
    setSending(true);
    try {
      await onSendMessage(messageInput);
      setMessageInput('');
    } finally {
      setSending(false);
    }
  };

  const getUserName = (user?: { email: string; user_metadata?: { first_name?: string; last_name?: string; full_name?: string } } | null) => {
    if (!user) return 'Unbekannt';
    const full = user.user_metadata?.full_name || '';
    const first = user.user_metadata?.first_name || '';
    const last = user.user_metadata?.last_name || '';
    return full || `${first} ${last}`.trim() || user.email || 'Unbekannt';
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Heute';
    if (isYesterday(d)) return 'Gestern';
    return format(d, 'EEEE, d. MMMM', { locale: de });
  };

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+|@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-400 font-medium bg-blue-900/20 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Check if date changes between groups
  let lastDateLabel = '';

  return (
    <div className="flex flex-col h-full bg-dark-800 border border-dark-500 rounded-xl overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-dark-500 bg-dark-900/50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{stats.pending} offen</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-teal-400">
          <CheckBadgeIcon className="h-3.5 w-3.5" />
          <span>{stats.confirmed} bestätigt</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
          <span>{stats.msgCount} Nachrichten</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-500">
        {[
          { key: 'activity', label: 'Activity', icon: HashtagIcon },
          { key: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {grouped.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-8">Noch keine Activity</p>
          )}
          {grouped.map((group, gIdx) => {
            const dateLabel = getDateLabel(group.timestamp);
            const showDateDivider = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;

            return (
              <div key={`g-${gIdx}`}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-dark-500" />
                    <span className="text-xs text-gray-500 font-medium">{dateLabel}</span>
                    <div className="flex-1 h-px bg-dark-500" />
                  </div>
                )}

                <div className="flex gap-2.5">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-300">{group.userName}</span>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(group.timestamp), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>

                    {group.items.map((item, iIdx) => {
                      if (item.type === 'message') {
                        const msg = item.data;
                        return (
                          <div key={`m-${gIdx}-${iIdx}`} className="text-sm text-gray-400">
                            {renderMentions(msg.content)}
                          </div>
                        );
                      }

                      const log = item.data;
                      const isConfirmed = log.status === 'confirmed';
                      const hasField = log.field && log.field.label;

                      return (
                        <div key={`l-${gIdx}-${iIdx}`} className="flex items-start gap-2">
                          {isConfirmed ? (
                            <CheckCircleSolid className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <PencilIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            {hasField && log.field && (
                              <p className="text-xs text-gray-500">{log.field.label}</p>
                            )}
                            {isConfirmed ? (
                              <p className="text-xs text-teal-400">
                                Bestätigt von{' '}
                                {getUserName((log as any).confirmed_by_user) || 'Jemand'}
                              </p>
                            ) : (
                              <div className="text-xs flex items-center gap-1.5 flex-wrap">
                                {log.old_value ? (
                                  <span className="text-red-400 line-through bg-red-900/20 px-1 rounded">
                                    {log.old_value}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 italic">leer</span>
                                )}
                                <span className="text-gray-500">→</span>
                                {log.new_value ? (
                                  <span className="text-green-400 bg-green-900/20 px-1 rounded">
                                    {log.new_value}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 italic">leer</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
              placeholder="Nachricht schreiben... @Name für Erwähnung"
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
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-600">Shift + Enter für neue Zeile</span>
            <button
              onClick={handleSend}
              disabled={sending || !messageInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Senden...' : 'Senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
