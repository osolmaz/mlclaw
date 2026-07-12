import { randomBytes } from "node:crypto";

export type DelegatedSnapshotEvent = {
  api_version: "brokerkit.io/operator-ui/v1";
  cursor: string;
  changed: boolean;
};

type Waiter = {
  resolve(value: DelegatedSnapshotEvent): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
  signal?: AbortSignal;
  abort?: (this: void) => void;
};

export class DelegatedRevisions<T> {
  private readonly epoch = randomBytes(16).toString("base64url");
  private revision = 0;
  private material = "";
  private current: T | undefined;
  private readonly waiters = new Set<Waiter>();

  publish(material: string, value: (cursor: string) => T): T {
    if (this.current && material === this.material) return this.current;
    this.material = material;
    this.revision += 1;
    this.current = value(this.cursor());
    for (const waiter of [...this.waiters])
      this.finish(waiter, { api_version: "brokerkit.io/operator-ui/v1", cursor: this.cursor(), changed: true });
    return this.current;
  }

  wait(cursor: string, waitSeconds: number, signal?: AbortSignal): Promise<DelegatedSnapshotEvent> {
    const observed = this.parse(cursor);
    if (observed === undefined) return Promise.reject(revisionError("cursor_expired"));
    if (observed !== this.revision) {
      return Promise.resolve({ api_version: "brokerkit.io/operator-ui/v1", cursor: this.cursor(), changed: true });
    }
    if (this.waiters.size >= 256) return Promise.reject(revisionError("source_unavailable"));
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.finish(waiter, { api_version: "brokerkit.io/operator-ui/v1", cursor: this.cursor(), changed: false });
        }, waitSeconds * 1_000),
        ...(signal ? { signal } : {}),
      };
      waiter.timer.unref();
      if (signal) {
        waiter.abort = () => this.fail(waiter, abortError());
        signal.addEventListener("abort", waiter.abort, { once: true });
      }
      this.waiters.add(waiter);
    });
  }

  private cursor(): string {
    return `${this.epoch}.${this.revision.toString(36)}`;
  }

  private parse(value: string): number | undefined {
    const match = /^([A-Za-z0-9_-]{22})\.([0-9a-z]{1,13})$/u.exec(value);
    if (!match || match[1] !== this.epoch) return undefined;
    const revision = Number.parseInt(match[2] ?? "", 36);
    return Number.isSafeInteger(revision) && revision <= this.revision ? revision : undefined;
  }

  private finish(waiter: Waiter, value: DelegatedSnapshotEvent): void {
    this.cleanup(waiter);
    waiter.resolve(value);
  }

  private fail(waiter: Waiter, error: Error): void {
    this.cleanup(waiter);
    waiter.reject(error);
  }

  private cleanup(waiter: Waiter): void {
    if (!this.waiters.delete(waiter)) return;
    clearTimeout(waiter.timer);
    if (waiter.signal && waiter.abort) waiter.signal.removeEventListener("abort", waiter.abort);
  }
}

function revisionError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

function abortError(): Error {
  return new DOMException("The operation was aborted", "AbortError");
}
