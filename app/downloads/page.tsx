import Link from 'next/link';

export const metadata = {
  title: 'Download Vibe.ly apps',
  description: 'Download the Vibe.ly social app or administrative app for Android.',
};

export default function DownloadsPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px', background: '#0b0a14', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#b9aaff', textDecoration: 'none' }}>← Back to Vibe.ly</Link>
        <div style={{ marginTop: 32, padding: 28, border: '1px solid #30284a', borderRadius: 24, background: 'linear-gradient(145deg, #171329, #100f1c)' }}>
          <p style={{ color: '#b9aaff', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>VIBE.LY FOR ANDROID</p>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: '12px 0' }}>Get the app that fits you.</h1>
          <p style={{ color: '#c5c0d5', lineHeight: 1.7 }}>Download the Android installer directly to your device. These apps need an internet connection to use Vibe.ly.</p>
          <section style={{ marginTop: 28, display: 'grid', gap: 16 }}>
            <article style={{ padding: 20, border: '1px solid #3d3459', borderRadius: 18, background: '#171426' }}>
              <h2 style={{ fontSize: 21, margin: '0 0 8px' }}>Vibe.ly Social</h2>
              <p style={{ color: '#c5c0d5', margin: '0 0 18px', lineHeight: 1.6 }}>For members: discover people, share posts, message and connect.</p>
              <a href="https://github.com/dubemascend-png/vibely-social/releases/latest/download/Vibe-ly-Social.apk" download style={{ display: 'inline-block', background: '#8065ff', color: '#fff', padding: '13px 18px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>Download Social APK ↓</a>
            </article>
            <article style={{ padding: 20, border: '1px solid #3d3459', borderRadius: 18, background: '#171426' }}>
              <h2 style={{ fontSize: 21, margin: '0 0 8px' }}>Vibe.ly Admin</h2>
              <p style={{ color: '#c5c0d5', margin: '0 0 18px', lineHeight: 1.6 }}>For authorized administrators to review reports and manage platform safety. Admin access is still required to sign in.</p>
              <a href="https://github.com/dubemascend-png/vibely-social/releases/latest/download/Vibe-ly-Admin.apk" download style={{ display: 'inline-block', background: '#29243c', color: '#fff', padding: '13px 18px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid #51466f' }}>Download Admin APK ↓</a>
            </article>
          </section>
          <p style={{ color: '#a8a2b9', fontSize: 13, lineHeight: 1.6, marginTop: 22 }}>Android may ask you to allow installation from this browser. Only install APKs downloaded from your trusted Vibe.ly website. If an installer fails, check that the download completed fully and try again.</p>
        </div>
      </div>
    </main>
  );
}
