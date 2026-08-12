/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Фикс для firebase-admin: официальный способ Next.js исключить пакет из
  // трассировки/бандлинга для серверлесс-функций, вместо ручного webpack.externals
  // (тот вариант не помог — ошибка ERR_REQUIRE_ESM из jwks-rsa/jose сохранялась).
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  // Фикс сборки для Konva: не пытаемся собрать серверную зависимость 'canvas'.
  // Доска работает только в браузере, серверная ветка konva никогда не запускается.
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ })
      );
    }
    return config;
  },
};

module.exports = nextConfig;