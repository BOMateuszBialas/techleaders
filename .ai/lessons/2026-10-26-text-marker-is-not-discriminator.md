# 2026-10-26 — A text marker is not a discriminator; mark data by an identifier

A demo marker that lives in display text (`[DEMO] ` prefix) is both shown to shoppers and read by logic (AI demo flag), so removing it from the text silently breaks the logic. Use the machine identifier (the `DEMO-` SKU) for logic and keep text clean. A data-only migration is tested by re-applying it (`migrator.down` then `up`) on rows that carry the old text, and by checking that stock, prices and statuses are unchanged.
