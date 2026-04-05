'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Non mostrare navbar/footer per admin, guest e pulizie
  const isSpecialPage = pathname?.startsWith('/admin') || pathname?.startsWith('/guest') || pathname?.startsWith('/pulizie');

  if (isSpecialPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
