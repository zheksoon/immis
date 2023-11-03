import { useCallback, useRef, useSyncExternalStore } from "react";

function clonePaths(state, paths) {
  const clonedPaths = new Set();

  function clone(obj, index, path, currentPath) {
    if (Object(obj) !== obj) {
      return obj;
    }

    let cloned = obj;

    if (!clonedPaths.has(currentPath)) {
      clonedPaths.add(currentPath);

      if (Array.isArray(obj)) {
        cloned = obj.slice();
      } else {
        cloned = Object.assign({}, obj);
      }
    }

    if (index < path.length) {
      const currentKey = path[index];

      cloned[currentKey] = clone(
        cloned[currentKey],
        index + 1,
        path,
        currentPath + "." + currentKey
      );
    }

    return cloned;
  }

  return paths.reduce((state, path) => clone(state, 0, path, ""), state);
}

const proxyCache = new WeakMap();

let reportedSubscriptions;

export function createStore(root) {
  let pathsToUpdate = [];

  const subscriptions = new Set();

  const scheduleUpdate = (path) => {
    if (!pathsToUpdate.length) {
      Promise.resolve().then(() => {
        root = clonePaths(root, pathsToUpdate);
        pathsToUpdate = [];
        subscriptions.forEach((cb) => cb(root));
      });
    }

    pathsToUpdate.push(path);
  };

  function wrap(obj, path) {
    if (Object(obj) !== obj) {
      return obj;
    }

    let cached = proxyCache.get(obj);

    if (cached) return cached;

    cached = new Proxy(obj, {
      get(target, prop, receiver) {
        reportedSubscriptions = subscriptions;

        const value = Reflect.get(target, prop, receiver);

        if (prop === "prototype" || prop === "constructor") {
          return value;
        }

        return wrap(value, path.concat(prop));
      },
      set(target, prop, value) {
        scheduleUpdate(path);
        return Reflect.set(target, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate(path);
        return Reflect.defineProperty(target, prop, attributes);
      },
      deleteProperty(target, prop) {
        scheduleUpdate(path);
        return Reflect.deleteProperty(target, prop);
      },
    });

    proxyCache.set(obj, cached);

    return cached;
  }

  const store = Proxy(
    {},
    {
      get(target, prop, receiver) {
        const wrapped = wrap(root, []);

        return Reflect.get(wrapped, prop, receiver);
      },
      set(target, prop, value) {
        scheduleUpdate([]);
        return Reflect.set(root, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate([]);
        return Reflect.defineProperty(root, prop, attributes);
      },
      deleteProperty(target, prop) {
        scheduleUpdate([]);
        return Reflect.deleteProperty(root, prop);
      },
      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(root, prop);
      },
      has(target, prop) {
        return Reflect.has(root, prop);
      },
      ownKeys(target) {
        return Reflect.ownKeys(root);
      },
      isExtensible(target) {
        return Reflect.isExtensible(root);
      },
      preventExtensions(target) {
        return Reflect.preventExtensions(root);
      },
      getPrototypeOf(target) {
        return Reflect.getPrototypeOf(root);
      },
      setPrototypeOf(target, proto) {
        return Reflect.setPrototypeOf(root, proto);
      },
    }
  );

  return { store, subscriptions };
}

export const useSelector = (selector) => {
  const selectorRef = useRef(selector);

  selectorRef.current = selector;

  const reportedSubscriptionsRef = useRef(null);

  const subscriber = useCallback((callback) => {
    const subscriptions = reportedSubscriptionsRef.current;

    if (!subscriptions) {
      return () => {};
    }

    let prevResult = undefined;

    const callbackWithCheck = () => {
      const result = selectorRef.current();

      if (result !== prevResult) {
        prevResult = result;
        callback();
      }
    }

    subscriptions.add(callbackWithCheck);

    return () => {
      subscriptions.delete(callbackWithCheck);
    };
  }, []);

  const reportedSelector = () => {
    const result = selector();
    reportedSubscriptionsRef.current = reportedSubscriptions;
    return result;
  };

  return useSyncExternalStore(subscriber, reportedSelector);
};
