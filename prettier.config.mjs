import baseConfig from '@seriesfi/prettier-config'

const {
  importOrder,
  importOrderSeparation,
  importOrderGroupNamespaceSpecifiers,
  importOrderParserPlugins,
  plugins,
  ...noSortImportsConfig
} = baseConfig

const prettierConfig = {
  ...noSortImportsConfig,
}

export default prettierConfig
