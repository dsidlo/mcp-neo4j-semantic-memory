/**
 * LLM Client using token.js to connect to multiple LLM providers
 */

import { TokenJS } from 'token.js';

// Initialize the TokenJS client
const tokenjs = new TokenJS();

/**
 * Makes a callback to the LLM service using token.js
 * @param {string} prompt - The prompt to send to the LLM
 * @param {Object} context - Context data to include in the prompt
 * @returns {Promise<Object>} - The LLM response
 */
export async function callLLM(prompt, context = {}) {
  try {
    // Check for required environment variables
    const provider = process.env.LLM_API_PROVIDER || 'openai';
    const model = process.env.LLM_API_MODEL || 'gpt-4.1';

    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];

    if (!apiKey) {
      throw new Error(`API key for provider ${provider} is not configured. Set ${provider.toUpperCase()}_API_KEY environment variable.`);
    } else {
      // Log a portion of the key to verify it's the correct one
      const keyPreview = `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`;
      console.log(`Using API key preview: ${keyPreview} for provider: ${provider}`);
    }

    // Prepare the complete prompt with context
    const fullPrompt = formatPromptWithContext(prompt, context);

    // Log API call information without exposing the full key
    console.log(`Making API call to ${provider} using model: ${model}`);

    // Create a completion using token.js
    const completion = await tokenjs.chat.completions.create({
      // stream: true,
      provider: provider,
      model:model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.2, // Lower temperature for more deterministic outputs
      max_tokens: 32768
    });

    console.log('API call completed successfully');

    return extractLLMResponse(completion);
  } catch (error) {
    console.error(`Error making LLM API call: ${error.message}`);
    throw new Error(`LLM API call failed: ${error.message}`);
  }
}

/**
 * Formats a prompt with context data
 * @param {string} prompt - The base prompt
 * @param {Object} context - Context data to include
 * @returns {string} - The formatted prompt
 */
function formatPromptWithContext(prompt, context) {
  // Add context as JSON if provided
  let fullPrompt = prompt;

  if (Object.keys(context).length > 0) {
    fullPrompt += '\n\nContext:\n```json\n' + JSON.stringify(context, null, 2) + '\n```';
  }

  return fullPrompt;
}

/**
 * Extracts the response content from the LLM API response
 * @param {Object} response - The LLM API response
 * @returns {Object} - The extracted response
 */
function extractLLMResponse(response) {
  try {
    // Extract the text content from the response
    const content = response.choices?.[0]?.message?.content || '';

    // Try to parse as JSON if it looks like JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return {
          text: content,
          json: JSON.parse(content)
        };
      } catch (error) {
        // If parsing fails, return as text
        console.debug('Failed to parse JSON response:', error.message);
        return { text: content };
      }
    }

    // Return as text
    return { text: content };
  } catch (error) {
    throw new Error(`Error extracting LLM response: ${error.message}`);
  }
}

/**
 * Registers additional models for supported providers
 * @param {string} provider - The provider name
 * @param {string} modelName - The custom model name to register
 * @param {string|Object} featureSupport - Either an existing model name to copy features from or an object of supported features
 */
export function extendModelList(provider, modelName, featureSupport) {
  tokenjs.extendModelList(provider, modelName, featureSupport);
}
