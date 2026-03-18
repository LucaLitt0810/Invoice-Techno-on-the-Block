import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Fetch unavailability for a DJ
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const djId = searchParams.get('dj_id');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = user.user_metadata?.role || 'admin';
    
    let query = supabase
      .from('dj_unavailability')
      .select(`
        *,
        dj:djs(*)
      `)
      .order('start_date', { ascending: true });
    
    // DJs can only see their own unavailability
    if (role === 'dj') {
      const { data: djData } = await supabase
        .from('djs')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (djData) {
        query = query.eq('dj_id', djData.id);
      } else {
        // DJ not found, return empty
        return NextResponse.json({ unavailability: [] });
      }
    } else if (djId) {
      // Non-DJs can filter by DJ ID
      query = query.eq('dj_id', djId);
    }
    
    const { data: unavailability, error } = await query;
    
    if (error) {
      console.error('Error fetching unavailability:', error);
      return NextResponse.json({ error: 'Failed to fetch unavailability' }, { status: 500 });
    }
    
    return NextResponse.json({ unavailability });
  } catch (error: any) {
    console.error('Error in unavailability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create unavailability
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dj_id, start_date, end_date, reason, type } = body;
    
    if (!dj_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { data: unavailability, error } = await supabase
      .from('dj_unavailability')
      .insert({
        dj_id,
        start_date,
        end_date,
        reason,
        type: type || 'vacation',
      })
      .select(`
        *,
        dj:djs(*)
      `)
      .single();
    
    if (error) {
      console.error('Error creating unavailability:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ unavailability, message: 'Unavailability created successfully' });
  } catch (error: any) {
    console.error('Error in unavailability POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
