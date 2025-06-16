# LLM Provider Configuration Guide

This project uses `token.js` to connect to multiple LLM providers. You can configure which LLM provider to use by setting the appropriate environment variables.

## Available Providers

The following LLM providers are supported:

- OpenAI (default)
- Anthropic (Claude)
- Mistral
- Google Gemini
- Groq
- Perplexity
- OpenRouter
- AI21
- Cohere
- AWS Bedrock

## Configuration

### Basic Configuration

Set these environment variables to specify your provider and model:

```bash
# Required: Specify which provider to use
LLM_API_PROVIDER=openai  # Options: openai, anthropic, mistral, gemini, groq, perplexity, openrouter, ai21, cohere, bedrock

# Required: Specify which model to use
LLM_API_MODEL=gpt-4  # Model name for the selected provider
```

### Provider-Specific API Keys

You only need to set the API key for your chosen provider:

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here

# Mistral
MISTRAL_API_KEY=your_mistral_key_here

# Google Gemini
GEMINI_API_KEY=your_gemini_key_here

# Groq
GROQ_API_KEY=your_groq_key_here

# Perplexity
PERPLEXITY_API_KEY=your_perplexity_key_here

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key_here

# AI21
AI21_API_KEY=your_ai21_key_here

# Cohere
COHERE_API_KEY=your_cohere_key_here
```

### AWS Bedrock Configuration

If using AWS Bedrock, you need to configure AWS credentials:

```bash
AWS_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

## Recommended Models by Provider

- **OpenAI**: `gpt-4`, `gpt-4o`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`
- **Mistral**: `mistral-large-latest`, `mistral-medium-latest`
- **Google Gemini**: `gemini-1.5-pro`, `gemini-1.5-flash`
- **Groq**: `llama3-8b-8192`, `llama2-70b-4096`
- **Perplexity**: `sonar-medium-online`, `sonar-small-online`
- **AWS Bedrock**: `anthropic.claude-3-sonnet-20240229-v1:0`

## Using Custom Models

If you need to use a model that's not in the predefined list (such as new model versions or models with regional prefixes), you can extend the model list in your code:

```javascript
import { extendModelList } from '../tools/llm.js';

// Register a new model
extendModelList('bedrock', 'us-east-1.anthropic.claude-3-sonnet', 'anthropic.claude-3-sonnet-20240229-v1:0');
```
