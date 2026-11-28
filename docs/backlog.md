# Arion backlog

Features identified for the Arion packages (core, pipeline, c1, db, server, node, analyst) and their AWS deployment.
Last updated 2026-11-28.

## Open

None.

## Done

| Item | Where |
|---|---|
| Redeploy arion-main with the latest code (Monitor page, progress endpoint, control experiments, fleet control) | Deployed 2026-11-28 |
| An update command for arion-main | `deploy/aws/update.sh` |
| `deploy/aws` README | `deploy/aws/README.md` |
| Scale the node fleet from the analyst's Monitor page | `GET/PUT /arion/fleet`; Monitor page, Node fleet |

## Planned: node features

Four phases, each deployable on its own (server and analyst with `deploy/aws/update.sh`; node changes reach the
fleet when instances are replaced: scale to 0 and back, or a new image after step 4.3). Every step lists the packages
it changes and how it is tested. Sizes: S about half a day, M about a day.

Background: a simulation is one CPU-bound loop that blocks the node process's single event loop, so nothing else
(heartbeat, cancellation, commands) can run during a run. Step 1.1 moves simulation into a worker thread, which
steps 1.3, 2.3, 2.4 and 3.1 depend on. Phase 2 is shaped by the 2026-11-28 overload: retries every 2 s from 12
processes, about 850 run tickets that were never completed, and no way to see or stop a stuck process.

### Phase 1: visibility

| Step | Change | Packages | Tests | Size |
|---|---|---|---|---|
| 1.1 Worker thread (**done**) | Simulation runs in a `worker_threads` worker; the main thread talks to the server. Messages: run, progress (every N ticks), result, error, cancel | node | Results identical to in-process runs for the same seeds; cancel stops the worker within a second; a worker crash is reported as a failed run | M |
| 1.2 Process identity (**done**) | Node id `<machine id>:<EC2 instance id or hostname>:<process index>` (pm2 `NODE_APP_INSTANCE`) instead of a random number; the server's node id check already accepts any suffix | node | Id format; ids distinct across pm2 processes | S |
| 1.3 Heartbeat (**done**) | Every 10 s, `POST /arion/node/heartbeat` (node key): state (idle, simulating, posting, backing off, draining), current run and % done, runs completed and failed, average run time, last error, memory, uptime, code version. Stored in a new `node_process` table (one row per process, pruned after a day). The reply carries commands (empty until 3.1) | node, server, db (migration) | Unit: payload, reply handling. e2e: heartbeat stored and updated; unknown key 401; stale rows pruned | M |
| 1.4 Version reporting (**done**; Monitor flag in 1.5) | The node build records its git commit; the server knows the node commit deployed on the main instance (written by `main-setup.sh`) and flags processes running another | node, server, deploy | Version in heartbeat; mismatch flag | S |
| 1.5 Monitor: processes | Node fleet panel lists processes under their instance: state, current run with progress bar, last heartbeat (flagged when over 30 s), version flag. Progress tiles add average run time | server (progress), analyst | Unit; smoke route with recorded heartbeats | M |

Done when: the Monitor shows every process of every instance, what it is doing and how far it is, and flags a silent
or outdated process within 30 s.

### Phase 2: robustness

| Step | Change | Packages | Tests | Size |
|---|---|---|---|---|
| 2.1 Backoff with jitter | After an error or timeout, wait min(60 s, 2 s x 2^k) x U(0.5, 1.5) before the next request; reset on success | node | Delay sequence; reset; the loop never stops | S |
| 2.2 Run leases | `run.leaseExpiresAt` set at dispatch (from the measured run time, at least 10 min) and renewed by heartbeats for the run in progress. `next()` reissues expired runs (same run index, so the same random streams) before creating new ones, so unanswered dispatches no longer pile up; late results are still accepted (idempotent by run id) | server, db (migration) | e2e: expired run reissued with the same seeds; renewed lease kept; dispatched-without-result count stays bounded under client timeouts | M |
| 2.3 Cancellation | The heartbeat reply lists runs to stop (sim config converged or failed, SimSet deleted); the node stops the worker and takes the next job | server, node | e2e: converged sim config cancels in-flight runs; node unit: cancel path | S |
| 2.4 Spot drain | On EC2 the node polls the instance metadata for the 2-minute interruption notice; on notice it stops taking work, cancels its run, releases the lease (`POST /arion/run/:id/release`) and exits | node, server | Unit with a stub metadata service; e2e: released run is dispatched again at once | S |
| 2.5 Local result buffer | A result that cannot be posted is written to disk and posted before new work is taken | node | Unit: buffered across a restart, posted once, removed after success | S |
| 2.6 Self-check | A process exits after N consecutive failures or memory above a limit; pm2 restarts it; repeated restarts mark the instance unhealthy so the Auto Scaling group replaces it | node, deploy (permission) | Unit: thresholds | S |

Done when: stopping the server for 5 minutes with nodes running loses no work, the retry rate stays low, and run
tickets without results do not accumulate.

### Phase 3: control from the analyst

| Step | Change | Packages | Tests | Size |
|---|---|---|---|---|
| 3.1 Remote commands | Drain, pause, resume, restart, set processes per instance; addressed to a process, an instance or the fleet; queued on the server, delivered in heartbeat replies, acknowledged. Buttons on the Monitor | server, db, node, analyst | e2e: command delivered once and acknowledged; node unit per command | M |
| 3.2 Idle auto-stop | Every minute the server checks: fleet above 0, no dispatchable work and no runs in flight for N minutes (`fleet.idleStopMinutes`, default 15) means scale to 0. The Monitor shows the countdown | server, analyst | Unit with fake clock and fleet | S |
| 3.3 Fleet size suggestion | From outstanding work, average run time and processes per instance, the Monitor suggests a fleet size for a chosen finish time | server (progress), analyst | Unit | S |

Done when: a run can be drained, paused and resumed from the Monitor, and a fleet left on with no work stops itself.

### Phase 4: throughput and start-up

| Step | Change | Packages | Tests | Size |
|---|---|---|---|---|
| 4.1 Long polling | `GET /arion/sim-config/next?wait=25`: with no work the server waits up to 25 s, checking every 2 s, before answering empty; idle nodes stop polling every 2 s | server, node | e2e: answers as soon as work appears; empty after the wait | S |
| 4.2 Several runs per request | `GET /arion/sim-config/next-batch?count=k` returns up to k runs; the node keeps a small local queue sized to its processes | server, node | e2e: k distinct run tickets; leases per run | S |
| 4.3 Prebuilt node image | `deploy/aws/bake-node-image.sh` makes an image from a ready node and points the launch template at it (template parameter `NodeImage`, default the plain Ubuntu image); node setup skips installing and building when its image already has the deployed commit | deploy, template | New instance takes work within about 1 minute; falls back to a full build on a commit change | M |

Done when: a node takes work within about a minute of launch, and an idle fleet makes about one request per process
every 25 s.

### Order

Phase 1 first (1.1 is the foundation), then phase 2, then 3.2 on its own (small, cost guard), then the rest of
phase 3 and phase 4. The plan absorbs two formerly parked items: the prebuilt node image (4.3) and scaling on
outstanding work (3.2, 3.3).

## Parked

| # | Item |
|---|---|
| 1 | Merge `claude/aethon-arion-analysis-sr1ra4` into `main` in all 7 repos |
| 2 | Lock `db:reset` in production |
| 3 | SSH from your laptop (`SshCidr`) or Tailscale SSH |
| 4 | Stop arion-main when idle |
| 5 | In-app login for the analyst |
| 6 | Analyst lint: 43 old findings |
| 7 | Home setup on the Mac minis |
| 8 | Stopping rule based on the precision of differences, with the optimiser requesting more data |

### Notes on parked item 8

Convergence tests stop when each design's own mean is known to within a percentage of itself (`orgConfigConvergenceMargin`).
With performance around 38,000 and run-to-run spread around 3.6, that is met at `minOrgConfigs`, so the optimiser compares
designs with too few replicates to resolve differences of about 1 point (SimSet 2: purposeful vs random influence, +0.5 to
+1.9 with standard errors of 1 to 11; never above two standard errors). Proposed design: the optimiser classifies each
comparison as clearly better, clearly not worth it (below a minimum meaningful improvement) or undecided, and asks the
server for more paired replicates for undecided comparisons only (new `requiredOrgConfigs` on `convergence_test`), until
decided or `maxOrgConfigs`. Related: `gains.influence` `derivativeStepSize` 3e-6 produces identical outcomes under common
random numbers (gradient exactly 0); a larger step would give it a signal.
