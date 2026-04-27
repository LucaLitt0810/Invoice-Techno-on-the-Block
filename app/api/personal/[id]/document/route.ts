import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_FIELDS = ['nda_pdf', 'job_desc_pdf', 'data_storage_pdf'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');

    if (!field || !VALID_FIELDS.includes(field as typeof VALID_FIELDS[number])) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: employee, error } = await supabase
      .from('employees')
      .select(field)
      .eq('id', params.id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const pdfData = (employee as Record<string, string | null>)[field];

    if (!pdfData) {
      return NextResponse.json({ error: 'No PDF found' }, { status: 404 });
    }

    // Extract base64 data (remove data:application/pdf;base64, prefix if present)
    const base64 = pdfData.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64, 'base64');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${field}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
}
