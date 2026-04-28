module.exports = function (api) {
  api.cache(true);
  const isProd = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip console.* in production builds, but keep error/warn so we
      // still surface real problems via crash reporting.
      ...(isProd
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
    ],
  };
};
