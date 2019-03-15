import { Path } from './Path';

export interface Bundler {
  outputBundles(
    entrypoints: Map<string, Path>,
    outputDirectory: Path
  ): Promise<Map<string, Path[]>>;
}
