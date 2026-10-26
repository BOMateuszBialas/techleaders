# 2026-10-19 — Regex grounding checks are blind to invisible characters

A zero-width space inside a term (`Blue​tooth`) matched no glossary pattern, so a draft claiming Bluetooth for a wired product passed `findDescriptionIssues` while the owner would read "Bluetooth". NFKC does not remove `\p{Cf}`. Any check that matches words in model output must first reject (not strip) `\p{Cc}` other than `\n` and `\p{Cf}` (zero-width, bidi, soft hyphen, BOM); the description `markup` rule does since the #72 review.
