# Vercel Monorepo Configuration

This monorepo contains three main projects:
- **public-site/** - Next.js web application (deployed to Vercel)
- **katachi-generator/** - NFT generation service (not deployed to Vercel)
- **mcp-server/** - MCP server for blockchain data (deployed to Vercel as separate project)

Since we don't use npm/yarn/pnpm workspaces, Vercel's automatic build skipping won't work. Instead, we use Vercel's **built-in "Ignored Build Step"** feature to prevent unnecessary rebuilds.

## Important: Multiple Vercel Projects

Since both `public-site/` and `mcp-server/` are deployed to Vercel as **separate projects**, you need to configure the Ignored Build Step for **each project individually**:

- **public-site project**: Only build when `public-site/` changes
- **mcp-server project**: Only build when `mcp-server/` changes

This ensures that changes to one project don't trigger rebuilds of the other.

## Configuration Steps

### For public-site Project

1. **Set Root Directory**
   - Vercel Dashboard → Project Settings → General
   - **Root Directory**: `public-site`

2. **Configure Ignored Build Step**
   - Vercel Dashboard → Project Settings → Git → Ignored Build Step
   - Select: **"Only build if there are changes in public-site/"**
   - Or use custom command: `git diff HEAD^ HEAD --quiet -- public-site/`

### For mcp-server Project

1. **Set Root Directory**
   - Vercel Dashboard → Project Settings → General
   - **Root Directory**: `mcp-server`

2. **Configure Ignored Build Step**
   - Vercel Dashboard → Project Settings → Git → Ignored Build Step
   - Select: **"Only build if there are changes in mcp-server/"**
   - Or use custom command: `git diff HEAD^ HEAD --quiet -- mcp-server/`

**How it works:**
- Exit code 0: Skip build (no changes detected)
- Exit code 1: Proceed with build (changes detected)

### For Both Projects (Recommended)

**Enable System Environment Variables**
- Vercel Dashboard → Project Settings → Environment Variables
- Enable "Automatically expose System Environment Variables"

This gives your build access to variables like:
- `VERCEL_ENV` (production, preview, development)
- `VERCEL_GIT_COMMIT_REF` (branch name)
- `VERCEL_GIT_COMMIT_SHA` (commit hash)

## What This Accomplishes

✅ **Faster Deployments**: Only rebuild projects when their specific folders change
✅ **Reduced Build Minutes**: Save on Vercel usage limits
✅ **Better CI/CD**: Independent deployment cycles for each project
- Changes to `public-site/` won't trigger mcp-server rebuilds
- Changes to `mcp-server/` won't trigger public-site rebuilds
- Changes to `katachi-generator/` won't trigger either project

## Testing Your Configuration

1. **Test: Changes in public-site/** → Should trigger build
   ```bash
   git commit -m "update public site" public-site/app/page.tsx
   git push
   ```
   Expected: ✅ Build proceeds

2. **Test: Changes in other folders** → Should skip build
   ```bash
   git commit -m "update generator" katachi-generator/server.js
   git push
   ```
   Expected: 🛑 Build skipped (deployment marked "CANCELED")

3. **Check build logs** in Vercel Dashboard to verify the ignored build step is working

## Alternative: Set Up Workspaces (Future Enhancement)

For automatic build skipping without manual configuration, you could set up npm/yarn/pnpm workspaces:

**Requirements:**
- Create root `package.json` with `workspaces` field
- Each project needs unique `name` in `package.json`
- Connected to GitHub repository
- Explicit dependency declarations

**Example root package.json:**
```json
{
  "name": "katachi-gen",
  "private": true,
  "workspaces": [
    "public-site",
    "katachi-generator",
    "mcp-server"
  ]
}
```

With workspaces, Vercel automatically detects changes and skips unchanged projects without needing the Ignored Build Step configuration.

## Troubleshooting

### Build still runs on unrelated changes
- Check that Root Directory is set to `public-site`
- Verify the Ignored Build Step command is correct
- Check build logs for the script output

### Build doesn't run when it should
- Ensure the git diff command syntax is correct
- Verify git history depth (Vercel uses `--depth=10`)
- Test the command locally: `git diff HEAD^ HEAD --quiet -- public-site/ && echo "skip" || echo "build"`

### Changes to root files (like .gitignore)
Current configuration: These won't trigger builds. If you need them to, modify the command:
```bash
git diff HEAD^ HEAD --quiet -- public-site/ .gitignore README.md
```

## Resources

- [Vercel Monorepos Documentation](https://vercel.com/docs/monorepos)
- [Ignored Build Step Guide](https://vercel.com/guides/how-do-i-use-the-ignored-build-step-field-on-vercel)
- [Git Settings Configuration](https://vercel.com/docs/project-configuration/git-settings#ignored-build-step)
