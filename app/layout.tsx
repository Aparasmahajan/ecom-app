import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'CustomWear — Custom Clothing',
  description: 'Hand-crafted custom clothing store'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Header />
          <main className="container view">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
