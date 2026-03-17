# Techno on the Block Invoice Center

A complete SaaS-ready invoice management web application built with Next.js and Supabase.

## Features

- **Multi-tenant Architecture**: Each user manages their own data independently
- **Company Management**: Create and manage multiple company profiles
- **Customer Management**: Store and manage customer information
- **Invoice Creation**: Professional invoice creation with auto-numbering
- **Tax System**: Support for 19% VAT, 7% VAT, reverse charge, and small business regulation
- **Product/Service Database**: Reusable products for quick invoice creation
- **PDF Generation**: Download invoices as PDF
- **Email Integration**: Send invoices directly to customers
- **Dashboard**: Revenue tracking and business analytics
- **Accounting Export**: CSV and DATEV format exports
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Charts**: Recharts
- **PDF**: Puppeteer

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- SMTP server (for email)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd invoice-app
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your:
   - Project URL
   - Anon Key
   - Service Role Key

3. Run the database migrations:
   - Go to SQL Editor in Supabase Dashboard
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

4. Set up Storage:
   - Go to Storage in Supabase Dashboard
   - Create a new bucket called `company-logos`
   - Set bucket to public
   - Add policy to allow authenticated users to upload

### 3. Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SMTP (for email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourapp.com
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
npm run build
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and create a new project
2. Import your GitHub repository
3. Configure environment variables (same as `.env.local`)
4. Deploy!

### 3. Update Supabase Auth Settings

After deployment:

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set Site URL to your Vercel domain
3. Add your Vercel domain to Redirect URLs

## Database Schema

### Tables

- **companies**: Company profiles
- **customers**: Customer data
- **products**: Product/service catalog
- **invoices**: Invoice headers
- **invoice_items**: Invoice line items
- **payments**: Payment records
- **invoice_sequences**: Auto-increment counters

### Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data.

## Invoice Numbering

Invoice numbers follow the format: `YYYY-XXXX`

- Numbers increment automatically
- Reset each year
- Unique per company

## Tax Options

- **19% VAT**: Standard German VAT rate
- **7% VAT**: Reduced German VAT rate
- **Reverse Charge**: 0% VAT for EU B2B
- **No VAT**: Small business regulation

## API Routes

- `/api/invoices/[id]/pdf` - Generate PDF
- `/api/invoices/[id]/send` - Send via email
- `/api/export` - Export accounting data

## Customization

### Adding New Tax Rates

Edit `types/index.ts`:

```typescript
export const TAX_OPTIONS: { value: TaxType; label: string; rate: number }[] = [
  { value: 'vat_19', label: '19% VAT', rate: 19 },
  { value: 'vat_7', label: '7% VAT', rate: 7 },
  { value: 'your_new_tax', label: 'New Tax', rate: 10 },
  // ...
];
```

### Customizing Invoice Template

Edit `app/api/invoices/[id]/pdf/route.ts` to customize the PDF layout.

## Security Considerations

1. **Never commit `.env.local` to git**
2. **Use strong passwords for Supabase**
3. **Enable 2FA on all accounts**
4. **Regularly rotate API keys**

## Troubleshooting

### PDF Generation Issues

For production PDF generation, consider using:
- Puppeteer with a serverless function
- External PDF service like DocRaptor
- Client-side PDF generation with jsPDF

### Email Delivery

If emails aren't sending:
1. Check SMTP credentials
2. Verify firewall rules
3. Check spam folders
4. Use a transactional email service like SendGrid

## License

MIT License - feel free to use for commercial projects.

## Support

For issues and feature requests, please open an issue on GitHub.
