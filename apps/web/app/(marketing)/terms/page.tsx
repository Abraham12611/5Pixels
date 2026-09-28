import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service — 5Pixels",
  description:
    "The terms that govern your use of 5Pixels: accounts, credits, subscriptions, generated content, and acceptable use.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="September 28, 2026"
      intro={
        <>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of 5Pixels (&ldquo;5Pixels,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a service that transforms
            your photos using curated AI presets. By creating an account or
            using the service, you agree to these Terms, our{" "}
            <Link href="/privacy">Privacy Policy</Link>, and our{" "}
            <Link href="/acceptable-use">Acceptable Use Policy</Link>, which is
            incorporated by reference.
          </p>
          <p>
            <strong>
              You must be at least 18 years old (or the age of majority in your
              jurisdiction) to use the service.
            </strong>{" "}
            If you do not agree to these Terms, do not use the service.
          </p>
        </>
      }
      sections={[
        {
          id: "the-service",
          title: "The service",
          body: (
            <p>
              5Pixels lets you pick a preset (&ldquo;Filter&rdquo; or
              &ldquo;Poster&rdquo;), upload a photo, adjust preset options, and
              receive an AI-generated result. Each transformation costs credits,
              and the exact cost is always shown before you generate. The
              service is an independent product that uses third-party AI models
              under our own agreements; 5Pixels is not affiliated with or
              endorsed by the providers of those models.
            </p>
          ),
        },
        {
          id: "accounts",
          title: "Accounts",
          body: (
            <>
              <p>
                You are responsible for activity under your account and for
                keeping your credentials confidential. Provide accurate
                information when registering and keep it up to date.
              </p>
              <p>
                We may suspend or terminate accounts that violate these Terms,
                the Acceptable Use Policy, or that create risk for other users
                or for the service.
              </p>
            </>
          ),
        },
        {
          id: "your-content",
          title: "Your content and license to us",
          body: (
            <p>
              You retain all rights to the photos you upload. You grant us a
              limited license to host, process, and transmit your uploads and
              preset inputs solely to provide the service to you — including
              sending them to the third-party AI providers that render your
              transformations. Only upload content you own or have permission to
              use, including permission from recognizable people in the photo.
            </p>
          ),
        },
        {
          id: "generated-results",
          title: "Generated results",
          body: (
            <>
              <p>
                <strong>Your results are yours.</strong> As between you and
                5Pixels, you own the results generated from your uploads, and
                you may use them for personal and commercial purposes, subject
                to these Terms and applicable law.
              </p>
              <p>
                Results are produced by AI and may be imperfect. Similar inputs
                can produce similar outputs for different users; we do not
                guarantee that a result is unique. You are responsible for how
                you use your results, including respecting third-party rights
                (copyright, publicity, trademark) in any content you publish.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          body: (
            <>
              <p>
                You may not use the service to create, request, or distribute
                prohibited content. In particular, you must not use the service
                to generate or attempt to generate:
              </p>
              <ul>
                <li>
                  Sexually explicit, sexually suggestive, pornographic, or other
                  NSFW content — including nudity, sexualized depictions,
                  sexualized clothing changes, or &ldquo;undressing&rdquo;
                  transformations;
                </li>
                <li>
                  Sexualized, exploitative, or harmful content involving minors
                  in any form — we report suspected child sexual abuse material
                  to the relevant authorities;
                </li>
                <li>
                  Non-consensual intimate imagery, or transformations of photos
                  of people who have not consented;
                </li>
                <li>
                  Face-swap, deepfake, or identity-manipulation content, or
                  content designed to impersonate a real person;
                </li>
                <li>
                  Fraudulent or deceptive content — fake IDs, documents,
                  screenshots, endorsements, or misinformation;
                </li>
                <li>
                  Content that infringes intellectual-property or publicity
                  rights, including unauthorized use of celebrity likenesses;
                </li>
                <li>
                  Hateful, harassing, violent, or otherwise illegal content.
                </li>
              </ul>
              <p>
                The full list and enforcement details are in our{" "}
                <Link href="/acceptable-use">Acceptable Use Policy</Link>.
                Violations may result in blocked generations, forfeiture of the
                credits used for the offending request, and account suspension
                or termination.
              </p>
            </>
          ),
        },
        {
          id: "content-moderation",
          title: "Content moderation",
          body: (
            <p>
              User inputs are screened by automated content-moderation systems —
              including our payment partner&rsquo;s moderation API — before a
              transformation is generated. Inputs flagged as violating our
              policies are refused, and we may review content and accounts where
              abuse is suspected. Repeated or severe violations lead to account
              termination.
            </p>
          ),
        },
        {
          id: "billing",
          title: "Credits, subscriptions, and billing",
          body: (
            <>
              <p>
                <strong>Credits.</strong> Transformations cost credits. The
                credit cost is shown before every generation. If a generation
                fails to complete, the credits used are returned to your balance
                automatically.
              </p>
              <p>
                <strong>Subscriptions.</strong> Paid plans grant credits on a
                recurring basis and renew automatically at the interval shown at
                checkout until you cancel.
              </p>
              <p>
                <strong>Cancellation.</strong> You can cancel your subscription
                at any time in the product from{" "}
                <strong>Billing → Plan → Cancel subscription</strong>, which
                hands off to the secure billing portal. Cancellation takes
                effect at the end of the current billing period; you keep
                access and any remaining credits until then.
              </p>
              <p>
                <strong>Merchant of record.</strong> Purchases are processed by
                Creem as merchant of record. Creem appears on your payment
                statement, issues receipts, and handles sales tax where
                applicable. Refund requests are handled through our support and
                Creem&rsquo;s processes.
              </p>
              <p>
                <strong>Price changes.</strong> We may change plan pricing or
                credit costs with reasonable advance notice; changes apply to
                future billing periods.
              </p>
            </>
          ),
        },
        {
          id: "our-ip",
          title: "Our intellectual property",
          body: (
            <p>
              The service — including the 5Pixels name, branding, preset designs
              and names, software, and site content — is owned by us and
              protected by intellectual-property laws. These Terms do not grant
              you any right to our branding or to reverse-engineer, scrape, or
              resell the service.
            </p>
          ),
        },
        {
          id: "disclaimers",
          title: "Disclaimers",
          body: (
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as
              available.&rdquo; We disclaim warranties of merchantability,
              fitness for a particular purpose, and non-infringement to the
              extent permitted by law. We do not warrant that results will meet
              your expectations or that the service will be uninterrupted or
              error-free.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <p>
              To the extent permitted by law, 5Pixels is not liable for
              indirect, incidental, special, consequential, or punitive damages,
              or for lost profits, data, or goodwill. Our aggregate liability
              for claims relating to the service is limited to the amount you
              paid us in the 12 months before the claim (or USD 100 if you paid
              nothing). Nothing in these Terms limits liability that cannot be
              limited by law.
            </p>
          ),
        },
        {
          id: "termination",
          title: "Termination",
          body: (
            <p>
              You may stop using the service and delete your account at any
              time. We may suspend or terminate access for violations of these
              Terms or to protect the service and its users. Sections that by
              their nature should survive — including content rights,
              disclaimers, and liability limits — survive termination.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these Terms",
          body: (
            <p>
              We may update these Terms from time to time. We will post the
              revised version here and update the &ldquo;Last updated&rdquo;
              date; for material changes we will provide additional notice.
              Continued use after changes take effect constitutes acceptance.
            </p>
          ),
        },
        {
          id: "general",
          title: "General",
          body: (
            <p>
              These Terms, together with the Privacy Policy and Acceptable Use
              Policy, are the entire agreement between you and 5Pixels regarding
              the service. If a provision is found unenforceable, the rest
              remain in effect. Consumers retain any mandatory protections
              granted by the law of their place of residence.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about these Terms:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
