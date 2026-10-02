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
      lastUpdated="October 2, 2026"
      intro={
        <>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of 5Pixels (&ldquo;5Pixels,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a service that transforms
            your photos using curated AI presets. By creating an account or
            using the service, you agree to these Terms, our{" "}
            <Link href="/privacy">Privacy Policy</Link>,{" "}
            <Link href="/acceptable-use">Acceptable Use Policy</Link>, and{" "}
            <Link href="/cookies">Cookie Notice</Link>, each of which is
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
          id: "eligibility",
          title: "Eligibility",
          body: (
            <p>
              The service is intended only for adults. You must be at least 18
              years old, or the age of majority in your jurisdiction if higher,
              to create an account or use the service. By using the service you
              represent that you meet this requirement.
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
                information when registering and keep it up to date. You may not
                share your account, and you may not create multiple accounts to
                abuse free credits, referral rewards, or promotions.
              </p>
              <p>
                We may suspend or terminate accounts that violate these Terms or
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
              preset inputs to provide the service to you — including sending
              them to the third-party AI providers that render your
              transformations — and to operate, secure, moderate, support, and
              enforce the service and our legal obligations. Only upload content
              you own or have permission to use, including permission from
              recognizable people in the photo.
            </p>
          ),
        },
        {
          id: "generated-results",
          title: "Generated results",
          body: (
            <>
              <p>
                <strong>Your results are yours to use.</strong> As between you
                and 5Pixels, we do not claim ownership of the results generated
                from your uploads. To the extent we obtain any rights in a
                result that are transferable to you, we assign those rights to
                you, subject to these Terms, applicable law, and third-party
                rights.
              </p>
              <p>
                Results are produced by AI and may be imperfect. Because output
                rights depend on the degree of human authorship and the law of
                each jurisdiction, we do not guarantee that any result is
                copyrightable, unique, registrable, or free of third-party
                rights. Similar inputs can produce similar outputs for
                different users. You may use your results for personal and
                commercial purposes, but you are responsible for how you use
                them — including clearing copyright, publicity, and trademark
                rights in anything you publish.
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
                Violations may result in refused generations and account
                restriction, suspension, or termination.
              </p>
            </>
          ),
        },
        {
          id: "content-moderation",
          title: "Content moderation",
          body: (
            <>
              <p>
                User inputs are screened by automated content-moderation systems
                — including our payment partner&rsquo;s moderation API — before
                a transformation is generated. Inputs flagged or denied as
                violating our policies are refused, and we may review content
                and accounts where abuse is suspected. Repeated or severe
                violations lead to account termination.
              </p>
              <p>
                Requests blocked before generation do not consume credits: any
                reserved amount is released back to your balance. Upstream AI
                provider safety rules may also cause a request to be refused;
                where a provider&rsquo;s rules are stricter than ours, they may
                limit what the service can produce.
              </p>
            </>
          ),
        },
        {
          id: "credits",
          title: "Credits",
          body: (
            <>
              <p>
                <strong>What credits are.</strong> Credits are a limited,
                non-transferable contractual entitlement to use eligible
                features of the service. Credits are not currency and are not
                stored value; they have no cash value, are not redeemable for
                cash, and may not be sold, transferred, or exchanged.
              </p>
              <p>
                <strong>How credits are obtained.</strong> Credits may be
                granted by a subscription plan, a one-time pass, a top-up
                purchase, or a promotion (including referral rewards). The
                amount and any usage terms are shown at purchase.
              </p>
              <ul>
                <li>
                  <strong>Plan credits</strong> are granted at the start of each
                  billing period and remain available while your subscription is
                  active and for the period described in the plan.
                </li>
                <li>
                  <strong>One-time pass credits</strong> (such as a weekly pass)
                  are granted once, do not renew, and are usable for the period
                  shown at purchase.
                </li>
                <li>
                  <strong>Top-up credits</strong> are added to your balance
                  immediately after purchase and do not expire while your
                  account remains active.
                </li>
                <li>
                  <strong>Promotional credits</strong> (including referral
                  rewards) may carry additional conditions shown at the time
                  they are granted.
                </li>
              </ul>
              <p>
                <strong>Spending and refunds of credits.</strong> The credit
                cost of a transformation is shown before you generate. If a
                generation fails to complete or is blocked before generation,
                the credits involved are returned to your balance
                automatically. When you delete your account or your account is
                terminated for a violation of these Terms, unused credits are
                forfeited and are not refunded, except where required by law.
              </p>
            </>
          ),
        },
        {
          id: "billing",
          title: "Purchases, subscriptions, and refunds",
          body: (
            <>
              <p>
                <strong>Merchant of record.</strong> Purchases are processed by
                Creem, which acts as merchant of record and contractual reseller
                for purchases made through its checkout. Creem enters into the
                purchase transaction with you, processes payment, issues
                receipts and invoices, and handles applicable sales taxes where
                required. &ldquo;Creem&rdquo; may appear on your payment
                statement. The{" "}
                <a
                  href="https://creem.io/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Creem Buyer Terms
                </a>{" "}
                also apply to your purchase and are presented at checkout.
              </p>
              <p>
                <strong>Subscriptions.</strong> Paid plans grant credits on a
                recurring basis and renew automatically at the interval shown at
                checkout until you cancel. If a renewal payment fails, we may
                retry it or suspend plan benefits until payment succeeds.
              </p>
              <p>
                <strong>Cancellation.</strong> You can cancel a subscription at
                any time in the product from{" "}
                <strong>Billing → Plan → Cancel subscription</strong>, which
                hands off to the secure billing portal. Cancellation takes
                effect at the end of the current billing period; you keep access
                and any remaining credits until then.
              </p>
              <p>
                <strong>Refunds.</strong> Failed generations and requests
                blocked before generation return their credits automatically.
                For purchases of plans, passes, or credit packs, refund requests
                are assessed individually through our support at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and
                Creem&rsquo;s processes. Nothing in these Terms limits any
                refund or withdrawal rights you have under mandatory consumer
                law. Note that Creem may issue a refund within 60 days of a
                purchase where needed to resolve a dispute.
              </p>
              <p>
                <strong>Price changes.</strong> We may change plan pricing or
                credit costs with reasonable advance notice; changes apply to
                future billing periods and do not affect purchases already made.
              </p>
            </>
          ),
        },
        {
          id: "consumer-rights",
          title: "Consumer withdrawal rights",
          body: (
            <p>
              If you are a consumer in the EEA or UK, you may have a statutory
              right to withdraw from a purchase within 14 days. For digital
              content and services, that right can be lost once performance
              begins with your express consent — where required, checkout will
              ask for that consent before generation starts. Any statutory
              rights you hold are unaffected by these Terms.
            </p>
          ),
        },
        {
          id: "third-party-services",
          title: "Third-party services and model changes",
          body: (
            <p>
              The service depends on third-party providers for AI models,
              hosting, authentication, storage, and payments. Those providers
              may change, deprecate, or impose their own policies, and the
              models behind a preset may change over time. We may update,
              replace, or retire presets and the underlying capabilities at our
              discretion. We do not guarantee the permanent availability of any
              particular preset, transformation style, or underlying capability.
            </p>
          ),
        },
        {
          id: "ip-complaints",
          title: "IP complaints and takedown",
          body: (
            <>
              <p>
                If you believe content on 5Pixels infringes your copyright,
                trademark, or right of publicity — or that a transformation was
                made from your photo or likeness without consent — contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with:
              </p>
              <ul>
                <li>Identification of the work, likeness, or right at issue;</li>
                <li>
                  The content concerned (a link or description sufficient for us
                  to locate it);
                </li>
                <li>Your contact details; and</li>
                <li>
                  A statement that you own the right or are authorized to act
                  for its owner.
                </li>
              </ul>
              <p>
                We investigate reports and may remove or disable content and
                restrict the accounts responsible. We treat reports involving
                minors, non-consensual intimate imagery, or impersonation as
                urgent. We apply a repeat-infringer policy: accounts that
                repeatedly generate infringing or unlawful content are
                terminated.
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
          id: "indemnification",
          title: "Indemnification",
          body: (
            <p>
              To the extent permitted by law, you agree to indemnify and hold
              harmless 5Pixels and its operators, employees, and agents from
              claims, damages, and expenses (including reasonable legal fees)
              arising from content you upload without the necessary rights or
              consent, your misuse of generated results, or your violation of
              these Terms.
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
              limited by law, including liability arising from consumer
              protections in your place of residence.
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
              Terms or to protect the service and its users. On termination,
              unused credits are forfeited as described in the Credits section,
              and Sections that by their nature should survive — including
              content rights, billing, disclaimers, liability limits,
              indemnification, and governing law — survive termination.
            </p>
          ),
        },
        {
          id: "governing-law",
          title: "Governing law and disputes",
          body: (
            <p>
              These Terms are governed by the laws of the Federal Republic of
              Nigeria, without regard to conflict-of-law rules, and disputes
              will be resolved in the courts of Nigeria, except where mandatory
              consumer law gives you the right to bring a claim in the courts
              of your place of residence.
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
              These Terms, together with the Privacy Policy, Acceptable Use
              Policy, and Cookie Notice, are the entire agreement between you
              and 5Pixels regarding the service. If a provision is found
              unenforceable, the rest remain in effect. Our failure to enforce a
              provision is not a waiver. Consumers retain any mandatory
              protections granted by the law of their place of residence. We are
              not liable for delays or failures caused by events beyond our
              reasonable control.
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
