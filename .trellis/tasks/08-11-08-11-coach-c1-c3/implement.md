# Execution Plan: Coach C1-C3 Figma Restoration

1. Inspect C1-C3 page tests and add focused failing assertions for the Figma-defined top-bar, card, and action-grid rules.
2. Repair C1 with no API or date-logic change; test and capture it.
3. Repair C2 while preserving action handlers and long-title behavior; test and capture it.
4. Repair C3's form hierarchy and safe-area top bar; test and capture top and lower content.
5. Run the mini-program checks, full project check, `git diff --check`, and a Terra review.
6. Commit only the C1-C3 batch plus its task record/progress update.

Implemented: C1 keeps long live titles within the Hero time row; C2 now uses the Figma bottom coach tab bar and its 140px session header / 100px action-card geometry; C3 uses 22px content insets, 12px cards, 44px inputs and an 80px notes control. Full root check passed. A bounded DevTools screenshot run timed out without producing a PNG, so all three runtime screenshot criteria remain open.
