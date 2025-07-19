import { ServiceUnavailableError } from '@src/core/custom.errors';

export interface CircuitBreakerOptions {
  /**
   * Time in milliseconds to keep the circuit open
   * @default 10000 (10 seconds)
   */
  timeoutMs?: number;

  /**
   * Maximum number of failures before opening the circuit
   * @default 3
   */
  failureThreshold?: number;

  /**
   * Number of successful executions to close the circuit
   * @default 2
   */
  successThreshold?: number;

  /**
   * Name of the circuit for logging and identification
   * @default 'circuit'
   */
  name?: string;
}

interface CircuitState {
  failures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
  successCount: number;
}

/**
 * A circuit breaker implementation that stops execution of operations
 * when they fail too many times, giving the failing service time to recover.
 */
export class CircuitBreaker {
  private readonly states: Map<string, CircuitState> = new Map();
  private readonly options: Required<Omit<CircuitBreakerOptions, 'name'>> & {
    name: string;
  };

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      timeoutMs: options.timeoutMs ?? 10000, // 10 seconds
      failureThreshold: options.failureThreshold ?? 3,
      successThreshold: options.successThreshold ?? 2,
      name: options.name ?? 'circuit',
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param key A unique key to identify the circuit
   * @param operation The function to execute
   * @returns The result of the operation
   * @throws {ServiceUnavailableError} If the circuit is open
   */
  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const state = this.getState(key);
    const now = Date.now();

    // Check if circuit is open
    if (state.isOpen) {
      // Check if we should attempt to close the circuit
      if (state.lastFailureTime && now - state.lastFailureTime > this.options.timeoutMs) {
        this.setState(key, { ...state, isOpen: false, successCount: 0 });
      } else {
        const retryAfter = Math.ceil(
          (this.options.timeoutMs - (now - (state.lastFailureTime || 0))) / 1000
        );
        throw new ServiceUnavailableError(
          `Service ${key} is temporarily unavailable due to circuit breaker`,
          retryAfter,
          {
            retryAfter,
            circuit: key,
            state: 'open',
            lastFailure: state.lastFailureTime,
          }
        );
      }
    }

    try {
      const result = await operation();
      // On success, update the state
      const currentState = this.getState(key);
      const successCount = currentState.successCount + 1;

      // If we've had enough successes, reset the circuit
      if (successCount >= this.options.successThreshold) {
        this.setState(key, {
          failures: 0,
          lastFailureTime: null,
          isOpen: false,
          successCount: 0,
        });
      } else {
        this.setState(key, { ...currentState, successCount });
      }

      return result;
    } catch (error) {
      // On failure, update the state
      const currentState = this.getState(key);
      const failures = currentState.failures + 1;
      const isOpen = failures >= this.options.failureThreshold;

      this.setState(key, {
        failures,
        lastFailureTime: now,
        isOpen,
        successCount: 0,
      });

      throw error;
    }
  }

  /**
   * Get the current state of a circuit
   * @param key The circuit key
   * @returns The current state of the circuit
   */
  getState(key: string): CircuitState {
    return (
      this.states.get(key) || {
        failures: 0,
        lastFailureTime: null,
        isOpen: false,
        successCount: 0,
      }
    );
  }

  /**
   * Set the state of a circuit
   * @param key The circuit key
   * @param state The new state
   */
  private setState(key: string, state: CircuitState): void {
    this.states.set(key, state);
  }
}

/**
 * Create a simple circuit breaker for a specific operation
 * @param operation The operation to protect
 * @param options Circuit breaker options
 * @returns A function that wraps the operation with circuit breaker protection
 */
export function createCircuitBreaker<T, Args extends any[] = any[]>(
  operation: (...args: Args) => Promise<T>,
  options: CircuitBreakerOptions = {}
): (...args: Args) => Promise<T> {
  const breaker = new CircuitBreaker(options);
  const key = options.name || 'default';

  return async (...args: Args): Promise<T> => {
    return breaker.execute(key, () => operation(...args));
  };
}

// Default export for backward compatibility
export default createCircuitBreaker;
