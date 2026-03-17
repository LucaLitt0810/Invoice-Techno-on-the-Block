import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Document, Page, Text, View, StyleSheet, PDFRenderer } from '@react-pdf/renderer';
import { renderToStream } from '@react-pdf/renderer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  invoiceTo: {
    textAlign: 'right',
    flex: 1,
  },
  invoiceToLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 5,
  },
  invoiceToName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  invoiceToAddress: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  tableHeaderText: {
    fontSize: 9,
    color: '#666',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  description: {
    flex: 2,
  },
  qty: {
    flex: 0.5,
    textAlign: 'center',
  },
  price: {
    flex: 1,
    textAlign: 'right',
  },
  total: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  totalLabel: {
    width: 100,
    textAlign: 'right',
    paddingRight: 20,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  grandTotalLabel: {
    width: 100,
    textAlign: 'right',
    paddingRight: 20,
    fontWeight: 'bold',
    fontSize: 12,
  },
  grandTotalValue: {
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 10,
    marginBottom: 3,
  },
  footerSmall: {
    fontSize: 8,
    color: '#666',
    marginTop: 10,
  },
  paymentPage: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 3,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 40,
  },
  paymentBox: {
    width: '80%',
    borderWidth: 2,
    borderColor: '#000',
    padding: 30,
    backgroundColor: '#fafafa',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  paymentLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  paymentValue: {
    fontSize: 11,
  },
  paymentFooter: {
    marginTop: 40,
    alignItems: 'center',
  },
  paymentFooterText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
});

const InvoicePDF = ({ invoice }: { invoice: any }) => {
  const currency = invoice.currency || 'EUR';
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
  
  return (
    <Document>
      {/* Main Invoice Page */}
      <Page size="A4" style={styles.page}>
        {/* Header with company info */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{invoice.company?.name}</Text>
            <Text style={styles.companyAddress}>{invoice.company?.street}</Text>
            <Text style={styles.companyAddress}>{invoice.company?.postal_code} {invoice.company?.city}</Text>
            <Text style={styles.companyAddress}>{invoice.company?.country}</Text>
            <Text style={styles.companyAddress}>{invoice.company?.email}</Text>
          </View>
          
          <View style={styles.invoiceTo}>
            <Text style={styles.invoiceToLabel}>INVOICE TO:</Text>
            <Text style={styles.invoiceToName}>{invoice.customer?.company_name}</Text>
            <Text style={styles.invoiceToAddress}>{invoice.customer?.street}</Text>
            <Text style={styles.invoiceToAddress}>{invoice.customer?.postal_code} {invoice.customer?.city}</Text>
            <Text style={styles.invoiceToAddress}>{invoice.customer?.country}</Text>
            {invoice.customer?.contact_person && (
              <Text style={styles.invoiceToAddress}>Attn: {invoice.customer.contact_person}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>INVOICE</Text>
        <View style={styles.divider} />

        {/* Invoice Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>INVOICE NUMBER</Text>
            <Text style={styles.infoValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>INVOICE DATE</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.invoice_date)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>DUE DATE</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.due_date)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>STATUS</Text>
            <Text style={styles.infoValue}>{invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.description]}>DESCRIPTION</Text>
          <Text style={[styles.tableHeaderText, styles.qty]}>QTY</Text>
          <Text style={[styles.tableHeaderText, styles.price]}>PRICE</Text>
          <Text style={[styles.tableHeaderText, styles.total]}>TOTAL</Text>
        </View>

        {invoice.items?.map((item: any, idx: number) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Text style={styles.price}>{item.price.toFixed(2)} {currency}</Text>
            <Text style={styles.total}>{item.total.toFixed(2)} {currency}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{invoice.subtotal.toFixed(2)} {currency}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({invoice.tax_rate}%)</Text>
            <Text style={styles.totalValue}>{invoice.tax.toFixed(2)} {currency}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{invoice.total.toFixed(2)} {currency}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>Questions? Contact: {invoice.company?.email}</Text>
          <Text style={styles.footerSmall}>Payment information on next page</Text>
        </View>
      </Page>

      {/* Payment Information Page */}
      <Page size="A4" style={styles.paymentPage}>
        <Text style={styles.paymentTitle}>PAYMENT INFORMATION</Text>
        <Text style={styles.paymentSubtitle}>Invoice {invoice.invoice_number}</Text>
        
        <View style={styles.paymentBox}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>INVOICE NUMBER</Text>
            <Text style={styles.paymentValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>AMOUNT DUE</Text>
            <Text style={styles.paymentValue}>{invoice.total.toFixed(2)} {currency}</Text>
          </View>
          {invoice.company?.bank_name && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>BANK NAME</Text>
              <Text style={styles.paymentValue}>{invoice.company.bank_name}</Text>
            </View>
          )}
          {invoice.company?.iban && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>IBAN</Text>
              <Text style={styles.paymentValue}>{invoice.company.iban}</Text>
            </View>
          )}
          {invoice.company?.bic && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>BIC</Text>
              <Text style={styles.paymentValue}>{invoice.company.bic}</Text>
            </View>
          )}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>REFERENCE</Text>
            <Text style={styles.paymentValue}>{invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={styles.paymentFooter}>
          <Text style={styles.paymentFooterText}>Please use the invoice number as payment reference.</Text>
          <Text style={styles.paymentFooterText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`*, company:companies(*), customer:customers(*), items:invoice_items(*)`)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfDoc = <InvoicePDF invoice={invoice} />;
    const stream = await renderToStream(pdfDoc);
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
