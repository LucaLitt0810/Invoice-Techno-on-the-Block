import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Fetch all bookings (with optional DJ filter)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const djId = searchParams.get('dj_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Check user role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = user.user_metadata?.role || 'admin';
    
    // Build select query - handle potential customer join issues
    let selectQuery = `
      *,
      dj:djs(*)
    `;
    
    // Try to join customer data if customer_id column exists
    try {
      const { data: testData } = await supabase
        .from('bookings')
        .select('customer_id')
        .limit(1);
      
      if (testData !== null) {
        selectQuery += `,customer:customers(id, company_name, contact_person)`;
      }
    } catch (e) {
      // Column doesn't exist, skip customer join
    }
    
    let query = supabase
      .from('bookings')
      .select(selectQuery)
      .order('start_date', { ascending: true });
    
    // DJ role: only see own bookings
    if (role === 'dj') {
      const { data: djData } = await supabase
        .from('djs')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (djData) {
        query = query.eq('dj_id', djData.id);
      }
    }
    
    // Optional filters
    if (djId && role !== 'dj') {
      query = query.eq('dj_id', djId);
    }
    
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('end_date', endDate);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
    
    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error('Error in bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new booking
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dj_id, event_name, start_date, end_date, location, client_name, fee, provision, status, notes } = body;
    
    if (!dj_id || !event_name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check for conflicts
    const { data: conflictCheck } = await supabase.rpc('check_booking_conflict', {
      p_dj_id: dj_id,
      p_start_date: start_date,
      p_end_date: end_date,
    });
    
    if (conflictCheck) {
      return NextResponse.json({ error: 'Booking conflict detected for this DJ' }, { status: 409 });
    }
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        dj_id,
        event_name,
        start_date,
        end_date,
        location,
        client_name,
        fee: fee || 0,
        provision: provision || 0,
        status: status || 'request',
        notes,
        user_id: user.id,
      })
      .select(`
        *,
        dj:djs(*)
      `)
      .single();
    
    if (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ booking, message: 'Booking created successfully' });
  } catch (error: any) {
    console.error('Error in bookings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
