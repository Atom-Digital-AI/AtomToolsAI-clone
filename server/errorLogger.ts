import { db } from './db';
import { errorLogs } from '@shared/schema';
import type { Request } from 'express';

interface LogErrorParams {
  userId?: string;
  userEmail?: string;
  toolName: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  requestData?: any;
  httpStatus?: number;
  endpoint: string;
  req?: Request;
  responseHeaders?: any; // HTTP response headers from external API calls
}

export async function logToolError(params: LogErrorParams) {
  try {
    const {
      userId,
      userEmail,
      toolName,
      errorType,
      errorMessage,
      errorStack,
      requestData,
      httpStatus,
      endpoint,
      req,
      responseHeaders
    } = params;

    await db.insert(errorLogs).values({
      userId: userId || null,
      userEmail: userEmail || null,
      toolName,
      errorType,
      errorMessage,
      errorStack: errorStack || null,
      requestData: requestData || null,
      httpStatus: httpStatus || null,
      endpoint,
      userAgent: req?.get('User-Agent') || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      responseHeaders: responseHeaders || null,
    });

    console.error(`Tool Error Logged: ${toolName} - ${errorType} - ${errorMessage}`);
  } catch (logError) {
    console.error('Failed to log tool error:', logError);
    console.error('Original error:', params.errorMessage);
  }
}

export function getErrorTypeFromError(error: any): string {
  if (error?.code === 'insufficient_quota' || error?.status === 429) {
    return 'rate_limit';
  }
  if (error?.name === 'ValidationError' || error?.name === 'ZodError') {
    return 'validation_error';
  }
  if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
    return 'application_error';
  }
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    return 'client_error';
  }
  if (error?.response?.status >= 500) {
    return 'external_api_error';
  }
  return 'unknown_error';
}