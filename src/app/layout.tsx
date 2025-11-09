import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fira_Code } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const firaCode = Fira_Code({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Loan Manager',
  description: 'Daily collection loan management platform with customer, loan, and payment tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${firaCode.variable} font-sans bg-gradient-dark text-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
