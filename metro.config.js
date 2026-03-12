const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Properly handle TypeScript and JavaScript files
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs', 'cjs'];

// Custom resolver for problematic packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix for nanoid/non-secure - use our shim
  if (moduleName === 'nanoid/non-secure') {
    const shimPath = path.resolve(__dirname, 'nanoid-shim.js');
    return {
      filePath: shimPath,
      type: 'sourceFile',
    };
  }
  
  // Default resolver
  return context.resolveRequest(context, moduleName, platform);
};

// Performance optimizations
config.transformer.minifierConfig = {
  compress: false,
  mangle: false,
};

config.watchFolders = [__dirname];
config.maxWorkers = Math.max(1, require('os').cpus().length - 1);

module.exports = config;
