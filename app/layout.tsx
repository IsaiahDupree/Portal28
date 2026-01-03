import "./globals.css";
import { MetaPixel } from "@/lib/meta/MetaPixel";

export const metadata = {
  title: "Portal28 Academy",
  description: "Courses by Sarah Ashley — built for results."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
