import { useContext } from 'react';
import { CitrusContext } from './CitrusContext';

export function Style({ css }: { css: string }) {
  const value = useContext(CitrusContext);

  value.registerStyles(css);

  return null;
}
