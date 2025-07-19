import EventEmitter from 'events';

import { INJECTABLES } from '@src/shared/enums/enums';

export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();
  private eventEmitter: EventEmitter;

  private constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  public get<T>(key: INJECTABLES): T {
    const found = this.services.has(key);
    // console.log(`[container.get] ${key} → ${found ? 'FOUND' : 'NOT FOUND'}`);
    if (!found) throw new Error(`Service ${key} not found in container`);
    return this.services.get(key) as T;
  }

  public has(key: INJECTABLES): boolean {
    return this.services.has(key);
  }

  public set<T>(key: INJECTABLES, instance: T): void {
    // console.log(`[container.set] Registering ${key} → ${instance?.constructor?.name}`);
    this.services.set(key, instance);
  }

  public clear(): void {
    this.services.clear();
  }

  public getEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}

export const container = Container.getInstance();
export default container;
