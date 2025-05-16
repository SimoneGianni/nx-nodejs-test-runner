# @simonegianni/nx-nodejs-test-runner

An Nx executor for running tests using Node.js's built-in test runner with TypeScript support and Jest compatibility.

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
| `enableTsc` | boolean | `false` | Whether to enable TypeScript compilation (if disabled, tests will run directly from source) |
| `enableJestCompat` | boolean | `true` | Whether to enable Jest compatibility via node-test-jest-compat (uses `--import node-test-jest-compat`) |
| `imports` | string[] | | Additional modules to import before running tests (uses `--import` for each module) |
| `reporter` | string | `default` | Test reporter to use (e.g., 'default', 'spec', 'tap', 'dot', or a path to a custom reporter) (uses `--test-reporter`) |
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
| `testTimeout` | number | `5000` | Default timeout of a test in milliseconds (uses `--test-timeout`) |
| `bail` | boolean | `false` | Exit the test suite immediately after the first failing test (uses `--test-fail-fast`) |
| `testNamePattern` | string | | Run only tests with the specified name (uses `--test-name-pattern`) |
| `testPathPattern` | string | | Run only tests in files matching the specified pattern (uses `--test-path-pattern`) |
| `maxWorkers` | number | | Maximum number of workers to use for running tests (uses `--test-concurrency`) |
| `parallel` | boolean | `true` | Whether to run tests in parallel (when false, uses `--test-concurrency=1`) |


## How It Works

This executor provides several key features to enhance your testing experience:

### TypeScript Compilation (Optional)

By default, TypeScript compilation is disabled (`enableTsc: false`). In this mode, the executor will run JavaScript test files directly from the project directory.

If you enable TypeScript compilation (`enableTsc: true`), the executor will:
1. Compile your TypeScript tests using the specified tsconfig
2. Resolve path aliases using tsc-alias (if enabled)
3. Run the compiled JavaScript tests from the output directory

If you need to run TypeScript test files without compilation, you can use the `imports` option to specify a TypeScript loader like `ts-node/register`:

```json
{
  "imports": ["ts-node/register"]
}
```

However, this has various limitations and may or may not work depending on your setup.

### Jest Compatibility (Optional)

Jest compatibility is enabled by default (`enableJestCompat: true`). This executor uses [node-test-jest-compat](https://github.com/SimoneGianni/node-test-jest-compat) to provide compatibility with Jest syntax, allowing you to:

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

### With TypeScript Compilation Enabled

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "enableTsc": true,
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testFiles": "**/*.test.ts"
      }
    }
  }
}
```

### With Custom Reporter

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "reporter": "tap",
        "tsConfig": "packages/my-package/tsconfig.spec.json"
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

### Without Jest Compatibility

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "enableJestCompat": false,
        "tsConfig": "packages/my-package/tsconfig.spec.json"
      }
    }
  }
}
```

### With Coverage

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "coverage": true
      }
    }
  }
}
```

### With Test Filtering

```json
{
  "targets": {
    "test": {
      "executor": "@simonegianni/nx-nodejs-test-runner:nodejs-test",
      "options": {
        "tsConfig": "packages/my-package/tsconfig.spec.json",
        "testNamePattern": "should handle errors"
      }
    }
  }
}
```

## License

Apache-2.0
