import { useCallback, useRef, useSyncExternalStore } from "react";

const unwrapMap = new WeakMap();

function unwrap(obj) {
  return unwrapMap.get(obj) || obj;
}

function isPrimitive(value) {
  return value === null || typeof value !== "object";
}

function clone(value) {
  return Array.isArray(value) ? value.slice() : Object.assign({}, value);
}

let reportedSubscriptions;

export function createStore(root) {
  const proxyCache = new WeakMap();
  const pathMap = new WeakMap();

  const objectesToUpdate = new Set();
  const subscriptions = new Set();

  function clonePaths(state, objectesToUpdate) {
    const clones = new Map();
    const root = clone(state);

    let wasUpdated = false;

    objectesToUpdate.forEach((obj) => {
      const path = pathMap.get(obj);

      let finalObj = path.reduce(
        (acc, key) => (isPrimitive(acc) ? acc : acc[key]),
        state
      );

      if (unwrap(finalObj) !== obj) {
        return;
      }

      let parent = root;

      path.forEach((key) => {
        const obj = parent[key];
        const currentPath = pathMap.get(obj);
        const cloned = clones.get(obj) || clone(obj);

        parent[key] = cloned;
        parent = cloned;

        clones.set(obj, cloned);
        pathMap.set(cloned, currentPath);
      });

      wasUpdated = true;
    });

    if (wasUpdated) {
      return root;
    }

    return state;
  }

  function updatePath(obj, parent, parentKey) {
    if (isPrimitive(obj)) {
      return;
    }

    const parentPath = pathMap.get(parent);

    if (!parentPath) {
      return;
    }

    const path = parent ? parentPath.concat(parentKey) : [];

    obj = unwrap(obj);

    pathMap.set(obj, path);

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => updatePath(item, obj, index));
    } else {
      Object.keys(obj).forEach((key) => updatePath(obj[key], obj, key));
    }
  }

  function scheduleUpdate(obj) {
    if (!objectesToUpdate.size) {
      Promise.resolve().then(() => {
        const newRoot = clonePaths(root, objectesToUpdate);

        if (newRoot !== root) {
          root = newRoot;
          subscriptions.forEach((cb) => cb(newRoot));
        }

        objectesToUpdate.clear();
      });
    }

    objectesToUpdate.add(obj);
  };

  function wrap(obj, parent, key) {
    if (isPrimitive(obj)) {
      return obj;
    }

    obj = unwrap(obj);

    let cached = proxyCache.get(obj);

    if (cached) return cached;

    cached = new Proxy(obj, {
      get(target, prop, receiver) {
        reportedSubscriptions = subscriptions;

        const value = Reflect.get(target, prop, receiver);

        if (
          isPrimitive(value) ||
          typeof value === "function" ||
          prop === "prototype"
        ) {
          return value;
        }

        return wrap(value, obj, prop);
      },
      set(target, prop, value) {
        scheduleUpdate(obj);

        if (!isPrimitive(value)) {
          value = unwrap(value);
          updatePath(value, target, prop);
        }

        return Reflect.set(target, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate(obj);

        let value = attributes.value;

        if (!isPrimitive(value)) {
          value = unwrap(value);
          attributes.value = value;
          updatePath(value, target, prop);
        }

        return Reflect.defineProperty(target, prop, attributes);
      },
      deleteProperty(target, prop) {
        scheduleUpdate(obj);
        return Reflect.deleteProperty(target, prop);
      },
    });

    proxyCache.set(obj, cached);
    unwrapMap.set(cached, obj);

    const parentPath = pathMap.get(parent);

    pathMap.set(obj, parentPath ? parentPath.concat(key) : []);

    return cached;
  }

  const store = new Proxy(
    {},
    {
      get(target, prop, receiver) {
        const wrapped = wrap(root, null, null);

        return Reflect.get(wrapped, prop, receiver);
      },
      set(target, prop, value) {
        scheduleUpdate(root);

        const wrapped = wrap(root, null, null);

        return Reflect.set(wrapped, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate(root);

        const wrapped = wrap(root, null, null);

        return Reflect.defineProperty(wrapped, prop, attributes);
      },
      deleteProperty(target, prop) {
        scheduleUpdate(root);
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

export const useSelector = (selector, equalsFn = Object.is) => {
  const reportedSubscriptionsRef = useRef(null);
  const selectorRef = useRef(selector);

  const lastArgsRef = useRef();
  const lastResultRef = useRef();

  selectorRef.current = selector;

  const subscriber = useCallback((callback) => {
    const subscriptions = reportedSubscriptionsRef.current || new Set();

    subscriptions.add(callback);

    return () => {
      subscriptions.delete(callback);
    };
  }, []);

  const memoize = useCallback((...args) => {
    const fn = args.pop();

    if (typeof fn !== "function") {
      throw new Error("Last memo argument must be a function");
    }

    if (shallowEquals(args, lastArgsRef.current)) {
      return lastResultRef.current;
    }

    lastArgsRef.current = args;

    const result = fn(...args);

    return result;
  }, []);

  const reportedSelector = useCallback(() => {
    const result = selectorRef.current(memoize);

    const executedBefore = !!reportedSubscriptionsRef.current;

    reportedSubscriptionsRef.current = reportedSubscriptions;

    if (executedBefore && equalsFn(result, lastResultRef.current)) {
      return lastResultRef.current;
    }

    lastResultRef.current = result;

    return result;
  }, []);

  return useSyncExternalStore(subscriber, reportedSelector);
};

function isObject(value) {
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

export const shallowEquals = (a, b) => {
  if (a === b) {
    return true;
  }

  if (isPrimitive(a) || isPrimitive(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => item === b[index]);
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) => a[key] === b[key]);
  }

  return false;
}
