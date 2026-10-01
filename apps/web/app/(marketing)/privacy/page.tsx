import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy — 5Pixels",
  description:
    "How 5Pixels collects, uses, stores, and protects your personal information, including the photos you upload for AI transformations.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="October 2, 2026"
      intro={
        <p>
          5Pixels is an AI-powered photo transformation service operated by{" "}
          <strong>{"{{LEGAL_ENTITY}}"}</strong> (&ldquo;5Pixels,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), which is the
          data controller for the processing described here. You choose a preset
          look, upload a photo, and we generate a transformed result using
          third-party AI models. This Privacy Policy explains what information
          we collect, how we use it, and the choices you have.
        </p>
      }
      sections={[
        {
          id: "information-we-collect",
          title: "Information we collect",
          body: (
            <>
              <p>
                <strong>Account information.</strong> When you create an
                account, we collect your email address and, optionally, a
                display name and avatar. If you sign in with Google, we receive
                your Google account name, email, and profile picture as permitted
                by your Google settings.
              </p>
              <p>
                <strong>Photos you upload.</strong> To create a transformation,
                you upload a source photo. Uploads are stored privately and are
                never shown to other users. We process them to produce your
                results and, where necessary, to operate, secure, moderate,
                support, and comply with legal obligations relating to the
                service. We do not sell your photos or use them for unrelated
                advertising, and we do not use them to train AI models.
              </p>
              <p>
                <strong>Generated results.</strong> The images we produce for
                you are stored in your private library until you delete them or
                your retention settings remove them.
              </p>
              <p>
                <strong>Preset options.</strong> Some presets let you customize
                the result with short text fields or option selections (for
                example, a name on a poster). These inputs are part of your
                generation request.
              </p>
              <p>
                <strong>Billing information.</strong> Purchases are processed by
                Creem, our merchant of record and payment processor. We receive
                transaction details (plan purchased, amount, status) but we do
                not collect or store your full payment card number. If you begin
                a purchase and don&rsquo;t finish, Creem may email you a reminder
                to complete your checkout.
              </p>
              <p>
                <strong>Usage data.</strong> We record credit balance changes,
                generation history, and technical logs needed to operate,
                secure, and improve the service.
              </p>
              <p>
                <strong>Information collected automatically.</strong> When you
                use the service we automatically collect technical information:
                IP address, browser and device type, operating system, timestamps
                and request/error logs, referring pages, approximate location
                inferred from IP, and signals used for security and fraud
                prevention.
              </p>
              <p>
                <strong>Information from others.</strong> We receive information
                from authentication providers (for example, your Google account
                name, email, and profile picture when you sign in with Google),
                from Creem (transaction and subscription status), and from our
                infrastructure providers (delivery and error telemetry).
              </p>
              <p>
                <strong>Communications.</strong> If you contact us, we keep a
                record of that correspondence to respond and resolve your
                request.
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "How we use your information",
          body: (
            <ul>
              <li>Provide the service: process your uploads and deliver generated results.</li>
              <li>Operate your account, credits, subscriptions, and payment history.</li>
              <li>Screen inputs for content-policy compliance before generation.</li>
              <li>Respond to support requests and send service-related notices.</li>
              <li>Maintain security, prevent fraud and abuse, and enforce our Terms.</li>
              <li>Analyze aggregated usage to improve presets and product quality.</li>
            </ul>
          ),
        },
        {
          id: "legal-bases",
          title: "Legal bases (EEA/UK)",
          body: (
            <>
              <p>
                If you are in the EEA or UK, we process your personal
                information on these bases:
              </p>
              <ul>
                <li>
                  <strong>Contract performance</strong> — operating your
                  account, processing uploads, delivering results, and
                  administering credits and plans.
                </li>
                <li>
                  <strong>Legitimate interests</strong> — security, fraud and
                  abuse prevention, content moderation, product improvement
                  using aggregated data, and service-related communications.
                </li>
                <li>
                  <strong>Legal obligation</strong> — retaining billing and
                  transaction records and responding to lawful requests.
                </li>
                <li>
                  <strong>Consent</strong> — where we ask for it, for example
                  optional product communications; you can withdraw consent at
                  any time.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "photos-and-faces",
          title: "Your photos and generated content",
          body: (
            <>
              <p>
                Your uploads and results are <strong>private by default</strong>.
                They are stored in private storage and served through short-lived
                signed URLs — only you can access them while signed in, unless you
                explicitly share a result link.
              </p>
              <p>
                Photos may contain faces. We process the photo you upload solely
                to render the preset you selected. We do not build faceprints,
                biometric identifiers, or a facial-recognition database, and we
                do not use your uploads to identify you or anyone else.
              </p>
              <p>
                Only upload photos of yourself or photos you have permission to
                use.
              </p>
            </>
          ),
        },
        {
          id: "ai-providers",
          title: "Third-party AI processing",
          body: (
            <>
              <p>
                To generate a result, your uploaded photo and preset options are
                sent to third-party AI model providers over an encrypted
                connection. Those providers process your input to produce the
                transformation and return the result to us; their retention and
                handling are governed by our provider agreements.
              </p>
              <p>
                We do not name our model providers publicly as part of the
                product experience, but all processing happens server-side.
                Your photos are not sold and are not shared for unrelated
                purposes.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "How we share information",
          body: (
            <>
              <p>We share personal information only with:</p>
              <ul>
                <li>
                  <strong>Infrastructure providers</strong> that host our
                  application, database, authentication, and file storage.
                </li>
                <li>
                  <strong>AI model providers</strong> that render your requested
                  transformations.
                </li>
                <li>
                  <strong>Creem</strong>, our merchant of record, to process
                  payments, subscriptions, refunds, and receipts.
                </li>
                <li>
                  <strong>Legal and safety</strong> recipients where required by
                  law, to enforce our rights, or to protect users and the
                  public.
                </li>
              </ul>
              <p>We do not sell your personal information.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and similar technologies",
          body: (
            <p>
              We use cookies and similar technologies to keep you signed in,
              remember preferences, and operate the service. We do not run
              third-party advertising trackers. The full inventory is in our{" "}
              <a href="/cookies">Cookie Notice</a>.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Retention and deletion",
          body: (
            <>
              <p>
                You control how long your content is kept. In{" "}
                <strong>Account → Privacy &amp; data</strong> you can set
                automatic deletion for source uploads and generated results.
              </p>
              <ul>
                <li>Delete an individual generation (source + result) at any time.</li>
                <li>Enable auto-delete so uploads/results expire on your chosen schedule.</li>
                <li>Delete your entire account from Account settings.</li>
              </ul>
              <p>
                We retain billing and transaction records as required for tax,
                accounting, and legal purposes. Backup copies are removed on the
                backup system&rsquo;s normal cycle.
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "Your rights and choices",
          body: (
            <>
              <p>
                Depending on where you live, you may have rights to access,
                correct, export, or delete your personal information, and to
                object to or restrict certain processing. You can exercise most
                of these directly in the product — edit your profile, adjust
                retention settings, or delete content and your account — or by
                contacting us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
              <p>
                If you are in the EEA, UK, or a U.S. state with a privacy law
                (such as California), you may have additional statutory rights.
                We may need to verify your identity before acting on a request,
                and you may use an authorized agent where the law provides for
                one. If we decline a request, you may ask us to reconsider; you
                may also complain to your local data-protection or supervisory
                authority. We respond within the time required by applicable
                law.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              We use industry-standard measures including encryption in transit,
              private-by-default storage with expiring signed URLs, server-side
              authorization checks, and restricted internal access. No method of
              transmission or storage is 100% secure, but protecting your photos
              is a core design goal of the product.
            </p>
          ),
        },
        {
          id: "international",
          title: "International data transfers",
          body: (
            <p>
              We process and store information in the countries where we and our
              service providers operate, which may be outside your country of
              residence. Where required, transfers rely on appropriate
              safeguards such as standard contractual clauses.
            </p>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              5Pixels is not intended for anyone under 18, or under the age of
              majority in their jurisdiction where higher. If you believe a
              minor has provided us personal information, contact us and we will
              delete it.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              If we update this policy, we will post the new version here and
              update the &ldquo;Last updated&rdquo; date. For material changes,
              we will provide additional notice in the product or by email.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact us",
          body: (
            <p>
              Questions or privacy requests:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or by
              mail to {"{{LEGAL_ENTITY}}"}, {"{{REGISTERED_ADDRESS}}"}. We
              respond within the time required by applicable law.
            </p>
          ),
        },
      ]}
    />
  );
}
