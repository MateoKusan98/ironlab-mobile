import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';
import { ProgressBar } from './ProgressBar';

type UploadStatus = 'uploading' | 'success' | 'error';

export interface FileUploadItemProps {
  filename: string;
  size?: string; // e.g. '315.5kb'
  progress?: number; // 0-100
  status: UploadStatus;
  onRemove?: () => void;
  onRetry?: () => void;
}

export const FileUploadItem: React.FC<FileUploadItemProps> = ({
  filename,
  size,
  progress = 0,
  status,
  onRemove,
  onRetry,
}) => {
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isUploading = status === 'uploading';

  // Determine colors based on status
  const getColors = () => {
    if (isError) return { border: palette.error[600], bg: palette.error[950], text: palette.error[500], progressColor: palette.error[500] };
    if (isSuccess) return { border: palette.success[600], bg: palette.success[950], text: palette.success[500], progressColor: palette.success[500] };
    return { border: palette.gray[700], bg: palette.gray[900], text: palette.gray[400], progressColor: palette.brand[500] };
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <View style={styles.topRow}>
        <View style={styles.iconPlaceholder}>
          {/* File generic icon or specific success/error icon depending on designs */}
          <Text style={{ fontSize: 18, color: colors.progressColor }}>
            {isSuccess ? '✓' : isError ? '!' : '📄'}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={[theme.typography.textMd, styles.filename]} numberOfLines={1}>
            {filename}
          </Text>
          <View style={styles.subtitleRow}>
            {isError ? (
              <Text style={[theme.typography.textSm, { color: colors.text }]}>
                Upload failed. Please try again.
              </Text>
            ) : isSuccess ? (
              <Text style={[theme.typography.textSm, { color: colors.text }]}>
                Upload Successful.
              </Text>
            ) : (
              <Text style={[theme.typography.textSm, { color: palette.gray[400] }]}>
                {size}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          {isError && onRetry && (
            <TouchableOpacity onPress={onRetry} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[theme.typography.textSm, { color: palette.error[400], marginRight: theme.spacing.sm }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}

          {onRemove && (
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 16, color: palette.gray[400] }}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.progressRow}>
        <ProgressBar
          progress={isSuccess ? 100 : progress}
          color={colors.progressColor}
          trackColor={palette.gray[800]}
          height={6}
          style={styles.progressBarWrapper}
        />
        <Text style={[theme.typography.textXs, { color: palette.gray[400], width: 35, textAlign: 'right' }]}>
          {isSuccess ? '100%' : `${Math.round(progress)}%`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: palette.gray[800],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  filename: {
    color: palette.gray[50],
    fontWeight: theme.fontWeight.medium,
    marginBottom: 2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
});
