import { FileSystem } from './FileSystem';
import { Path } from './Path';
import mkdirp from 'mkdirp';
import { promisify } from 'util';
import NodeFs from 'fs';

const mkdirpPromise = promisify(mkdirp);
const writeFile = promisify(NodeFs.writeFile);
const readFile = promisify(NodeFs.readFile);

export class NodeFileSystem implements FileSystem {
  readFile(path: Path): Promise<Buffer> {
    return readFile(path.toString());
  }

  async ensureDirectory(path: Path) {
    await mkdirpPromise(path.toString());
  }

  async writeFile(path: Path, contents: string) {
    await this.ensureDirectory(path.dirname);
    await writeFile(path.toString(), contents);
  }
}
