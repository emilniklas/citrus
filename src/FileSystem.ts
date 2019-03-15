import { Path } from './Path';

export interface FileSystem {
  readFile(path: Path): Promise<Buffer>;
  writeFile(path: Path, contents: string): Promise<void>;
  ensureDirectory(path: Path): Promise<void>;
}
