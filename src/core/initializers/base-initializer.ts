import { Container } from '../service.container';

/**
 * Base interface for all service initializers
 */
export interface Initializer {
  /**
   * Initialize services and register them in the container
   * @param container The dependency injection container
   */
  initialize(container: Container): Promise<void> | void;
}

/**
 * Interface for services that require cleanup logic
 */
export interface Cleanable {
  /**
   * Cleanup resources used by the service
   */
  cleanup(): Promise<void> | void;
}

export type Initializable = Initializer | (Initializer & Cleanable);
