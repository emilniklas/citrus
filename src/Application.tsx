import React, { ReactElement, ReactNode } from "react";
import { Bundler } from "./Bundler";
import { FileSystem } from "./FileSystem";
import { WebpackBundler } from "./WebpackBundler";
import { NodeFileSystem } from "./NodeFileSystem";
import { Path } from "./Path";
import { renderToStaticMarkup } from "react-dom/server";
import { CitrusContext } from "./CitrusContext";
import { createHash } from "crypto";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";
import { LocationContext } from "./useLocation";
import { Readable } from "stream";

export class Application {
  private readonly _bundler: Bundler;
  private readonly _fileSystem: FileSystem;
  private readonly _pages: Map<Path, ReactElement>;
  private readonly _files: Map<Path, Readable>;

  constructor({
    bundler = new WebpackBundler(),
    fileSystem = new NodeFileSystem()
  }: {
    bundler?: Bundler;
    fileSystem?: FileSystem;
  } = {}) {
    this._bundler = bundler;
    this._fileSystem = fileSystem;
    this._pages = new Map();
    this._files = new Map();
  }

  page(path: string, element: ReactElement) {
    this._pages.set(Path.url(path), element);
  }

  file(path: string, body: Readable | Buffer | string) {
    if (body instanceof Readable) {
      this._files.set(Path.url(path), body);
    } else {
      const stream = new Readable();
      stream.push(body);
      stream.push(null);
      this._files.set(Path.url(path), stream);
    }
  }

  json(
    path: string,
    body: any,
    replacer?: (key: string, value: any) => any,
    space?: string | number
  ) {
    this.file(path, JSON.stringify(body, replacer, space));
  }

  async build(outputDirectory: string) {
    const out = Path.create(outputDirectory);
    await this._fileSystem.ensureDirectory(out);

    await Promise.all(
      Array.from(this._files, ([path, file]) => {
        return this._fileSystem.pipeToFile(out.join(path), file);
      })
    );

    const liveComponents = new Map<string, Path>();
    const stylesMap = new Map<string, string>();

    const pages: {
      id: string;
      path: Path;
      head: ReactNode;
      assets: Set<string>;
      body: string;
    }[] = [];

    for (const [path, element] of this._pages) {
      const pageId = hash(path.toString());

      const assets = new Set<string>();
      const pathAssets = new Map<string, string>();
      const pageDirPath = out.join(path);
      let headContents: ReactNode = <></>;
      const sheet = new ServerStyleSheet();
      const body = renderToStaticMarkup(
        <StyleSheetManager sheet={sheet.instance}>
          <LocationContext.Provider
            value={{
              path: path.toUrl(),
              segments: path.segments
            }}
          >
            <CitrusContext.Provider
              value={{
                registerToHead: node => {
                  headContents = (
                    <>
                      {headContents}
                      {node}
                    </>
                  );
                },
                registerLiveComponent: path => {
                  if (pathAssets.has(path)) {
                    return pathAssets.get(path)!;
                  }
                  const p = Path.create(path);
                  const id = hash(this._fileSystem.readFile(p));
                  liveComponents.set(id, p);
                  assets.add(id);
                  pathAssets.set(path, id);
                  return id;
                },
                registerStyles: css => {
                  const styleId = hash(css);
                  stylesMap.set(styleId, css);
                  assets.add(styleId);
                }
              }}
            >
              {element}
            </CitrusContext.Provider>
          </LocationContext.Provider>
        </StyleSheetManager>
      );
      const pattern = /<style.*?>([^]*?)<\/style>/g;
      let match: RegExpExecArray | null;
      const styleTags = sheet.getStyleTags();
      while ((match = pattern.exec(styleTags))) {
        const css = match[1];
        const styleId = hash(css);
        stylesMap.set(styleId, css);
        assets.add(styleId);
      }
      pages.push({
        id: pageId,
        path: pageDirPath.join("index.html"),
        head: headContents,
        assets,
        body
      });
    }

    const assetModules = new Map<string, Path>();

    await Promise.all(
      Array.from(liveComponents, async ([id, componentPath]) => {
        const wrapperCode = `
          var React = require('react');
          var ReactDOM = require('react-dom');
          var Component = require('${componentPath}').default;

          var roots = document.querySelectorAll('[data-component-id="${id}"]');
          for (var i = 0; i < roots.length; i++) {
            var root = roots[i];
            ReactDOM.hydrate(React.createElement(Component, JSON.parse(root.getAttribute('data-props') || '{}')), root);
          }
        `;

        const wrapperPath = Path.url("./.cache").join(id + ".js");

        await this._fileSystem.writeFile(wrapperPath, wrapperCode);

        assetModules.set(id, wrapperPath);
      })
    );

    await Promise.all(
      Array.from(stylesMap, async ([id, css]) => {
        const wrapperPath = Path.url("./.cache").join(id + ".css");

        await this._fileSystem.writeFile(wrapperPath, css);

        assetModules.set(id, wrapperPath);
      })
    );

    const entrypoints = new Map<string, Path[]>();

    for (const page of pages) {
      entrypoints.set(
        page.id,
        Array.from(page.assets, aid => assetModules.get(aid)).filter(
          (p: Path | undefined): p is Path => p !== undefined
        )
      );
    }

    const bundles = await this._bundler.outputBundles(entrypoints, out);

    await Promise.all(
      pages.map(async page => {
        const assetsToInclude = bundles.get(page.id) || [];

        await this._fileSystem.writeFile(
          page.path,
          `<!DOCTYPE html><html><head>${renderToStaticMarkup(
            <>{page.head}</>
          )}${Array.from(assetsToInclude, path => {
            if (path.isJavaScript) {
              return `<script defer src="${path.toUrl()}"></script>`;
            }

            if (path.isCSS) {
              return `<link rel="stylesheet" href="${path.toUrl()}">`;
            }

            return "";
          })
            .sort()
            .join("")}</head><body>${page.body}</body></html>`
        );
      })
    );
  }
}

function hash(value: string | Buffer): string {
  return createHash("sha1")
    .update(value)
    .digest()
    .toString("hex");
}
