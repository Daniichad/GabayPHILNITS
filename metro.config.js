const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.assetExts.push('bin');

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

