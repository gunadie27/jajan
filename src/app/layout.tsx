import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Poppins, PT_Sans } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "next-themes";

// Font optimization dengan next/font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: "Maujajan POS",
  description: "Point of Sale system for Maujajan",
  metadataBase: new URL('https://app.maujajan.id'),
  openGraph: {
    title: "Maujajan POS",
    description: "Point of Sale system for Maujajan",
  },
  other: {
    'theme-color': '#3F51B5',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${ptSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Preconnect untuk origins penting */}
        <link rel="preconnect" href="https://app.maujajan.id" />
        <link rel="preconnect" href="https://geqebteyoseuvcmpvimp.supabase.co" />
        <link rel="dns-prefetch" href="https://placehold.co" />
        
        {/* Preload critical CSS */}
        <link rel="preload" href="/globals.css" as="style" />
        
        {/* Preload critical images */}
        <link rel="preload" href="/favicon.ico" as="image" type="image/x-icon" />
        
        {/* DNS prefetch untuk external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
