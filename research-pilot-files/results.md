# Results: real public NPR listing-level language-cue pilot (revised)

Data fetched: 2026-11-18T09:18:57.375Z. Analysis generated: 2026-11-18T11:55:13.114Z. Runtime: Node v24.22.1.  
Sample: n=30; explicit AI listings n=10; technology/business listings n=5; general politics listings n=14; broad AI/tech legacy label n=15.

This is a descriptive listing-level content analysis of public headlines and snippets. It is not audience research, not a causal study, and not framing analysis of full articles.

## H1: accountability language by explicit AI cue

Explicit AI rate = 0.4; comparison rate = 0.25; risk difference (AI - comparison) = 0.15. Fisher exact p = 0.431. Internal bootstrap 95% interval = [-0.15, 0.55] (5000 resamples). Phi = 0.154; phi bootstrap interval [-0.196, 0.524].

## H2: named-actor presence by explicit AI cue

Explicit AI rate = 1; comparison rate = 0.9; risk difference = 0.1. Fisher exact p = 0.54. Internal bootstrap 95% interval = [0, 0.25]. Phi = 0.189; phi bootstrap interval [0.102, 0.354].

## Exploratory: uncertainty language by explicit AI cue

Explicit AI rate = 0.8; comparison rate = 0.2; risk difference = 0.6. Fisher exact p = 0.004. Internal bootstrap 95% interval = [0.25, 0.9].

## H3: human code vs deterministic explicit-AI rule

Observed agreement = 1; expected agreement = 0.556; Cohen's kappa = 1; n=30; rule mismatches=0. The rule is a transparent keyword rule with word boundaries, not an AI model. Because the rule was defined to match this explicit-AI coding after the audit, kappa is a rule-construction check, not independent validation.

## Intracoder second pass

Second-pass subsample n=6. Variable-level agreement: ai_explicit=1; tech_business=1; general_politics=1; broad_ai_tech=1; political_relevance=1; named_actor_present=1; accountability_language=1; uncertainty_language=1.

## Missing data

Missing cells by variable are reported in results.json. No missing values were found in the coded analytic variables.

## Failed public page requests

- https://www.npr.org/sections/technology/ai/: HTTP 404
