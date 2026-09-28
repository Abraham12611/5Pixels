/**
 * Per-class error copy (16 §5). Formula: what happened (plain) → what it
 * means for the user → what to do. Never exposes stack traces, provider
 * names, model names, or internal status strings (AGENTS.md).
 */
export const ERROR_COPY = {
  network: {
    title: "We couldn't load this",
    body: "Check your connection and try again.",
    primary: "Try again",
    secondary: { label: "Go to Library", href: "/app/library" },
  },
  server: {
    title: "Something went wrong on our side",
    body: "Give it another try — if it keeps failing, it's on us.",
    primary: "Try again",
  },
  notFound: {
    title: "This isn't available",
    body: "It may have been removed or the link is wrong.",
    primary: "Browse looks",
  },
  notPermitted: {
    title: "You don't have access to this",
    body: "This belongs to a different account.",
    primary: "Go to Library",
  },
  shareExpired: {
    title: "This link is no longer available",
    body: "Shared links can be removed by their owner.",
    primary: "Explore looks",
  },
  presetRetired: {
    title: "This look has been retired",
    body: "It's no longer available, but there are similar looks to try.",
    primary: "Find a similar look",
  },
  uploadRejected: {
    title: "That file won't work",
    body: "Choose a photo in a supported format under the size limit.",
    primary: "Choose another photo",
  },
  paymentFailed: {
    title: "We couldn't complete the payment",
    body: "Nothing was charged. Check your card details and try again.",
    primary: "Try another card",
  },
  generationFailed: {
    title: "We couldn't finish this one",
    body: "No credits were taken — you can try again right away.",
    primary: "Try again",
  },
  generationBlocked: {
    title: "We can't transform this photo",
    body: "This photo doesn't meet the content guidelines. No credits were taken.",
    primary: "Choose another photo",
  },
} as const;

export type ErrorClass = keyof typeof ERROR_COPY;
