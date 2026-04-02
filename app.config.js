const appJson = require('./app.json');

module.exports = () => {
  const base = appJson.expo || {};
  const projectId =
    process.env.EAS_PROJECT_ID ||
    (base.extra && base.extra.eas && base.extra.eas.projectId) ||
    'f5419105-eb79-4624-930a-9290a3b2a5c7';

  return {
    ...base,
    runtimeVersion: base.runtimeVersion || { policy: 'appVersion' },
    updates: {
      ...(base.updates || {}),
      url: `https://u.expo.dev/${projectId}`,
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...(base.extra || {}),
      eas: {
        ...((base.extra && base.extra.eas) || {}),
        projectId,
      },
    },
  };
};
