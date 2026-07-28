import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { UserResponse } from '@shared';
import { palette } from '../../theme';

interface Props {
  user: UserResponse | null;
  size?: number;
}

export const UserAvatar: React.FC<Props> = ({ user, size = 40 }) => {
  const radius = size / 2;

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: palette.brand[600] }]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: palette.white, fontWeight: '700', letterSpacing: 0.5 },
});
