# Visual evidence path audit — 2026-09-02

## Scope

- Goal: keep new screenshots and comparison outputs out of the Desktop and the repository worktree.
- Canonical directory: `%TEMP%\\cq-talent-visual-evidence`.
- Canonical guards: `scripts/devtools/visual-evidence-path.cjs` and `scripts/devtools/visual_evidence_path.py`.
- Historical screenshots remain in their original locations and are not moved or deleted.

## Findings and changes

- The MCP-first scripts under `scripts/devtools/` already rejected Desktop/worktree outputs and defaulted to the system temporary directory.
- Legacy Python probes under `tmp/prod-verify/` still referenced `C:\\Users\\ASUS\\cq-talent-visual-evidence`; they now resolve their input directory through the shared Python guard and honor `CQ_TALENT_VISUAL_EVIDENCE_DIR`.
- Legacy CUA diagnostic writers now use the same validated directory. They remain troubleshooting-only and are not visual-acceptance evidence.
- Legacy shell sweeps now resolve the evidence directory through the Python guard instead of hard-coded paths.
- The Python guard now supports `--print-dir`, which lets the shell sweeps use exactly the same path policy as the MCP scripts.

## Verification

- `py -3 -m py_compile` passed for the modified Python helpers and probes.
- `py -3 scripts/devtools/visual_evidence_path.py --print-dir` returned `C:\\Users\\ASUS\\AppData\\Local\\Temp\\cq-talent-visual-evidence`.
- `node --test scripts/devtools/visual-evidence-path.test.cjs scripts/devtools/wechatide-mcp-capture.test.cjs` passed: `15/15`.
- `git diff --check` passed for the tracked path-policy files.

## Runtime evidence collected during the same audit

- WeChatIDE MCP status: logged in, `tokenRequired=false`, skill `0.3.9`.
- Runtime device: iPhone X, `375x812`, SDK `3.17.0`.
- C10.1 route `/pages/coach/coverage/index`: screenshot `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788301174207-7avytc.png`; current dynamic dimensions exceed the three Figma sample rows and remain API data.
- C11 route `/pages/coach/test-tasks/index`: screenshot `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788301231450-67pau0.png`; task count, dates, statuses and progress remain real API data.
- C12/C12.1 route `/pages/coach/test-entry/index?eventId=event-cq-talent-secure-test-1-trn-0818&templateId=assessment-template-technical&title=体能综合评估`: screenshot `C:\\Users\\ASUS\\AppData\\Local\\Temp\\wechatide-simulator-screenshot-1788301330945-mvws2z.png`; the existing local draft correctly opens the C12.1 resume overlay.
- Console filtering `error|exception|fail` returned no current hits for the three pages.

## Figma boundary

- Online node `1571:7` (C10.1) and `1564:7` (C11) were re-read through Figma MCP and compared at `375x812`.
- C12.1 remains compared with the preserved node `1566:7`; the current Coach V6 page has no separate C12.1 board. The runtime overlay structure is accepted against that preserved reference, while dynamic saved-time text is not copied from the sample.
- Figma MCP `whoami` still reports the authenticated team seat as `View`, even though the browser file-level sharing UI reports editing access. No Figma write was attempted in this audit.
