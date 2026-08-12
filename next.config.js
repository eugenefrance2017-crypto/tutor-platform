/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Фикс сборки для Konva: не пытаемся собрать серверную зависимость 'canvas'.
  // Доска работает только в браузере, серверная ветка konva никогда не запускается.
  //
  // Фикс сборки для firebase-admin: этот пакет тянет ESM-модуль 'jose' через
  // 'jwks-rsa', который webpack не умеет корректно бандлить как CommonJS.
  // Исключаем firebase-admin из бандла — на сервере Node сам его найдёт
  // через обычный require() из node_modules при выполнении.
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ })
      );
      config.externals = [...(config.externals || []), 'firebase-admin'];
    }
    return config;
  },
};

module.exports = nextConfig;