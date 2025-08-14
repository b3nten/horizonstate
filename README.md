<div align="center">

<br />

![horizonstate](/.github/banner.jpg)

<h1>horizonstate</h3>

#### transactional state management library

**horizonstate is a transactional state management library for JS with temporal ordering and automatic rollback**

</div>

> 🚧👷 **Warning** Proceed at your own risk. This is an in-development library, which is another way of saying that it will change _quite a lot_.

## Overview

Horizonstate is a transactional state management library for JS that is designed to provide simple primitives for managing state without concern for response ordering or manual rollback of optimistic updates. It does this by saving a snapshot of the state before each transaction and recording mutations to the state via updator functions. These mutations can be replayed or dropped when prior transactions complete, ensuring that each update to the state is applied in the correct order.

## Usage

Define a model:

```ts
import { Model } from "horizonstate";

let m = new Model(
  {
    foo: "bar",
    pending: false,
  },
  // optional config:
  {
    timeout: 10000 // the minimum amount of time a transaction has to complete. Default: 10000ms
  }
);
```

Define transactions:

```ts
let setFoo = m.addTransaction(async (args: string, { optimisticUpdate, update, applyOptimisticUpdates }) => {
  // set state optimistically, which will be rolled back once this transaction completes
  optimisticUpdate(draft => {
    draft.foo = args;
    draft.pending = true;
  });
  let result = await someApiCall(args);
  // apply updates to the model
  update(draft => draft.foo = result.foo);
  // Or call applyOptimisticUpdates() if you're sure the optimistic updates will match the server state
});
```

Run the transaction:

```ts
setFoo.run("baz");
```

Transactions can await prior pending transactions:

```ts
model.addTransaction(async (args: any, { optimisticUpdate, update, pendingTransactions }) => {
  await pendingTransactions;
  // run transaction...
});
```

Transactions can read state from the model.
This state is the result of previous transactions (pending and resolved),
but does not reflect state updates from later transactions (temporal ordering is preserved).
Keep in mind if prior transactions complete or update the model after state() is called,
this state could be stale. It's generally advisable to await previous transactions if you
need to send state from the model to the server.

```ts
model.addTransaction(async (args: any, { optimisticUpdate, update, state }) => {
  let s = state();
  // continue with transaction...
});
```

You can also drop optimistic updates during your transaction, which will automatically roll them back:

```ts
model.addTransaction(async (args: any, { optimisticUpdate, update, dropOptimisticUpdates }) => {
  optimisticUpdate(draft => {
    draft.foo = args;
    draft.pending = true;
  });
  let result = await someApiCall(args);
  if(result.someCond) {
    // drop all prior optimistic updates
    dropOptimisticUpdates();
  }
  optimisticUpdate(draft => draft.error = true);
  let newResult = await someOtherApiCall(args);
  update(draft => draft.foo = newResult.foo);
});
```

Since optimistic updates are automatically rolled back, handling errors is simply
a matter of applying a different update if applicable.

```ts
model.addTransaction(async (args: any, { optimisticUpdate, update }) => {
  optimisticUpdate(draft => draft.foo = args)
  let result = await someApiCall(args);
  if(result.success) {
    update(draft => draft.foo = result.foo);
  } else {
    update(draft => draft.error = true);
  }
});
```

## React

Horizonstate exports a React hook for managing models inside of components.

```ts
import { model } from "./model.ts"
import { useModel } from 'horizonstate/react';

let Component = () => {
  let state = useModel(model);
  return <div>{state.foo}</div>;
};
```

useModel takes an additional argument for the model to use as a state selector to reduce rerenders.

```ts
let Component = () => {
  let bar_baz = useModel(model, (state) => state.bar.baz);
  return <div>{bar_baz}</div>;
};
```

### License

Made with 💛

Published under [MIT License](./LICENSE).
