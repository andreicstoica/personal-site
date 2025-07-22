# Purpose / Goal
Read each entry's type field, and apply a background‐color + text‐color (style defined in `const typeColors` highlight to the Experience cell so that visitors can visually distinguish “work”, “school”, “personal”, etc.
# Success Criteria
1. After page load the correct color bar appears behind every experience name. the highlighting should be clipped to the text, not the div/container
2. Colors match the mapping defined in the site data (extensible).
3. Runs client-side only, no page refresh, completes in < 50 ms for ≤ 100 rows.
4. Degrades gracefully (no JS → plain table).
