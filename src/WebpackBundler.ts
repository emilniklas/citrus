import { Bundler } from './Bundler';
import Webpack from 'webpack';
import { Path } from './Path';

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

type Without<T, K> = Pick<T, Exclude<keyof T, K>>;
type PartialWebpackConfiguration = Without<
  Webpack.Configuration,
  'entry' | 'output'
>;

export class WebpackBundler implements Bundler {
  constructor(
    private readonly _config: PartialWebpackConfiguration = WebpackBundler.DefaultConfiguration
  ) {}

  static get DefaultConfiguration(): PartialWebpackConfiguration {
    return {
      plugins: [new MiniCssExtractPlugin()],
      module: {
        rules: [
          {
            test: /\.css$/,
            loader: [MiniCssExtractPlugin.loader, 'css-loader']
          }
        ]
      },
      optimization: {
        minimizer: [new OptimizeCSSAssetsPlugin()]
      }
    };
  }

  async outputBundles(
    entrypoints: Map<string, Path[]>,
    outputDirectory: Path
  ): Promise<Map<string, Path[]>> {
    if (entrypoints.size === 0) {
      return new Map();
    }

    const entry: { [name: string]: string[] } = {};

    for (const [id, paths] of entrypoints) {
      entry[id] = paths.map(String);
    }

    const compiler = Webpack({
      ...this._config,
      entry,
      output: {
        path: outputDirectory.absolute().toString()
      }
    });

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
        } else if (stats.hasErrors()) {
          reject(stats.toJson().errors);
        } else {
          const entrypoints: {
            [id: string]: { assets: string[] };
          } = stats.toJson().entrypoints;
          const assetsForPage = new Map<string, Path[]>();

          for (const [id, { assets }] of Object.entries(entrypoints)) {
            assetsForPage.set(id, assets.map(Path.url));
          }

          resolve(assetsForPage);
        }
      });
    });
  }
}
