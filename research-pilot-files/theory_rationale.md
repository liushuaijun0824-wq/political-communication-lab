# Theoretical rationale (indicative)

This pilot does not test a full theory of media effects. It uses a small public listing sample to demonstrate how theoretical concepts can be translated into transparent, auditable coding decisions.

## Source cues and visibility

Political communication research has long treated source cues as central to how audiences orient to messages: people use who appears, who is named, and which institution is invoked as shortcuts for credibility and accountability. In listing-level data, a named actor or institution is only a visible cue, not evidence of a journalistic source attribution. The variable `named_actor_present` therefore captures a minimal form of source visibility.

## Accountability and governance language

Accountability journalism emphasizes oversight, legal action, regulation, and public justification. In AI-mediated political communication, these cues matter because AI systems are often discussed through governance, risk, and institutional control rather than through message content alone. The broad `accountability_language` cue index captures this language family but is not a pure measure of legal accountability.

## Uncertainty and risk framing

Uncertainty language (may, could, risks, questions, theories, TBD) signals that a claim is provisional or contested. In technology and AI reporting, uncertainty can reflect technical novelty, regulatory uncertainty, or evidentiary limits. The coding treats uncertainty as a listing-level language cue only.

## Why separate AI from technology/business

AI-mediated political communication is not identical to technology news. A story about a chipmaker's board, an email outage, or a phone ban may be technology/business news without making an AI claim. The revised design separates `ai_explicit`, `tech_business`, and `general_politics` to avoid treating all technology items as AI items.

## Indicative readings

These are conceptual anchors, not a complete literature review:

- Entman, R. M. (1993). Framing: Toward clarification of a fractured paradigm.
- Goffman, E. (1974). Frame analysis.
- Iyengar, S. (1991). Is anyone responsible? How television frames political issues.
- Druckman, J. N. (2001). The implications of framing effects for citizen competence.
- Warren, M. E. (1999). Democracy and trust.
- Mayer, R. C., Davis, J. H., & Schoorman, F. D. (1995). An integrative model of organizational trust.
- Bovens, M. (2007). Analysing and assessing accountability.
- Kovach, B., & Rosenstiel, T. (2001). The elements of journalism.
- Gillespie, T. (2014). The relevance of algorithms.
- Bucher, T. (2012). Want to be on the top? Algorithmic power and the threat of invisibility.

For the current pilot, these readings motivate the variables but do not license causal or audience-level claims.
