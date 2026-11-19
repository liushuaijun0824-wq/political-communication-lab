# Pre-registration (revised): listing-level language cues in public NPR politics/technology pages

**Status:** original research questions and hypotheses were written before analysis. This revised version was updated after methodological audit to tighten constructs, analysis plan, and inferential language; it does not add or reinterpret empirical findings to fit the results.

**Data status:** real public headlines and snippets from NPR section pages. This is a small listing-level content-analysis pilot, not a survey, experiment, full-article framing study, or audience study.

## Research question

RQ1. In a small sample of public NPR politics/technology section listings, do explicit-AI listings contain different language cues from the remaining listings, specifically named-actor presence, accountability cues, and uncertainty cues?

## Hypotheses

- H1. Explicit-AI listings will have a higher rate of accountability-language cues than the comparison listings.
- H2. Explicit-AI listings will more often contain a named actor or institution than the comparison listings.
- H3. Human `ai_explicit` coding and a transparent deterministic keyword rule with word boundaries will show at least moderate agreement (Cohen's kappa > .40).

## Unit of analysis

One article listing from a public NPR section page, represented by its public URL, headline, and snippet as displayed in the section listing. The unit is not the full article and not a reader/audience.

## Sampling plan

Collect public section pages from NPR politics and technology-related sections. Keep unique article links with a headline/snippet. Target n = 20–30 items. Use only pages that return HTTP 200. Do not bypass logins, paywalls, or bot protections.

## Construct separation

- `ai_explicit`: listing explicitly mentions AI, artificial intelligence, ChatGPT/OpenAI, machine learning, or algorithms.
- `tech_business`: technology-company or business/industry cue without explicit AI wording.
- `general_politics`: general political/government/election/court/policy item without AI or tech-business cue.
- `broad_ai_tech`: legacy broad category retained only for audit and comparison.

The primary analysis uses `ai_explicit`. `tech_business` and `general_politics` are descriptive categories, not merged into the AI construct.

## Variables and analysis plan

Variables: `ai_explicit`, `tech_business`, `general_politics`, `broad_ai_tech`, `political_relevance`, `named_actor_present`, `accountability_language`, `uncertainty_language`, `rule_ai_explicit`.

1. Report missing-data counts and complete-case n for every analysis.
2. Report descriptive statistics and frequencies.
3. For each binary outcome, report the rate in explicit-AI and comparison listings, the risk difference (AI minus comparison), Fisher's exact test, an internal deterministic bootstrap interval, and the phi coefficient with a bootstrap interval. Welch/Cohen's d are not used as primary statistics for binary outcomes.
4. Test H3 with Cohen's kappa and a confusion matrix; describe the rule as deterministic, not as AI.
5. Report a 6-item intracoder second pass as a consistency check, not independent intercoder reliability.
6. Treat all results as descriptive of this sampled public listing set, not causal, not population-level, and not generalizable to audiences.

## Decision rule

This pilot demonstrates an audit trail and inferential restraint. Statistical significance is not used to claim a media effect. All limitations are reported.
