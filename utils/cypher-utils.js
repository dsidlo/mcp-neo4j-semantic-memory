/**
 * Utility functions for Cypher query validation and execution
 */

/**
 * Checks if a Cypher query contains write operations
 * @param {string} query - The Cypher query to check
 * @returns {boolean} - True if the query contains write operations
 */
export function containsWriteOperations(query) {
  const writeOperators = ['CREATE', 'SET', 'DELETE', 'REMOVE', 'MERGE'];

  // Case-insensitive regex to match write operators
  // Looks for the operators as standalone words (with word boundaries)
  // This helps avoid false positives in strings or comments
  const regex = new RegExp('\\b(' + writeOperators.join('|') + ')\\b', 'i');

  return regex.test(query);
}

/**
 * Wraps a write query with a CASE statement that checks for the existence of a security node
 * @param {string} query - The original Cypher query
 * @param {string} securityNodeName - The name of the security node to check
 * @returns {string} - The wrapped Cypher query
 */
export function wrapWithSecurityCheck(query, securityNodeName) {
  // Build a query that will only execute the write operations if the security node exists
  return `
    // Security check to ensure only authorized operations are performed
    MATCH (security:SecurityNode {name: "${securityNodeName}"})
    WITH security
    WHERE security IS NOT NULL
    // Original query follows
    ${query}
  `;
}
