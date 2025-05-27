// サムネイル画像リクエスト用のグローバルキュー
// 最大同時実行数を制御し、キューのクリアも可能

export type RequestTask<T> = () => Promise<T>;

interface QueueItem<T> {
  task: RequestTask<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  abortController: AbortController;
}

export class RequestQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: QueueItem<any>[] = [];

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  setSetKey() {
    this.clear();
  }

  enqueue<T>(task: RequestTask<T>, abortController: AbortController): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject, abortController });
      this.runNext();
    });
  }

  private runNext() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) return;
      this.running++;
      item.task()
        .then((result) => {
          this.running--;
          item.resolve(result);
          this.runNext();
        })
        .catch((err) => {
          this.running--;
          item.reject(err);
          this.runNext();
        });
    }
  }

  clear() {
    // Abort all queued (not yet started) requests
    for (const item of this.queue) {
      item.abortController.abort();
      item.reject(new Error('Request cancelled by queue clear'));
    }
    this.queue = [];
  }
}

// グローバルなキューインスタンスを作成
export const globalRequestQueue = new RequestQueue(10); // 例: 同時10件まで 