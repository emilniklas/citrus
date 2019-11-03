import { Path } from "./Path";
import { Readable } from "stream";

export interface FileSystem {
  readFile(path: Path): Buffer;
  writeFile(path: Path, contents: string): Promise<void>;
  pipeToFile(path: Path, contents: Readable): Promise<void>;
  ensureDirectory(path: Path): Promise<void>;
}
