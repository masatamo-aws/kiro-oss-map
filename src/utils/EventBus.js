import { Logger } from './Logger.js';

/**
 * Simple event bus for component communication
 */
export class EventBus {
  static events = new Map();

  static on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  static off(event, callback) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  static emit(event, data = null) {
    if (!this.events.has(event)) return;
    
    this.events.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        Logger.error(`Error in event handler for ${event}`, error, 'event-bus');
      }
    });
  }

  static clear(event = null) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}