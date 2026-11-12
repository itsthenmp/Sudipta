import type { Metadata } from 'next';
import Invitation from '@/components/Invitation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itsthenmp.github.io/Sudipta/';
const pageUrl = new URL('wedding-invite/', siteUrl).toString();
const previewImage = new URL('wedding-invite-preview-v3.png', siteUrl).toString();
const title = 'Wedding Invite | Sudipta & Nitesh';
const description = 'Join us for the wedding of Sudipta and Nitesh on 14 February 2027 at JMS Villa.';

export const metadata: Metadata = {
 title,
 description,
 openGraph: {
  title,
  description,
  url: pageUrl,
  type: 'website',
  images: [{ url: previewImage, width: 1734, height: 907, alt: 'Wedding Invite' }],
 },
 twitter: {
  card: 'summary_large_image',
  title,
  description,
  images: [previewImage],
 },
};

export default function WeddingInvitePage() {
 return <Invitation/>;
}
