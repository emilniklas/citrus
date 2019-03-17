import { Bundler } from './Bundler';
import Webpack from 'webpack';
import { Path } from './Path';

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
      optimization: {
        splitChunks: {
          cacheGroups: {
            node_modules: {
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 1
            }
          }
        }
      }
    };
  }

  async outputBundles(
    entrypoints: Map<string, Path>,
    outputDirectory: Path
  ): Promise<Map<string, Path[]>> {
    if (entrypoints.size === 0) {
      return new Map();
    }

    const compiler = Webpack({
      ...this._config,
      entry: Array.from(entrypoints.entries()).reduce(
        (o, [k, v]) => ({ ...o, [k]: v.toString() }),
        {}
      ),
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
          resolve(
            new Map(
              Object.entries(entrypoints).map(
                ([id, { assets }]): [string, Path[]] => [
                  id,
                  assets.map(Path.url)
                ]
              )
            )
          );
        }
      });
    });
  }
}
