import { useReducer } from 'react';
import type { UiSpec } from '@jjapgma/ui-spec';
type State = { past: UiSpec[]; present: UiSpec; future: UiSpec[] };
type Action = { type: 'edit' | 'reset'; spec: UiSpec } | { type: 'undo' | 'redo' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { past: [], present: action.spec, future: [] };
    case 'edit':
      if (JSON.stringify(state.present) === JSON.stringify(action.spec)) return state;
      return { past: [...state.past.slice(-99), state.present], present: action.spec, future: [] };
    case 'undo':
      return state.past.length
        ? {
            past: state.past.slice(0, -1),
            present: state.past.at(-1)!,
            future: [state.present, ...state.future],
          }
        : state;
    case 'redo':
      return state.future.length
        ? {
            past: [...state.past, state.present],
            present: state.future[0],
            future: state.future.slice(1),
          }
        : state;
  }
}
export function useHistory(spec: UiSpec) {
  return useReducer(reducer, { past: [], present: spec, future: [] });
}
