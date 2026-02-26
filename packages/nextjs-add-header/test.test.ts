import { describe, it, expect, afterEach } from 'vitest'
import { prepareTestProject, installDeps, typecheck, cleanup } from '../../test-utils'
import { join } from 'path'

const PACKAGE_DIR = join(__dirname)

describe('nextjs-add-header', () => {
  let projectDir: string

  afterEach(() => {
    if (projectDir) cleanup(projectDir)
  })

  it('should overlay files onto base Next.js template without type errors', () => {
    projectDir = prepareTestProject(PACKAGE_DIR)
    installDeps(projectDir)
    expect(() => typecheck(projectDir)).not.toThrow()
  })
})
