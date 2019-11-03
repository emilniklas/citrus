import React from "react";
import { useContext } from "react";
import { CitrusContext } from "./CitrusContext";

export function useLiveComponent<T>(path: string): T {
  const { registerLiveComponent } = useContext(CitrusContext);

  const id = registerLiveComponent(path);
  const module = require(path);

  const WrappedComponent = module.default as any;

  return function Wrapper(props: any) {
    const encodedProps = JSON.stringify(props);
    return (
      <div
        data-component-id={id}
        data-props={encodedProps === "{}" ? undefined : encodedProps}
      >
        <WrappedComponent {...props} />
      </div>
    );
  } as any;
}
