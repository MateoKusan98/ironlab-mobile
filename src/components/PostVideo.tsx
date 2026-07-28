import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { palette } from '../theme';
type Props = {
  uri: string;
  style?: ViewStyle;
};

/**
 * Inline video player for community posts (e.g. form-check clips). Loops, starts
 * muted, and exposes the native scrub/play controls so reviewers can study a rep.
 */
export const PostVideo: React.FC<Props> = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit="contain"
      nativeControls
    />
  );
};

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    backgroundColor: palette.black,
  },
});
