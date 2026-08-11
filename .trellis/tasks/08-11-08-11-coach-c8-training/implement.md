# Execution plan: C8 training management

1. Trace the coach-team BFF to add a truthful cumulative training field and write a failing API regression.
2. Write failing C8 tests for the new metric source and node-93:896 geometry.
3. Make the smallest API/type/view-model/WXML/WXSS changes, preserving existing event interactions.
4. Run focused tests, typechecks, root check and diff check; record runtime visual evidence separately if available.

Implemented: the coach-team BFF now exposes `completedTrainingCount`; C8 consumes that field for “累计课时” and matches the node's 180px hero, 2×2 64px stat cards, 48px tab row, 22px list insets, and 114px minimum session cards. Runtime 375×812 capture remains separately required.
