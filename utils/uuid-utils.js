/**
 * Utility functions for generating UUIDs
 */

/**
 * Generates a UUID v4
 * @returns {string} - A UUID v4 string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a security node name with timestamp and UUID
 * @returns {string} - A unique security node name
 */
export function generateSecurityNodeName() {
  return `security-node-${Date.now()}-${generateUUID()}`;
}
