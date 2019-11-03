import { FileSystem } from "./FileSystem";
import { Path } from "./Path";
import mkdirp from "mkdirp";
import { promisify } from "util";
import NodeFs from "fs";
import { Readable } from "stream";

const mkdirpPromise = promisify(mkdirp);
const writeFile = promisify(NodeFs.writeFile);

export class NodeFileSystem implements FileSystem {
  readFile(path: Path): Buffer {
    return NodeFs.readFileSync(path.toString());
  }

  async ensureDirectory(path: Path) {
    await mkdirpPromise(path.toString());
  }

  async writeFile(path: Path, contents: string) {
    await this.ensureDirectory(path.dirname);
    await writeFile(path.toString(), contents);
  }

  async pipeToFile(path: Path, contents: Readable) {
    await this.ensureDirectory(path.dirname);

    return new Promise<void>((resolve, reject) => {
      contents
        .on("end", resolve)
        .on("error", reject)
        .pipe(NodeFs.createWriteStream(path.toString()));
    });
  }
}
