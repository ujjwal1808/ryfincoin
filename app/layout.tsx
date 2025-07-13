import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

import { headers } from 'next/headers'
import ContextProvider from '@/context'
import { createAppKit } from '@reown/appkit/react'
import Head from 'next/head'
import Script from 'next/script'

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ryfin Presale',
  description: 'RYFIN Global Exchange - Learn While You Earn. Join the presale of RYFN tokens and be part of the future of digital finance.',
  icons: {
    icon: '/assets/ryfin-coin.svg',
    apple: '/assets/ryfin-coin.svg',
  },
  openGraph: {
    title: 'Ryfin Presale - Join the Future of Digital Finance',
    description: 'RYFIN Global Exchange - Learn While You Earn. Join the presale of RYFN tokens and be part of the future of digital finance.',
    url: 'https://ryfin-demo.onrender.com/',
    siteName: 'RYFIN Global Exchange',
    images: [
      {
        url: '/assets/ryfin-logo.svg',
        width: 800,
        height: 600,
        alt: 'RYFIN Global Exchange Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
  alternates: {
    canonical: 'https://ryfin-demo.onrender.com/',
  },
}

// Initialize AppKit in client component
// We'll create a client component wrapper for AppKit

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersObj = headers()
  const cookies = headersObj.get('cookie')

  return (
    <html lang="en" className={outfit.className}>
      <Head>
        <Script>

          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PP7D9HMB');`}
        </Script>

      </Head>
      <body>
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-KEES7JXL2G" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KEES7JXL2G');
          `}
        </Script>
        
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PP7D9HMB"
height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}></iframe></noscript>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  )
}
