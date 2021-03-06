import * as NodePath from 'path';
import * as Util from 'util';

const MEMO = new Map<string, Path>();

function memo(p: Path): Path {
  const s = p.toString();

  if (MEMO.has(s)) {
    return MEMO.get(s) as Path;
  }

  MEMO.set(s, p);

  return p;
}

export class Path {
  private constructor(
    public readonly segments: string[],
    public readonly isAbsolute: boolean
  ) {}

  static create(path: string): Path {
    return memo(new Path(path.split(NodePath.sep), NodePath.isAbsolute(path)));
  }

  static url(path: string): Path {
    return memo(new Path(path.split('/').filter(Boolean), false));
  }

  [Util.inspect.custom]() {
    return this.toUrl();
  }

  join(other: Path | string): Path {
    if (typeof other === 'string') {
      return new Path([...this.segments, other], this.isAbsolute);
    }
    if (other.isAbsolute) {
      return other;
    }
    return new Path([...this.segments, ...other.segments], this.isAbsolute);
  }

  toString(): string {
    return this.segments.join(NodePath.sep);
  }

  get dirname(): Path {
    return new Path(this.segments.slice(0, -1), this.isAbsolute);
  }

  get isJavaScript(): boolean {
    return this.endsWith('.js');
  }

  get isCSS(): boolean {
    return this.endsWith('.css');
  }

  endsWith(part: string): boolean {
    const lastSegment = this.segments[this.segments.length - 1];
    if (!lastSegment) {
      return false;
    }
    return lastSegment.endsWith(part);
  }

  toUrl(): string {
    return '/' + this.segments.join('/');
  }

  absolute(): Path {
    return Path.create(NodePath.resolve(this.toString()));
  }
}
