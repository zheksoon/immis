type Listener<T> = (newStore: T) => void;

type Store<T> = {
  store: T;
  subscribers: Set<Listener<T>>;
};

export declare function createStore<T>(root: T): Store<T>;

export declare function useSelector<T>(selector: () => T): T;
