import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

const MOVEMENT_THRESHOLD = 0.5; // delta from gravity baseline
const UPDATE_INTERVAL = 100;    // 10 Hz

/**
 * Monitors phone stillness via accelerometer.
 * Returns whether the phone is currently still (not moving).
 * Used during STANDOFF phase to ensure fair play.
 */
export function useAccelerometer(enabled: boolean) {
  const [isStill, setIsStill] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsStill(false);
      return;
    }

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // ~9.81 m/s² is gravity at rest
      const delta = Math.abs(magnitude - 9.81);
      setIsStill(delta <= MOVEMENT_THRESHOLD);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [enabled]);

  return { isStill };
}
