import { createContext, useContext, useState, type ReactNode } from 'react';

const NavigationContext = createContext<{
  queries: Record<string, string>;
  search: (target: string, value: string) => void;
}>({ queries: {}, search: () => {} });
export const PanelContext = createContext({ collapsed: false, close: () => {} });
export const useNavigation = () => useContext(NavigationContext);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [queries, setQueries] = useState<Record<string, string>>({});
  return (
    <NavigationContext.Provider
      value={{
        queries,
        search: (target, value) => setQueries((old) => ({ ...old, [target]: value })),
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
