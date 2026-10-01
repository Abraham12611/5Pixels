import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SkipLink, RouteFocus } from "@/components/ui/skip-link";
import "./globals.css";

const GROWSURF_CAMPAIGN_ID =
  process.env.NEXT_PUBLIC_GROWSURF_CAMPAIGN_ID ?? "whr2c0";

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
        <SkipLink />
        <RouteFocus />
        {children}
        {/* GrowSurf stays dormant but the universal script only makes sense
            on the production origin — on preview/ephemeral hosts it just
            throws "campaign not authorized" 403s into the console. */}
        {GROWSURF_CAMPAIGN_ID &&
        (process.env.VERCEL_ENV === "production" ||
          process.env.VERCEL_ENV === undefined) ? (
          <Script
            id="growsurf-universal"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(g,r,s,f){g.grsfSettings={campaignId:"${GROWSURF_CAMPAIGN_ID}",version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="https://app.growsurf.com/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);`,
            }}
          />
        ) : null}
      </body>
    </html>
  );
}
