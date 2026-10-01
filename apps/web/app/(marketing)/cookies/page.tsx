import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cookie Notice — 5Pixels",
  description:
    "The cookies and browser storage 5Pixels uses: what they are, what they do, and how to control them.",
};

export default function CookieNoticePage() {
  return (
    <LegalPage
      title="Cookie Notice"
      lastUpdated="October 2, 2026"
      intro={
        <p>
          This Cookie Notice explains how 5Pixels uses cookies and similar
          browser storage. It is part of our{" "}
          <Link href="/privacy">Privacy Policy</Link>. We keep our tracking
          surface deliberately small: we use essential cookies to run the
          service and browser storage for preferences — and{" "}
          <strong>no third-party advertising or analytics trackers</strong>.
        </p>
      }
      sections={[
        {
          id: "what-are-cookies",
          title: "What are cookies?",
          body: (
            <p>
              Cookies are small text files a site stores in your browser.
              Similar technologies — such as <code>localStorage</code> — store
              small amounts of data on your device to remember preferences or
              keep features working.
            </p>
          ),
        },
        {
          id: "cookies-we-use",
          title: "Cookies we use",
          body: (
            <>
              <p>
                <strong>Strictly necessary.</strong> Required for the service to
                function. They cannot be switched off without breaking sign-in
                or security.
              </p>
              <ul>
                <li>
                  <strong>Authentication session</strong> (Supabase auth
                  cookies, e.g. <code>sb-*-auth-token</code>) — keeps you signed
                  in and secures your session. Expires with your session or
                  token lifetime.
                </li>
              </ul>
              <p>
                <strong>Functional.</strong> Optional cookies that improve the
                experience.
              </p>
              <ul>
                <li>
                  <strong>Referral attribution</strong> (<code>spx_ref</code>) —
                  remembers that you arrived via a friend&rsquo;s referral link
                  so their reward can be attributed if you sign up. Lasts 30
                  days.
                </li>
              </ul>
              <p>
                <strong>Checkout.</strong> Payments are completed on our
                merchant of record&rsquo;s checkout (Creem), which may set its
                own cookies on its domain during checkout; those are governed by
                its terms and privacy policy.
              </p>
            </>
          ),
        },
        {
          id: "browser-storage",
          title: "Browser storage we use",
          body: (
            <>
              <p>
                A few features store small preferences in your browser&rsquo;s
                local storage rather than cookies. These never leave your
                device:
              </p>
              <ul>
                <li>
                  <code>5px:recent-presets</code> — recently viewed presets,
                  used to surface them in search.
                </li>
                <li>
                  <code>5px:skip-cost-confirm</code> — remembers if you opted
                  out of the pre-generation cost confirmation.
                </li>
                <li>
                  Interface hints (e.g. <code>sp_ios_download_hint_seen</code>,{" "}
                  <code>sp_hold_hint_seen</code>) — remember that you&rsquo;ve
                  already seen one-time tips.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "what-we-dont-use",
          title: "What we don’t use",
          body: (
            <p>
              We do not use third-party advertising cookies, cross-site tracking
              pixels, or analytics providers that profile you. If we introduce
              optional analytics in the future, we will update this notice and,
              where required, ask for your consent first.
            </p>
          ),
        },
        {
          id: "your-choices",
          title: "Your choices",
          body: (
            <p>
              You can delete or block cookies in your browser settings and clear
              local storage at any time. Blocking the authentication cookie will
              prevent sign-in; blocking functional cookies or storage only
              degrades optional features.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this notice",
          body: (
            <p>
              We will update this notice when the technologies we use change.
              The current version is always available here with the
              &ldquo;Last updated&rdquo; date above.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about cookies:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
