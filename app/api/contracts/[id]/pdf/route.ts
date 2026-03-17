import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Use puppeteer-core with chromium for Vercel
let chromium: any;
let puppeteer: any;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let browser;
  
  try {
    // Dynamic import for serverless compatibility
    chromium = await import('@sparticuz/chromium');
    puppeteer = await import('puppeteer-core');
    
    const supabase = createClient();
    
    // Get contract with related data
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        company:companies(*),
        customer:customers(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !contract) {
      console.error('Contract fetch error:', error);
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: contract.currency || 'EUR',
      }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
      return date ? new Date(date).toLocaleDateString('de-DE') : '-';
    };

    // Get contract type label
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'booking_offer': 'BOOKING OFFER',
        'booking_confirmation': 'BOOKING CONFIRMATION',
        'booking_rejection': 'BOOKING INFORMATION',
        'custom': 'CONTRACT',
      };
      return labels[type] || 'CONTRACT';
    };

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contract ${contract.contract_number}</title>
  <style>
    @page { 
      margin: 40px; 
      size: A4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica', 'Arial', sans-serif; 
      font-size: 11pt; 
      line-height: 1.5; 
      color: #333;
      background: #fff;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #000;
    }
    .logo { max-height: 60px; }
    .contract-type {
      font-size: 24pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #000;
    }
    .contract-number {
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .party {
      width: 45%;
    }
    .party-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 10px;
    }
    .party-name {
      font-weight: bold;
      font-size: 13pt;
      margin-bottom: 5px;
    }
    .party-details {
      font-size: 10pt;
      color: #333;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    .detail-item {
      margin-bottom: 15px;
    }
    .detail-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 5px;
    }
    .detail-value {
      font-weight: bold;
      font-size: 12pt;
    }
    .fee-box {
      background: #f5f5f5;
      padding: 20px;
      border: 2px solid #000;
      margin: 20px 0;
    }
    .fee-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ddd;
    }
    .fee-row:last-child {
      border-bottom: none;
      font-size: 14pt;
      font-weight: bold;
    }
    .terms {
      white-space: pre-line;
      font-size: 10pt;
      line-height: 1.6;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 10px;
      font-size: 10pt;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      ${contract.company?.logo_url ? `<img src="${contract.company.logo_url}" class="logo" alt="Logo">` : ''}
      <h1 class="contract-type">${getTypeLabel(contract.contract_type)}</h1>
      <p class="contract-number">Contract No. ${contract.contract_number}</p>
    </div>

  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <p class="party-label">Provider</p>
      <p class="party-name">${contract.company?.name || ''}</p>
      <div class="party-details">
        <p>${contract.company?.street || ''}</p>
        <p>${contract.company?.postal_code || ''} ${contract.company?.city || ''}</p>
        <p>${contract.company?.country || ''}</p>
        <p style="margin-top: 10px;">${contract.company?.email || ''}</p>
        ${contract.company?.phone ? `<p>${contract.company.phone}</p>` : ''}
        ${contract.company?.vat_id ? `<p>VAT: ${contract.company.vat_id}</p>` : ''}
      </div>
    </div>
    <div class="party">
      <p class="party-label">Client</p>
      <p class="party-name">${contract.customer?.company_name || ''}</p>
      ${contract.customer?.contact_person ? `<p>${contract.customer.contact_person}</p>` : ''}
      <div class="party-details">
        <p>${contract.customer?.street || ''}</p>
        <p>${contract.customer?.postal_code || ''} ${contract.customer?.city || ''}</p>
        <p>${contract.customer?.country || ''}</p>
        <p style="margin-top: 10px;">${contract.customer?.email || ''}</p>
      </div>
    </div>
  </div>

  <!-- Subject -->
  <div class="section">
    <h2 class="section-title">Subject</h2>
    <p style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">${contract.title}</p>
    ${contract.event_description ? `<p class="terms">${contract.event_description}</p>` : ''}
  </div>

  <!-- Event Details -->
  <div class="section">
    <h2 class="section-title">Event Details</h2>
    <div class="details-grid">
      <div class="detail-item">
        <p class="detail-label">Event Date</p>
        <p class="detail-value">${formatDate(contract.event_date)}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">Location</p>
        <p class="detail-value">${contract.event_location || 'TBD'}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">Valid Until</p>
        <p class="detail-value">${formatDate(contract.valid_until)}</p>
      </div>
    </div>
  </div>

  <!-- Payment Terms -->
  <div class="section">
    <h2 class="section-title">Payment Terms</h2>
    <div class="fee-box">
      <div class="fee-row">
        <span>Total Fee</span>
        <span>${formatCurrency(contract.fee)}</span>
      </div>
      <div class="fee-row">
        <span>Deposit (${formatDate(contract.deposit_due)})</span>
        <span>${formatCurrency(contract.deposit || 0)}</span>
      </div>
      <div class="fee-row">
        <span>Final Payment (${formatDate(contract.final_payment_due)})</span>
        <span>${formatCurrency(contract.fee - (contract.deposit || 0))}</span>
      </div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  ${contract.cancellation_terms ? `
  <div class="section">
    <h2 class="section-title">Cancellation Terms</h2>
    <p class="terms">${contract.cancellation_terms}</p>
  </div>
  ` : ''}

  ${contract.technical_requirements ? `
  <div class="section">
    <h2 class="section-title">Technical Requirements</h2>
    <p class="terms">${contract.technical_requirements}</p>
  </div>
  ` : ''}

  ${contract.notes ? `
  <div class="section">
    <h2 class="section-title">Additional Notes</h2>
    <p class="terms">${contract.notes}</p>
  </div>
  ` : ''}

  <!-- Signatures -->
  <div class="section" style="page-break-before: always;">
    <h2 class="section-title">Signatures</h2>
    <div class="signature-area">
      <div class="signature-box">
        <p class="detail-label">Provider</p>
        <div class="signature-line">
          ${contract.company?.name}<br>
          Date: ________________
        </div>
      </div>
      <div class="signature-box">
        <p class="detail-label">Client</p>
        <div class="signature-line">
          ${contract.customer?.company_name}<br>
          Date: ________________
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This contract was generated electronically and is valid without signature.</p>
    <p>Contract created on ${formatDate(contract.created_at)}</p>
  </div>
</body>
</html>
    `;

    // Launch browser with chromium for serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${contract.contract_number}.pdf"`,
      },
    });
  } catch (error: any) {
    if (browser) await browser.close();
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
