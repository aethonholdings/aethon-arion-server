// Runs before each e2e test file: the e2e suites use their own database, <ARION_DB_NAME or arion>_e2e, recreated
// empty by test/e2e-database.ts at the start of every run, so they never touch the working database and do not
// depend on data left by an earlier run.
if (!process.env.ARION_DB_NAME?.endsWith("_e2e")) process.env.ARION_DB_NAME = (process.env.ARION_DB_NAME || "arion") + "_e2e";
