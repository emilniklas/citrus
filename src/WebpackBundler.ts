import { Bundler } from "./Bundler";
import Webpack from "webpack";
import { Path } from "./Path";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

type Without<T, K> = Pick<T, Exclude<keyof T, K>>;
type PartialWebpackConfiguration = Without<
  Webpack.Configuration,
  "entry" | "output"
>;

export class WebpackBundler implements Bundler {
  constructor(
    private readonly _config: PartialWebpackConfiguration = WebpackBundler.DefaultConfiguration()
  ) {}

  static DefaultConfiguration({
    mode = "production"
  }: {
    mode?: "production" | "development";
  } = {}): PartialWebpackConfiguration {
    return {
      mode,
      plugins: [
        new MiniCssExtractPlugin({
          filename: mode === "production" ? "[hash].css" : "[name].css"
        })
      ],
      module: {
        rules: [
          {
            test: /\.css$/,
            loader: [MiniCssExtractPlugin.loader, "css-loader"]
          }
        ]
      },
      optimization: {
        minimizer:
          mode === "production"
            ? [new OptimizeCSSAssetsPlugin(), new TerserPlugin()]
            : [],
        splitChunks: {
          chunks: "initial",
          minSize: 30000,
          maxSize: 0,
          minChunks: 1,
          maxAsyncRequests: 5,
          maxInitialRequests: 3,
          automaticNameDelimiter: "~",
          name: true,
          cacheGroups: {
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            },
            styles: {
              name: "styles",
              test: /\.css$/,
              chunks: "initial",
              enforce: true
            }
          }
        }
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
        path: outputDirectory.absolute().toString(),
        filename: "[name].js",
        chunkFilename:
          this._config.mode === "production" ? "[chunkhash].js" : "[name].js"
      }
    });

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
        } else if (stats.hasErrors()) {
          reject(
            new MultiError(
              stats.toJson().errors.map((m: string) => new Error(m))
            )
          );
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

class MultiError extends Error {
  constructor(public readonly errors: Error[]) {
    super(errors.map(e => e.message).join(", "));

    Object.setPrototypeOf(this, MultiError.prototype);
  }
}
