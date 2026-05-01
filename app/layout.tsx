import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UD Dokar ERP",
  description: "Sistem Manajemen Gudang & Produksi Kardus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-black`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
