import type { Model } from "./mod";
import { useSyncExternalStore } from "react";

type ModelState<T extends Model<any>> = ReturnType<T["state"]>;

/**
 * Use a model's state in a React component.
 * @param model The model to use.
 * @param selector Optional selector function to extract a specific part of the state.
 * @returns The selected state or the entire state if no selector is provided.
 */
export function useModel<T extends Model<any>>(model: T): ModelState<T>;
export function useModel<
  T extends Model<any>,
  Selector extends (state: ModelState<T>) => any,
>(
  model: T,
  selector?: Selector,
): Selector extends (state: ModelState<T>) => infer U ? U : ModelState<T>;
export function useModel<
  T extends Model<any>,
  Selector extends (state: ModelState<T>) => any,
>(model: T, selector?: Selector): ModelState<T> {
  let actualSelector = selector ?? ((state: ModelState<T>) => state);
  return useSyncExternalStore(
    (callback) => model.select(actualSelector, callback),
    () => actualSelector(model.state()),
    () => actualSelector(model.state()),
  );
}
