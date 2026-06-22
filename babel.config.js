module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated v4 (powers react-native-keyboard-controller's
    // KeyboardAwareScrollView). Must be the last plugin in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};
