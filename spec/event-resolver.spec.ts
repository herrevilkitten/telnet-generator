import "jasmine";
import { EventResolver } from "../src/event-resolver";

describe("event-resolver", () => {
  let eventResolver: EventResolver<string>;

  beforeEach(() => {
    eventResolver = new EventResolver<string>();
  });

  it("should shift the event list if an item exists", async () => {
    eventResolver.add("hello");
    const next = await eventResolver.next();
    expect(next).toBe("hello");
  });

  it("should use the resolve function if an item as added after", (done) => {
    const promise = eventResolver.next();
    promise.then((value) => {
      expect(value).toBe("hello");
      done();
    });
    eventResolver.add("hello");
  });
});
