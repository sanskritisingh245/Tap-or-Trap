import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD = 1.8;
const SHAKE_COOLDOWN = 1000; // 1s between shakes

export function useShake(enabled: boolean) {
  const [shaking, setShaking] = useState(false);
  const [shakeTriggered, setShakeTriggered] = useState(false);
  const lastShakeRef = useRef(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setShaking(false);
      return;
    }

    Accelerometer.setUpdateInterval(80);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(magnitude - 9.81);

      if (delta > SHAKE_THRESHOLD) {
        setShaking(true);
        const now = Date.now();
        if (now - lastShakeRef.current > SHAKE_COOLDOWN) {
          lastShakeRef.current = now;
          setShakeTriggered(true);
          // Auto-reset trigger after a tick
          setTimeout(() => setShakeTriggered(false), 100);
        }
      } else {
        setShaking(false);
      }
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [enabled]);

  return { shaking, shakeTriggered };
}
