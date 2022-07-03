/**
 * EventResolver is an asynchronous queueing system always returns a Promise when waiting for the next event.
 * If there is already a value in the internal queue, it is shifted out of the queue and used to resolve the promise.
 * If the queue is empty, then the Promise is pushed onto a separate internal queue.
 * 
 * When items are added to the resolver, the Promise 
 */
export class EventResolver<EventType> {
  private eventList: EventType[] = [];
  private resolveList: Array<(value: EventType | PromiseLike<EventType>) => void> = [];

  add(event: EventType) {
    if (this.resolveList.length > 0) {
      const resolve = this.resolveList.shift();
      if (resolve) {
        resolve(event);
      }
    } else {
      this.eventList.push(event);
    }
  }

  next() {
    return new Promise<EventType>((resolve) => {
      const event = this.eventList.shift();
      if (event) {
        resolve(event);
      } else {
        this.resolveList.push(resolve);
      }
    });
  }
}
