import React, { ReactNode, useContext } from 'react';
import { CitrusContext } from './CitrusContext';

export function Head({ children }: { children: ReactNode }) {
  const value = useContext(CitrusContext);
  value.registerToHead(children);
  return null;
}
