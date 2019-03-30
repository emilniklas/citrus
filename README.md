# Citrus

_The Pragmatic Static Site Generator for React_

```shell
npm install citrus
# or
yarn add citrus
```

SPA navigation combined with SSR creates a lot of overhead. Your entire application, including the parts that are completely static, must be bundled and served to the browser.

Citrus is an alternative that only bundles the stuff that's actually interactive. The static parts are as easy as creating an Express app:

```javascript
import React from 'react';
import { Application } from 'citrus';
import { HomePage } from './HomePage';
import { ArticlePage } from './ArticlePage';
import { getArticles } from './getArticles';

(async () => {
  const app = new Application();

  app.page('/', <HomePage />);

  const articles = await getArticles();
  for (const article of articles) {
    app.page(`/article/${article.slug}`, <ArticlePage article={article} />);
  }

  await app.build('dist');

  console.log('Built in ./dist');
})();
```

By default, Citrus will just build static HTML. To use an interactive component, use the `useLiveComponent` hook:

```javascript
import React from 'react';
import { useLiveComponent } from 'citrus';

export function HomePage() {
  const Menu = useLiveComponent(import('./Menu'));

  return (
    <div>
      <Menu />
    </div>
  );
}
```
