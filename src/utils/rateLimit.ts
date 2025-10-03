export class RateLimiter {
  private queue: number[] = [];
  private maxRequests: number;
  private perMilliseconds: number;

  constructor(maxRequests: number, perMilliseconds: number) {
    this.maxRequests = maxRequests;
    this.perMilliseconds = perMilliseconds;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.queue = this.queue.filter(time => now - time < this.perMilliseconds);

    if (this.queue.length >= this.maxRequests) {
      const oldestRequest = this.queue[0];
      const waitTime = this.perMilliseconds - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.queue.push(now);
  }
}
