import { DataSource, EntityManager, QueryFailedError } from "typeorm";

/** MySQL/MariaDB error numbers that indicate transient lock contention; the transaction can be retried. */
const RETRYABLE_ERRNOS: number[] = [1205 /* ER_LOCK_WAIT_TIMEOUT */, 1213 /* ER_LOCK_DEADLOCK */];

export function isRetryableTransactionError(error: any): boolean {
    const driverError: any = error instanceof QueryFailedError ? (error as any).driverError ?? error : error;
    return RETRYABLE_ERRNOS.includes(driverError?.errno);
}

/**
 * Runs `work` in a READ COMMITTED database transaction and re-runs the whole transaction (with jittered exponential backoff) when
 * it fails on a deadlock or lock wait timeout. `work` must be safe to re-run, i.e. all of its side effects must
 * happen through the supplied entity manager.
 */
export async function withTransactionRetry<T>(
    dataSource: DataSource,
    work: (tEntityManager: EntityManager) => Promise<T>,
    attempts: number = 4,
    baseDelayMs: number = 25
): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            // READ COMMITTED: every statement sees the latest committed data. Under the MySQL default (REPEATABLE
            // READ) a transaction keeps reading the snapshot taken at its first read, so aggregates computed after
            // waiting for a row lock would miss the rows committed by the transaction that held it.
            return await dataSource.transaction("READ COMMITTED", work);
        } catch (error) {
            lastError = error;
            if (!isRetryableTransactionError(error) || attempt === attempts - 1) throw error;
            const delay = baseDelayMs * 2 ** attempt * (0.5 + Math.random());
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
