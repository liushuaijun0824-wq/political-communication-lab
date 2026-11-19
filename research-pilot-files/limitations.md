# Limitations (revised)

- The sample is small (n=30), time-stamped to one fetch date, and drawn from only two NPR section pages. It is a convenience sample, not a probability sample.
- The unit is a section-page listing (headline + snippet), not a full article and not an audience member. This study cannot measure exposure, perception, credibility judgments, framing of full articles, or causal effects.
- Source section and topic are partly confounded: politics and technology pages supply different editorial populations. Results cannot separate topic from section context.
- AI is coded strictly (`ai_explicit`) and technology/business items are reported separately. This reduces construct contamination but also limits statistical power.
- Human coding was performed by one coder from headline/snippet text only. A 6-item second pass is an intracoder consistency check, not intercoder reliability.
- The rule label is a deterministic keyword rule with word boundaries, not an AI model. Agreement with the rule is a reproducibility check, not evidence about model performance.
- `named_actor_present` means an identifiable actor/institution appears in the listing; it is not journalistic source attribution. `accountability_language` is a broad cue index and mixes legal, oversight, and regulatory language.
- Binary outcomes are analyzed with risk differences, Fisher's exact tests, and resampling intervals; Fisher's exact tests assume independent rows, which is only an approximation for clustered section listings.
- Internal bootstrap/phi intervals describe resampling variability in this convenience sample. They are not population-level 95% confidence intervals.
- One attempted public page (`/sections/technology/ai/`) returned HTTP 404 and was excluded. No login, paywall, or bot protection was bypassed.
- Raw HTML snapshots are included for audit only. Public headlines/snippets are used with source links for a noncommercial methods demonstration; raw page snapshots should not be redistributed as a content product.
