# Arion backlog

Features identified for the Arion packages (core, pipeline, c1, db, server, node, analyst) and their AWS deployment.
Last updated 2026-11-28.

## Open

| # | Item | Status |
|---|---|---|
| 1 | Redeploy arion-main with the latest code (Monitor page, progress endpoint, control experiments) | Pushed to the branch, not deployed |
| 2 | An update command for arion-main (pull, build, restart) | Done: `deploy/aws/update.sh` |
| 3 | `deploy/aws` README | Done |

## Parked

| # | Item |
|---|---|
| 4 | Merge `claude/aethon-arion-analysis-sr1ra4` into `main` in all 7 repos |
| 5 | Lock `db:reset` in production |
| 6 | Prebuilt machine image for nodes |
| 7 | Scale nodes automatically on the number of outstanding runs |
| 8 | SSH from your laptop (`SshCidr`) or Tailscale SSH |
| 9 | Stop arion-main when idle |
| 10 | In-app login for the analyst |
| 11 | Analyst lint: 43 old findings |
| 12 | Home setup on the Mac minis |
| 13 | Stopping rule based on the precision of differences, with the optimiser requesting more data |

### Notes on parked item 13

Convergence tests stop when each design's own mean is known to within a percentage of itself (`orgConfigConvergenceMargin`).
With performance around 38,000 and run-to-run spread around 3.6, that is met at `minOrgConfigs`, so the optimiser compares
designs with too few replicates to resolve differences of about 1 point (SimSet 2: purposeful vs random influence, +0.5 to
+1.9 with standard errors of 1 to 11; never above two standard errors). Proposed design: the optimiser classifies each
comparison as clearly better, clearly not worth it (below a minimum meaningful improvement) or undecided, and asks the
server for more paired replicates for undecided comparisons only (new `requiredOrgConfigs` on `convergence_test`), until
decided or `maxOrgConfigs`. Related: `gains.influence` `derivativeStepSize` 3e-6 produces identical outcomes under common
random numbers (gradient exactly 0); a larger step would give it a signal.
