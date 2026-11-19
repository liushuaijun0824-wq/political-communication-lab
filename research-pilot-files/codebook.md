# Codebook (revised)

Unit: one article listing from a public NPR section page. Code only the visible headline and snippet captured by `collect.mjs`. This is listing-level language-cue coding, not full-article framing analysis.

## Topic constructs

- `ai_explicit` (human, 0/1): 1 if the headline/snippet explicitly refers to AI, artificial intelligence, ChatGPT/OpenAI, machine learning, algorithm(s), or an AI-specific application. Nvidia/technology-company mentions alone are not sufficient.
- `tech_business` (human, 0/1): 1 if the item concerns a technology company, platform, chipmaker, or industry/business strategy, but does not explicitly mention AI.
- `general_politics` (human, 0/1): 1 if the item concerns government, elections, courts, regulation, public policy, or political institutions, without an explicit AI or tech-business cue.
- `broad_ai_tech` (human, 0/1): legacy broad label retained for audit; 1 if the item concerns AI, technology companies, or technology/business policy.

## Listing-language variables

- `political_relevance` (human, 0/1): 1 if the item concerns government, elections, courts, regulation, public policy, or political institutions.
- `named_actor_present` (human, 0/1): 1 if a named actor or institution is identifiable in the headline/snippet. This is not a measure of journalistic source attribution.
- `accountability_language` (human, 0/1): broad cue index: 1 if the headline/snippet includes lawsuit/sues, investigation, oversight, regulation/rules, court/legal action, ban, antitrust, or election-challenge language. The variable is intentionally broad and is not a pure legal-accountability measure.
- `uncertainty_language` (human, 0/1): 1 if the text uses may, might, could, questions, risks, whether, theories, TBD, allegations, or explicit uncertainty framing.

## Deterministic rule

- `rule_ai_explicit`: deterministic keyword rule applied by `analyze.mjs`, not an AI model. 1 if the lowercase headline/snippet matches a word-boundary lexicon: `ai`, `artificial intelligence`, `chatgpt`, `openai`, `machine learning`, `algorithm`.

## Human coding statement

Human codes are a single researcher's transparent reading of public headlines/snippets. Each code includes `evidence_span` and `coding_note`. A 6-item second pass after codebook clarification is reported as an intracoder consistency check. These codes are not validated by multiple trained coders and do not code full article bodies; they are suitable only for this methods pilot.
