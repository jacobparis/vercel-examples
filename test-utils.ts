import { execSync } from 'child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { globSync } from 'node:fs'

const TEMPLATES_DIR = join(__dirname, 'templates')

/**
 * Prepare a test project by copying the base template and overlaying package files.
 * Returns the path to the prepared project directory.
 */
export function prepareTestProject(packageDir: string, template = 'nextjs'): string {
  const tmpDir = join(tmpdir(), `vercel-examples-test-${randomUUID()}`)
  const templateDir = join(TEMPLATES_DIR, template)
  const filesDir = join(packageDir, 'files')
  const patchesDir = join(packageDir, 'patches')

  // Copy base template
  cpSync(templateDir, tmpDir, { recursive: true })

  // Overlay package files
  if (existsSync(filesDir)) {
    cpSync(filesDir, tmpDir, { recursive: true })
  }

  // Apply package.json patches (merge dependencies)
  if (existsSync(patchesDir)) {
    const patches = readdirSyncSafe(patchesDir).filter(f => f.endsWith('.patch'))
    for (const patch of patches) {
      const patchPath = join(patchesDir, patch)
      const patchContent = readFileSync(patchPath, 'utf-8')

      // If it's a package.json patch, merge dependencies
      if (patch.includes('package.json')) {
        applyPackageJsonPatch(tmpDir, patchContent)
      }
    }
  }

  return tmpDir
}

/**
 * Parse a package.json patch and merge the added dependencies into the project's package.json.
 */
function applyPackageJsonPatch(projectDir: string, patchContent: string): void {
  const pkgPath = join(projectDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

  // Extract lines that start with + (added dependencies)
  const lines = patchContent.split('\n')
  for (const line of lines) {
    const match = line.match(/^\+\s*"([^"]+)"\s*:\s*"([^"]+)"/)
    if (match) {
      const [, name, version] = match
      if (!pkg.dependencies) pkg.dependencies = {}
      pkg.dependencies[name] = version
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

function readdirSyncSafe(dir: string): string[] {
  try {
    const { readdirSync } = require('fs')
    return readdirSync(dir)
  } catch {
    return []
  }
}

/**
 * Install dependencies in the project directory.
 */
export function installDeps(projectDir: string): void {
  execSync('pnpm install --no-frozen-lockfile', {
    cwd: projectDir,
    stdio: 'pipe',
    timeout: 120_000,
  })
}

/**
 * Run TypeScript type checking on the project.
 */
export function typecheck(projectDir: string): void {
  try {
    execSync('npx tsc --noEmit', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 120_000,
    })
  } catch (e: any) {
    const stdout = e.stdout?.toString() || ''
    const stderr = e.stderr?.toString() || ''
    throw new Error(`TypeScript errors:\n${stdout}\n${stderr}`)
  }
}

/**
 * Run Next.js build on the project.
 */
export function build(projectDir: string): void {
  execSync('npx next build', {
    cwd: projectDir,
    stdio: 'pipe',
    timeout: 180_000,
  })
}

/**
 * Clean up a test project directory.
 */
export function cleanup(projectDir: string): void {
  try {
    rmSync(projectDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup failures
  }
}
