# Immis

<p align="center">
    <img src="https://raw.githubusercontent.com/zheksoon/immis/master/assets/immis.png" alt="Immis logo" width="200" />
    <hr>
</p>

**Immis** is a ~1KB library for managing immutable state in React applications. It offers a simple API for creating and updating immutable state, and a React hook for using it in components. It's main purpose is to be used as a state management library for small React applications, or as a replacement for bulky Redux or Immer libraries.

## Features:

- 🪄 **Magic** - use the immutable state as if it was mutable.
- 🖐️ **Simplicity** - the API is very simple and easy to use.
- 📦 **Immutability** - always get a new immutable object when the state is updated.
- 📚 **Batching** - all state mutations are batched, so the immutable objects are cloned only once.
- 🪝 **Single hook** - `useSelector` React hook for using the immutable state in components.
- 🎈 **Tiny** - only ~1KB gzipped.

## Installation

```bash
npm install immis

yarn add immis
```

## Introduction

Managing immutable state in a React application isnt's that simple. You have to create a new immutable object every time you want to update the state, and it's not always easy to do. 
For example, if you want to update a deeply nested object, you have to clone all the parent objects, and it's not always clear how to do it. 
That's where **Immis** comes in. It allows you to use the immutable state as if it was mutable. 
You can update the state directly, and **Immis** will take care of cloning the objects for you.

Also, Redux's event-sourcing isn't always needed for small applications. 
It's much easier to use a mutable state, and **Immis** allows you to do it.

**Immis** API is very simple: you create a store, and then you can update it directly. 
You can subscribe to the store updates using `subscriptions` Set object returned by `createStore` function:  

```js
import { createStore, useSelector } from "immis";

const { store, subscriptions } = createStore({ count: 0 });

subscriptions.add((newStore) => {
  console.log('updated store', newStore);
});

store.count += 1; // the subscriptions will be notified with the new store object
store.count += 1; // changes to count are batched untill the end of the current microtask
```

Store can consist of aritrary nested objects and arrays, and any built-in methods can be used to update it:

```js
const { store } = createStore({ todos: [{ text: 'hello', done: false }] });

store.todos.push({ text: 'world', done: false });
store.todos[0].text = 'bye';
store.todos[1].done = true;
store.todos.splice(0, 1);
store.todos = store.todos.filter(todo => !todo.done);
```

The only rule **Immis** has is that all objects in the state tree should be unique, i.e. one object should not be a child of multiple parent objects.

You can also use the `useSelector` React hook to subscribe to the store updates in components. It will trigger a re-render when the selected part of the store changes:

```js
import { useSelector } from "immis";

const Counter = () => {
  const count = useSelector(() => store.count);
  // the component now re-renders when the count changes
}
```

Note that the function in `useSelector` hook does not take any arguments and can access any part of the store:

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

**Important note:** as the data in the store is immutable, memoization is often needed to avoid unnecessary re-renders.
In the example above, all `Todo` components will re-render every time the `TodoList` component re-renders, even if the `todo.text` value hasn't changed. To avoid this, use `React.memo` wrapper:

```js
const Todo = React.memo(({ todo }) => {
  const text = useSelector(() => todo.text);
  // the component now re-renders only when the todo text changes

  return <div>{text}</div>;
});
```

And... That's all! Now you know everything you need to use **Immis** in your application.

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
  import { createStore, useSelector } from "immis";

  const { store } = createStore({ todos: [], filter: "ALL" });

  let todoKey = 0;

  export function TodoList() {
    const todos = useSelector(() => store.todos);
    const filter = useSelector(() => store.filter);

    const addTodo = () => {
      todos.push({ text: "", done: false, key: todoKey++ });
    };

    const removeTodo = (key) => {
      store.todos = todos.filter((todo) => todo.key !== key);
    };

    const clearDone = () => {
      store.todos = todos.filter((todo) => !todo.done);
    };

    const setFilter = (e) => {
      store.filter = e.target.value;
    };

    const statusFilter = (todo) => {
      switch (filter) {
        case "DONE":
          return todo.done;

        case "UNDONE":
          return !todo.done;

        default:
          return true;
      }
    };

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
          {todos.filter(statusFilter).map((todo) => (
            <Todo
              key={todo.key}
              todo={todo}
              onRemove={() => removeTodo(todo.key)}
            />
          ))}
        </div>
      </div>
    );
  }

  const Todo = ({ todo, onRemove }) => {
    const setText = (e) => {
      todo.text = e.target.value;
    };

    const toggle = () => {
      todo.done = !todo.done;
    };

    return (
      <div className="todo-item">
        <input type="checkbox" checked={todo.done} onChange={toggle} />
        <input type="text" value={todo.text} onChange={setText} />
        <button onClick={onRemove}>Remove</button>
      </div>
    );
  };
  ```
</details>

[Codesandbox](https://codesandbox.io/s/immis-todo-list-qqqq73)

## Under the hood

**Immis** uses [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to intercept all store updates. 
When you update the store, **Immis** clones the updated object and all its parents, and then replaces the old objects with the new ones. Each `Proxy` is memoized in a `WeakMap`, so access to the same object is very fast. Proxies are created lazily, so if you don't access some part of the store, it won't be wrapped. This allows not to "infect" the newely created objects with proxies, and to keep the performance high.

As built-in array method can write to the object multiple times, batching is needed to make sure that the object is cloned only once. **Immis** uses `Promise.resolve().then()` to batch all updates until the end of the current microtask.

## Author

Eugene Daragan

## License

MIT
