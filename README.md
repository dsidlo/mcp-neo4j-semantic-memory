# mcp-neo4j-semantic-memory

---

## This is work in progress, please don't using it until this message is remove.

---


This is a fork of Kinark/mcp-neo4j-memory-claude.

Plans to add...
- specifying a Neo4j database (neo4j-enterprise), 
- automated semantic analysis to create associations between memories automatically, to allow for appropriate associations through natural language.

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

- `NEO4J_URI`: Connection URI for your Neo4j instance (e.g., `neo4j://localhost:7687` for local or `neo4j+s://your-instance-id.databases.neo4j.io` for cloud)
- `NEO4J_USER`: Username for Neo4j database (default is `neo4j`)
- `NEO4J_PASSWORD`: Password for Neo4j database
- `NEO4J_DATABASE`: Select a specific Neo4j database (default is `neo4j`; requires Neo4j Enterprise for non-default databases)

You can set these variables in your environment or by creating a `.env` file in the project root directory:

```
# .env file example
NEO4J_URI="neo4j://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="password"
NEO4J_DATABASE="neo4j"
```

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

This MCP server provides the following tools for any MCP capable environment:

| Tool                          | Description                                                    |
|-------------------------------|----------------------------------------------------------------|
| `create_entities`             | Create new entities in the knowledge graph with observations   |
| `create_relations`            | Create relationships between existing entities                 |
| `add_observations`            | Add new observations to existing entities                      |
| `delete_entities`             | Remove entities and their relationships                        |
| `delete_observations`         | Remove specific observations from entities                     |
| `delete_relations`            | Remove relationships between entities                          |
| `read_graph`                  | Retrieve the entire knowledge graph                            |
| `search_nodes`                | Find entities matching search criteria                         |
| `open_nodes`                  | Retrieve specific entities by name                             |
| **Additions**                 |                                                                |                       
| `create_base_ontology`        | Create a new semantic ontology                                 |
| `create_base_ontology_rels`   | Create a semantic ontology relationships to existing objects   |
| `create_object_relationships` | Create relationship between objects and base ontology entities |

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

## Troubleshooting

### Connection Issues

- **Error: NEO4J_URI environment variable is not defined**: Make sure you've set up your environment variables either in your shell or in a `.env` file.
- **ServiceUnavailable**: Ensure your Neo4j database is running and accessible at the specified URI.
- **Authentication failed**: Verify your Neo4j username and password are correct.

### Database Issues

- **Database not found**: If using a non-default database name, ensure you're using Neo4j Enterprise Edition which supports multiple databases.
- **This Neo4j instance does not support multiple databases**: Switch to using the default `neo4j` database or upgrade to Neo4j Enterprise Edition.

## Contributing

Contributions welcome! Please check the [GitHub repository](https://github.com/neo4j-contrib/mcp-neo4j) for guidelines.

## Acknowledgments

Based on the work by the Neo4j and Anthropic teams to integrate graph databases with Large Language Models through the Model Context Protocol.
