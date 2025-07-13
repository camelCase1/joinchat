import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from 'react-hot-toast';

import { TRPCReactProvider } from "~/trpc/react";
import { AuthProvider } from "~/contexts/AuthContext";
import { initializeDatabase } from "~/lib/initializeDb";

// Initialize database on app start
initializeDatabase();

export const metadata: Metadata = {
  title: "Join.Chat - Topic-based conversations",
  description: "Community-owned, AI-moderated messaging platform for focused discussions",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
