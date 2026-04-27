import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const category_id = searchParams.get('category_id');
    const status = searchParams.get('status');

    const supabase = createClient();
    let query = supabase
      .from('transactions')
      .select('*, category:categories(*), receipt:receipts(*)')
      .order('date', { ascending: false });

    if (type) query = query.eq('type', type);
    if (category_id) query = query.eq('category_id', category_id);
    if (status) query = query.eq('status', status);
    if (year) {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      query = query.gte('date', start).lte('date', end);
    }
    if (month && year) {
      const start = `${year}-${month}-01`;
      const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('date', start).lte('date', end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createClient();

    const { data, error } = await (supabase.from('transactions') as any)
      .insert(body)
      .select('*, category:categories(*), receipt:receipts(*)')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
