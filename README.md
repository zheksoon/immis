# Immis

<p align="center">
    <img src="https://raw.githubusercontent.com/zheksoon/immis/master/assets/immis.png" alt="Immis logo" width="200" />
    <hr>
</p>

**Immis** is a **~1KB** library designed for managing immutable state in React applications. It's designed to be a state management library for small React applications, offering a lightweight alternative to bulky Redux or Immer libraries.

Why **Immis**? The answer is short - **magic**. It allows you to use the immutable state as if it was mutable, without any boilerplate code and limitations. You can directly subscribe to state updates, or utilize the useSelector hook in your React components.

## Features:

- 🪄 **Magic** - use the immutable state as if it was mutable.
- 🖐️ **Simplicity** - the API is very simple and easy to use.
- 📦 **Immutability** - always get a new immutable object when the state is updated.
- 📚 **Batching** - all state mutations are batched, so the immutable objects are cloned only once.
- 🪝 **Single hook** - `useSelector` React hook for using the immutable state in components.
- 🎈 **Tiny** - less than **1KB** gzipped.

## Installation

```bash
npm install immis

yarn add immis
```

## Introduction

Managing an immutable state in a React application isn't simple. You need to create a new immutable object every time you update the state, and it's not always easy. For example, to update a deeply nested object, cloning all the parent objects is necessary, which can be cumbersome. This is where **Immis** steps in. It enables you to work with an immutable state as if it were mutable. After each update, **Immis** takes care of cloning the changed objects for you, maintaining the state's immutability.

Furthermore, for small applications, the event-sourcing provided by Redux may be unnecessary. Mutating the state directly is much simpler, and **Immis** facilitates this process.

The **Immis** API is straightforward: create a store, and then update it directly. You can subscribe to store updates using the subscriptions Set object returned by the `createStore` function:

```js
import { createStore, useSelector } from "immis";

const { store, subscriptions } = createStore({ count: 0 });

subscriptions.add((newStore) => {
  console.log('updated store', newStore);
});

store.count += 1; // the subscriptions will be notified with the new store object
store.count += 1; // changes to count are batched untill the end of the current microtask
```

A store can consist of arbitrarily nested objects and arrays, and you can use any built-in methods to update it.

```js
const { store } = createStore({ todos: [{ text: 'hello', done: false }] });

store.todos.push({ text: 'world', done: false });
store.todos[0].text = 'bye';
store.todos[1].done = true;
store.todos.splice(0, 1);
store.todos = store.todos.filter(todo => !todo.done);
```

The only rule for **Immis** is that every object in the state tree must be unique; in other words, you cannot have one object as a child of multiple parent objects.

### Using with React

Use the `useSelector` hook to subscribe a component to store updates, which will trigger a re-render whenever the selected part of the store changes:

```js
import { useSelector } from "immis";

const Counter = () => {
  const count = useSelector(() => store.count);
  // the component now re-renders when the count changes
}
```

Note that the selector function you pass to the `useSelector` hook takes no arguments and has access to any part of the store:

```js
const TodoList = () => {
  const todos = useSelector(() => store.todos);
  // the component now re-renders when any todo changes
  
  return todos.map(todo => <Todo todo={todo} />);
}

const Todo = ({ todo }) => {
  const text = useSelector(() => todo.text);
  // the component now re-renders when only the todo text changes

  return <div>{text}</div>;
}
```

**Important note:** Since the store's data is immutable, you frequently need memoization to prevent unnecessary re-renders. In the given example, all `Todo` components re-render with every `TodoList` re-render, regardless of changes in the `todo.text` value. Use the `React.memo` wrapper to circumvent this:

Please note that the result of the selector function [should be immutable](#dos-and-donts).

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

import { createStore, useSelector } from "./immis";

const { store } = createStore({ todos: [], filter: "ALL" });

let todoKey = 0;

const removeTodo = (key) => {
  store.todos = store.todos.filter((todo) => todo.key !== key);
};

const addTodo = () => {
  store.todos.push({ text: "", done: false, key: todoKey++ });
};

const clearDone = () => {
  store.store.todos = store.todos.filter((todo) => !todo.done);
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
  const todos = useSelector(() => store.todos);
  const filter = useSelector(() => store.filter);

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
        {todos.filter(statusFilter(filter)).map((todo) => (
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

## Do's and don'ts

As **Immis** is a very simple library, there are not many rules to follow. However, there are some things you should be aware of:

1) **Don't cache objects from store**. Always get the object from the store before updating it. For example, the following code will not work as expected:

```js
const { store } = createStore({ todos: [] });

const todos = store.todos;

todos.push({ text: 'hello' });

await Promise.resolve();  // the store is updated, so store.todos now is different object

todos.push({ text: 'world' }); // the old reference to todos will not update the store
```

2) **Return immutable objects from selectors**. The result of the selector function should be immutable and don't change when there are no changes in the store. For example, the following code will cause unnecessary re-renders:

```js
const TodoList = () => {
  const todos = useSelector(() => [...store.todos]);
  // the outout of the selector now changes on every store update
  // so the component re-renders on every store update
  
  return todos.map(todo => <Todo todo={todo} />);
}
```

To prevent this, use memoization libraries like `reselect` if you need to do complex computations in the selector function.

## Under the hood

**Immis** uses [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to intercept all updates to the store. When you update the store, **Immis** clones the updated object along with its ancestors before replacing the old objects with the new ones. Each `Proxy` is memoized in a `WeakMap` for fast access to the same object. Proxies are created lazily; parts of the store not accessed aren't wrapped, avoiding unnecessary "infection" of newly created objects with proxies and maintaining high performance.

As built-in array methods may write to the object multiple times, batching is needed to make sure that the object is cloned only once. **Immis** uses `Promise.resolve().then()` to batch all updates until the end of the current microtask.

## Author

Eugene Daragan

## License

MIT
