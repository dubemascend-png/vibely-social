import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'vibe.ly — Find Your People. Feel the Vibe.',
  description: 'Discover people, share your moments, and find your local community on vibe.ly.',
  applicationName: 'vibe.ly',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'vibe.ly' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7257ff',
};
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
