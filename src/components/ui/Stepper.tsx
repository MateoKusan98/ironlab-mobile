import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, palette } from '../../theme';

export interface StepItem {
  id: string;
  title: string;
  subtitle?: string;
  status: 'pending' | 'active' | 'completed';
}

export interface StepperProps {
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = 'horizontal',
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View style={[styles.container, isHorizontal ? styles.row : styles.column]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';
        
        // Define colors based on kit status
        const circleBg = isCompleted ? palette.brand[600] : isActive ? palette.brand[600] : palette.gray[800];
        const circleBorder = isActive ? palette.brand[600] : palette.gray[700];
        const textColor = isActive || isCompleted ? palette.gray[50] : palette.gray[400];
        const lineColor = isCompleted ? palette.brand[600] : palette.gray[800];

        return (
          <View
            key={step.id}
            style={[
              isHorizontal ? styles.stepWrapperHorizontal : styles.stepWrapperVertical,
              !isLast && isHorizontal && { flex: 1 },
            ]}
          >
            {/* Step Content */}
            <View style={[styles.stepItem, isHorizontal && styles.stepItemHorizontal]}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: circleBg, borderColor: circleBorder },
                  isActive && styles.circleActive, // Outer glow if active maybe
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkIcon}>✓</Text>
                ) : (
                  <Text style={[styles.stepNumber, { color: isActive ? palette.white : palette.gray[400] }]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              <View style={isHorizontal ? styles.textContainerHorizontal : styles.textContainerVertical}>
                <Text style={[theme.typography.textSm, { color: textColor, fontWeight: theme.fontWeight.medium }]}>
                  {step.title}
                </Text>
                {step.subtitle && (
                  <Text style={[theme.typography.textXs, { color: palette.gray[500], marginTop: 2 }]}>
                    {step.subtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* Connecting Line */}
            {!isLast && (
              <View
                style={[
                  isHorizontal ? styles.lineHorizontal : styles.lineVertical,
                  { backgroundColor: lineColor },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flexDirection: 'column',
  },
  stepWrapperHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrapperVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 2,
  },
  stepItemHorizontal: {
    flexDirection: 'column',
    width: 60,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.gray[800],
  },
  circleActive: {
    borderWidth: 4,
    borderColor: palette.brand[900], // Fake glow border
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkIcon: {
    color: palette.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textContainerHorizontal: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  textContainerVertical: {
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xl, // Space before next step
  },
  lineHorizontal: {
    flex: 1,
    height: 2,
    marginTop: -28, // Align with circle center (32 height / 2 = 16) + margin offsets
    marginHorizontal: -8, // pull behind circles
    zIndex: 1,
  },
  lineVertical: {
    position: 'absolute',
    left: 15, // center of 32px circle
    top: 32, // start below circle
    bottom: 0, // go to bottom of wrapper
    width: 2,
    zIndex: 1,
  },
});
