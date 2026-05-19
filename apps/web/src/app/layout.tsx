import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrainLens',
  description: 'Free, multi-source fitness analytics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
