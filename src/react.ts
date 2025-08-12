import type { Objectish } from "immer";
import { Model } from "./mod";
import { useSyncExternalStore } from "react";

type ReactModel<T extends Objectish> = {
  (): T;
  <Selector extends (state: T) => any>(
    selector: Selector,
  ): Selector extends (state: T) => infer U ? U : T;
  model: Model<T>;
};

export let model = <T extends Objectish>(state: T) => {
  let model = new Model(state);

  function hook(): T;
  function hook<Selector extends (state: T) => any>(
    selector: Selector,
  ): Selector extends (state: T) => infer U ? U : T;
  function hook<Selector extends (state: T) => any>(selector?: Selector) {
    const actualSelector = selector ?? ((state: T) => state);
    return useSyncExternalStore(
      (callback) => model.select(actualSelector, callback),
      () => actualSelector(model.state()),
      () => actualSelector(model.state()),
    );
  }
  hook.model = model;

  return hook as unknown as ReactModel<T>;
};

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
