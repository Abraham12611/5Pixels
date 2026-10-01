import { SettingCard } from "@/components/consumer/setting-card";

/**
 * White-label referral blocks — GrowSurf embeddable elements (Step 4:
 * "Embedded elements on your own page"). The universal code in the root
 * layout powers these; `data-grsf-email` forces the participant view so
 * signed-in users see their referral link instead of a signup form.
 *
 * Style attributes mirror the dark theme (ink/charcoal/cream/lime) — values
 * must stay JSON-parseable per the GrowSurf docs.
 */
const GRSF_DARK_STYLES = {
  button:
    '{"background-color": "#82ea3a", "color": "#080a08", "font-weight": "600"}',
  label: '{"color": "#a6aaa4"}',
  link: '{"color": "#96f04c"}',
  input:
    '{"border": "1px solid rgba(247,242,232,0.15)", "background-color": "#141714", "color": "#f7f2e8"}',
  card: '{"background-color": "#141714", "box-shadow": "none", "border-radius": "12px", "border": "1px solid rgba(247,242,232,0.1)"}',
  title: '{"color": "#f7f2e8", "font-size": "14px"}',
  text: '{"color": "#a6aaa4"}',
} as const;

interface GrowSurfBlocksProps {
  email: string;
  firstName?: string;
  lastName?: string;
}

export function GrowSurfBlocks({
  email,
  firstName,
  lastName,
}: GrowSurfBlocksProps) {
  const participantProps = {
    "data-grsf-email": email,
    ...(firstName ? { "data-grsf-first-name": firstName } : {}),
    ...(lastName ? { "data-grsf-last-name": lastName } : {}),
  };

  return (
    <>
      {/* Share link + social buttons */}
      <SettingCard
        title="Your referral link"
        description="Share it anywhere — sign-ups through it count as your referrals."
      >
        <div
          data-grsf-block-form
          {...participantProps}
          data-grsf-button-style={GRSF_DARK_STYLES.button}
          data-grsf-label-style={GRSF_DARK_STYLES.label}
          data-grsf-link-style={GRSF_DARK_STYLES.link}
          data-grsf-share-url-input-style={GRSF_DARK_STYLES.input}
          data-grsf-copy-link-button-style={GRSF_DARK_STYLES.button}
          data-grsf-share-instructions="Share this link with friends — they get their first result free"
          data-grsf-share-instructions-style={GRSF_DARK_STYLES.text}
          data-grsf-social-buttons-layout-theme="3"
        />
      </SettingCard>

      {/* Referral stats + progress */}
      <SettingCard
        title="Your referrals"
        description="Everyone who joined through your link."
      >
        <div
          data-grsf-block-referral-summary
          {...participantProps}
          data-grsf-referral-summary-title="At a glance"
          data-grsf-referral-summary-title-style={GRSF_DARK_STYLES.title}
        />
        <div
          data-grsf-block-next-milestone
          {...participantProps}
        />
        <div
          data-grsf-block-referral-status
          {...participantProps}
          data-grsf-referral-status-title="Your referrals"
          data-grsf-referral-status-title-style={GRSF_DARK_STYLES.title}
          data-grsf-button-style={GRSF_DARK_STYLES.button}
          data-grsf-link-style={GRSF_DARK_STYLES.link}
          data-grsf-header-style={GRSF_DARK_STYLES.text}
          data-grsf-list-item-style={GRSF_DARK_STYLES.card}
        />
      </SettingCard>

      {/* Earned rewards */}
      <SettingCard
        title="Your rewards"
        description="Credits earned from referrals land in your balance automatically."
      >
        <div
          data-grsf-block-rewards
          {...participantProps}
          data-grsf-card-style={GRSF_DARK_STYLES.card}
          data-grsf-title-style={GRSF_DARK_STYLES.title}
          data-grsf-footer-style={GRSF_DARK_STYLES.text}
          data-grsf-required-referrals-style='{"background-color": "#1d211d", "color": "#a6aaa4"}'
          data-grsf-progress-icon-style='{"background-color": "#82ea3a", "color": "#080a08"}'
        />
      </SettingCard>

      {/* Bulk email invite */}
      <SettingCard
        title="Invite by email"
        description="Send invites to friends directly."
      >
        <div
          data-grsf-block-invite
          {...participantProps}
          data-grsf-instructions-text="Add their email addresses and we'll send the invite for you"
          data-grsf-instructions-style={GRSF_DARK_STYLES.text}
          data-grsf-label-style={GRSF_DARK_STYLES.label}
          data-grsf-input-style={GRSF_DARK_STYLES.input}
          data-grsf-input-placeholder-text="friend@example.com"
          data-grsf-button-style={GRSF_DARK_STYLES.button}
          data-grsf-link-style={GRSF_DARK_STYLES.link}
          data-grsf-submit-button-text="Send invites"
          data-grsf-contact-pill-style='{"background-color": "#1d211d", "color": "#f7f2e8"}'
        />
      </SettingCard>
    </>
  );
}
