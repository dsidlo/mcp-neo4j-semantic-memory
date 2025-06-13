/**
 * Examples of using the safe_cypher_query tool
 * 
 * This file contains examples that demonstrate how to use the safe_cypher_query tool
 * from both a security perspective and for different types of queries.
 */

// Import required modules
import { Neo4jMemory } from '../neo4j-memory.js';
import neo4j from 'neo4j-driver';

// Example 1: Basic read-only query
async function executeBasicReadQuery() {
  const driver = neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  const memory = new Neo4jMemory(driver);

  const result = await memory.executeCypherQuery(
    'MATCH (n:Memory) RETURN n.name, n.entityType LIMIT 5',
    {}, // No params
    false // Not a write operation
  );

  console.log('Basic read query result:', result);
  await driver.close();
}

// Example 2: Parameterized read query
async function executeParameterizedReadQuery() {
  const driver = neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  const memory = new Neo4jMemory(driver);

  const result = await memory.executeCypherQuery(
    'MATCH (n:Memory) WHERE n.entityType = $type RETURN n.name, n.entityType',
    { type: 'Author' }, // Parameters
    false // Not a write operation
  );

  console.log('Parameterized read query result:', result);
  await driver.close();
}

// Example 3: Secure write operation with security node
async function executeSecureWriteOperation() {
  const driver = neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  const memory = new Neo4jMemory(driver);

  // Step 1: Create a security node with UUID
  // Generate a UUID v4
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const securityNodeName = `security-node-${Date.now()}-${uuidv4()}`;
  await memory.createSecurityNode(securityNodeName);

  try {
    // Step 2: Execute write operation using the security node
    const { containsWriteOperations, wrapWithSecurityCheck } = await import('../utils/cypher-utils.js');

    const query = 'CREATE (n:TestNode {name: $name}) RETURN n';
    const params = { name: 'Test Node' };

    const hasWriteOps = containsWriteOperations(query);
    let preparedQuery = query;

    if (hasWriteOps) {
      preparedQuery = wrapWithSecurityCheck(query, securityNodeName);
    }

    const result = await memory.executeCypherQuery(preparedQuery, params, true);
    console.log('Secure write operation result:', result);

    // Step 3: Clean up - delete the test node we just created
    const cleanupQuery = wrapWithSecurityCheck(
      'MATCH (n:TestNode {name: $name}) DELETE n RETURN count(*) as deleted',
      securityNodeName
    );

    await memory.executeCypherQuery(cleanupQuery, { name: 'Test Node' }, true);

  } finally {
    // Step 4: Always remove the security node when done
    await memory.removeSecurityNode(securityNodeName);
  }

  await driver.close();
}

// Example 4: Unsafe write operation (will fail without security node)
async function executeUnsafeWriteOperation() {
  const driver = neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  const memory = new Neo4jMemory(driver);

  try {
    // Attempt to execute a write operation without a security node
    const result = await memory.executeCypherQuery(
      'CREATE (n:TestNode {name: "Unsafe Node"}) RETURN n',
      {}, // No params
      true // It's a write operation
    );

    console.log('This should not execute unless NEO4J_UNSAFE_MEMORY_CYPHERS=true:', result);
  } catch (error) {
    console.error('Expected error when executing unsafe write operation:', error.message);
  }

  await driver.close();
}

// Run the examples
async function runExamples() {
  console.log('Running safe_cypher_query examples...');

  try {
    await executeBasicReadQuery();
    await executeParameterizedReadQuery();
    await executeSecureWriteOperation();
    await executeUnsafeWriteOperation();
  } catch (error) {
    console.error('Error running examples:', error);
  }

  console.log('Examples completed.');
}

// Uncomment to run the examples
// runExamples();

export {
  executeBasicReadQuery,
  executeParameterizedReadQuery,
  executeSecureWriteOperation,
  executeUnsafeWriteOperation,
  runExamples
};
