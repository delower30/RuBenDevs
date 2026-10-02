import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool',
  description: 'Shared electric 3-wheeler ride-pooling system for Dhaka. Sub-second matching and deterministic integer poysha fare calculation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-emerald-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
