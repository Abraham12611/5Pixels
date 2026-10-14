import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SkipLink, RouteFocus } from "@/components/ui/skip-link";
import { CookieConsentProvider } from "@/components/consent/cookie-consent-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "5Pixels — Pick the look. Upload your photo. We handle the rest.",
  description:
    "Curated AI image transformations. No prompts required.",
};

export const viewport: Viewport = {
  themeColor: "#080a08",
  colorScheme: "dark",
  viewportFit: "cover",
  // BlockNote mobile compat: lets the on-screen keyboard resize the viewport
  // so the article editor's menus/trackers stay visible (blocknotejs.org docs).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink-950 text-text-primary">
        <CookieConsentProvider>
          <SkipLink />
          <RouteFocus />
          {children}
        </CookieConsentProvider>
      </body>
    </html>
  );
}
