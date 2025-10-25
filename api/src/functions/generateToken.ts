/**
 * generateToken.ts
 * Azure HTTP trigger function for generating LiveKit access tokens.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { LiveKitTokenService, LiveKitTokenGenerator } from '../services/LiveKitTokenService';
import { validateTokenRequest, formatValidationError } from '../utils/validation';
import { createMissingCredentialsError } from '../utils/config';
import { ErrorResponse, ErrorCode } from '../models/ErrorResponse';

/**
 * HTTP POST handler for /api/token endpoint.
 * Generates LiveKit access tokens for voice chat sessions.
 */
async function generateToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Processing token generation request', {
    invocationId: context.invocationId,
    method: request.method,
    url: request.url
  });

  try {
    // Parse request body
    const body = await request.json() as unknown;
    context.log('Request body parsed', { body });

    // Validate request
    let validatedRequest;
    try {
      validatedRequest = validateTokenRequest(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = formatValidationError(error);
        context.log('Validation failed', { errors: errorResponse.validationErrors });

        return {
          status: 400,
          jsonBody: errorResponse,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
      throw error; // Re-throw non-validation errors
    }

    // Check credentials
    try {
      // Initialize service with real LiveKit generator
      const generator = new LiveKitTokenGenerator();
      const service = new LiveKitTokenService(generator);

      // Generate token
      const response = await service.generateToken(
        validatedRequest.roomName,
        validatedRequest.participantIdentity,
        validatedRequest.expirationSeconds,
        validatedRequest.participantName
      );

      context.log('Token generated successfully', {
        roomName: response.roomName,
        participantIdentity: response.participantIdentity,
        expiresAt: response.expiresAt
      });

      return {
        status: 200,
        jsonBody: response,
        headers: {
          'Content-Type': 'application/json'
        }
      };
    } catch (credError) {
      // Handle missing credentials
      if (credError instanceof Error && credError.message.includes('must be configured')) {
        const errorResponse = createMissingCredentialsError();
        context.error('Missing LiveKit credentials', { error: credError.message });

        return {
          status: 500,
          jsonBody: errorResponse,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
      throw credError; // Re-throw other errors
    }
  } catch (error) {
    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      statusCode: 500,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };

    context.error('Unexpected error in token generation', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      status: 500,
      jsonBody: errorResponse,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}

// Register the HTTP trigger
app.http('generateToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'token',
  handler: generateToken
});

export { generateToken };
