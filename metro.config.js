const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.assetExts.push('bin');

  // Fix asset-registry resolution for React Native
  config.transformer.assetRegistryPath = 'react-native/Libraries/Image/AssetRegistry';
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    'react-native/asset-registry': path.resolve(__dirname, 'node_modules/react-native/Libraries/Image/AssetRegistry.js'),
  };

  // Exclude backend directory and python virtual environment from Metro crawler
  const blockList = Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean);

  blockList.push(
    /.*[/\\]backend[/\\].*/,
    /.*[/\\]\.venv[/\\].*/
  );
  config.resolver.blockList = blockList;

  return config;
})();

