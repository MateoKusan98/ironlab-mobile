import { useAuthStore } from '../stores/auth.store';
import type { LiftingUnit } from './weight';

/** The signed-in athlete's unit for bar weights; kg until they choose pounds. */
export function useLiftingUnit(): LiftingUnit {
  return useAuthStore((s) => (s.user?.liftingUnit === 'lb' ? 'lb' : 'kg'));
}
