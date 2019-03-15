import React, { ReactElement, ReactNode } from 'react';
import { Bundler } from './Bundler';
import { FileSystem } from './FileSystem';
import { WebpackBundler } from './WebpackBundler';
import { NodeFileSystem } from './NodeFileSystem';
import { Path } from './Path';
import { renderToStaticMarkup } from 'react-dom/server';
import { CitrusContext } from './CitrusContext';
import { createHash } from 'crypto';
import { wait, fiber } from './Fibers';

export class Application {
  private readonly _bundler: Bundler;
  private readonly _fileSystem: FileSystem;
  private readonly _pages: Map<Path, ReactElement>;

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
  }

  page(path: string, element: ReactElement) {
    this._pages.set(Path.url(path), element);
  }

  async build(outputDirectory: string) {
    const out = Path.create(outputDirectory);
    await this._fileSystem.ensureDirectory(out);

    const liveComponents = new Map<string, Path>();

    const pages: {
      path: Path;
      head: ReactNode;
      assets: Set<string>;
      body: string;
    }[] = [];

    await Promise.all(
      Array.from(this._pages.entries(), async ([path, element]) => {
        const assets = new Set();
        const pageDirPath = out.join(path);
        let headContents: ReactNode = <></>;
        const body = await fiber(() => {
          return renderToStaticMarkup(
            <CitrusContext.Provider
              value={{
                registerToHead: (node) => {
                  headContents = (
                    <>
                      {headContents}
                      {node}
                    </>
                  );
                },
                registerLiveComponent: (path) => {
                  const p = Path.create(path);
                  const id = createHash('sha1')
                    .update(wait(this._fileSystem.readFile(p)))
                    .digest()
                    .toString('hex');
                  liveComponents.set(id, p);
                  assets.add(id);
                  return id;
                }
              }}
            >
              {element}
            </CitrusContext.Provider>
          );
        });
        pages.push({
          path: pageDirPath.join('index.html'),
          head: headContents,
          assets,
          body
        });
      })
    );
    console.log(pages);

    const liveComponentWrappers = new Map<string, Path>();

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

        const wrapperPath = Path.url('./.cache').join(id + '.js');

        await this._fileSystem.writeFile(wrapperPath, wrapperCode);

        liveComponentWrappers.set(id, wrapperPath);
      })
    );

    const bundles = await this._bundler.outputBundles(
      liveComponentWrappers,
      out
    );

    await Promise.all(
      pages.map(async (page) => {
        const assetsToInclude = new Set<Path>();

        for (const id of page.assets) {
          const assetsInBundle = bundles.get(id);
          if (assetsInBundle === undefined) {
            continue;
          }
          for (const assetInBundle of assetsInBundle) {
            assetsToInclude.add(assetInBundle);
          }
        }

        await this._fileSystem.writeFile(
          page.path,
          `<!DOCTYPE html><html><head>${renderToStaticMarkup(
            <>{page.head}</>
          )}${Array.from(assetsToInclude, (path) => {
            if (path.isJavaScript) {
              return `<script defer src="${path.toUrl()}"></script>`;
            }

            if (path.isCSS) {
              return `<link rel="stylesheet" href="${path.toUrl()}">`;
            }

            return '';
          })
            .sort()
            .join('')}</head><body>${page.body}</body></html>`
        );
      })
    );
  }
}
