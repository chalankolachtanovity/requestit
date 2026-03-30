import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SoundQ",
  description: "Live song requests pre DJ-ov a eventy",
  icons: {
      icon: "/logo.png",
      apple: "/logo.png",
      shortcut: "/logo.png",
    },
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