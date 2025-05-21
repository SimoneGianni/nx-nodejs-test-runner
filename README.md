# @simonegianni/nx-nodejs-test-runner

An Nx executor for running tests using Node.js's built-in test runner with TypeScript support and Jest compatibility.

It is (almost) a drop-in replacement for Jest's test runner, allowing you to run your tests using Node.js's built-in test runner while still using Jest's syntax both in the test files and in the nx executor configuration.

## Features

- Uses Node.js built-in test runner for fast, native test execution
- Optional TypeScript compilation (disabled by default for faster execution)
- Optional Jest/Vitest compatibility (enabled by default)
- Support for custom module imports
- Configurable test reporter
- Supports snapshots, coverage, and parallel test execution
- Configurable test filtering and reporting

## Installation

```bash
npm install --save-dev @simonegianni/nx-nodejs-test-runner
```

## Usage

Add the executor to your project's `project.json` file:

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testFiles": "**/*.test.ts",
        "coverage": true
      }
    }
  }
}
```

Or configure it globally in your `nx.json` file:

```json
{
  "targetDefaults": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "dependsOn": ["build"],
      "inputs": ["default", "^production"],
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "tsConfig": "tsconfig.spec.json",
        "coverage": true
      }
    }
  }
}
```

Then run your tests with:

```bash
nx test my-package
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useTsLoader` | boolean | `false` | Whether to automatically use the built-in loader.mjs file from this module for inline TypeScript compilation and path resolution |
| `useTsc` | boolean | `false` | Whether to enable TypeScript compilation (if disabled, tests will run directly from source) |
| `useTsx` | boolean | `true` | Whether to use tsx instead of node for running TypeScript tests directly (recommended for most projects unless esbuild limitations require tsc) |
| `enableJestCompat` | boolean | `true` | Whether to enable Jest compatibility via @simonegianni/node-test-jest-compat (uses `--import @simonegianni/node-test-jest-compat`) |
| `imports` | string[] | | Additional modules to import before running tests (uses `--import` for each module) |
| `loader` | string | | Custom loader to use with node --test (uses --loader flag) |
| `reporter` | string | `spec` | Test reporter to use (e.g., 'default', 'spec', 'tap', 'dot', or a path to a custom reporter) (uses `--test-reporter`) |
| `testFiles` | string | `**/*.test.{js,ts}` | Glob pattern for test files |
| `tsConfig` | string | `tsconfig.spec.json` | Path to tsconfig file |
| `useAlias` | boolean | `true` | Whether to use tsc-alias to resolve path aliases |
| `ignoreBuildErrors` | boolean | `false` | Whether to ignore TypeScript build errors |
| `verbose` | boolean | `false` | Whether to enable verbose logging |
| `coverage` | boolean | `false` | Collect coverage information (uses `--experimental-test-coverage`) |
| `additionalArgs` | string | | Additional arguments to pass to the node test command |
| `outputDir` | string | `dist/test-out/{projectName}` | Custom output directory for compiled tests |
| `experimental` | boolean | `false` | Whether to use experimental test features (uses `--experimental-test-module-mocks`) |
| `updateSnapshot` | boolean | `false` | Whether to update snapshots (alias: `u`) (uses `--test-update-snapshots`) |
| `testTimeout` | number | none | Default timeout of a test in milliseconds (uses `--test-timeout`) |
| `bail` | boolean | `false` | Exit the test suite immediately after the first failing test (uses `--test-fail-fast`) |
| `testNamePattern` | string | | Run only tests with the specified name (uses `--test-name-pattern`) |
| `testPathPattern` | string | | Run only tests in files matching the specified pattern (uses `--test-path-pattern`) |
| `maxWorkers` | number | | Maximum number of workers to use for running tests (uses `--test-concurrency`) |
| `parallel` | boolean | `true` | Whether to run tests in parallel (when false, uses `--test-concurrency=1`) |


## How It Works

This executor provides several key features to enhance your testing experience:

### TypeScript Support

This executor provides several ways to run TypeScript tests, offering a balance between speed and compatibility:

1. **Using tsx (Recommended for most projects)**: By default, the executor uses [tsx](https://github.com/privatenumber/tsx) to run TypeScript tests directly (`useTsx: true`). This is powered by esbuild, which is much faster than traditional TypeScript compilation and works for most projects. It handles TypeScript files, path aliases, and other TypeScript features out of the box.

   However, tsx (esbuild) does not support decorator metadata, which is required by some frameworks like NestJS or TypeORM.

2. **Using the built-in TypeScript loader**: If you need decorator metadata support, you can enable the built-in loader (`useTsLoader: true`). This uses a custom loader that:
   - Provides proper TypeScript path resolution
   - Supports decorator metadata
   - Handles ESM imports correctly
   - Maps imports to proper TypeScript aliases

This uses ts-node to compile TypeScript files on the fly, which takes quite some time for large projects. 

3. **Using TypeScript Compilation (Fallback)**: If the above options don't work for your project, you can enable full TypeScript compilation (`useTsc: true`). The executor will:
   - Compile your TypeScript tests using the specified tsconfig
   - Resolve path aliases using tsc-alias (if enabled)
   - Run the compiled JavaScript tests from the output directory
   
   This approach provides the most compatibility for complex TypeScript projects. The compiled tests will be placed in the `outputDir` specified in the options, which makes it also possible to inspect the compiled code.

4. **Custom approach**: For other special requirements or backward compatibility, you can still use the `imports` option to specify a TypeScript loader like `ts-node/register` or the `loader` option to specify a custom loader. 

### Jest Compatibility (Optional)

Jest compatibility is enabled by default (`enableJestCompat: true`). This executor uses [@simonegianni/node-test-jest-compat](https://github.com/SimoneGianni/node-test-jest-compat) to provide compatibility with Jest syntax, allowing you to:

- Use Jest's `describe`, `it`, `test`, `beforeEach`, `afterEach`, etc.
- Use Jest's `expect` assertions
- Use Jest's mocking capabilities
- Use Jest's snapshot testing

You can disable Jest compatibility if you prefer to use Node.js's native test syntax.

### Custom Module Imports

You can specify additional modules to import before running tests using the `imports` option. This is useful for loading global setup code, custom test helpers, or other modules needed by your tests.

### Configurable Test Reporter

You can customize the test reporter using the `reporter` option. Node.js supports several built-in reporters:
- `default`: Human-readable output
- `spec`: Detailed test specification output
- `tap`: Test Anything Protocol output
- `dot`: Minimal dot notation output

You can also specify a path to a custom reporter module.

## Examples

### Basic Usage

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "tsConfig": "packages/my-package/tsconfig.spec.json"
      }
    }
  }
}
```

### Using tsx for TypeScript Tests (Recommended)

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "useTsx": true,
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testFiles": "**/*.test.ts"
      }
    }
  }
}
```

### With TypeScript Compilation Enabled

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "useTsc": true,
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testFiles": "**/*.test.ts"
      }
    }
  }
}
```

### With Additional Imports

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "imports": ["ts-node/register", "./test/setup.js"],
        "tsConfig": "packages/my-package/tsconfig.spec.json"
      }
    }
  }
}
```

### Using the Built-in TypeScript Loader (for Decorator Metadata Support)

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "useTsLoader": true,
        "useTsx": false,
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testFiles": "**/*.test.ts"
      }
    }
  }
}
```

## License

Apache-2.0
