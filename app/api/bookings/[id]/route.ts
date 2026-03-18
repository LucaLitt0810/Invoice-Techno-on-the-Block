import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dj_id, event_name, start_date, end_date, location, client_name, fee, status, notes } = body;
    
    // Check for conflicts if date changed
    if (dj_id && start_date && end_date) {
      const { data: conflictCheck } = await supabase.rpc('check_booking_conflict', {
        p_dj_id: dj_id,
        p_start_date: start_date,
        p_end_date: end_date,
        p_exclude_booking_id: params.id,
      });
      
      if (conflictCheck) {
        return NextResponse.json({ error: 'Booking conflict detected for this DJ' }, { status: 409 });
      }
    }
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        dj_id,
        event_name,
        start_date,
        end_date,
        location,
        client_name,
        fee,
        status,
        notes,
      })
      .eq('id', params.id)
      .select(`
        *,
        dj:djs(*)
      `)
      .single();
    
    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ booking, message: 'Booking updated successfully' });
  } catch (error: any) {
    console.error('Error in booking PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Partial update (for drag & drop)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { start_date, end_date } = body;
    
    if (start_date && end_date) {
      // Get current booking to check dj_id
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('dj_id')
        .eq('id', params.id)
        .single();
      
      if (currentBooking) {
        const { data: conflictCheck } = await supabase.rpc('check_booking_conflict', {
          p_dj_id: currentBooking.dj_id,
          p_start_date: start_date,
          p_end_date: end_date,
          p_exclude_booking_id: params.id,
        });
        
        if (conflictCheck) {
          return NextResponse.json({ error: 'Booking conflict detected for this DJ' }, { status: 409 });
        }
      }
    }
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .update(body)
      .eq('id', params.id)
      .select(`
        *,
        dj:djs(*)
      `)
      .single();
    
    if (error) {
      console.error('Error patching booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ booking, message: 'Booking updated successfully' });
  } catch (error: any) {
    console.error('Error in booking PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('Error deleting booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    console.error('Error in booking DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
