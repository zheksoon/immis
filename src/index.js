import { useCallback, useRef, useSyncExternalStore } from "react";

function clone(obj) {
  return Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
}

function updateParents(objects, recursive) {
  const updated = new Set();

  function update(obj) {
    if (Array.isArray(obj)) {
      obj.forEach((child, idx) => {
        if (isPrimitive(child)) return;

        child = unwrapMap.get(child) || child;

        if (updated.has(child)) return;

        parentsMap.set(child, { p: obj, k: idx });

        updated.add(child);

        if (recursive) update(child);
      });
    } else {
      Object.keys(obj).forEach((key) => {
        let child = obj[key];

        if (isPrimitive(child)) return;

        child = unwrapMap.get(child) || child;

        if (updated.has(child)) return;

        parentsMap.set(child, { p: obj, k: key });

        updated.add(child);

        if (recursive) update(child);
      });
    }
  }

  objects.forEach((obj) => {
    update(obj);
  });
}

function performUpdates(oldRoot, objects) {
  const clones = new Map();
  let root = oldRoot;

  objects.forEach((obj) => {
    const path = [];
    let parentInfo;
    let prevObj;

    while ((parentInfo = parentsMap.get(obj))) {
      prevObj = obj;

      const { p, k } = parentInfo;

      if (p && p[k] !== obj) {
        return;
      }

      path.push([obj, k]);

      obj = p;
    }

    if (prevObj !== oldRoot) return;

    let p, clonedParent;

    while ((p = path.pop())) {
      const [obj, prop] = p;

      const cloned = clones.get(obj) || clone(obj);

      clones.set(obj, cloned);

      if (clonedParent) {
        clonedParent[prop] = cloned;
      } else {
        root = cloned;
      }

      clonedParent = cloned;
    }
  });

  updateParents(clones, false);

  parentsMap.set(root, { p: null, k: null });

  return root;
}

const isPrimitive = (obj) => Object(obj) !== obj;

const proxyCache = new WeakMap();
const parentsMap = new WeakMap();
const unwrapMap = new WeakMap();

let reportedSubscriptions;

export function createStore(root) {
  const objectsToUpdate = new Set();
  const subscriptions = new Set();

  const scheduleUpdate = (obj) => {
    if (!objectsToUpdate.size) {
      Promise.resolve().then(() => {
        updateParents(objectsToUpdate, true);

        const newRoot = performUpdates(root, objectsToUpdate);

        if (newRoot !== root) {
          root = newRoot;
          subscriptions.forEach((cb) => cb(newRoot));
        }

        objectsToUpdate.clear();
      });
    }

    objectsToUpdate.add(obj);
  };

  function wrap(obj) {
    if (isPrimitive(obj)) return obj;

    obj = unwrapMap.get(obj) || obj;

    let proxy = proxyCache.get(obj);

    if (proxy) return proxy;
    
    proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        reportedSubscriptions = subscriptions;

        const value = Reflect.get(obj, prop, receiver);

        if (
          prop === "prototype" ||
          prop === "constructor" ||
          typeof value === "function"
        ) {
          return value;
        }

        return wrap(value);
      },
      set(target, prop, value) {
        scheduleUpdate(obj);

        if (!isPrimitive(value)) {
          value = unwrapMap.get(value) || value;
        }

        return Reflect.set(obj, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate(obj);
        return Reflect.defineProperty(target, prop, attributes);
      },
      deleteProperty(target, prop) {
        scheduleUpdate(obj);
        return Reflect.deleteProperty(target, prop);
      },
    });

    proxyCache.set(obj, proxy);
    unwrapMap.set(proxy, obj);

    return proxy;
  }

  updateParents([root], true);
  
  parentsMap.set(root, { p: null, k: null });

  const store = new Proxy(
    {},
    {
      get(target, prop, receiver) {
        const wrapped = wrap(root);

        return Reflect.get(wrapped, prop, receiver);
      },
      set(target, prop, value) {
        scheduleUpdate(root);
        return Reflect.set(root, prop, value);
      },
      defineProperty(target, prop, attributes) {
        scheduleUpdate(root);
        return Reflect.defineProperty(root, prop, attributes);
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
    };

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
