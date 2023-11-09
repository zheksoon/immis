export function createStore(root: any): {
    store: {};
    subscriptions: Set<any>;
};
export function useSelector(selector: any, equalsFn?: (a: any, b: any) => boolean): any;
export function shallowEquals(a: any, b: any): boolean;
