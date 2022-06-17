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
