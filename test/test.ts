import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  create_test_model,
  wait_for_update,
  delay,
  create_mock_api,
  assert_state_equals,
} from "./helpers.js";

describe("Model", () => {
  describe("basic functionality", () => {
    it("should create model with initial state", () => {
      let model = create_test_model();
      let state = model.state();

      assert.equal(state.count, 0);
      assert.equal(state.name, "test");
      assert.deepEqual(state.items, []);
    });

    it("should return same reference for unchanged state", () => {
      let model = create_test_model();
      let state1 = model.state();
      let state2 = model.state();

      assert.strictEqual(state1, state2);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers on state change", async () => {
      let model = create_test_model();
      let notification_count = 0;
      let last_state: any = null;

      let unsubscribe = model.subscribe((state) => {
        notification_count++;
        last_state = state;
      });

      model.runInline(({ update }) => {
        update((draft: any) => {
          draft.count = 42;
        });
      });

      await wait_for_update();

      assert.equal(notification_count, 1);
      assert.equal(last_state.count, 42);

      unsubscribe();
    });

    it("should unsubscribe properly", async () => {
      let model = create_test_model();
      let notification_count = 0;

      let unsubscribe = model.subscribe(() => {
        notification_count++;
      });

      model.runInline(({ update }) => {
        update((draft: any) => {
          draft.count = 1;
        });
      });
      await wait_for_update();
      assert.equal(notification_count, 1);

      unsubscribe();

      model.runInline(({ update }) => {
        update((draft: any) => {
          draft.count = 2;
        });
      });

      await wait_for_update();
      assert.equal(notification_count, 1);
    });
  });
});

describe("Transactions", () => {
  describe("basic execution", () => {
    it("should execute simple transaction", async () => {
      let model = create_test_model();

      let set_count = model.addTransaction(
        async (value: number, { update }) => {
          update((draft: any) => {
            draft.count = value;
          });
        },
      );

      set_count.run(99);
      await wait_for_update();

      assert.equal(model.state().count, 99);
    });
  });

  describe("optimistic updates", () => {
    it("should apply optimistic updates immediately", async () => {
      let model = create_test_model();

      let optimistic_update = model.addTransaction(
        async (_, { optimisticUpdate }) => {
          optimisticUpdate((draft: any) => {
            draft.count = 100;
          });
          await delay(20);
        },
      );

      optimistic_update.run();
      await delay(5);
      assert.equal(model.state().count, 100);
    });

    it("should rollback optimistic updates when transaction completes", async () => {
      let model = create_test_model();

      let rollback_test = model.addTransaction(
        async (_, { optimisticUpdate, update }) => {
          optimisticUpdate((draft: any) => {
            draft.count = 100;
          });

          await delay(20);

          update((draft: any) => {
            draft.count = 50;
          });
        },
      );

      rollback_test.run();
      await delay(5);
      assert.equal(model.state().count, 100);
      await delay(30);
      assert.equal(model.state().count, 50);
    });
  });
});

describe("Transaction Ordering", () => {
  describe("concurrent execution", () => {
    it("should run transactions concurrently but apply updates with immediate feedback", async () => {
      let model = create_test_model();
      let execution_order: number[] = [];
      let update_order: number[] = [];

      let transaction1 = model.addTransaction(async (_, { update }) => {
        await delay(20);
        execution_order.push(1);
        update((draft: any) => {
          update_order.push(1);
          draft.count = 10;
        });
      });

      let transaction2 = model.addTransaction(async (_, { update }) => {
        await delay(10);
        execution_order.push(2);
        update((draft: any) => {
          update_order.push(2);
          draft.count = 20;
        });
      });

      transaction1.run();
      transaction2.run();

      await delay(35);

      assert.deepEqual(execution_order, [2, 1]);

      // Update order shows: [2, 1, 2]
      // - First 2: T2 applies immediately when it completes
      // - 1: T1 applies when it completes
      // - Second 2: Final ordered processing ensures T2 wins (transaction order consistency)
      assert.deepEqual(update_order, [2, 1, 2]);

      // Final state should be from t2 (later in transaction order)
      assert.equal(model.state().count, 20);
    });

    it("should provide correct state to each transaction", async () => {
      let model = create_test_model();
      let state_snapshots: Array<{ id: number; count: number }> = [];

      let transaction1 = model.addTransaction(async (_, { state, update }) => {
        state_snapshots.push({ id: 1, count: state().count });
        await delay(10);
        update((draft: any) => {
          draft.count = 100;
        });
      });

      let transaction2 = model.addTransaction(async (_, { state, update }) => {
        state_snapshots.push({ id: 2, count: state().count });
        await delay(10);
        update((draft: any) => {
          draft.count = 200;
        });
      });

      transaction1.run();
      transaction2.run();

      await delay(30);

      let snapshot1 = state_snapshots.find((s) => s.id === 1);
      let snapshot2 = state_snapshots.find((s) => s.id === 2);

      assert.equal(snapshot1?.count, 0);
      assert.equal(snapshot2?.count, 0);
      assert.equal(model.state().count, 200);
    });
  });

  describe("pending_transactions promise", () => {
    it("should resolve immediately when no previous transactions", async () => {
      let model = create_test_model();
      let pending_resolved = false;

      let transaction = model.addTransaction(
        async (_, { pendingTransactions }) => {
          await pendingTransactions;
          pending_resolved = true;
        },
      );

      transaction.run();
      await delay(10);

      assert.equal(pending_resolved, true);
    });

    it("should wait for previous transactions to complete", async () => {
      let model = create_test_model();
      let t2_started = false;

      let transaction1 = model.addTransaction(async () => {
        await delay(20);
      });

      let transaction2 = model.addTransaction(
        async (_, { pendingTransactions }) => {
          await pendingTransactions;
          t2_started = true;
        },
      );

      transaction1.run();
      transaction2.run();

      await delay(10);
      assert.equal(t2_started, false);

      await delay(30);
      assert.equal(t2_started, true);
    });
  });

  describe("optimistic updates with ordering", () => {
    it("should maintain proper order with optimistic updates", async () => {
      let model = create_test_model();
      let state_history: number[] = [];

      let unsubscribe = model.subscribe((state: any) => {
        state_history.push(state.count);
      });

      let transaction1 = model.addTransaction(
        async (_, { optimisticUpdate, update }) => {
          optimisticUpdate((draft: any) => {
            draft.count = 100;
          });
          await delay(15);
          update((draft: any) => {
            draft.count = 10;
          });
        },
      );

      let transaction2 = model.addTransaction(
        async (_, { optimisticUpdate, update }) => {
          optimisticUpdate((draft: any) => {
            draft.count = 200;
          });
          await delay(10);
          update((draft: any) => {
            draft.count = 20;
          });
        },
      );

      transaction1.run();
      await delay(5);
      transaction2.run();

      await delay(25);
      unsubscribe();

      assert.ok(state_history.includes(100)); // t1 optimistic
      assert.ok(state_history.includes(200)); // t2 optimistic
      assert.equal(model.state().count, 20); // Final ordered state
    });

    it("should handle mixed optimistic and regular updates", async () => {
      let model = create_test_model();

      let transaction1 = model.addTransaction(async (_, { update }) => {
        await delay(15);
        update((draft: any) => {
          draft.count = 5;
        });
      });

      let transaction2 = model.addTransaction(
        async (_, { optimisticUpdate, update }) => {
          optimisticUpdate((draft: any) => {
            draft.count = 99;
          });
          await delay(10);
          update((draft: any) => {
            draft.count = 10;
          });
        },
      );

      transaction1.run();
      transaction2.run();

      await delay(5);
      assert.equal(model.state().count, 99);

      await delay(20);
      assert.equal(model.state().count, 10);
    });
  });
});

describe("Error Handling", () => {
  it("should handle transaction function errors", async () => {
    let model = create_test_model();
    let original_state = { ...model.state() };

    let failing_transaction = model.addTransaction(async () => {
      throw new Error("Transaction failed");
    });

    failing_transaction.run();
    await delay(20);

    assert_state_equals(model.state(), original_state);
  });

  it("should handle subscription callback errors", async () => {
    let model = create_test_model();
    let error_thrown = false;

    let unsubscribe = model.subscribe(() => {
      if (!error_thrown) {
        error_thrown = true;
        throw new Error("Callback error");
      }
    });

    model.runInline(({ update }) => {
      update((draft: any) => {
        draft.count = 1;
      });
    });
    await wait_for_update();

    model.runInline(({ update }) => {
      update((draft: any) => {
        draft.count = 2;
      });
    });
    await wait_for_update();

    assert.equal(model.state().count, 2);
    unsubscribe();
  });

  it("should handle API errors gracefully", async () => {
    let model = create_test_model();
    let failing_api = create_mock_api(10, true);

    let error_handling_transaction = model.addTransaction(
      async (_, { optimisticUpdate, update }) => {
        optimisticUpdate((draft: any) => {
          draft.name = "loading";
        });

        try {
          await failing_api("data");
        } catch (error) {
          update((draft: any) => {
            draft.name = "error";
          });
        }
      },
    );

    error_handling_transaction.run();

    await delay(5);
    assert.equal(model.state().name, "loading");

    await delay(20);
    assert.equal(model.state().name, "error");
  });
});
