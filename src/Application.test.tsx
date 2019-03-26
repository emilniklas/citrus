import React, { useState } from 'react';
import { Application } from './Application';
import { TestFileSystem } from './TestFileSystem';
import { FileSystem } from './FileSystem';
import { Path } from './Path';
import { useLiveComponent } from './useLiveComponent';
import { TestBundler } from './TestBundler';
import { Bundler } from './Bundler';
import { Head } from './Head';

describe('Application', () => {
  let app: Application;
  let fileSystem: FileSystem;
  let bundler: Bundler;
  let mockFileSystem: TestFileSystem;
  let mockBundler: TestBundler;

  beforeEach(() => {
    app = new Application({
      fileSystem: fileSystem = mockFileSystem = new TestFileSystem(),
      bundler: bundler = mockBundler = new TestBundler()
    });
  });

  it('creates an empty directory', async () => {
    await app.build('build');
    expect(fileSystem.ensureDirectory).toHaveBeenCalledWith(Path.url('build'));
  });

  it('creates an HTML file for a page', async () => {
    app.page('/my-page', <div />);

    mockBundler.outputBundles.mockResolvedValue(new Map());

    await app.build('build');

    expect(fileSystem.ensureDirectory).toHaveBeenCalledWith(Path.url('build'));
    expect(fileSystem.writeFile).toHaveBeenCalledWith(
      Path.url('build/my-page/index.html'),
      '<!DOCTYPE html><html><head></head><body><div></div></body></html>'
    );
  });

  it('uses a bundler to bundle live components', async () => {
    function LiveComponent({ initial }: { initial: number }) {
      const [count, setCount] = useState(initial);
      return <button>{count}</button>;
    }

    const liveComponentModule = { default: LiveComponent };

    function UsesLiveComponent() {
      const LiveComponentX = useLiveComponent(
        Promise.resolve(liveComponentModule)
      );

      return <LiveComponentX initial={10} />;
    }

    (global as any).__requireCache = {
      ['/SOME-PATH']: {
        exports: liveComponentModule
      }
    };

    app.page('/some-page', <UsesLiveComponent />);

    mockFileSystem.readFile.mockReturnValue(
      Promise.resolve().then(() => Buffer.from('x'))
    );

    mockBundler.outputBundles.mockResolvedValue(
      new Map([
        [
          '11f6ad8ec52a2984abaafd7c3b516503785c2072',
          [Path.url('oneAsset.js'), Path.url('anotherAsset.js')]
        ]
      ])
    );

    await app.build('build');

    expect(bundler.outputBundles).toHaveBeenCalledWith(
      new Map([
        [
          'd62accaae0c0b62ceba73caf97c087bc95213579',
          [Path.url('./.cache/11f6ad8ec52a2984abaafd7c3b516503785c2072.js')]
        ]
      ]),
      Path.url('build')
    );
  });

  it('can add elements to head', async () => {
    app.page(
      '/with-head',
      <div>
        <Head>
          <title>Title</title>
        </Head>
        body
      </div>
    );

    mockBundler.outputBundles.mockResolvedValue(new Map());

    await app.build('build');
    expect(fileSystem.writeFile).toHaveBeenCalledWith(
      Path.url('build/with-head/index.html'),
      '<!DOCTYPE html><html><head>' +
        '<title>Title</title>' +
        '</head><body>' +
        '<div>body</div>' +
        '</body></html>'
    );
  });
});
