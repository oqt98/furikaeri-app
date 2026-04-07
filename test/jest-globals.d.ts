type MockFunction = ((...args: any[]) => any) & {
  mockResolvedValue: (value: any) => MockFunction;
  mockResolvedValueOnce: (value: any) => MockFunction;
  mockRejectedValue: (value: any) => MockFunction;
  mockImplementation: (fn: (...args: any[]) => any) => MockFunction;
  mockReturnValue: (value: any) => MockFunction;
};

type Matchers = {
  toBe: (value: any) => void;
  toEqual: (value: any) => void;
  toContain: (value: any) => void;
  toHaveLength: (value: number) => void;
  toHaveTextContent: (value: any) => void;
  toBeNull: () => void;
  toBeOnTheScreen: () => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toHaveBeenCalled: () => void;
  toHaveBeenCalledTimes: (count: number) => void;
  toHaveBeenCalledWith: (...args: any[]) => void;
  toMatchObject: <T = any>(value: Partial<T>) => void;
  rejects: {
    toMatchObject: <T = any>(value: Partial<T>) => Promise<void>;
  };
};

declare function expect<T = any>(actual: T): Matchers;
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const jest: {
  fn: <T extends (...args: any[]) => any = (...args: any[]) => any>(
    implementation?: T
  ) => MockFunction;
  mock: (moduleName: string, factory?: () => any) => void;
  useFakeTimers: () => { setSystemTime: (date: Date) => void };
  useRealTimers: () => void;
  clearAllMocks: () => void;
  spyOn: (object: object, method: string) => MockFunction;
};
