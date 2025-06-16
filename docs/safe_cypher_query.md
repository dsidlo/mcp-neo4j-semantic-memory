# Safe Cypher Query Tool

The `safe_cypher_query` tool allows for executing Cypher queries against the Neo4j database with appropriate security checks. This tool differentiates between read-only and write operations, providing a security mechanism for write operations.

## Overview

Cypher is Neo4j's query language for describing and querying graph data. The `safe_cypher_query` tool enables:

1. Executing read-only queries (e.g., `MATCH`, `RETURN`) without special permissions
2. Executing write operations (`CREATE`, `SET`, `DELETE`, `REMOVE`, `MERGE`) only with a valid security token

## Usage

### Read-Only Query Example

```
@mcp-neo4j-memory safe_cypher_query
{
  "query": "MATCH (n:Memory) RETURN n.name, n.entityType LIMIT 5"
}
```

### Write Operation Example

Write operations require a security node name to be provided:

```
@mcp-neo4j-memory safe_cypher_query
{
  "query": "CREATE (n:Test {name: 'Test Node'}) RETURN n",
  "securityNodeName": "security-token-123"
}
```

The query will only execute if a SecurityNode with the specified name exists in the database.

### Query with Parameters

Parameters can be passed to make queries more flexible and secure:

```
@mcp-neo4j-memory safe_cypher_query
{
  "query": "MATCH (n:Memory) WHERE n.name = $name RETURN n",
  "params": {
    "name": "Foundation"
  }
}
```

## Security Mechanism

For write operations, the tool follows this security flow:

1. Checks if the query contains write operations (`CREATE`, `SET`, `DELETE`, `REMOVE`, `MERGE`)
2. If it does, requires a `securityNodeName` parameter
3. Wraps the write query with a security check that only executes if the specified SecurityNode exists
4. The SecurityNode is typically created and deleted by internal MCP processes, not by external users

This ensures that write operations can only be performed by authorized processes that have created a security token beforehand.

## Response Format

Responses from the tool include:

```json
{
  "result": [...],         // Array of result records
  "rowCount": 5,          // Number of result records
  "queryType": "read"     // Type of query ("read" or "write")
}
```

Each result record is a JSON object with properties matching the returned columns from the Cypher query.

## Error Handling

The tool returns detailed error messages in case of:

- Missing security node for write operations
- Syntax errors in the Cypher query
- Database access errors
- Other Neo4j-related errors

## Environment Configuration

For testing purposes, the security check can be bypassed by setting the `NEO4J_UNSAFE_MEMORY_CYPHERS` environment variable to `true`. This is not recommended for production environments.

```
NEO4J_UNSAFE_MEMORY_CYPHERS=true
```

## Internal Implementation

Internally, the tool:

1. Parses and validates the Cypher query
2. Checks for write operations
3. For write operations, wraps the query with a security check
4. Executes the query against the Neo4j database
5. Transforms the Neo4j result into a more user-friendly format
6. Returns the formatted result

This approach ensures that all database access is properly controlled while still providing flexible query capabilities.
