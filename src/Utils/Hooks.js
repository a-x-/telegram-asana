import { useCallback } from "react";
import { debounce } from "./Common";

export function useCallbackDebounce (fn, ms, deps) {
  return useCallback(debounce(fn, ms), deps);
}
