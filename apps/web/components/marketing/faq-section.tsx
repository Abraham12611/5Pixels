"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is a preset?",
    answer:
      "A preset is a curated visual direction. It bundles the AI instructions, model routing, post-processing, and user-facing controls into one click.",
  },
  {
    question: "Do I need to write prompts?",
    answer:
      "No. 5Pixels is preset-first. You pick a look, upload your photo, and optionally tweak a few simple controls.",
  },
  {
    question: "Will it keep my face?",
    answer:
      "Many presets are designed for likeness preservation. Each preset shows its identity-preservation level so you can choose accordingly.",
  },
  {
    question: "What photos work best?",
    answer:
      "Clear, well-lit photos with a single subject usually work best. Follow any guidance listed on the preset detail page.",
  },
  {
    question: "How long does a transformation take?",
    answer:
      "Most transformations complete in seconds to under a minute, depending on the provider and any post-processing steps.",
  },
  {
    question: "What happens to my uploaded image?",
    answer:
      "Your source image is stored privately and used only for your own generations. You can delete it from your library at any time.",
  },
  {
    question: "What happens if a generation fails?",
    answer:
      "Failed generations are detected automatically and the credits are refunded to your balance.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            FAQ
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-cream-50 font-medium">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-lime-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-cream-100/10 border-t px-5 pb-5 pt-4">
                    <p className="text-text-secondary">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
