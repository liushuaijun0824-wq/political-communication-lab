# Real public listing-level language-cue pilot (revised)

This directory contains a small real-data content-analysis pilot using public NPR politics and technology section pages. No simulated data are used. The revised version separates explicit AI cues from technology/business and general-politics cues, preserves evidence spans for human codes, and is self-contained for reproduction.

## Reproduce the analysis

From this directory:

```bash
node analyze.mjs
```

`analyze.mjs` reads `real_sample.json` and `human_codes.json`, verifies item_id/URL/headline alignment, runs the analysis with the local `stats.js`, and rewrites `results.json`, `results.md`, `real_coded_sample.csv`, and `checksums.sha256`.

Do **not** rerun `collect.mjs` for the frozen analysis sample. `collect.mjs` is retained as the collection script and documentation of how the sample was obtained; rerunning it overwrites `real_sample.json` and can break alignment with `human_codes.json`. If you must recollect, save the run in a new folder and create a new aligned human-code file.

## Files

- `preregistration.md` — research questions, hypotheses, revised analysis plan
- `theory_rationale.md` — concise conceptual rationale and indicative readings
- `codebook.md` — variable definitions and coding rules
- `collect.mjs` — public-page collection script (frozen-run warning included)
- `raw-*.html` — raw page snapshots for audit only
- `raw-pages.json` — fetch metadata and failed requests
- `real_sample.json` — frozen real sample with item IDs, URLs, timestamps
- `human_codes.json` — single-coder codes with item_id, URL, headline, evidence spans, notes, and 6-item second pass
- `analyze.mjs` — reproducible analysis script; imports local `stats.js`
- `stats.js` — local copy of statistical helpers for self-contained reproduction
- `results.md` / `results.json` — analysis output
- `real_coded_sample.csv` — coded analytic dataset
- `checksums.sha256` — hashes of raw and derived data files
- `limitations.md` — scope and cautions
- `data-use-note.md` — public-data use and attribution statement
- `portfolio_summary.md` — short application-portfolio description
- `_audit_backup_before_revision/` — pre-revision files, retained for audit transparency

## Scope

This is a descriptive listing-level content analysis of public headlines/snippets. It is not a survey, not an experiment, not full-article framing analysis, and not evidence about audience effects. See `limitations.md`.
