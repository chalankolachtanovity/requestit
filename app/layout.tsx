import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RequestIt",
  description: "Live song requests pre DJ-ov a eventy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}