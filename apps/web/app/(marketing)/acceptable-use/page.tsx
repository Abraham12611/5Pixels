import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — 5Pixels",
  description:
    "What is and is not allowed on 5Pixels: prohibited content categories, moderation, and enforcement.",
};

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      lastUpdated="September 28, 2026"
      intro={
        <p>
          This Acceptable Use Policy (&ldquo;AUP&rdquo;) defines what is and is
          not allowed on 5Pixels. It is part of our{" "}
          <Link href="/terms">Terms of Service</Link>. It applies to everything
          you upload, every preset input you provide, and every result you
          generate or share. If you violate this policy we may block the
          generation, remove content, and suspend or terminate your account.
        </p>
      }
      sections={[
        {
          id: "prohibited-content",
          title: "Prohibited content",
          body: (
            <>
              <p>
                You may not use 5Pixels to upload, generate, or distribute any
                of the following:
              </p>
              <ul>
                <li>
                  <strong>Sexual or NSFW content.</strong> Sexually explicit,
                  pornographic, erotic, or sexually suggestive material of any
                  kind — including nudity, sexual acts, fetish content,
                  sexualized clothing changes, and &ldquo;undressing&rdquo; or
                  body-altering transformations of real people.
                </li>
                <li>
                  <strong>Minors.</strong> Any sexualized, exploitative, or
                  harmful depiction of a person who is or appears to be under
                  18. Suspected child sexual abuse material is reported to the
                  relevant authorities.
                </li>
                <li>
                  <strong>Non-consensual intimate imagery.</strong> Intimate or
                  sexualized depictions of any real person without their
                  consent, including of public figures.
                </li>
                <li>
                  <strong>Deepfakes and identity manipulation.</strong>{" "}
                  Face-swap content, deepfakes, or transformations designed to
                  place a real person into a scene or context they were not in,
                  or to impersonate someone.
                </li>
                <li>
                  <strong>Deceptive or fraudulent content.</strong> Fake IDs,
                  passports, certificates, screenshots, financial documents,
                  fabricated endorsements, phishing or credential-theft imagery,
                  social-engineering materials, or content intended to defraud
                  or mislead.
                </li>
                <li>
                  <strong>Sensitive personal data and doxxing.</strong> Using
                  text inputs or imagery to expose private addresses,
                  identification numbers, financial credentials, or other
                  sensitive personal information.
                </li>
                <li>
                  <strong>Biometric identification.</strong> Using the service
                  to identify an unknown person in a photo or to infer highly
                  sensitive traits from someone&rsquo;s face.
                </li>
                <li>
                  <strong>Harassment and hate.</strong> Content that demeans,
                  harasses, threatens, or incites violence or discrimination
                  against individuals or groups.
                </li>
                <li>
                  <strong>Extremist content.</strong> Content that praises,
                  recruits for, or facilitates terrorism or violent extremism.
                </li>
                <li>
                  <strong>Illegal content.</strong> Content that violates any
                  applicable law, or promotes illegal goods or services.
                </li>
                <li>
                  <strong>IP-infringing content.</strong> Uploads or requests
                  that infringe copyright, trademark, or publicity rights —
                  including unauthorized use of celebrity likenesses or
                  copyrighted characters.
                </li>
                <li>
                  <strong>Graphic violence and self-harm.</strong> Gore,
                  gratuitous violence, or content that glorifies, encourages,
                  or instructs serious self-harm.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "prohibited-conduct",
          title: "Prohibited conduct",
          body: (
            <ul>
              <li>
                Uploading photos of other people without their consent,
                including photos scraped from social media.
              </li>
              <li>
                Attempting to bypass, probe, or evade content moderation,
                prompt filters, rate limits, or credit controls.
              </li>
              <li>
                Misusing preset text fields to inject instructions, slurs, or
                prohibited content into a generation.
              </li>
              <li>
                Scraping, reverse-engineering, or reselling the service or its
                presets.
              </li>
              <li>
                Creating multiple accounts to abuse free credits, referrals, or
                promotions.
              </li>
              <li>
                Uploading malware or content designed to disrupt the service.
              </li>
            </ul>
          ),
        },
        {
          id: "moderation",
          title: "How moderation works",
          body: (
            <>
              <p>
                User-supplied text inputs are screened by automated moderation
                systems — including the Creem Moderation API — before a
                transformation is generated. Inputs that are flagged or denied
                are refused and never reach our AI providers.
              </p>
              <p>
                Presets are curated and configured server-side with safety
                rules that block NSFW output, harmful depictions of minors, and
                unauthorized use of public figures. Upstream AI and
                infrastructure providers also enforce their own safety rules;
                where a provider&rsquo;s rules are stricter, they may control
                whether a request can be produced.
              </p>
              <p>
                A blocked generation does not consume credits; the credits are
                returned to your balance. If you believe a moderation decision
                or account restriction was made in error, contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to ask
                for a review.
              </p>
            </>
          ),
        },
        {
          id: "enforcement",
          title: "Enforcement",
          body: (
            <ul>
              <li>
                <strong>Blocked generation:</strong> the request is refused and
                its credits are released back to your balance.
              </li>
              <li>
                <strong>Warning or restriction:</strong> repeated borderline
                attempts may limit your account.
              </li>
              <li>
                <strong>Suspension or termination:</strong> severe or repeated
                violations end access to the service, without refund where
                prohibited conduct caused the loss.
              </li>
              <li>
                <strong>Reporting:</strong> we report illegal content —
                including suspected CSAM — to the appropriate authorities.
              </li>
            </ul>
          ),
        },
        {
          id: "reporting",
          title: "Reporting a violation or rights issue",
          body: (
            <>
              <p>
                If you believe content on 5Pixels violates this policy — or that
                a transformation was made from your photo or likeness without
                consent — contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Include
                enough detail for us to locate the content and identify the
                issue. Reports involving minors, non-consensual intimate
                imagery, or impersonation are treated as urgent.
              </p>
              <p>
                For copyright, trademark, or publicity complaints — including
                the information a report must contain and how we handle
                counter-notices and repeat infringers — see{" "}
                <Link href="/terms#ip-complaints">
                  IP complaints and takedown
                </Link>{" "}
                in the Terms of Service.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              We may update this policy as the product and its risks evolve. The
              current version is always available at this page, with the
              &ldquo;Last updated&rdquo; date above.
            </p>
          ),
        },
      ]}
    />
  );
}
