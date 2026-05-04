import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Techno on the Block Workspace',
  description: 'Create, manage, and send professional invoices. Track payments and export accounting data.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-900 text-white min-h-screen`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111111',
              color: '#fff',
              border: '1px solid #333',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#000',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#000',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
