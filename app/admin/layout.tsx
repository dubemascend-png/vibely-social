import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = { title: 'Vibe.ly Admin Control Center', robots: { index: false, follow: false } };
export default function AdminLayout({children}:{children:React.ReactNode}) { return children; }
