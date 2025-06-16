# Debugging the MCP Neo4j Semantic Memory

## Overview

This MCP implementation includes a comprehensive debugging system that can be enabled to help troubleshoot issues or understand the flow of operations.

## Enabling Debugging

To enable debugging, set the `MCP_SEMMEM_DEBUG` environment variable:

```bash
# Basic enabling (info level)
export MCP_SEMMEM_DEBUG=info

# Run with debugging enabled
MCP_SEMMEM_DEBUG=info npx mcp-neo4j-semantic-memory
```

## Debug Levels

You can specify different debug levels by setting the value of `MCP_SEMMEM_DEBUG`:

- `info`: General information (default if just enabled)
- `verbose`: More detailed logging
- `trace`: Extremely detailed logging including all function calls

Example:
```bash
export MCP_SEMMEM_DEBUG=verbose
```

## Debug Log Location

By default, logs are written to `/tmp/mcp-semmem-debug.log`. You can customize this location by setting the `MCP_SEMMEM_LOG_DIR` environment variable:

```bash
export MCP_SEMMEM_LOG_DIR=/path/to/your/logs
```

## Troubleshooting Common Issues

### No Debug Output

If you've set `MCP_SEMMEM_DEBUG` but don't see any output:

1. Verify the environment variable is actually set with `echo $MCP_SEMMEM_DEBUG`
2. Check that the log directory is writable
3. Look for any initialization errors in the console output
4. Try running with the verbose level: `MCP_SEMMEM_DEBUG=verbose`

### Neo4j Connection Issues

Set `MCP_SEMMEM_DEBUG=verbose` to see detailed connection attempts and errors when connecting to Neo4j.

## Reading the Debug Logs

The debug logs use a consistent format:

```
[TIMESTAMP] [LOG_LEVEL] [FUNCTION_NAME] {JSON data}
```

You can follow the logs in real-time using:

```bash
tail -f /tmp/mcp-semmem-debug.log
```

## Advanced Debugging

For even more detailed debugging when working with Neo4j connections, you can also enable Neo4j driver logging:

```bash
NEO4J_LOGGING=debug MCP_SEMMEM_DEBUG=verbose npx mcp-neo4j-semantic-memory
```
