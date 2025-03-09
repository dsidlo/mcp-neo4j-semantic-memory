# mcp-neo4j-memory-claude

A knowledge graph memory implementation for Claude AI using Neo4j and the Model Context Protocol (MCP).

This package provides a persistent memory store that allows Claude to save, retrieve, and reason about structured knowledge in conversations. It's based on the official [Neo4j MCP implementation](https://github.com/neo4j-contrib/mcp-neo4j).

## Features

- **Persistent Memory**: Store conversation knowledge across sessions
- **Knowledge Graph Structure**: Entity-relationship model for structured data
- **Semantic Search**: Find relevant information and connections
- **Contextual Memory**: Add observations to existing entities
- **Relationship Tracing**: Track how concepts connect to each other

## Installation

```bash
npm install -g mcp-neo4j-memory-claude
```

## Prerequisites

- Neo4j database instance (cloud or local)
- Claude AI with MCP support (Claude 3 Opus/Sonnet via Claude Desktop)

## Configuration

### Environment Variables

You'll need to provide your Neo4j credentials:

- `NEO4J_URI`: Connection URI for your Neo4j instance
- `NEO4J_USER`: Username for Neo4j database
- `NEO4J_PASSWORD`: Password for Neo4j database

### Claude Desktop Integration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-neo4j-memory": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-neo4j-memory-claude"
      ],
      "env": {
        "NEO4J_URI": "neo4j+s://your-instance-id.databases.neo4j.io",
        "NEO4J_USER": "your_username",
        "NEO4J_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

This MCP server provides the following tools for Claude:

| Tool | Description |
|------|-------------|
| `create_entities` | Create new entities in the knowledge graph with observations |
| `create_relations` | Create relationships between existing entities |
| `add_observations` | Add new observations to existing entities |
| `delete_entities` | Remove entities and their relationships |
| `delete_observations` | Remove specific observations from entities |
| `delete_relations` | Remove relationships between entities |
| `read_graph` | Retrieve the entire knowledge graph |
| `search_nodes` | Find entities matching search criteria |
| `open_nodes` | Retrieve specific entities by name |

## Example Usage (in Claude)

```
I'd like to build a knowledge graph about science fiction authors.

@mcp-neo4j-memory create_entities
[
  {
    "name": "Isaac Asimov",
    "entityType": "Author",
    "observations": ["Born in 1920", "Known for Foundation series", "Wrote about the Three Laws of Robotics"]
  },
  {
    "name": "Foundation",
    "entityType": "Book Series",
    "observations": ["Epic science fiction series", "Spans centuries of future history"]
  }
]

@mcp-neo4j-memory create_relations
[
  {
    "from": "Isaac Asimov",
    "to": "Foundation",
    "relationType": "WROTE"
  }
]
```

## License

MIT

## Contributing

Contributions welcome! Please check the [GitHub repository](https://github.com/neo4j-contrib/mcp-neo4j) for guidelines.

## Acknowledgments

Based on the work by the Neo4j and Anthropic teams to integrate graph databases with Large Language Models through the Model Context Protocol.
