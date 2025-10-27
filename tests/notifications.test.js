import { jest } from "@jest/globals";
import { scheduleReminder, clearAll } from "../src/notifications/scheduler.js";

afterEach(() => {
  clearAll();
});

test("schedules and logs notification", async () => {
  const logs = [];
  const spy = jest
    .spyOn(console, "log")
    .mockImplementation((...args) => logs.push(args.join(" ")));

  const now = () => 1_000_000;
  const at = new Date(1_000_000 + 30).toISOString();
  scheduleReminder("user-1", at, now);

  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(logs.join("\n")).toMatch(/NOTIFY userId=user-1/);
  spy.mockRestore();
});

test("throws on bad date", () => {
  expect(() => scheduleReminder("user-1", "nope")).toThrow("bad_date");
});

test("throws when scheduled in past", () => {
  const past = new Date(1000).toISOString();
  expect(() => scheduleReminder("user-1", past, () => 2000)).toThrow("in_past");
});

test("prevents duplicate reminders for same user/time", () => {
  const baseNow = () => 1_000_000;
  const at = new Date(1_000_000 + 1_000).toISOString();
  scheduleReminder("user-1", at, baseNow);
  expect(() => scheduleReminder("user-1", at, baseNow)).toThrow("duplicate");
});
