import { Cleanable, Initializable } from '../initializers/base-initializer';
import { Container } from '../service.container';

function isCleanable(initializer: Initializable): initializer is Initializable & Cleanable {
  return 'cleanup' in initializer && typeof initializer.cleanup === 'function';
}

export class ServiceLifecycleManager {
  constructor(
    private readonly container: Container,
    private readonly initializers: Initializable[]
  ) {}

  public async initialize(): Promise<void> {
    for (const initializer of this.initializers) {
      await initializer.initialize(this.container);
    }
  }

  public async cleanup(): Promise<void> {
    for (let i = this.initializers.length - 1; i >= 0; i--) {
      const initializer = this.initializers[i];
      if (isCleanable(initializer)) {
        await initializer.cleanup();
      }
    }
    this.container.clear();
  }
}
