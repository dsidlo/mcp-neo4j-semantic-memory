/**
 * Base Ontology Tool Implementation
 * 
 * This module provides functions for creating and managing base ontologies in the knowledge graph
 */

import { generateSecurityNodeName } from '../utils/uuid-utils.js';
import { callLLM } from '../tools/llm.js';

// Dynamic import for debug logger (will be a no-op if MCP_SEMMEM_DEBUG isn't set)
let debugLogger;
if (process.env.MCP_SEMMEM_DEBUG !== undefined) {
  import('../utils/debug-logger.js').then(logger => {
    debugLogger = logger;
    debugLogger.debugLog('base-ontology.js', 'Module loaded', 'init');
  }).catch(err => {
    console.error(`Failed to import debug logger: ${err.message}`);
  });
}

/**
 * Checks if a subject is already represented by an existing Base Ontology using LLM callback
 * @param {Object} memory - The Neo4jMemory instance
 * @param {string} subject - The subject to check
 * @returns {Object} - Result with existence status and details
 */
export async function checkBaseOntologyExists(memory, subject) {
  try {
    // First, get all existing base ontologies
    const query = `
      MATCH (bo:BaseOntology)
      RETURN bo
    `;

    const existingOntologies = await memory.executeCypherQuery(query, {}, false);

    // Use LLM callback to determine if the subject is already represented
    const prompt = `
      You are a knowledge graph expert tasked with determining if a subject is already represented by an existing Base Ontology.

      Subject: "${subject}"

      Given the list of existing Base Ontologies, determine if the subject is already represented by any of them.
      Consider semantic similarity, not just exact matches. For example, "Machine Learning" might be represented by "AI" or "Artificial Intelligence".

      Return a JSON object with the following structure:
      {
        "isRepresented": boolean,
        "representedBy": [list of matching ontology names] or null if not represented,
        "confidence": number between 0 and 1,
        "reasoning": "brief explanation of your reasoning"
      }
    `;

    const llmResponse = await callLLM(prompt, { existingOntologies });

    // Process the LLM response
    const result = llmResponse.json || { isRepresented: false };

    return {
      exists: result.isRepresented,
      baseOntologies: result.representedBy ? existingOntologies.filter(o => 
        result.representedBy.includes(o.bo.name || o.bo.subject)
      ) : [],
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error(`Error checking if base ontology exists: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a new Base Ontology and related entities using LLM callback
 * @param {Object} memory - The Neo4jMemory instance
 * @param {string} subject - The subject for the new Base Ontology
 * @param {string} securityNodeName - The security node name for write operations
 * @returns {Object} - Result of the creation operation
 */
export async function createBaseOntology(memory, subject, securityNodeName) {
  try {
    // Use LLM callback to generate the ontology structure
    const ontologyPrompt = `
      Create a Base Semantic Ontology for "${subject}" including semantic entities and potential relationships between those entities.

      For this ontology, provide:
      1. A comprehensive list of key entities/concepts relevant to the subject domain (e.g., "Algorithm", "Data Structure", "Programming Language", "Operating System", "Network Protocol", "Artificial Intelligence", "Machine Learning", "Cybersecurity", "Database", "Software Engineering", "Hardware", "Computational Theory").
      2. Properties that might be associated with these entities (e.g., for "Programming Language": "paradigm", "creator", "year_created", "use_case"; for "Algorithm": "complexity", "type", "application").
      3. Potential relationships between entities (entity-relationship-entity pairs), ensuring a good variety of relationship types (e.g., "Programming Language" IS_USED_FOR "Software Engineering", "Algorithm" SOLVES "Problem", "Operating System" MANAGES "Hardware", "Artificial Intelligence" IS_A_FIELD_OF "Computer Science", "Machine Learning" IS_A_SUBFIELD_OF "Artificial Intelligence", "Data Structure" IS_USED_BY "Algorithm").
      4. A hierarchical structure showing which concepts might be parents or children of others (e.g., "Computer Science" -> "Artificial Intelligence" -> "Machine Learning"; "Software Engineering" -> "Programming Language").

      Generate a JSON response with the following structure:
      {
        "name": "${subject}",
        "description": "[Brief description of this ontology]",
        "entities": [
          {
            "name": "[Entity Name]",
            "type": "[Entity Type]",
            "description": "[Description]"
          }
        ],
        "relationships": [
          {
            "from": "[Source Entity]",
            "type": "[Relationship Type]",
            "to": "[Target Entity]",
            "description": "[Description of relationship]"
          }
        ],
        "hierarchy": [
          {
            "parent": "[Parent Entity]",
            "children": ["[Child Entity1]", "[Child Entity2]"]
          }
        ]
      }
    `;

    // Get ontology structure from LLM
    const ontologyResponse = await callLLM(ontologyPrompt);
    const ontologyStructure = ontologyResponse.json || createDefaultOntology(subject);

    // Now use LLM to generate the Cypher queries to create this structure
    const cypherPrompt = `
      You are a Neo4j and Cypher expert. Generate the Cypher queries needed to create the following ontology structure in a Neo4j database.

      Important requirements:
      1. All CREATE operations must be wrapped with a security check:
         MATCH (security:SecurityNode {name: "${securityNodeName}"})
         WITH security
         WHERE security IS NOT NULL
         [Your CREATE statements here]

      2. Use parameters for dynamic values like $subject and $ontologyStructureJson.

      3. Create the main BaseOntology node with the label \`BaseOntology\` and these properties: \`name\` (prefixed with \`(BO): \`), \`subject\`, \`createdAt\`, \`type\` (set to "BaseOntology"), \`description\`, and \`structure\` (which should store the entire \`ontologyStructure\` JSON as a string, using a parameter like \`$ontologyStructureJson\`).

      4. For entities, create nodes with the label \`OntologyEntity\` and prefix their \`name\` property with \`(OE): \`.

      5. For relationships between entities, create them with the label \`OntologyRelationship\` and use the \`type\` property from the \`relationships\` array.

      6. For parent-child relationships between the BaseOntology and its entities, create \`HAS_ENTITY\` relationships from the \`BaseOntology\` node to each \`OntologyEntity\` node.

      7. For hierarchical relationships between entities, use the specified relationship types (e.g., \`PARENT_OF\`, \`CHILD_OF\`, \`RELATED_TO\`).

      Return a JSON object with the following structure:
      {
        "queries": [
          { "description": "Create base ontology node", "query": "[Cypher query]" },
          { "description": "Create entity nodes", "query": "[Cypher query]" },
          { "description": "Create relationships", "query": "[Cypher query]" }
        ]
      }
    `;

    const cypherResponse = await callLLM(cypherPrompt, { ontologyStructure });

    // Execute the generated Cypher queries
    const results = [];
    for (const queryObj of cypherResponse.json?.queries || []) {
      const params = {
        subject,
        ontologyStructureJson: JSON.stringify(ontologyStructure)
      };
      console.log('Description:', queryObj.description);
      console.log('Query:', queryObj.query);
      console.log('Params:', params);

      const result = await memory.executeCypherQuery(
        queryObj.query,
        params,
        true // This is a write operation
      );
      results.push({
        description: queryObj.description,
        result: result
      });
    }

    // Finally, check for related ontologies and create connections
    await createOntologyConnections(memory, subject, securityNodeName);

    return {
      baseOntology: { name: subject, description: ontologyStructure.description },
      ontologyStructure,
      executionResults: results,
      success: true,
      message: `Created Base Ontology '${subject}' with ${ontologyStructure.entities?.length || 0} entities and ${ontologyStructure.relationships?.length || 0} relationships`
    };
  } catch (error) {
    console.error(`Error creating base ontology: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a default ontology structure if LLM response fails
 * @param {string} subject - The subject for the ontology
 * @returns {Object} - A default ontology structure
 */
function createDefaultOntology(subject) {
  return {
    name: `(BO): ${subject}`,
    description: `Base Ontology for ${subject}`,
    entities: [
      { name: '(OE): Concept', type: 'EntityType', description: `A concept within the ${subject} domain` },
      { name: '(OE): Property', type: 'EntityType', description: `A property in the ${subject} domain` },
      { name: '(OE): Relationship', type: 'EntityType', description: `A relationship in the ${subject} domain` }
    ],
    relationships: [],
    hierarchy: []
  };
}

/**
 * Checks for related ontologies and creates connections using LLM
 * @param {Object} memory - The Neo4jMemory instance
 * @param {string} subject - The subject of the ontology
 * @param {string} securityNodeName - The security node name
 */
async function createOntologyConnections(memory, subject, securityNodeName) {
  try {
    // Get all existing ontologies
    const query = `
      MATCH (bo:BaseOntology)
      WHERE bo.subject <> $subject
      RETURN bo
    `;

    const existingOntologies = await memory.executeCypherQuery(query, { subject }, false);

    if (existingOntologies.length === 0) return;

    // Use LLM to determine relationships with other ontologies
    const connectionsPrompt = `
      You are a knowledge graph expert tasked with determining the relationships between ontologies.

      New Ontology: "${subject}"

      Determine if the new ontology should be connected to any existing ontologies as a parent or child.
      Consider semantic relationships and domain hierarchies.

      Return a JSON object with the following structure:
      {
        "connections": [
          {
            "existingOntology": "[Ontology Name]",
            "relationship": "parent" or "child" or "related",
            "confidence": number between 0 and 1,
            "reasoning": "brief explanation"
          }
        ]
      }
    `;

    const connectionsResponse = await callLLM(connectionsPrompt, { existingOntologies });
    const connections = connectionsResponse.json?.connections || [];

    // Filter for high-confidence connections
    const highConfidenceConnections = connections.filter(c => c.confidence > 0.7);

    if (highConfidenceConnections.length === 0) return;

    // Generate Cypher query to create the connections
    const connectionsCypherPrompt = `
      Generate a Cypher query to create the following ontology connections:

      New Ontology: "${subject}"

      Connections to create:
      ${JSON.stringify(highConfidenceConnections, null, 2)}

      For parent relationships, create a "PARENT_OF" relationship from the parent to the child.
      For child relationships, create a "CHILD_OF" relationship from the child to the parent.
      For related relationships, create a "RELATED_TO" relationship in both directions.

      Remember to include the security node check:
      MATCH (security:SecurityNode {name: "${securityNodeName}"})
      WITH security
      WHERE security IS NOT NULL
      [Your CREATE statements here]

      Return just the Cypher query as plain text.
    `;

    const connectionsCypherResponse = await callLLM(connectionsCypherPrompt);
    const connectionsQuery = connectionsCypherResponse.text;

    // Execute the connections query
    if (connectionsQuery && connectionsQuery.includes('MATCH') && connectionsQuery.includes('CREATE')) {
      await memory.executeCypherQuery(
        connectionsQuery,
        { subject },
        true
      );
    }
  } catch (error) {
    console.error(`Error creating ontology connections: ${error.message}`);
    // Don't throw, as this is a non-critical operation
  }
}

/**
 * Main function to handle the create_base_ontology tool request
 * @param {Object} memory - The Neo4jMemory instance
 * @param {Object} args - The tool arguments
 * @returns {Object} - Result of the operation
 */
export async function handleCreateBaseOntology(memory, args) {
  if (debugLogger) debugLogger.logFunctionStart('handleCreateBaseOntology', args);
  const { subject, force_it } = args;

  if (!subject) {
    const result = {
      success: false,
      message: 'Missing required parameter: subject'
    };
    if (debugLogger) debugLogger.logFunctionEnd('handleCreateBaseOntology', result);
    return result;
  }

  try {
    // Create a security node for write operations
    const securityNodeName = generateSecurityNodeName();
    await memory.createSecurityNode(securityNodeName);

    try {
      // First, check if the subject is already represented by an existing Base Ontology
      const existsResult = await checkBaseOntologyExists(memory, subject);

      // If it exists and force_it is not set, return a message
      if (existsResult.exists && !force_it) {
        const result = {
          success: false,
          message: `The subject '${subject}' is already represented by an existing Base Ontology.`,
          baseOntologies: existsResult.baseOntologies
        };
        if (debugLogger) debugLogger.logFunctionEnd('handleCreateBaseOntology', result);
        return result;
      }

      // If it doesn't exist or force_it is set, create the new Base Ontology
      const createResult = await createBaseOntology(memory, subject, securityNodeName);

      const result = {
        success: true,
        message: `Successfully created new Base Ontology for '${subject}'.`,
        details: createResult
      };
      if (debugLogger) debugLogger.logFunctionEnd('handleCreateBaseOntology', result);
      return result;
    } finally {
      // Always remove the security node when done
      await memory.removeSecurityNode(securityNodeName);
    }
  } catch (error) {
    if (debugLogger) debugLogger.logFunctionError('handleCreateBaseOntology', error);
    const result = {
      success: false,
      message: `Error creating Base Ontology: ${error.message}`,
      error: error.toString()
    };
    if (debugLogger) debugLogger.logFunctionEnd('handleCreateBaseOntology', result);
    return result;
  }
}
