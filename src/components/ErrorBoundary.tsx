import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { logService } from '../services/log.service';
import i18n from '../i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level crash guard. A render error anywhere below this boundary would
 * otherwise unmount the whole tree to a blank white screen with no recovery —
 * here we catch it, report it through the existing logService pipeline (so it
 * lands in the admin Error Logs like any other JS crash), and show the athlete a
 * calm "try again" instead of a dead app.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logService.capture({
      level: 'fatal',
      source: 'js',
      message: `React render crash: ${error.message}`,
      stack: `${error.stack ?? ''}\n\nComponent stack:${info.componentStack ?? ''}`,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    const t = i18n.t.bind(i18n);
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>💪</Text>
        <Text style={styles.title}>
          {t('errors.boundaryTitle', { defaultValue: 'Something went wrong' })}
        </Text>
        <Text style={styles.body}>
          {t('errors.boundaryBody', {
            defaultValue: 'The app hit an unexpected error. Your data is safe — tap below to try again.',
          })}
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {t('errors.boundaryRetry', { defaultValue: 'Try again' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: theme.colors.background,
  },
  emoji: { fontSize: 48, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
});
