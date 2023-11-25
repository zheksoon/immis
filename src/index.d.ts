type StoreSubscriber<T> = (store: T) => void;

export declare function createStore<T>(root: T): {
  store: T;
  subscriptions: Set<StoreSubscriber<T>>;
};

export declare function useSelector<Result>(
  selector: (
    memo: <Args extends any[], Combinator extends (...args: Args) => any>(
      ...args: [...Args, Combinator]
    ) => ReturnType<Combinator>
  ) => Result,
  equalsFn?: (a: Result, b: Result) => boolean
): Result;

export declare function shallowEquals(a: any, b: any): boolean;
