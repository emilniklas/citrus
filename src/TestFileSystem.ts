import { FileSystem } from './FileSystem';

export class TestFileSystem implements FileSystem {
  ensureDirectory = jest.fn();
  writeFile = jest.fn();
  readFile = jest.fn();
}
