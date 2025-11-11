/**
 * LangSmith Configuration for Tracing and Monitoring
 * Optional monitoring - only activates if LANGCHAIN_API_KEY is set
 * 
 * This module provides:
 * - API key validation with detailed diagnostics
 * - Configuration logging for troubleshooting
 * - Error capture for LangChain tracing failures
 * - Root cause investigation for 403 Forbidden errors
 * 
 * When LANGCHAIN_API_KEY is set:
 * - Validates API key format (should start with 'ls__' or 'lsv2_')
 * - Tests API key by calling LangSmith projects endpoint
 * - Verifies project exists in LangSmith account
 * - Logs comprehensive diagnostic information
 * - Captures and logs tracing errors with full context
 * 
 * Common issues diagnosed:
 * - Invalid API key format (must start with 'ls__' or 'lsv2_')
 * - Project doesn't exist (defaults to 'default' if not specified)
 * - API key lacks permissions
 * - Expired or invalid API key
 */

let langSmithEnabled = false;
let validationError: string | undefined;
let consecutive403Errors = 0;
const MAX_403_ERRORS = 5; // Disable tracing after 5 consecutive 403 errors

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    apiKeyFormat?: string;
    apiKeyLength?: number;
    projectExists?: boolean;
    availableProjects?: string[];
    responseStatus?: number;
    responseBody?: string;
    isProjectToken?: boolean;
  };
}

/**
 * Validates LangSmith API key format and makes test API call
 */
async function validateLangSmithKey(): Promise<ValidationResult> {
  const apiKey = process.env.LANGCHAIN_API_KEY;
  
  if (!apiKey) {
    return { 
      valid: false, 
      error: "LANGCHAIN_API_KEY environment variable not set",
      details: {}
    };
  }

  const details: ValidationResult['details'] = {
    apiKeyLength: apiKey.length,
    apiKeyFormat: apiKey.substring(0, Math.min(10, apiKey.length)),
  };

  // Check format - LangSmith keys start with ls__ (legacy) or lsv2_ (v2 format including project tokens)
  if (!apiKey.startsWith('ls__') && !apiKey.startsWith('lsv2_')) {
    return { 
      valid: false, 
      error: `Invalid API key format. LangSmith keys should start with 'ls__' (legacy) or 'lsv2_' (v2 format). Detected format: ${apiKey.substring(0, 10)}...`,
      details
    };
  }

  const isProjectToken = apiKey.startsWith('lsv2_pt_');
  
  // Project tokens (lsv2_pt_*) are scoped to a specific project and cannot access the projects endpoint
  // They can only write traces to their assigned project.
  // We can't fully validate them without actually creating a trace (which LangChain does),
  // so we'll validate format and project name configuration only.
  // Actual validation happens when traces are sent - if there's an error, we diagnose it in the error handler.
  if (isProjectToken) {
    // Project tokens require an explicit project name - they can't use the default
    const projectName = process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT;
    if (!projectName) {
      return {
        valid: false,
        error: "Project token detected but LANGCHAIN_PROJECT is not set. Project tokens require an explicit project name that matches the token's assigned project.",
        details: {
          ...details,
          isProjectToken: true,
        }
      };
    }
    
    // For project tokens, we can't fully validate without creating a trace
    // But we can check format and that project name is set
    // If the token is invalid or lacks permissions, the error handler will diagnose it
    return {
      valid: true, // Assume valid - actual validation happens when traces are sent
      details: {
        ...details,
        isProjectToken: true,
        projectExists: true, // Assumed - will fail at trace time if invalid
      }
    };
  }

  try {
    // Create timeout signal (with fallback for older Node.js versions)
    let timeoutSignal: AbortSignal;
    if (typeof AbortSignal.timeout === 'function') {
      timeoutSignal = AbortSignal.timeout(10000); // 10 second timeout
    } else {
      // Fallback for Node.js < 17.3.0
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      timeoutSignal = controller.signal;
    }

    // Test API key by calling LangSmith projects endpoint (only for regular API keys)
    const response = await fetch('https://api.smith.langchain.com/api/v1/projects', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: timeoutSignal,
    });

    details.responseStatus = response.status;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      details.responseBody = errorText;
      
      // 404 could mean endpoint doesn't exist or key doesn't have access
      // 401/403 means invalid key or insufficient permissions
      if (response.status === 404) {
        return {
          valid: false,
          error: `Projects endpoint returned 404. The API key may not have permission to list projects, or the endpoint may have changed.`,
          details: {
            ...details,
            responseBody: errorText.substring(0, 500),
          }
        };
      }
      
      // 403 means insufficient permissions - disable tracing
      if (response.status === 403) {
        disableTracing();
        return {
          valid: false,
          error: `API key validation failed: 403 Forbidden - Insufficient permissions. Tracing has been disabled.`,
          details: {
            ...details,
            responseBody: errorText.substring(0, 500),
          }
        };
      }
      
      return { 
        valid: false, 
        error: `API key validation failed: ${response.status} ${response.statusText}`,
        details: {
          ...details,
          responseBody: errorText.substring(0, 500), // Limit length
        }
      };
    }

    // Check if project exists (if specified)
    const projects = await response.json();
    const projectName = process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT;
    const availableProjects = Array.isArray(projects) 
      ? projects.map((p: any) => p.name || p.project_name || String(p)).filter(Boolean)
      : [];
    
    details.availableProjects = availableProjects;
    
    // If no project name specified, that's fine - LangSmith will use "default"
    if (!projectName) {
      return { 
        valid: true, 
        details: {
          ...details,
          projectExists: true, // Will use "default" project
        }
      };
    }
    
    // If project name is specified, check if it exists
    details.projectExists = availableProjects.includes(projectName);

    if (availableProjects.length === 0) {
      return { 
        valid: false, 
        error: `No projects found in LangSmith account. The API key may not have permission to list projects.`,
        details
      };
    }
    
    if (!details.projectExists) {
      // Project doesn't exist, but LangSmith may auto-create it
      // So we'll return valid but warn about it
      return { 
        valid: true, // Assume valid - LangSmith may auto-create the project
        details: {
          ...details,
          projectExists: false,
        }
      };
    }

    return { valid: true, details };
  } catch (error) {
    return { 
      valid: false, 
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        ...details,
        responseBody: error instanceof Error ? error.stack : undefined,
      }
    };
  }
}

/**
 * Disables LangSmith tracing by setting LANGCHAIN_TRACING_V2 to false
 */
function disableTracing() {
  if (process.env.LANGCHAIN_TRACING_V2 === "false") {
    return; // Already disabled
  }
  
  process.env.LANGCHAIN_TRACING_V2 = "false";
  langSmithEnabled = false;
  console.warn("🚫 LangSmith tracing has been disabled due to persistent 403 errors.");
  console.warn("   To re-enable, fix API key permissions and restart the server.");
}

/**
 * Logs diagnostic information about LangChain tracing configuration
 */
function logLangChainDiagnostics() {
  const config = {
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY 
      ? `${process.env.LANGCHAIN_API_KEY.substring(0, 10)}...${process.env.LANGCHAIN_API_KEY.substring(process.env.LANGCHAIN_API_KEY.length - 4)}` 
      : 'not set',
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT || 'not set (will default to "default" project)',
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT || 'not set (using default: api.smith.langchain.com)',
    LANGCHAIN_CALLBACKS_BACKGROUND: process.env.LANGCHAIN_CALLBACKS_BACKGROUND || 'not set (default: true for non-serverless)',
    LANGSMITH_WORKSPACE_ID: process.env.LANGSMITH_WORKSPACE_ID || 'not set (only needed for multi-workspace API keys)',
  };

  console.log('🔍 LangChain Tracing Configuration:');
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Captures and logs LangChain tracing errors with full context
 * Now also attempts to diagnose the root cause
 */
function setupLangChainErrorCapture() {
  // Track if we've already logged this error to prevent duplicates
  const loggedErrors = new WeakSet();
  let lastErrorTime = 0;
  const ERROR_SUPPRESSION_WINDOW = 60000; // 1 minute - only log once per minute
  let sentryErrorCount = 0;
  const MAX_SENTRY_ERRORS = 3; // Only send first 3 errors to Sentry
  
  // Add error listener for LangChain tracing errors
  // We add this as an additional listener, not replacing existing handlers
  process.on('unhandledRejection', (reason, promise) => {
    // Skip if we've already logged this error
    if (loggedErrors.has(reason as object)) {
      return;
    }
    
    const errorStr = String(reason);
    // Check if this is a LangChain/LangSmith tracing error
    // Normalize error string to avoid duplicate "Failed to" prefixes
    const normalizedErrorStr = errorStr.replace(/^Failed to\s+/i, '');
    const isLangSmithError = (normalizedErrorStr.includes('multipart request') || 
         normalizedErrorStr.includes('LangSmith') || 
         normalizedErrorStr.includes('langsmith') ||
         (normalizedErrorStr.includes('403') && normalizedErrorStr.includes('Forbidden'))) &&
        (normalizedErrorStr.includes('Failed to') || normalizedErrorStr.includes('send multipart'));
    
    if (isLangSmithError) {
      // Mark as logged to prevent duplicate logging
      if (typeof reason === 'object' && reason !== null) {
        loggedErrors.add(reason);
      }
      
      // Suppress frequent 403 errors - only log once per minute
      const now = Date.now();
      const is403Error = normalizedErrorStr.includes('403') && normalizedErrorStr.includes('Forbidden');
      if (is403Error && (now - lastErrorTime) < ERROR_SUPPRESSION_WINDOW) {
        // Increment counter even when suppressing
        consecutive403Errors++;
        
        // Disable tracing after threshold
        if (consecutive403Errors >= MAX_403_ERRORS) {
          disableTracing();
        }
        
        // Silently suppress - these are non-critical and frequent
        return;
      }
      lastErrorTime = now;
      
      // Track 403 errors for auto-disable
      if (is403Error) {
        consecutive403Errors++;
        
        // Disable tracing after threshold
        if (consecutive403Errors >= MAX_403_ERRORS) {
          disableTracing();
        }
      } else {
        // Reset counter on non-403 errors
        consecutive403Errors = 0;
      }
      
      // Send to Sentry (first few errors only)
      if (sentryErrorCount < MAX_SENTRY_ERRORS) {
        try {
          // Dynamic import to avoid circular dependencies
          import('@sentry/node').then((SentryModule) => {
            // Sentry is imported as namespace, so methods are on the module directly
            const Sentry = SentryModule as typeof import('@sentry/node');
            if (Sentry && typeof Sentry.captureException === 'function') {
              Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
                tags: {
                  errorType: 'langsmith_tracing_error',
                  is403Error: is403Error.toString(),
                  consecutiveErrors: consecutive403Errors.toString(),
                },
                level: 'warning', // Non-critical but worth tracking
                extra: {
                  errorString: normalizedErrorStr.substring(0, 500), // Limit length
                  apiKeyFormat: process.env.LANGCHAIN_API_KEY?.substring(0, 10) || 'not set',
                  projectName: process.env.LANGCHAIN_PROJECT || 'atomtools-rag',
                },
              });
            }
          }).catch(() => {
            // Sentry not available or failed to import - ignore
          });
          sentryErrorCount++;
        } catch {
          // Sentry not available - ignore
        }
      }
      
      const apiKey = process.env.LANGCHAIN_API_KEY;
      const projectName = process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT || "default";
      
      // Use console.warn instead of console.error for tracing errors
      // These are non-critical and don't affect application functionality
      console.warn('⚠️  LangChain Tracing Error Detected (non-critical):');
      // Use normalized error string to avoid duplicate "Failed to" prefixes
      const displayError = reason instanceof Error ? reason.message : normalizedErrorStr;
      console.warn('Error:', displayError);
      if (reason instanceof Error) {
        console.warn(`Error Name: ${reason.name}`);
        // Clean up duplicate "Failed to" prefixes in error message
        const cleanMessage = reason.message.replace(/^Failed to\s+Failed to\s+/i, 'Failed to ');
        console.warn(`Error Message: ${cleanMessage}`);
        
        // Diagnose 403 errors specifically
        if (is403Error && apiKey) {
          const isProjectToken = apiKey.startsWith('lsv2_pt_');
          console.warn('');
          console.warn('🔍 Root Cause Analysis:');
          console.warn(`   API Key Type: ${isProjectToken ? 'Project Token (lsv2_pt_*)' : 'Regular API Key'}`);
          console.warn(`   Project Name: ${projectName}`);
          console.warn('');
          console.warn('   Possible causes:');
          if (isProjectToken) {
            console.warn('   1. Project token does not have write permission for the specified project');
            console.warn('   2. Project name does not match the token\'s assigned project');
            console.warn('   3. Project does not exist - tokens cannot create projects');
          } else {
            console.warn('   1. API key does not have permission to write traces');
            console.warn('   2. Project does not exist and cannot be created automatically');
            console.warn('   3. API key is invalid or expired');
          }
          console.warn('');
          console.warn('   Solution:');
          if (isProjectToken) {
            console.warn('   - Verify the project name matches the token\'s assigned project');
            console.warn('   - Ensure the project exists in your LangSmith account');
            console.warn('   - Check that the token has write permissions');
          } else {
            console.warn('   - Verify the project exists in LangSmith dashboard');
            console.warn('   - Create the project if it doesn\'t exist');
            console.warn('   - Ensure the API key has write permissions');
          }
        }
      }
      console.warn('');
      console.warn('This error does not affect application functionality, but tracing will not work.');
      if (is403Error) {
        console.warn('(Subsequent 403 errors will be suppressed for 1 minute to reduce log noise)');
      }
    }
  });
}

/**
 * Synchronous initialization - sets environment variables immediately
 * Call validateAndInitialize() for async validation
 */
export function initializeLangSmith() {
  if (process.env.LANGCHAIN_API_KEY) {
    // LangSmith environment variables
    process.env.LANGCHAIN_TRACING_V2 = "true";
    
    // Project name is optional - if not set, LangSmith defaults to "default" project
    // Only set if explicitly provided by user
    if (!process.env.LANGCHAIN_PROJECT && !process.env.LANGSMITH_PROJECT) {
      // Don't force a project name - let LangSmith use "default"
      // This prevents 403 errors if the forced project doesn't exist
    }
    
    // Enable background callbacks for long-running server (reduces latency)
    // This is recommended for non-serverless environments (like Railway)
    if (!process.env.LANGCHAIN_CALLBACKS_BACKGROUND) {
      process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true";
    }
    
    langSmithEnabled = true;
    
    // Log diagnostics
    logLangChainDiagnostics();
    
    const projectName = process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT || "default";
    console.log("✅ LangSmith tracing enabled for project:", projectName);
    console.log("ℹ️  Running async validation...");
  } else {
    console.log("ℹ️  LangSmith tracing disabled (LANGCHAIN_API_KEY not set)");
  }
}

/**
 * Async validation and initialization with diagnostics
 * Should be called during server startup after environment is ready
 */
export async function validateAndInitializeLangSmith(): Promise<void> {
  if (!process.env.LANGCHAIN_API_KEY) {
    console.log("ℹ️  LangSmith tracing disabled (LANGCHAIN_API_KEY not set)");
    return;
  }

  // Log diagnostics before validation
  logLangChainDiagnostics();

  // Setup error capture for LangChain tracing failures
  setupLangChainErrorCapture();

  // Run validation
  const validation = await validateLangSmithKey();
  
  if (validation.valid) {
    langSmithEnabled = true;
    validationError = undefined;
    console.log("✅ LangSmith tracing validated successfully");
    if (validation.details?.availableProjects) {
      console.log(`   Available projects: ${validation.details.availableProjects.join(', ')}`);
    }
  } else {
    validationError = validation.error;
    console.warn("⚠️  LangSmith tracing validation failed:");
    console.warn(`   ${validation.error}`);
    
    if (validation.details) {
      console.warn("   Diagnostic details:", JSON.stringify(validation.details, null, 2));
    }

    // Check if validation failed due to 403 - if so, disable immediately
    if (validation.error?.includes('403') || validation.details?.responseStatus === 403) {
      disableTracing();
      console.warn("   Tracing has been disabled. Fix API key permissions and restart to re-enable.");
    } else {
      // Don't disable tracing for other validation failures - keep it enabled to see actual errors
      // This helps diagnose the root cause
      console.warn("   Tracing remains enabled to capture full error details.");
      console.warn("   Check LangSmith dashboard and API key permissions.");
      
      langSmithEnabled = true; // Keep enabled for diagnostics
    }
  }
}

export function isLangSmithEnabled(): boolean {
  return langSmithEnabled;
}

export function getValidationError(): string | undefined {
  return validationError;
}

// Initialize synchronously on module load (for backward compatibility)
initializeLangSmith();

// Auto-run async validation after a short delay (non-blocking)
// This allows server to start while validation runs in background
setTimeout(() => {
  validateAndInitializeLangSmith().catch(error => {
    console.error('Failed to validate LangSmith configuration:', error);
  });
}, 1000); // Wait 1 second for server to start
