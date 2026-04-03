import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hubieras Ahorrado",
  description: "Rastrea tus gastos y administra tus finanzas personales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    borderLeft: '4px solid #10b981',
                  },
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    borderLeft: '4px solid #ef4444',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
