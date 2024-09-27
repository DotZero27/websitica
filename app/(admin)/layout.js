import "./../globals.css";

import localFont from "next/font/local";
import { Spicy_Rice } from "next/font/google";

const geistSans = localFont({
  src: "./../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const spicyRice = Spicy_Rice({
  weight: ["400"],
  variable: "--font-spicyRice",
  subsets: ["latin"],
});

export const metadata = {
  title: "Websitica Admin",
  description: "admin",
};

export default async function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} ${spicyRice.variable}`}>
        {children}
      </body>
    </html>
  );
}
