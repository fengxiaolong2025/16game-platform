// https://docs.taro.zone/docs/next/config#defineconfig
import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig(async (merge, { command, mode }) => {
  const baseConfig = {
    projectName: 'esports-miniapp',
    date: '2026-7-20',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    env: {
      TARO_APP_ENV: JSON.stringify(process.env.TARO_APP_ENV || 'dev')
    },
    copy: {
      patterns: [
        { from: 'src/assets/tabbar', to: 'assets/tabbar' },
      ],
      options: {},
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    sass: {
      data: `@import "@nutui/nutui-react-taro/dist/styles/variables.scss";`
    },
    mini: {
      webpackChain(chain, { webpack }) {
        // 强制 development 模式，避免 React jsx-dev-runtime 被打包成 production.min.js
        // 该生产版 jsxDEV=undefined，会导致所有页面空白
        chain.mode('development')
        // 完全禁用压缩，避免 CssMinimizerPlugin (css-tree) OOM
        // 开发模式下不需要压缩
        chain.optimization.minimize(false)
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false
        }
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
