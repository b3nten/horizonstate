import { Model } from "./mod";
import { useSyncExternalStore } from "react";

export function useModel<T extends Model<any>>(
  model: T,
): ReturnType<T["state"]>;

export function useModel<
  T extends Model<any>,
  Selector extends (state: ReturnType<T["state"]>) => any,
>(
  model: T,
  selector?: Selector,
): Selector extends (state: ReturnType<T["state"]>) => infer U
  ? U
  : ReturnType<T["state"]>;

export function useModel<
  T extends Model<any>,
  Selector extends (state: ReturnType<T["state"]>) => any,
>(model: T, selector?: Selector): ReturnType<T["state"]> {
  let actualSelector = selector ?? ((state: ReturnType<T["state"]>) => state);
  return useSyncExternalStore(
    (callback) => model.select(actualSelector, callback),
    () => actualSelector(model.state()),
    () => actualSelector(model.state()),
  );
}
