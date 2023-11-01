import { useCallback, useRef, useSyncExternalStore } from "react";

function clonePaths(state, paths) {
  const clonedPaths = new Set();

  function clone(obj, index, path, currentPath) {
    if (Object(obj) !== obj) {
      return obj;
    }

    let modified = obj;

    if (!clonedPaths.has(currentPath)) {
      clonedPaths.add(currentPath);

      if (Array.isArray(obj)) {
        modified = obj.slice();
      } else {
        modified = Object.assign({}, obj);
      }
    }

    if (index < path.length) {
      const currentKey = path[index];

      modified[currentKey] = clone(
        modified[currentKey],
        index + 1,
        path,
        currentPath + "." + currentKey
      );
    }

    return modified;
  }

  return paths.reduce((state, path) => clone(state, 0, path, ""), state);
}

const proxyCache = new WeakMap();

let reportedCallbacks;

export function createStore(root, callback) {
  let pathsToUpdate = [];

  const callbacks = new Set();

  if (callback) {
    callbacks.add(callback);
  }

  const scheduleUpdate = (path) => {
    if (!pathsToUpdate.length) {
      Promise.resolve().then(() => {
        root = clonePaths(root, pathsToUpdate);
        pathsToUpdate = [];
        callbacks.forEach((cb) => cb(root));
      });
    }

    pathsToUpdate.push(path);
  };

  function wrap(obj, path) {
    reportedCallbacks = callbacks;

    if (Object(obj) !== obj) {
      return obj;
    }

    let cached = proxyCache.get(obj);

    if (cached) return cached;

    cached = new Proxy(obj, {
      get(target, prop, receiver) {
        const isProto = prop === "prototype" || prop === "constructor";

        const value = Reflect.get(target, prop, receiver);

        if (isProto || typeof value === "function") {
          return value;
        }

        return wrap(value, path.concat(prop));
      },
      set(target, prop, value) {
        scheduleUpdate(path);
        return Reflect.set(target, prop, value);
      }
    });

    proxyCache.set(obj, cached);

    return cached;
  }

  return new Proxy(
    {},
    {
      get(target, prop, receiver) {
        const wrapped = wrap(root, []);

        return Reflect.get(wrapped, prop, receiver);
      },
      set(target, prop, value) {
        scheduleUpdate([]);
        return Reflect.set(root, prop, value);
      }
    }
  );
}

export const useSelector = (selector) => {
  const reportedCallbacksRef = useRef(null);

  const subscriber = useCallback((callback) => {
    const callbacks = reportedCallbacksRef.current;

    if (!callbacks) {
      return () => {};
    }

    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }, []);

  const reportedSelector = () => {
    const result = selector();
    reportedCallbacksRef.current = reportedCallbacks;
    return result;
  };

  return useSyncExternalStore(subscriber, reportedSelector);
};
