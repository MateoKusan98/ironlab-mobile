const COMPOUND_PATTERN =
  /squat|deadlift|bench\s*press|overhead\s*press|\bohp\b|military\s*press|push\s*press|barbell\s*row|chest.supported\s*row|t.bar\s*row|seal\s*row|pull.?up|chin.?up|\bdip\b|romanian|hip\s*thrust|good\s*morning|rack\s*pull|trap\s*bar|sumo|leg\s*press|lunge|bulgarian|split\s*squat|step.?up|power\s*clean|hang\s*clean|snatch|incline\s*(bench|press)|close.?grip\s*(bench|press)|pendlay|hack\s*squat/i;

export function classifyExercise(name: string): 'compound' | 'isolation' {
  return COMPOUND_PATTERN.test(name) ? 'compound' : 'isolation';
}
