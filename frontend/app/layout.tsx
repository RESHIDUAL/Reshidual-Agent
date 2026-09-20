import './globals.css';
import { ThemeProvider } from '@/theme/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ContextPanel from '@/components/layout/ContextPanel';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Reshidual Agent - Local-First AI',
  description: 'Sub-10ms local semantic search and autonomous engineering agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} font-body antialiased h-screen flex bg-surface text-on-surface overflow-hidden`}>
        <ThemeProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
            <TopBar />
            <main className="flex-1 overflow-hidden bg-surface relative z-0">
              {children}
            </main>
          </div>
          <ContextPanel />
        </ThemeProvider>
      </body>
    </html>
  );
}