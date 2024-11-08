import localFont from "next/font/local";
import { Spicy_Rice } from "next/font/google";

import "./../globals.css";
import Providers from "@/context/Providers";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const spicyRice = Spicy_Rice({
  weight: ["400"],
  variable: "--font-spicyRice",
  subsets: ["latin"],
});

export const metadata = {
  title: "Websitica",
  description: "Websitica",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} ${spicyRice.variable} bg-gradient-to-br from-blue-300 to-blue-600 overflow-hidden`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
