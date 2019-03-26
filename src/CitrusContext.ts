import { createContext, ReactNode } from 'react';

export const CitrusContext = createContext<CitrusContext.Value>({
  registerLiveComponent() {
    return '';
  },

  registerToHead() {},

  registerStyles() {}
});

export namespace CitrusContext {
  export interface Value {
    registerLiveComponent(path: string): string;
    registerToHead(node: ReactNode): void;
    registerStyles(css: string): void;
  }
}
