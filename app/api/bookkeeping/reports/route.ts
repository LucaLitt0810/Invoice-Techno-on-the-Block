import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month');

    const supabase = createClient();

    let startDate: string;
    let endDate: string;

    if (month) {
      const m = parseInt(month);
      const y = parseInt(year);
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Fetch transactions for period
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    const txs = transactions || [];

    // Calculate totals
    const income = txs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const expenses = txs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const profit = income - expenses;

    // Category breakdown
    const byCategory: Record<string, { name: string; type: string; color: string; amount: number }> = {};
    for (const t of txs) {
      const cat = t.category;
      if (!cat) continue;
      const key = cat.id;
      if (!byCategory[key]) {
        byCategory[key] = { name: cat.name, type: cat.type, color: cat.color, amount: 0 };
      }
      byCategory[key].amount += t.amount || 0;
    }

    // Monthly breakdown (if yearly report)
    const byMonth: Record<string, { income: number; expenses: number }> = {};
    if (!month) {
      for (let i = 1; i <= 12; i++) {
        byMonth[String(i).padStart(2, '0')] = { income: 0, expenses: 0 };
      }
      for (const t of txs) {
        const m = t.date?.substring(5, 7);
        if (!m || !byMonth[m]) continue;
        if (t.type === 'income') byMonth[m].income += t.amount || 0;
        else byMonth[m].expenses += t.amount || 0;
      }
    }

    // Receipt stats
    const { data: receipts } = await supabase
      .from('receipts')
      .select('status');

    const receiptStats = {
      total: receipts?.length || 0,
      unprocessed: receipts?.filter((r: any) => r.status === 'unprocessed').length || 0,
      reviewed: receipts?.filter((r: any) => r.status === 'reviewed').length || 0,
      assigned: receipts?.filter((r: any) => r.status === 'assigned').length || 0,
    };

    return NextResponse.json({
      period: { year, month },
      summary: { income, expenses, profit },
      byCategory: Object.values(byCategory),
      byMonth: Object.entries(byMonth).map(([m, v]) => ({ month: m, ...v })),
      receiptStats,
      transactionCount: txs.length,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
