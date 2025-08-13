<div align="center">

<br />

<!--![horizonstate](/assets/banner.jpg)-->

<h1>horizonstate</h3>

#### transactional state management library

**horizonstate is a transactional state management library for JS with temporal ordering and automatic rollback**

</div>

> 🚧👷 **Warning** Proceed at your own risk. This is an in-development library, which is another way of saying that it will change _quite a lot_.

# Usage

Define a model:

```ts
import { Model } from "horizonstate";

let m = new Model({
  foo: "bar",
  pending: false,
});
```

Define transactions:

```ts
let setFoo = m.addTransaction(async (args: string, { optimistic, update }) => {
  // set state optimistically, which will be rolled back once this transaction completes
  optimistic(draft => {
    draft.foo = args;
    draft.pending = true;
  });
  let result = await someApiCall(args);
  // apply updates to the model
  update(model => {
    model.foo = result.foo;
  });
});
```

Run the transaction:

```ts
await setFoo.run("baz");
```

### License

Made with 💛

Published under [MIT License](./LICENSE).
