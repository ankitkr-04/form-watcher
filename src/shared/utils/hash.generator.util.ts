import { createHash } from 'crypto';

import { ContentNormalizer } from './content.normalizer.util';

export class HashGenerator {
  constructor() {}

  public generate(content: string): string {
    const normalized = ContentNormalizer.normalizeText(content);
    const hash = createHash('sha256');
    hash.update(normalized);
    return hash.digest('hex');
  }
}
