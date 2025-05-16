import { ExecutorContext } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, execSync } from 'child_process';
import { replaceTscAliasPaths } from 'tsc-alias';

/**
 * Options for the Node.js test executor
 */
export interface NodeTestExecutorOptions {
  /**
   * Whether to enable TypeScript compilation
   * If disabled, tests will run directly from source
   * @default false
   */
  enableTsc?: boolean;
  
  /**
   * Whether to use tsx instead of node for running TypeScript tests directly
   * Recommended for most projects unless esbuild limitations require tsc
   * @default true
   */
  useTsx?: boolean;
  
  /**
   * Whether to enable Jest compatibility via @simonegianni/node-test-jest-compat
   * @default true
   */
  enableJestCompat?: boolean;
  
  /**
   * Additional modules to import before running tests
   */
  imports?: string[];
  
  /**
   * Test reporter to use
   * @default "default"
   */
  reporter?: string;
  
  /**
   * Glob pattern for test files
   * @default "** /*.test.{js,ts}"
   */
  testFiles?: string;
  
  /**
   * Path to tsconfig file
   * @default "tsconfig.spec.json"
   */
  tsConfig?: string;
  
  /**
   * Whether to use tsc-alias to resolve path aliases
   * @default true
   */
  useAlias?: boolean;
  
  /**
   * Whether to ignore TypeScript build errors
   * @default false
   */
  ignoreBuildErrors?: boolean;
  
  /**
   * Whether to enable verbose logging
   * @default false
   */
  verbose?: boolean;
  
  /**
   * Whether to collect coverage information
   * @default false
   */
  coverage?: boolean;
  
  /**
   * Additional arguments to pass to the node test command
   */
  additionalArgs?: string;
  
  /**
   * Custom output directory for compiled tests
   * If not specified, defaults to dist/test-out/{projectName}
   */
  outputDir?: string;
  
  /**
   * Whether to use experimental test features
   * @default false
   */
  experimental?: boolean;
  
  /**
   * Whether to update snapshots
   * @default false
   */
  updateSnapshot?: boolean;
  
  /**
   * Default timeout of a test in milliseconds
   * @default 5000
   */
  testTimeout?: number;
  
  /**
   * Exit the test suite immediately after the first failing test
   * @default false
   */
  bail?: boolean;
  
  /**
   * Run only tests with the specified name
   */
  testNamePattern?: string;
  
  /**
   * Run only tests in files matching the specified pattern
   */
  testPathPattern?: string;
  
  /**
   * Maximum number of workers to use for running tests
   */
  maxWorkers?: number;
  
  /**
   * Whether to run tests in parallel
   * @default true
   */
  parallel?: boolean;
}

/**
 * Runs tests using Node.js built-in test runner
 * 
 * @param options - The executor options
 * @param context - The executor context
 * @returns A promise that resolves to an object with a success property
 */
export default async function runExecutor(
  options: NodeTestExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectName = context.projectName;
  if (!projectName) {
    throw new Error('No project name provided');
  }

  const projectRoot = context.workspace?.projects?.[projectName]?.root;
  if (!projectRoot) {
    throw new Error(`Cannot find root for project ${projectName}`);
  }

  const tsConfigPath = options.tsConfig || 'tsconfig.spec.json';
  const fullTsConfigPath = path.join(context.root, projectRoot, tsConfigPath);
  
  // Check if tsconfig exists
  if (!fs.existsSync(fullTsConfigPath)) {
    throw new Error(`Cannot find tsconfig at ${fullTsConfigPath}`);
  }

  // Define output directory for compiled tests
  const testOutDir = options.outputDir 
    ? path.join(context.root, options.outputDir)
    : path.join(context.root, 'dist', 'test-out', projectName);
  
  try {
    // Determine if we should compile TypeScript
    const shouldCompileTypeScript = options.enableTsc === true;
    
    // If we're compiling TypeScript, prepare the output directory
    if (shouldCompileTypeScript) {
      // Delete and then recreate the output directory
      if (fs.existsSync(testOutDir)) {
        fs.rmSync(testOutDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testOutDir, { recursive: true });
      
      if (options.verbose) {
        console.info(`Compiling tests for ${projectName}...`);
      }
      
      // Use the nx tsc executor to compile tests, similar to how the build target works
      // This ensures we use the same compilation process as the build target
      const tscBin = path.join(context.root, 'node_modules', '.bin', 'tsc');
      
      // Compile tests using tsc with explicit options
      let tscCommand = `${tscBin} --project ${fullTsConfigPath} --outDir ${testOutDir}`;

      if (options.verbose) {
        console.log(`Executing: ${tscCommand}`);
      }

      try {
        execSync(tscCommand, { 
          cwd: context.root,
          stdio: 'inherit',
          env: {
            ...process.env,
          }
        });
      } catch (error) {
        console.error('Error during TypeScript compilation:');
        console.error(error);
        if (!options.ignoreBuildErrors) {
          return { success: false };
        }
      }

      // Use tsc-alias to resolve path aliases if enabled (default is true)
      if (options.useAlias !== false) {
        // Find and copy only the tsconfig files that correspond to folders in the output directory
        if (options.verbose) {
          console.info('Finding and copying relevant tsconfig files...');
        }

        // Function to recursively find all directories in the output folder
        const findAllDirectories = (dir: string, dirList: string[] = []): string[] => {
          // Add the current directory to the list
          dirList.push(dir);
          
          // Read directory contents
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          
          // Process each entry
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(dir, entry.name);
              // Recursively find directories in this subdirectory
              findAllDirectories(fullPath, dirList);
            }
          }
          
          return dirList;
        };
        
        // Find all directories in the output folder
        const outputDirs = findAllDirectories(testOutDir);
        
        // Copy tsconfig files from corresponding source directories
        const tsConfigOutPaths: string[] = [];
        let copiedCount = 0;
        
        // Process each output directory
        outputDirs.forEach(outputDir => {
          // Get the relative path from the output root
          const relativePath = path.relative(testOutDir, outputDir);
          // Construct the corresponding source path
          const sourceDirPath = path.join(context.root, relativePath);
          
          // Check if the source directory exists
          if (fs.existsSync(sourceDirPath)) {
            try {
              // Look for tsconfig files in this source directory
              const entries = fs.readdirSync(sourceDirPath);
              const tsConfigFiles = entries.filter(entry => 
                entry.startsWith('tsconfig') && entry.endsWith('.json')
              );
              
              // Copy each tsconfig file to the corresponding output directory
              for (const tsConfigFile of tsConfigFiles) {
                const sourceFilePath = path.join(sourceDirPath, tsConfigFile);
                const targetFilePath = path.join(outputDir, tsConfigFile);
                
                // Copy the file
                fs.copyFileSync(sourceFilePath, targetFilePath);
                copiedCount++;
                
                if (options.verbose) {
                  console.info(`Copied ${path.relative(context.root, sourceFilePath)} to ${path.relative(context.root, targetFilePath)}`);
                }
                
                // Add to the list of output paths
                tsConfigOutPaths.push(targetFilePath);
              }
            } catch (error) {
              // Skip directories that can't be read
              if (options.verbose) {
                console.info(`Skipping directory ${sourceDirPath}: ${(error as Error).message}`);
              }
            }
          }
        });
        
        if (options.verbose) {
          console.info(`Copied ${copiedCount} tsconfig files`);
        }
        
        // Use modified tsconfig path for tsc-alias
        // Get the relative path of the original tsconfig from the project root
        const relTsConfigPath = path.relative(context.root, fullTsConfigPath);
        // Find the corresponding tsconfig in the output directory
        const tsConfigOutPath = path.join(testOutDir, relTsConfigPath);
        
        // Run tsc-alias to resolve path aliases
        try {
          let output: any = undefined;
          if (options.verbose) {
            output = { verbose: true, ...console };
            console.info(`Running tsc-alias on ${tsConfigOutPath}...`);
          }
          await replaceTscAliasPaths({
            outDir: testOutDir,
            configFile: tsConfigOutPath,
            resolveFullPaths: true,
            output
          });
        } catch (error) {
          console.error('Error during tsc-alias replacement:');
          console.error(error);
          if (!options.ignoreBuildErrors) {
            return { success: false };
          }
        }
      }
      
      if (options.verbose) {
        console.info(`Tests compiled successfully. Running tests...`);
      }
    }
    
    // Determine whether to use tsx or node
    const useTsx = !shouldCompileTypeScript && options.useTsx !== false;
    
    // Build the command to run the tests
    let command = useTsx ? 'tsx' : 'node';

    // Prevent node warnings (only for node, not needed for tsx)
    if (!options.verbose && !useTsx) {
      command += ' --no-warnings';
    }
    
    // Enable source maps for better debugging (only for node, tsx has this built-in)
    if (!useTsx) {
      command += ' --enable-source-maps';
    }
    
    // Add test command
    command += ' --test';
    
    // Add test adapter to provide compatibility with Jest/Vitest syntax if enabled
    if (options.enableJestCompat !== false) {
      command += ' --import @simonegianni/node-test-jest-compat';
    }

    // Add custom imports if specified
    if (options.imports && options.imports.length > 0) {
      for (const importModule of options.imports) {
        command += ` --import ${importModule}`;
      }
    }

    // Set the test reporter
    const reporter = options.reporter || 'default';
    command += ` --test-reporter ${reporter}`;
    
    // Add experimental features if specified
    if (options.experimental) {
      command += ' --experimental-test-module-mocks';
    }
    
    // Add coverage if specified
    if (options.coverage) {
      command += ' --experimental-test-coverage';
    }
    
    // Add update snapshots if specified
    if (options.updateSnapshot) {
      command += ' --test-update-snapshots';
    }
    
    // Add test timeout if specified
    if (options.testTimeout) {
      command += ` --test-timeout=${options.testTimeout}`;
    }
    
    // Add bail option if specified
    if (options.bail) {
      command += ' --test-fail-fast';
    }
    
    // Add test name pattern if specified
    if (options.testNamePattern) {
      command += ` --test-name-pattern="${options.testNamePattern}"`;
    }
    
    // Add parallel option if specified (default is true)
    if (options.parallel === false) {
      command += ' --test-concurrency=1';
    } else if (options.maxWorkers) {
      command += ` --test-concurrency=${options.maxWorkers}`;
    }
    
    // Determine the correct path to the test files
    let testFilesPath: string;
    if (shouldCompileTypeScript) {
      // If we compiled TypeScript, use the compiled JS files
      const testPattern = options.testFiles || '**/*.test.js';
      testFilesPath = path.join(testOutDir, testPattern);
    } else {
      // If we're not compiling TypeScript, use the source TS files directly
      const testPattern = options.testFiles || '**/*.test.{js,ts}';
      testFilesPath = path.join(context.root, projectRoot, testPattern);
    }
    
    // Add test path pattern if specified
    if (options.testPathPattern) {
      command += ` --test-path-pattern="${options.testPathPattern}"`;
    }

    // Add additional arguments if provided
    if (options.additionalArgs) {
      command += ` ${options.additionalArgs}`;
    }

    command += ` "${testFilesPath}"`;
    
    if (options.verbose) {
      console.log(`Executing node test runner using ${command}`);
    }
    
    // Split the command into parts for spawn
    const [cmd, ...args] = command.split(' ');
    
    return new Promise((resolve) => {
      const childProcess = spawn(cmd, args, {
        cwd: context.root,
        env: {
          ...process.env,
        },
        stdio: 'inherit', // This will pipe output directly to parent process
        shell: true
      });
      
      childProcess.on('close', (code) => {
        resolve({ success: code === 0 });
      });
    });
  } catch (error) {
    console.error('Error during test compilation or execution:');
    console.error(error);
    return { success: false };
  }
}
