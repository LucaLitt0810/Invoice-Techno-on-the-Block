'use client';

import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { createClient } from '@/lib/supabase/client';
import { Booking, DJ, DJUnavailability, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/bookings';
import BookingModal from './BookingModal';
import toast from 'react-hot-toast';
import { PlusIcon, CalendarIcon, ListBulletIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  extendedProps: {
    booking?: Booking;
    unavailability?: DJUnavailability;
  };
}

export default function BookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unavailability, setUnavailability] = useState<DJUnavailability[]>([]);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [selectedDJ, setSelectedDJ] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showUnavailability, setShowUnavailability] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [currentDJId, setCurrentDJId] = useState<string>('');
  
  // Fetch user role and DJ ID on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'user';
        setUserRole(role);
        
        // If DJ, fetch their DJ ID
        if (role === 'dj') {
          const { data: djData } = await supabase
            .from('djs')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (djData) {
            setCurrentDJId(djData.id);
          }
        }
      }
    };
    fetchUserRole();
  }, [supabase]);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      let url = '/api/bookings';
      if (selectedDJ) {
        url += `?dj_id=${selectedDJ}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    }
  }, [selectedDJ]);

  const fetchDJs = useCallback(async () => {
    try {
      const response = await fetch('/api/djs');
      if (!response.ok) throw new Error('Failed to fetch DJs');
      
      const data = await response.json();
      setDjs(data.djs || []);
    } catch (error) {
      console.error('Error fetching DJs:', error);
      toast.error('Failed to load DJs');
    } finally {
      setLoading(false);
    }
  }, []);



  const fetchUnavailability = useCallback(async () => {
    try {
      let url = '/api/unavailability';
      // For DJs, use their own ID; for others use selectedDJ
      const djFilterId = userRole === 'dj' ? currentDJId : selectedDJ;
      if (djFilterId) {
        url += `?dj_id=${djFilterId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch unavailability');
      
      const data = await response.json();
      setUnavailability(data.unavailability || []);
    } catch (error) {
      console.error('Error fetching unavailability:', error);
    }
  }, [selectedDJ, userRole, currentDJId]);

  useEffect(() => {
    if (userRole !== 'dj') {
      fetchDJs();
    }
  }, [fetchDJs, userRole]);
  
  useEffect(() => {
    // For DJs, only fetch unavailability when currentDJId is loaded
    if (userRole === 'dj' && !currentDJId) return;
    fetchUnavailability();
  }, [fetchUnavailability, currentDJId, userRole]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleDateClick = (info: any) => {
    setSelectedBooking(null);
    setSelectedDate(info.date);
    setModalOpen(true);
  };

  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps.booking;
    setSelectedBooking(booking);
    setSelectedDate(null);
    setModalOpen(true);
  };

  const handleEventDrop = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newStart = info.event.start?.toISOString();
    const newEnd = info.event.start ? new Date(info.event.start.getTime() + (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime())).toISOString() : null;
    
    if (!newStart || !newEnd) return;
    
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: newStart,
          end_date: newEnd,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update booking');
      }
      
      toast.success('Booking moved successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error moving booking:', error);
      toast.error(error.message || 'Failed to move booking');
      info.revert();
    }
  };

  const calendarEvents: CalendarEvent[] = [
    // Bookings
    ...bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.event_name} (${booking.dj?.name || 'Unknown DJ'})`,
      start: booking.start_date,
      end: booking.end_date,
      backgroundColor: BOOKING_STATUS_COLORS[booking.status],
      borderColor: BOOKING_STATUS_COLORS[booking.status],
      extendedProps: {
        booking,
      },
    })),
    // Unavailability (if enabled)
    ...(showUnavailability ? unavailability.map((unav) => ({
      id: `unav-${unav.id}`,
      title: `🚫 ${unav.dj?.name || 'DJ'} - ${unav.reason || 'Unavailable'}`,
      start: unav.start_date,
      end: unav.end_date,
      backgroundColor: '#333333',
      borderColor: '#666666',
      textColor: '#999999',
      extendedProps: {
        unavailability: unav,
      },
    })) : []),
  ];

  const handleBookingSaved = () => {
    setModalOpen(false);
    fetchBookings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            {userRole === 'dj' ? 'My Bookings' : 'DJ Bookings'}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {userRole === 'dj' ? 'View your bookings and availability' : 'Manage DJ bookings and calendar'}
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 space-x-3">
          {/* DJ Filter - only for non-DJs */}
          {userRole !== 'dj' && (
            <select
              className="input bg-dark-800 border-dark-500 text-white"
              value={selectedDJ}
              onChange={(e) => setSelectedDJ(e.target.value)}
            >
              <option value="">All DJs</option>
              {djs.map((dj) => (
                <option key={dj.id} value={dj.id}>
                  {dj.name}
                </option>
              ))}
            </select>
          )}
          
          {/* View Toggle */}
          <div className="flex border border-dark-500">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 transition-colors ${view === 'calendar' ? 'bg-white !text-black font-medium' : 'text-white hover:bg-dark-700'}`}
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-white !text-black font-medium' : 'text-white hover:bg-dark-700'}`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Unavailability Toggle */}
          <button
            onClick={() => setShowUnavailability(!showUnavailability)}
            className={`px-3 py-2 border text-xs uppercase tracking-wider ${
              showUnavailability 
                ? 'border-gray-500 bg-gray-800 text-gray-300' 
                : 'border-dark-500 text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle unavailability display"
          >
            🚫 Unavailable
          </button>
          
          {/* Add Button - different for DJs */}
          {userRole === 'dj' ? (
            <button
              onClick={() => {
                setSelectedBooking(null);
                setSelectedDate(new Date());
                setModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Booking for me
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedBooking(null);
                setSelectedDate(new Date());
                setModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Booking
            </button>
          )}
          
          {/* My Unavailability - only for DJs */}
          {userRole === 'dj' && (
            <Link
              href="/bookings/unavailability"
              className="inline-flex items-center px-4 py-2 border border-gray-500 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <ClockIcon className="-ml-1 mr-2 h-5 w-5" />
              My Unavailability
            </Link>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: BOOKING_STATUS_COLORS.request }}></span>
          <span className="text-gray-300">Request</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: BOOKING_STATUS_COLORS.negotiation }}></span>
          <span className="text-gray-300">Negotiation</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: BOOKING_STATUS_COLORS.confirmed }}></span>
          <span className="text-gray-300">Confirmed</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: BOOKING_STATUS_COLORS.paid }}></span>
          <span className="text-gray-300">Paid</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: BOOKING_STATUS_COLORS.cancelled }}></span>
          <span className="text-gray-300">Cancelled</span>
        </div>
      </div>

      {/* Calendar or List View */}
      {view === 'calendar' ? (
        <div className="card bg-dark-800 border-dark-500 p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            height="auto"
            themeSystem="standard"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            dayMaxEvents={true}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={true}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              list: 'List',
            }}
          />
        </div>
      ) : (
        <div className="card bg-dark-800 border-dark-500">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-500">
              <thead className="bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">DJ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Prov. %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-dark-800 divide-y divide-dark-500">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  bookings
                    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                    .map((booking) => (
                      <tr 
                        key={booking.id} 
                        className="hover:bg-dark-700 cursor-pointer"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setSelectedDate(null);
                          setModalOpen(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{booking.event_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{booking.dj?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">
                            {new Date(booking.start_date).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            to {new Date(booking.end_date).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{booking.location || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{booking.client_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">€{booking.fee?.toFixed(2) || '0.00'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-orange-400">{booking.provision || 0}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-400">
                            €{((booking.fee || 0) * (1 - (booking.provision || 0) / 100)).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="inline-flex items-center px-2 py-1 text-xs font-medium uppercase"
                            style={{ 
                              backgroundColor: BOOKING_STATUS_COLORS[booking.status],
                              color: '#000'
                            }}
                          >
                            {BOOKING_STATUS_LABELS[booking.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {modalOpen && (
        <BookingModal
          booking={selectedBooking}
          initialDate={selectedDate}
          djs={djs}
          userRole={userRole}
          currentDJId={currentDJId}
          onClose={() => setModalOpen(false)}
          onSaved={handleBookingSaved}
        />
      )}
    </div>
  );
}
