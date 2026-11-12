import type { Metadata } from 'next';
import './globals.css';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itsthenmp.github.io/Sudipta/';
const previewImage = new URL('wedding-invite-preview-v2.png', siteUrl).toString();
export const metadata: Metadata = {
 metadataBase: new URL(siteUrl),
 title: 'Wedding Invite | Sudipta & Nitesh',
 description: 'Join us for the wedding of Sudipta and Nitesh on 14 February 2027 at JMS Villa.',
 openGraph: {
  title: 'Wedding Invite | Sudipta & Nitesh',
  description: 'Join us for the wedding of Sudipta and Nitesh on 14 February 2027 at JMS Villa.',
  url: siteUrl,
  type: 'website',
  images: [{ url: previewImage, width: 1734, height: 907, alt: 'Wedding Invite' }],
 },
 twitter: {
  card: 'summary_large_image',
  title: 'Wedding Invite | Sudipta & Nitesh',
  description: 'Join us for the wedding of Sudipta and Nitesh on 14 February 2027 at JMS Villa.',
  images: [previewImage],
 },
 icons: { icon: `${basePath}/photos/ns-monogram-transparent.png` },
};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><head><style>{`:where(html,body){margin:0;background:#140d0a}:where(.photo-opening){position:relative;width:100%;max-width:540px;margin:auto;height:100dvh;min-height:100dvh;overflow:hidden;background:#140d0a}:where(.reference-opening){position:absolute;inset:0;display:grid;place-items:center;background:#140d0a}:where(.reference-frame){position:relative;width:min(100%,calc(100dvh * .7143));aspect-ratio:1060/1484}:where(.gate,.seal-image,.invitation-reveal){visibility:hidden}:where(.reference-seal){position:absolute;left:50.8%;top:48.7%;transform:translate(-50%,-50%);width:19%;height:15%;border:0;border-radius:50%;background:transparent;cursor:pointer}:where(.sr-only){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}:where(.skip){position:absolute;right:24px;bottom:24px;color:#fff;background:#281713aa;padding:10px;z-index:10}`}</style></head><body>{children}</body></html>; }
