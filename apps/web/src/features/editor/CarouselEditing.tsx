import { createContext, useContext, useState, type ReactNode } from 'react';

const Context = createContext<{
  slides: Record<string, string>;
  select: (carousel: string, slide: string) => void;
}>({ slides: {}, select: () => {} });
export const useCarouselEditing = () => useContext(Context);
export function CarouselEditingProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<Record<string, string>>({});
  return (
    <Context.Provider
      value={{
        slides,
        select: (carousel, slide) =>
          setSlides((old) => (old[carousel] === slide ? old : { ...old, [carousel]: slide })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
