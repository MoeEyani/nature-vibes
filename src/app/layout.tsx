import type { Metadata } from "next";
import { BRAND } from "@/constants/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.configuratorName} — MVP`,
    template: `%s · ${BRAND.projectName}`,
  },
  description:
    "Design a modular Nature Vibes pavilion: location, structure, roof, seating, aquarium, planting and add-ons — with live pricing and design validation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
