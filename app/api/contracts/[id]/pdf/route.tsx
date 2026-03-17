import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  brandSub: {
    fontSize: 10,
  },
  contractType: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  contractNumber: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  parties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  party: {
    width: '48%',
  },
  partyLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  partyText: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    marginRight: 20,
  },
  detailLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  feeBox: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 10,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  feeRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
    marginTop: 5,
  },
  feeLabel: {
    fontSize: 11,
  },
  feeValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  terms: {
    fontSize: 10,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  signatureSection: {
    marginTop: 50,
    pageBreakBefore: 'always',
  },
  signatureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 40,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 60,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureDate: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    marginTop: 60,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#666',
  },
});

const ContractPDF = ({ contract }: { contract: any }) => {
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
  const formatCurrency = (amount: number) => {
    const currency = contract.currency || 'EUR';
    return `${amount.toFixed(2)} ${currency}`;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'booking_offer': 'BOOKING OFFER',
      'booking_confirmation': 'BOOKING CONFIRMATION',
      'booking_rejection': 'BOOKING INFORMATION',
      'custom': 'CONTRACT',
    };
    return labels[type] || 'CONTRACT';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brand}>Techno on the Block</Text>
              <Text style={styles.brandSub}>Invoice Center</Text>
            </View>
          </View>
          <Text style={styles.contractType}>{getTypeLabel(contract.contract_type)}</Text>
          <Text style={styles.contractNumber}>Contract No. {contract.contract_number}</Text>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Provider</Text>
            <Text style={styles.partyName}>{contract.company?.name}</Text>
            <Text style={styles.partyText}>{contract.company?.street}</Text>
            <Text style={styles.partyText}>{contract.company?.postal_code} {contract.company?.city}</Text>
            <Text style={styles.partyText}>{contract.company?.country}</Text>
            <Text style={styles.partyText}>{contract.company?.email}</Text>
            {contract.company?.vat_id && (
              <Text style={styles.partyText}>VAT: {contract.company.vat_id}</Text>
            )}
          </View>

          <View style={styles.party}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>{contract.customer?.company_name}</Text>
            {contract.customer?.contact_person && (
              <Text style={styles.partyText}>{contract.customer.contact_person}</Text>
            )}
            <Text style={styles.partyText}>{contract.customer?.street}</Text>
            <Text style={styles.partyText}>{contract.customer?.postal_code} {contract.customer?.city}</Text>
            <Text style={styles.partyText}>{contract.customer?.country}</Text>
            <Text style={styles.partyText}>{contract.customer?.email}</Text>
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject</Text>
          <Text style={styles.subjectTitle}>{contract.title}</Text>
          {contract.event_description && (
            <Text style={styles.text}>{contract.event_description}</Text>
          )}
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Event Date</Text>
              <Text style={styles.detailValue}>{formatDate(contract.event_date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{contract.event_location || 'TBD'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Valid Until</Text>
              <Text style={styles.detailValue}>{formatDate(contract.valid_until)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          <View style={styles.feeBox}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Total Fee</Text>
              <Text style={styles.feeValue}>{formatCurrency(contract.fee)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Deposit ({formatDate(contract.deposit_due)})</Text>
              <Text style={styles.feeValue}>{formatCurrency(contract.deposit || 0)}</Text>
            </View>
            <View style={styles.feeRowLast}>
              <Text style={styles.feeLabel}>Final Payment ({formatDate(contract.final_payment_due)})</Text>
              <Text style={styles.feeValue}>{formatCurrency(contract.fee - (contract.deposit || 0))}</Text>
            </View>
          </View>
        </View>

        {/* Cancellation Terms */}
        {contract.cancellation_terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Terms</Text>
            <Text style={styles.terms}>{contract.cancellation_terms}</Text>
          </View>
        )}

        {/* Technical Requirements */}
        {contract.technical_requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Requirements</Text>
            <Text style={styles.terms}>{contract.technical_requirements}</Text>
          </View>
        )}

        {/* Notes */}
        {contract.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.text}>{contract.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This contract was generated electronically.</Text>
          <Text style={styles.footerText}>Contract created on {formatDate(contract.created_at)}</Text>
        </View>
      </Page>

      {/* Signatures Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>Signatures</Text>
          <View style={styles.signatures}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Provider</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureName}>{contract.company?.name}</Text>
                <Text style={styles.signatureDate}>Date: ________________</Text>
              </View>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Client</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureName}>{contract.customer?.company_name}</Text>
                <Text style={styles.signatureDate}>Date: ________________</Text>
              </View>
            </View>
          </View>
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
    
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`*, company:companies(*), customer:customers(*)`)
      .eq('id', params.id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const pdfDoc = <ContractPDF contract={contract} />;
    const stream = await renderToStream(pdfDoc);
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${contract.contract_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
