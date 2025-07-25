#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

async function prompt(question: string): Promise<string> {
  const answer = globalThis.prompt(`${colors.cyan}? ${colors.reset}${question}`);
  return answer?.trim() || '';
}

async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const suffix = defaultValue ? '(Y/n)' : '(y/N)';
  const answer = await prompt(`${question} ${suffix}`);
  if (!answer) return defaultValue;
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function main() {
  console.log(`\n${colors.bright}🚀 Welcome to Library Template Setup!${colors.reset}\n`);

  // Get package name
  const packageName = await prompt(
    'What should your package be called? (will be @lasercat/<name>)',
  );
  if (!packageName) {
    console.error(`${colors.yellow}Package name is required. Exiting...${colors.reset}`);
    process.exit(1);
  }

  // Get author name
  const authorName = await prompt("What's your name? (for author field)");
  if (!authorName) {
    console.error(`${colors.yellow}Author name is required. Exiting...${colors.reset}`);
    process.exit(1);
  }

  // Ask about npm publishing
  const publishToNpm = await confirm('Will this be published to npm?', false);

  console.log(`\n${colors.bright}Configuring your library...${colors.reset}\n`);

  // Update package.json
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  packageJson.name = `@lasercat/${packageName}`;
  packageJson.author = authorName;

  // Remove postinstall script
  if (packageJson.scripts?.postinstall) {
    delete packageJson.scripts.postinstall;
  }

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`${colors.green}✅${colors.reset} Updated package.json`);

  // Create GitHub Actions workflow if user wants npm publishing
  if (publishToNpm) {
    const workflowDir = join(process.cwd(), '.github', 'workflows');
    const workflowPath = join(workflowDir, 'release.yml');

    // Create .github/workflows directory if it doesn't exist
    if (!existsSync(workflowDir)) {
      mkdirSync(workflowDir, { recursive: true });
    }

    const workflowContent = `name: Release

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run build

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

    writeFileSync(workflowPath, workflowContent);
    console.log(
      `${colors.green}✅${colors.reset} Created GitHub Actions workflow for npm publishing`,
    );
    console.log(
      `${colors.yellow}⚠${colors.reset}  Remember to add NPM_TOKEN secret to your GitHub repository`,
    );
  }

  // Clean up setup files
  console.log(`\n${colors.bright}Cleaning up...${colors.reset}\n`);

  // Remove this setup script
  rmSync(__filename, { force: true });
  console.log(`${colors.green}✅${colors.reset} Removed setup script`);

  // Remove scripts directory if empty
  const scriptsDir = join(process.cwd(), 'scripts');
  try {
    const files = readdirSync(scriptsDir);
    if (files.length === 0) {
      rmSync(scriptsDir, { recursive: true, force: true });
      console.log(`${colors.green}✅${colors.reset} Removed empty scripts directory`);
    }
  } catch {
    // Directory might not exist or might have other files
  }

  console.log(`\n${colors.green}${colors.bright}✨ Setup complete!${colors.reset}`);
  console.log(
    `\nYour library "${colors.cyan}@lasercat/${packageName}${colors.reset}" is ready for development.`,
  );
  console.log(`\nNext steps:`);
  console.log(`  1. Run ${colors.cyan}bun install${colors.reset} to install dependencies`);
  console.log(`  2. Start coding in ${colors.cyan}src/index.ts${colors.reset}`);
  console.log(`  3. Run ${colors.cyan}bun test${colors.reset} to run tests`);
  console.log(`  4. Run ${colors.cyan}bun run build${colors.reset} to build your library\n`);
}

main().catch(console.error);
