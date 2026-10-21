import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = {
  title: 'Vibe.ly Admin',
  description: 'Secure Vibe.ly administration and community safety tools.',
  applicationName: 'Vibe.ly Admin',
  manifest: '/admin-manifest.webmanifest',
  icons: { icon: '/admin-icon.svg', apple: '/admin-icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Vibe.ly Admin' },
  robots: { index: false, follow: false }
};
export default function AdminLayout({children}:{children:React.ReactNode}) { return children; }
