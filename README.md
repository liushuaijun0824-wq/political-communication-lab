# Political communication research workbench

A static, browser-based workbench for quantitative checks and coding audits in AI-mediated political communication research. It runs without a backend and is ready for GitHub Pages.

## What it includes

- Local CSV loading
- Missing-data report with inferred variable types and complete cases
- Descriptive statistics, histogram, skewness, and frequency tables
- Cronbach's alpha with reverse-coded items and alpha-if-deleted
- Welch independent-samples t-test and one-way ANOVA
- Chi-square test with Cramer's V
- Pearson correlation
- Multiple OLS regression
- Observed agreement and Cohen's kappa for AI-proposed versus human-final labels
- CSV export of the active result
- Plain-text method note for the active result
- URL extraction module for public pages: title, readable text, dates, outbound links, Markdown export, and pasted-text fallback
- Installable PWA shell and offline cache

The included `practice-data.csv` is synthetic and exists only to exercise the interface. It is not a research dataset and should not be cited as one.

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173/`.

Run the statistical function tests with:

```bash
npm test
```

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Put the contents of this folder at the repository root.
3. Commit and push to the `main` branch.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. The included workflow in `.github/workflows/pages.yml` will publish the site after the next push, or run it manually from the **Actions** tab.

No build step or secret is required.

## Privacy and scope

CSV parsing and calculations happen in the browser. The application does not upload data or call a language model.

The tests are research aids, not substitutes for a preregistered analysis plan, assumption checks, or statistical review. Complete-case sample sizes are shown with every analysis.

The URL extractor reads public pages only. It does not bypass logins, paywalls, bot protections, or site terms of use. For other sources, paste the text you are allowed to use.

Direct browser reads depend on each site's CORS and network policy. If a domain refuses the browser request, the extractor reports the failure and you can switch to paste mode instead of relying on a proxy or backend.

Only HTTPS public sites on the configured allowlist are accepted; local hosts, private IP addresses, and unknown domains are rejected. The default allowlist covers Apple, Reuters, AP, BBC, NPR, and The Guardian. Developers can change it at runtime with `setAllowedHosts([...])` and read the active domains with `allowedHosts()` in `extract.js`.
