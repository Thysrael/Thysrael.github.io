# Blog

Hexo 8 blog using NexT 8, server-side KaTeX, and GitHub Pages.

## Local Development

```bash
npm ci
npm run server
```

Open <http://localhost:4000>.

## Writing

Create posts with `hexo new post "Title"`. Keep post images beside the post in
`source/_posts/Title/` and reference them as `Title/image.webp`.

Before committing:

```bash
npm run spacing:check
npm run math:check
npm run clean && npm run build && npm run verify
```

Use `npm run spacing` or `npm run math:fix` to apply the corresponding fixes.
Staged images and CJK spacing are handled by the pre-commit hook.

## Deployment

Push `main`; GitHub Actions builds and deploys `public/`. GitHub Pages must use
`GitHub Actions` as its source.
