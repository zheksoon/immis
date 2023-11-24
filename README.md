# Immis

<p align="center">
    <img src="https://raw.githubusercontent.com/zheksoon/immis/master/assets/immis.png" alt="Immis logo" width="150" />
    <hr>
</p>

<p align="center">
    <img src="https://img.shields.io/bundlephobia/minzip/immis" alt="minzip size" />
    <img alt="GitHub" src="https://img.shields.io/github/license/zheksoon/immis" />
</p>

**Immis** is a **~1KB** immutable state management library for small and medium React applications. It's a lightweight alternative to Redux or Immer libraries, with zero boilerplate and a simple API.

Why **Immis**? The answer is short - **magic**. It allows you to use the immutable state as if it was mutable. You just mutate the state and get a new, immutable snapshot (much like Immer). Your subscribed components will get an update, like in Redux, but with zero boilerplate. You can also directly subscribe to state updates, or utilize the useSelector hook in your React components.

## Features:

- 🪄 **Magic** - use the immutable state as if it was mutable.
- 🖐️ **Simplicity** - the API is very simple and easy to use.
- 📦 **Immutability** - always get a new immutable object when the state is updated.
- 📚 **Batching** - all state mutations are batched, so the objects are cloned only once.
- 🪝 **Single hook** - easy React integration with `useSelector` hook
- 💾 **Memoization** - memoize selectors to prevent unnecessary re-renders.
- 🎈 **Tiny** - just around **1KB** gzipped.

## Installation

```bash
npm install immis

yarn add immis
```

## Introduction

Managing an immutable state in a React application isn't simple. You need to create a new immutable object every time you update the state, and it's not always easy. For example, to update a deeply nested object, cloning all the parent objects is necessary, which can be cumbersome. This is where **Immis** steps in. It enables you to work with an immutable state as if it were mutable. After each update, **Immis** takes care of cloning the changed objects for you, maintaining the state's immutability.

Furthermore, for small applications, the event-sourcing provided by Redux may be unnecessary. Mutating the state directly is much simpler, and **Immis** facilitates this process.

The **Immis** API is straightforward: create a store, and then update it directly. You can subscribe to store updates using the subscriptions `Set` object returned by the `createStore` function:

```js
import { createStore, useSelector } from "immis";

const { store, subscriptions } = createStore({ count: 0 });

subscriptions.add((newStore) => {
  console.log("updated store", newStore);
});

store.count += 1; // the subscriptions will be notified with the new store object
store.count += 1; // changes to count are batched until the end of the current microtask
```

A store can consist of arbitrarily nested objects and arrays, and you can use any built-in methods to update it.

```js
const { store } = createStore({
  todos: [{ text: "hello", done: false }],
  filter: "ALL",
});

store.todos.push({ text: "world", done: false });
store.todos[0].text = "bye";
store.todos[1].done = true;
store.todos.splice(0, 1);
store.filter = "DONE";
store.todos = store.todos.filter((todo) => !todo.done);
```

The only rule for **Immis** is that every object in the state tree must be unique; in other words, you cannot have one object as a child of multiple parent objects.

**Important:** at the moment, **Immis** supports only plain objects and arrays. It doesn't support Maps, Sets, or other data structures.

### Using with React

Use the `useSelector` hook to subscribe a component to store updates, which will trigger a re-render whenever the selected part of the store changes:

```js
import { useSelector } from "immis";

const Counter = () => {
  const count = useSelector(() => store.count);
  // the component now re-renders when the count changes
};
```

Note that the selector function you pass to the `useSelector` hook takes no arguments (actually [it does](#memoized-selectors) and can access any part of the store:

```js
const TodoList = () => {
  const todos = useSelector(() => store.todos);
  // the component now re-renders when any todo changes

  return todos.map((todo) => <Todo todo={todo} />);
};

const Todo = ({ todo }) => {
  const text = useSelector(() => todo.text);
  // the component now re-renders when only the todo text changes

  return <div>{text}</div>;
};
```

**Important:** Since the store's data is immutable, you frequently need memoization to prevent unnecessary re-renders. In the given example, all `Todo` components re-render with every `TodoList` re-render, regardless of changes in the `todo.text` value. Use the `React.memo` wrapper to circumvent this:

```js
const Todo = React.memo(({ todo }) => {
  const text = useSelector(() => todo.text);
  // the component now re-renders only when the todo text changes

  return <div>{text}</div>;
});
```

Please note that the result of the selector function [should be immutable](#dos-and-donts).

### Memoized selectors

If you need to do complex computations in the selector, there is a way to memoize it. The selector function takes an argument - a memo function. It has a signature similar to `createSelector` from `reselect`, but instead of input selectors you provide the input values themselves. The combintor function will be called only when the input values change:

```js
const TodoList = () => {
  const visibleTodos = useSelector((memo) =>
    memo(
      // specify dependencies for memoization
      store.todos,
      store.filter,
      // the combinator function takes dependencies as arguments
      (todos, filter) => todos.filter(makeFilter(filter))
    )
  );

  // the component now re-renders only when filtered todos are changed
  return todos.map((todo) => <Todo todo={visibleTodos} />);
};
```

The second argument of the `useSelector` hook is the equality check function. It's used to compare the result of previous selector value to the new one, so the component will re-render only when it returns `false`. By default it's `Object.is`, but there is also a built-in `shallowEquals` function - it handles primitive values, objects, and arrays:

```js
import { shallowEquals } from "immis";

const result = useSelector(
  () => someResult,
  // use built-in shallow equality function
  // now the result of the selector is checked by the function
  shallowEquals
);
```

You can specify your equality check function to handle more complex cases:

```js
const result = useSelector(
  (memo) => memo(...some_arguments),
  // specify your own equality check function
  (a, b) => a.length === b.length),
);
```

And... That's all! Now you know everything you need to use **Immis** in your application!

## Examples

### Simplest counter:

```js
import { createStore, useSelector } from "immis";

const { store } = createStore({ count: 0 });

const Counter = ({ counter }) => {
  const count = useSelector(() => counter.count);
  const increment = () => (counter.count += 1);
  const decrement = () => (counter.count -= 1);

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
};

root.render(<Counter counter={store} />);
```

[Codesandbox](https://codesandbox.io/s/immis-counter-k5m37v)

### Multiple counters:

It uses the `Counter` component from the example above.

```js
import { createStore, useSelector } from "immis";

const { store } = createStore({ counters: [{ count: 0 }, { count: 0 }] });

const Counters = () => {
  const counters = useSelector(() => store.counters);

  const addCounter = () => {
    counters.push({ count: 0 });
  };

  return (
    <div>
      <button onClick={addCounter}>Add counter</button>
      {counters.map((counter) => (
        <Counter counter={counter} />
      ))}
    </div>
  );
};

root.render(<Counters />);
```

[Codesandbox](https://codesandbox.io/s/immis-counter-list-h7x6nc)

### Todo list with filter:

An advanced example of Immis capabilities.

<details>
  <summary>Click to expand</summary>

```js
import React from "react";

import { createStore, useSelector } from "immis";

const { store } = createStore({ todos: [], filter: "ALL" });

let todoKey = 0;

const removeTodo = (key) => {
  store.todos = store.todos.filter((todo) => todo.key !== key);
};

const addTodo = () => {
  store.todos.push({ text: "", done: false, key: todoKey++ });
};

const clearDone = () => {
  store.todos = store.todos.filter((todo) => !todo.done);
};

const setFilter = (e) => {
  store.filter = e.target.value;
};

const statusFilter = (filter) => (todo) => {
  switch (filter) {
    case "DONE":
      return todo.done;

    case "UNDONE":
      return !todo.done;

    default:
      return true;
  }
};

export function TodoList() {
  const filter = useSelector(() => store.filter);
  
  const visibleTodos = useSelector((memo) =>
    memo(store.todos, store.filter, (todos, filter) =>
      todos.filter(statusFilter(filter))
    )
  );

  return (
    <div className="todo-list">
      <button onClick={addTodo}>Add todo</button>
      <button onClick={clearDone}>Clear done</button>
      <select value={filter} onChange={setFilter}>
        <option value="ALL">All</option>
        <option value="DONE">Done</option>
        <option value="UNDONE">Undone</option>
      </select>
      <div className="todos">
        {visibleTodos.map((todo) => (
          <Todo key={todo.key} todo={todo} todoKey={todo.key} />
        ))}
      </div>
    </div>
  );
}

const Todo = React.memo(({ todo, todoKey }) => {
  const setText = (e) => {
    todo.text = e.target.value;
  };

  const toggle = () => {
    todo.done = !todo.done;
  };

  const onRemove = () => {
    removeTodo(todoKey);
  };

  return (
    <div className="todo-item">
      <input type="checkbox" checked={todo.done} onChange={toggle} />
      <input type="text" value={todo.text} onChange={setText} />
      <button onClick={onRemove}>Remove</button>
    </div>
  );
});
```

</details>

[Codesandbox](https://codesandbox.io/s/immis-todo-list-qqqq73)

### Kanban board

A very advanced example of Immis capabilities in just 250 lines. It uses my [Snapdrag](https://github.com/zheksoon/snapdrag) drag-and-drop library and styled-components for styling.

[Codesandbox](https://codesandbox.io/p/sandbox/silly-bartik-y5z68c)

## Do's and don'ts

As **Immis** is a very simple library, there are not many rules to follow. However, there are some things you should be aware of:

1. **Don't cache objects from store**. Always get the object from the store before updating it. For example, the following code will not work as expected:

```js
const { store } = createStore({ todos: [] });

const todos = store.todos;

todos.push({ text: "hello" });

await Promise.resolve(); // the store is updated, so store.todos now is different object

todos.push({ text: "world" }); // the old reference to todos will not update the store
```

2. **Return immutable objects from selectors**. The result of the selector function should be immutable and don't change when there are no changes in the store. For example, the following code will cause unnecessary re-renders:

```js
const TodoList = () => {
  const todos = useSelector(() => [...store.todos]);
  // the output of the selector now changes on every store update
  // so the component re-renders on every store update

  return todos.map((todo) => <Todo todo={todo} />);
};
```

To prevent this, you can use the `shallowEquals` equality check function:

```js
import { shallowEquals } from "immis";

const TodoList = () => {
  const todos = useSelector(() => [...store.todos], shallowEquals);
  // the output of the selector now changes only when the todos array changes
  // so the component re-renders only when the todos array changes

  return todos.map((todo) => <Todo todo={todo} />);
};
```

3. **Don't store an object in multiple places**. Every object in the store should be unique. For example, the following code will not work as expected:

```js
const { store } = createStore({ todos: [] });

const todo = { text: "hello" };

store.todos.push(todo);
store.todos.push(todo); // updating the todo object will not work correctly
```

4. **Don't access multiple stores in a single selector**. The selector function should access only one store.

## Under the hood

**Immis** uses [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to intercept all updates to the store. When you update the store, **Immis** clones the updated object along with its ancestors before replacing the old objects with the new ones. Each `Proxy` is memoized in a `WeakMap` for fast access to the same object. Proxies are created lazily; parts of the store not accessed aren't wrapped, avoiding unnecessary "infection" of the store with proxies.

Each object in the store has an associated path from the root of the store. This is the main reason why you can't have one object as a child of multiple parent objects, as the object will have multiple paths. 

As built-in array methods may write to the object multiple times, batching is needed to make sure that the object is cloned only once. **Immis** uses `Promise.resolve().then()` to batch all updates until the end of the current microtask.

## Author

Eugene Daragan

## License

MIT
