import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Fetch all DJs
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const activeOnly = searchParams.get('active') !== 'false';
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let query = supabase
      .from('djs')
      .select('*')
      .order('name', { ascending: true });
    
    if (activeOnly) {
      query = query.eq('active', true);
    }
    
    const { data: djs, error } = await query;
    
    if (error) {
      console.error('Error fetching DJs:', error);
      return NextResponse.json({ error: 'Failed to fetch DJs' }, { status: 500 });
    }
    
    return NextResponse.json({ djs });
  } catch (error: any) {
    console.error('Error in DJs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new DJ
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dj_code, name, email, phone, genre, bio, rate_per_hour, user_id, active } = body;
    
    if (!dj_code || !name) {
      return NextResponse.json({ error: 'DJ ID and Name are required' }, { status: 400 });
    }
    
    const { data: dj, error } = await supabase
      .from('djs')
      .insert({
        dj_code: dj_code.toUpperCase(),
        name,
        email,
        phone,
        genre,
        bio,
        rate_per_hour: rate_per_hour || 0,
        user_id,
        active: active !== undefined ? active : true,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating DJ:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ dj, message: 'DJ created successfully' });
  } catch (error: any) {
    console.error('Error in DJs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
