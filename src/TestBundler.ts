import { Bundler } from './Bundler';

export class TestBundler implements Bundler {
  outputBundles = jest.fn();
}
