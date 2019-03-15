import React from 'react';
import { useContext } from 'react';
import { CitrusContext } from './CitrusContext';
import { wait } from './Fibers';

export function useLiveComponent<T>(importPromise: Promise<{ default: T }>): T {
  const { registerLiveComponent } = useContext(CitrusContext);
  const module = wait(importPromise);

  const requireCache =
    process.env.NODE_ENV === 'test'
      ? (global as any).__requireCache
      : require.cache;

  let id!: string;
  for (const [absolutePath, cachedModule] of Object.entries(requireCache)) {
    if ((cachedModule as any).exports === module) {
      id = registerLiveComponent(absolutePath);
    }
  }

  const WrappedComponent = module.default as any;

  return function Wrapper(props: any) {
    const encodedProps = JSON.stringify(props);
    return (
      <div
        data-component-id={id}
        data-props={encodedProps === '{}' ? undefined : encodedProps}
      >
        <WrappedComponent {...props} />
      </div>
    );
  } as any;
}
