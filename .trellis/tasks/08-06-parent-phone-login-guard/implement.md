# Implement: Parent phone authorization single-flight guard

1. Read the login page, current tests, API contract, and applicable specs.
2. Add a runtime-oriented RED test for duplicate authorization handling and safe no-retry behavior.
3. Implement the smallest synchronous single-flight guard in the login page.
4. Run GREEN, mini-program tests, typecheck, and `git diff --check`.
5. Review only the three approved page files; do not commit or deploy until Terra review completes.

## Stop conditions

Stop on any need to modify API/seed/session/role logic, any test that requires fabricated WeChat data, or any untrusted error text reaching the UI.
