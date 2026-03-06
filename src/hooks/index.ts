/**
 * Custom Hooks for HMS Mobile App
 * Production-ready hooks with performance optimizations
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useAsyncStorage - Persisted state with AsyncStorage
 * @param key - Storage key
 * @param initialValue - Initial value
 * @returns [value, setValue, loading]
 */
export function useAsyncStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null && mounted.current) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error loading ${key} from AsyncStorage:`, error);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    loadValue();
  }, [key]);

  const setValue = useCallback(
    async (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        if (mounted.current) {
          setStoredValue(valueToStore);
        }
        await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error saving ${key} to AsyncStorage:`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, loading];
}

/**
 * useDebounce - Debounces a value
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useInterval - Runs callback at intervals
 * @param callback - Function to call
 * @param delay - Delay in milliseconds (null to pause)
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * usePrevious - Returns previous value
 * @param value - Current value
 * @returns Previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * useToggle - Boolean state with toggle function
 * @param initialValue - Initial boolean value
 * @returns [value, toggle, setValue]
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);
  
  return [value, toggle, setValue];
}

/**
 * useArray - Array state with helper methods
 * @param initialValue - Initial array
 * @returns Object with array and helper methods
 */
export function useArray<T>(initialValue: T[] = []) {
  const [array, setArray] = useState<T[]>(initialValue);

  const push = useCallback((item: T) => {
    setArray(prev => [...prev, item]);
  }, []);

  const remove = useCallback((index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const updateAt = useCallback((index: number, item: T) => {
    setArray(prev => prev.map((el, i) => (i === index ? item : el)));
  }, []);

  return useMemo(
    () => ({
      array,
      set: setArray,
      push,
      remove,
      clear,
      updateAt,
    }),
    [array, push, remove, clear, updateAt]
  );
}

/**
 * useForm - Form state management
 * @param initialValues - Initial form values
 * @returns Form state and handlers
 */
export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    reset,
    setFieldError,
    setValues,
  };
}

/**
 * useCountdown - Countdown timer
 * @param seconds - Initial seconds
 * @param onComplete - Callback when countdown completes
 * @returns [timeLeft, start, pause, reset]
 */
export function useCountdown(
  seconds: number,
  onComplete?: () => void
): [number, () => void, () => void, () => void] {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);

  useInterval(
    () => {
      if (timeLeft > 0) {
        setTimeLeft(prev => prev - 1);
      } else {
        setIsRunning(false);
        if (onComplete) onComplete();
      }
    },
    isRunning ? 1000 : null
  );

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeLeft(seconds);
    setIsRunning(false);
  }, [seconds]);

  return [timeLeft, start, pause, reset];
}

export default {
  useAsyncStorage,
  useDebounce,
  useInterval,
  usePrevious,
  useToggle,
  useArray,
  useForm,
  useCountdown,
};
