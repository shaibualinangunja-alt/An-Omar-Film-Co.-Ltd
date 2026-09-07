export class AiCache {
  private cache: Map<string, any> = new Map();

  generateKey(mediaId: string, task: string, modelId?: string, extraParams?: string): string {
    return `${mediaId}_${task}_${modelId || 'default'}_${extraParams || ''}`;
  }

  get(key: string): any | null {
    return this.cache.get(key) || null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, data);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateMedia(mediaId: string): void {
    const keysToRemove: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${mediaId}_`)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(k => this.cache.delete(k));
  }
}

export const aiCache = new AiCache();
