# Immis

<p align="center">
    <img src="https://raw.githubusercontent.com/zheksoon/immis/master/assets/immis.png" alt="Immis logo" width="200" />
    <hr>
</p>

**Immis** is a ~1KB library for managing immutable state in React applications. It offers a simple API for creating and updating immutable state, and a React hook for using it in components. It's main purpose is to be used as a state management library for small React applications, or as a replacement for bulky Redux or MobX libraries.

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

## Show me the code!

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

[Codesandbox](https://codesandbox.io/s/immis-todo-list-qqqq73)

## Author

Eugene Daragan

## License

MIT
