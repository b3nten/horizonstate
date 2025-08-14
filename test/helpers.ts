import { strict as assert } from "node:assert";
import { Model } from "../src/mod.js";

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const wait_for_update = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });

export const create_test_model = () => {
  return new Model({
    count: 0,
    name: "test",
    items: [] as string[],
  });
};

export const create_mock_api = (delay_ms: number = 10, should_fail = false) => {
  return async (data: any) => {
    await delay(delay_ms);
    if (should_fail) {
      throw new Error("Mock API error");
    }
    return { success: true, data };
  };
};

export const assert_state_equals = (actual: any, expected: any) => {
  assert.deepStrictEqual(actual, expected);
};

export const wait_for_condition = async (
  condition: () => boolean,
  timeout_ms = 100,
  check_interval = 5,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout_ms) {
    if (condition()) return true;
    await delay(check_interval);
  }
  return false;
};
