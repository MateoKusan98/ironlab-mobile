// Sentry's wrapper around Expo's default config — it stamps Debug IDs into the
// bundle so uploaded source maps can be matched to a stack trace. Without it,
// production crash reports are unreadable minified frames.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const config = getSentryExpoConfig(__dirname);

config.resolver.alias = {
  '@shared': path.resolve(__dirname, 'src/shared'),
};

module.exports = config;
