#!/usr/bin/env node
import 'dotenv/config';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {driver as connectToNeo4j, auth as Neo4jAuth} from 'neo4j-driver';
import {Neo4jMemory} from './neo4j-memory.js';

// Get the database name from environment variables
const databaseName = process.env.NEO4J_DATABASE || 'neo4j';

// Check if Neo4j environment variables are defined
if (!process.env.NEO4J_URI) {
    console.error('Error: NEO4J_URI environment variable is not defined');
    console.error('Please set NEO4J_URI in your environment or create a .env file');
    process.exit(1);
}

if (!process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
    console.error('Error: NEO4J_USER or NEO4J_PASSWORD environment variables are not defined');
    console.error('Please set both in your environment or create a .env file');
    process.exit(1);
}

const neo4jDriver = connectToNeo4j(
    process.env.NEO4J_URI,
    Neo4jAuth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Check for multi-database support
async function validateDatabaseSupport() {
    try {
        // Only validate if database specified is not the default
        if (databaseName !== 'neo4j') {
            console.error(`Checking if Neo4j instance supports multiple databases for using '${databaseName}'...`);
            const supportsMultiDb = await neo4jDriver.supportsMultiDb();
            if (!supportsMultiDb) {
                throw new Error('This Neo4j instance does not support multiple databases. Please use the default \'neo4j\' database or upgrade to Neo4j Enterprise.');
            }
            console.error(`Database '${databaseName}' will be used as specified.`);
        } else {
            console.error('Using default database: \'neo4j\'');
        }
    } catch (error) {
        console.error(`Failed to validate database support: ${error.message}`);
        throw error;
    }
}

// Initialize memory with database support validation
async function initializeMemory() {
    await validateDatabaseSupport();
    return new Neo4jMemory(neo4jDriver, databaseName);
}

let knowledgeGraphMemory;
const server = new Server(
    {
        name: 'mcp-neo4j-memory',
        version: '1.0.1'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'safe_cypher_query',
                description: 'Execute a Cypher query against the Neo4j database. For read-only queries, no security node is required. For write operations (CREATE, SET, DELETE, REMOVE), a valid security node name must be provided.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The Cypher query to execute.'
                        },
                        securityNodeName: {
                            type: 'string',
                            description: 'The name of the security node to verify before executing write operations. Required for write operations (CREATE, SET, DELETE, REMOVE).'
                        },
                        params: {
                            type: 'object',
                            description: 'Optional parameters for the Cypher query.'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'create_entities',
                description: 'Create multiple new entities in the knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {
                        entities: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'The name of the entity'
                                    },
                                    entityType: {
                                        type: 'string',
                                        description: 'The type of the entity'
                                    },
                                    observations: {
                                        type: 'array',
                                        items: {type: 'string'},
                                        description: 'An array of observation contents associated with the entity'
                                    }
                                },
                                required: ['name', 'entityType', 'observations']
                            }
                        },
                        tz: {
                            type: 'string',
                            description: 'Optional timezone identifier (e.g., \'UTC\', \'EST\') for timestamps'
                        }
                    },
                    required: ['entities']
                }
            },
            {
                name: 'create_relations',
                description: 'Create multiple new relations between entities in the knowledge graph. Relations should be in active voice',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    from: {
                                        type: 'string',
                                        description: 'The name of the entity where the relation starts'
                                    },
                                    to: {
                                        type: 'string',
                                        description: 'The name of the entity where the relation ends'
                                    },
                                    relationType: {
                                        type: 'string',
                                        description: 'The type of the relation'
                                    }
                                },
                                required: ['from', 'to', 'relationType']
                            }
                        }
                    },
                    required: ['relations']
                }
            },
            {
                name: 'add_observations',
                description: 'Add new observations to existing entities in the knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {
                        observations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    entityName: {
                                        type: 'string',
                                        description: 'The name of the entity to add the observations to'
                                    },
                                    contents: {
                                        type: 'array',
                                        items: {type: 'string'},
                                        description: 'An array of observation contents to add'
                                    }
                                },
                                required: ['entityName', 'contents']
                            }
                        },
                        tz: {
                            type: 'string',
                            description: 'Optional timezone identifier (e.g., \'UTC\', \'EST\') for timestamps'
                        }
                    },
                    required: ['observations']
                }
            },
            {
                name: 'delete_entities',
                description: 'Delete multiple entities and their associated relations from the knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {
                        entityNames: {
                            type: 'array',
                            items: {type: 'string'},
                            description: 'An array of entity names to delete'
                        }
                    },
                    required: ['entityNames']
                }
            },
            {
                name: 'delete_observations',
                description: 'Delete specific observations from entities in the knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deletions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    entityName: {
                                        type: 'string',
                                        description: 'The name of the entity containing the observations'
                                    },
                                    observations: {
                                        type: 'array',
                                        items: {type: 'string'},
                                        description: 'An array of observations to delete'
                                    }
                                },
                                required: ['entityName', 'observations']
                            }
                        }
                    },
                    required: ['deletions']
                }
            },
            {
                name: 'delete_relations',
                description: 'Delete multiple relations from the knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    from: {
                                        type: 'string',
                                        description: 'The name of the entity where the relation starts'
                                    },
                                    to: {
                                        type: 'string',
                                        description: 'The name of the entity where the relation ends'
                                    },
                                    relationType: {
                                        type: 'string',
                                        description: 'The type of the relation'
                                    }
                                },
                                required: ['from', 'to', 'relationType']
                            },
                            description: 'An array of relations to delete'
                        }
                    },
                    required: ['relations']
                }
            },
            {
                name: 'read_graph',
                description: 'Read the entire knowledge graph',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'search_nodes',
                description: 'Search for nodes in the knowledge graph based on a query',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to match against entity names, types, and observation content'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'open_nodes',
                description: 'Open specific nodes in the knowledge graph by their names',
                inputSchema: {
                    type: 'object',
                    properties: {
                        names: {
                            type: 'array',
                            items: {type: 'string'},
                            description: 'An array of entity names to retrieve'
                        }
                    },
                    required: ['names']
                }
            }
        ]
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (!knowledgeGraphMemory) {
        knowledgeGraphMemory = await initializeMemory();
    }
    const {name, arguments: args} = request.params;
    if (!args) {
        throw new Error(`No arguments provided for tool: ${name}`);
    }
    switch (name) {
        case 'create_entities':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.createEntities(
                                args.entities,
                                args.tz
                            ),
                            null,
                            2
                        )
                    }
                ]
            };
        case 'create_relations':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.createRelations(
                                args.relations
                            ),
                            null,
                            2
                        )
                    }
                ]
            };
        case 'add_observations':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.addObservations(
                                args.observations,
                                args.tz
                            ),
                            null,
                            2
                        )
                    }
                ]
            };
        case 'delete_entities':
            await knowledgeGraphMemory.deleteEntities(args.entityNames);
            return {
                content: [{type: 'text', text: 'Entities deleted successfully'}]
            };
        case 'delete_observations':
            await knowledgeGraphMemory.deleteObservations(
                args.deletions
            );
            return {
                content: [{type: 'text', text: 'Observations deleted successfully'}]
            };
        case 'delete_relations':
            await knowledgeGraphMemory.deleteRelations(args.relations);
            return {
                content: [{type: 'text', text: 'Relations deleted successfully'}]
            };
        case 'read_graph':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.readGraph(),
                            (key, value) => {
                                // Format dates for readability if they look like ISO date strings
                                if (typeof value === 'string' &&
                                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                                    return new Date(value).toLocaleString();
                                }
                                return value;
                            },
                            2
                        )
                    }
                ]
            };
        case 'search_nodes':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.searchNodes(args.query),
                            (key, value) => {
                                // Format dates for readability if they look like ISO date strings
                                if (typeof value === 'string' &&
                                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                                    return new Date(value).toLocaleString();
                                }
                                return value;
                            },
                            2
                        )
                    }
                ]
            };
        case 'open_nodes':
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            await knowledgeGraphMemory.openNodes(args.names),
                            (key, value) => {
                                // Format dates for readability if they look like ISO date strings
                                if (typeof value === 'string' &&
                                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                                    return new Date(value).toLocaleString();
                                }
                                return value;
                            },
                            2
                        )
                    }
                ]
            };
        case 'safe_cypher_query':
            try {
                // Import utilities for Cypher query validation
                const {containsWriteOperations, wrapWithSecurityCheck} = await import('./utils/cypher-utils.js');

                const query = args.query;
                const securityNodeName = args.securityNodeName || null;

                // Check if the query contains write operations
                const hasWriteOps = containsWriteOperations(query);

                // Allow unsafe queries if environment variable is set
                const allowUnsafeQueries = process.env.NEO4J_UNSAFE_MEMORY_CYPHERS === 'true';

                // If query has write operations but no security node provided
                if (hasWriteOps && !securityNodeName && !allowUnsafeQueries) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    error: 'Security error: Write operations (CREATE, SET, DELETE, REMOVE) detected but no security node provided.',
                                    details: 'This API requires a valid security token for write operations.'
                                }, null, 2)
                            }
                        ]
                    };
                }

                // Prepare the query - wrap with security check if it's a write operation and security node is provided
                let preparedQuery = query;
                let isWrite = false;

                if (hasWriteOps) {
                    isWrite = true;
                    if (securityNodeName && !allowUnsafeQueries) {
                        preparedQuery = wrapWithSecurityCheck(query, securityNodeName);
                    }
                }

                // Execute the query
                const result = await knowledgeGraphMemory.executeCypherQuery(preparedQuery, args.params || {}, isWrite);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                result: result,
                                rowCount: result.length,
                                queryType: hasWriteOps ? 'write' : 'read'
                            }, (key, value) => {
                                // Format dates for readability if they look like ISO date strings
                                if (typeof value === 'string' &&
                                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                                    return new Date(value).toLocaleString();
                                }
                                return value;
                            }, 2)
                        }
                    ]
                };
            } catch (error) {
                console.error(`Error executing Cypher query: ${error.message}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: 'Error executing Cypher query',
                                message: error.message,
                                code: error.code || 'UNKNOWN'
                            }, null, 2)
                        }
                    ]
                };
            }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function main() {
    try {
        // Test connection to Neo4j
        console.error(`Connecting to Neo4j at ${process.env.NEO4J_URI}...`);
        const serverInfo = await neo4jDriver.getServerInfo();
        console.error(`Connected to Neo4j ${serverInfo.version} at ${process.env.NEO4J_URI}`);

        // Initialize memory
        console.error('Initializing knowledge graph memory...');
        knowledgeGraphMemory = await initializeMemory();

        // Start MCP server
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error(`MCP Knowledge Graph Memory using Neo4j running on stdio (Database: ${databaseName})`);
    } catch (error) {
        console.error('Initialization error:', error.message);
        if (error.code === 'ServiceUnavailable') {
            console.error(`Unable to connect to Neo4j at ${process.env.NEO4J_URI}. Please check if the database is running and your connection details are correct.`);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
