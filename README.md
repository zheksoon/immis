# Immis

<p align="center">
    <img src="https://raw.githubusercontent.com/zheksoon/immis/master/assets/immis.png" alt="Immis logo" width="200" />
    <i>500 bytes to do it all 🪄</i>
</p>

**Immis** is a ~500 bytes library for managing immutable state in React applications. It offers a simple API for creating and updating immutable state, and a React hook for using it in components. It's main purpose is to be used as a state management library for small React applications, or as a replacement for bulky Redux or MobX libraries.

## Features:

- **Magic** - use the immutable state as if it was mutable.
- **Simplicity** - the API is very simple and easy to use.
- **Immutability** - all state updates are immutable, which means that you can't accidentally mutate the state.
- **Updates batching** - all state mutations are batched, so the immutable objects are cloned only once, regardless of how many mutations are performed.
- **useSelector hook** - a React hook for using the immutable state in components.
- **Small size** - the library is very small, only ~500 bytes gzipped.

## Installation

```bash
npm install immis

yarn add immis
```

## Usage

### Simplest counter:

```js
import { createStore, useSelector } from "immis";

const counterState = makeStore({ count: 0 });

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

render(<Counter counter={counterState} />, document.getElementById("root"));
```

### Multiple counters:

```js
import { createStore, useSelector } from "immis";

const state = makeStore({ counters: [] });

const Counters = () => {
  const counters = useSelector(() => state.counters);

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

render(<Counters />, document.getElementById("root"));
```

## Author

Eugene Daragan

## License

MIT
