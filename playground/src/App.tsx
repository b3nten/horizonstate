import { useEffect } from "react";
import { Model } from "../../src/mod";
import { useModel } from "../../src/react";

let sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let model = new Model({
  a: 1,
  b: {
    c: 3,
  },
});

let increment_a = model.addTransaction(
  async (_: void, { update, optimisticUpdate }) => {
    optimisticUpdate((model) => {
      model.a = model.a + 1;
    });
    await sleep(1000);
    update((model) => {
      model.a = model.a + 1;
    });
  },
);

let increment_b = model.addTransaction(
  async (_: void, { applyOptimisticUpdates, optimisticUpdate }) => {
    optimisticUpdate((model) => {
      model.b.c = model.b.c + 1;
    });
    await sleep(1000);
    applyOptimisticUpdates();
  },
);

export let AppRoot = () => {
  let state = useModel(model);

  let b = useModel(model, (m) => m.b);

  useEffect(() => {
    console.log("Model updated");
  }, [state]);

  useEffect(() => {
    console.log("Model.b updated");
  }, [b]);

  return (
    <div className="w-lg mx-auto p-4">
      <button className="btn btn-primary" onClick={() => increment_a.run()}>
        Increment A: {state.a}
      </button>
      <button className="btn btn-primary" onClick={() => increment_b.run()}>
        Increment B: {b.c}
      </button>
    </div>
  );
};
