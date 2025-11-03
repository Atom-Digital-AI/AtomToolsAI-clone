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
 * - Project doesn't exist (default: 'atomtools-rag')
 * - API key lacks permissions
 * - Expired or invalid API key
 */

let langSmithEnabled = false;
let validationError: string | undefined;

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

    // Test API key by calling LangSmith projects endpoint
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
      
      return { 
        valid: false, 
        error: `API key validation failed: ${response.status} ${response.statusText}`,
        details: {
          ...details,
          responseBody: errorText.substring(0, 500), // Limit length
        }
      };
    }

    // Check if project exists
    const projects = await response.json();
    const projectName = process.env.LANGCHAIN_PROJECT || "atomtools-rag";
    const availableProjects = Array.isArray(projects) 
      ? projects.map((p: any) => p.name || p.project_name || String(p)).filter(Boolean)
      : [];
    
    details.availableProjects = availableProjects;
    details.projectExists = availableProjects.includes(projectName);

    if (availableProjects.length === 0) {
      return { 
        valid: false, 
        error: `No projects found in LangSmith account. The API key may not have permission to list projects.`,
        details
      };
    }
    
    if (!details.projectExists) {
      return { 
        valid: false, 
        error: `Project '${projectName}' not found in LangSmith. Available projects: ${availableProjects.join(', ') || 'none'}`,
        details
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
 * Logs diagnostic information about LangChain tracing configuration
 */
function logLangChainDiagnostics() {
  const config = {
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY 
      ? `${process.env.LANGCHAIN_API_KEY.substring(0, 10)}...${process.env.LANGCHAIN_API_KEY.substring(process.env.LANGCHAIN_API_KEY.length - 4)}` 
      : 'not set',
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT || 'not set (using default: atomtools-rag)',
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT || 'not set (using default: api.smith.langchain.com)',
  };

  console.log('🔍 LangChain Tracing Configuration:');
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Captures and logs LangChain tracing errors with full context
 */
function setupLangChainErrorCapture() {
  // Add error listener for LangChain tracing errors
  // We add this as an additional listener, not replacing existing handlers
  process.on('unhandledRejection', (reason, promise) => {
    const errorStr = String(reason);
    // Check if this is a LangChain/LangSmith tracing error
    if ((errorStr.includes('multipart request') || 
         errorStr.includes('LangSmith') || 
         errorStr.includes('langsmith') ||
         (errorStr.includes('403') && errorStr.includes('Forbidden'))) &&
        errorStr.includes('Failed to')) {
      console.error('⚠️  LangChain Tracing Error Detected:');
      console.error('Error:', reason);
      if (reason instanceof Error) {
        console.error('Stack:', reason.stack);
        // Log error name and message separately for better debugging
        console.error(`Error Name: ${reason.name}`);
        console.error(`Error Message: ${reason.message}`);
      }
      console.error('This is a non-critical tracing error. The application will continue to function normally.');
      console.error('To diagnose: Check LangSmith API key validity, project name, and permissions.');
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
    process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "atomtools-rag";
    
    langSmithEnabled = true;
    
    // Log diagnostics
    logLangChainDiagnostics();
    
    console.log("✅ LangSmith tracing enabled for project:", process.env.LANGCHAIN_PROJECT);
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

    // Don't disable tracing - keep it enabled to see actual errors
    // This helps diagnose the root cause
    console.warn("   Tracing remains enabled to capture full error details.");
    console.warn("   Check LangSmith dashboard and API key permissions.");
    
    langSmithEnabled = true; // Keep enabled for diagnostics
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
