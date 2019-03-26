import { createContext, useContext } from 'react';

export interface Location {
  readonly path: string;
  readonly segments: string[];
}

export const LocationContext = createContext<Location>({
  path: '/',
  segments: []
});

export function useLocation(): Location {
  return useContext(LocationContext);
}
