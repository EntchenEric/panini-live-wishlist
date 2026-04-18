import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';

import { ToastContainer } from 'react-toastify';
import { Providers } from '@/components/providers';
import { ErrorBoundary } from '@/components/error-boundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panini Live Wishlist",
  description: "Track and manage your Panini comic wishlist with priorities, notes, and dependencies.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="de">
      <head>
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ErrorBoundary>
          {children}
          </ErrorBoundary>

        <ToastContainer
          position="bottom-left"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={true}
          rtl={false}
        />
        </Providers>
      </body>
    </html>
  );
}