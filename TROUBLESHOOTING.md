# Troubleshooting Guide

## Neo4j Database Connection Issues

### Queries going to default 'neo4j' database instead of custom database

If your queries are going to the default 'neo4j' database instead of using the custom database specified in the NEO4J_DATABASE environment variable, check the following:

1. **Environment Variable Configuration**
   - Ensure your `.env` file has the correct NEO4J_DATABASE setting without any whitespace
   - Verify the variable is being loaded correctly by checking the console logs

2. **Neo4j Edition**
   - Multiple databases require Neo4j Enterprise Edition
   - Community Edition only supports the default 'neo4j' database

3. **Database Existence**
   - Verify the database specified actually exists in your Neo4j instance
   - Use Neo4j Browser to run `SHOW DATABASES` to see available databases

4. **Neo4j User Permissions**
   - Ensure the user specified in NEO4J_USER has permissions to access the specified database

5. **Session Configuration**
   - Check the application logs to confirm the correct database is being specified in session creation

### Error Messages and Solutions

- **"Neo.ClientError.Database.DatabaseNotFound"**: The specified database does not exist
  - Create the database using `CREATE DATABASE yourdbname` in Neo4j Browser (Enterprise Edition only)

- **"This Neo4j instance does not support multiple databases"**: You're using Community Edition
  - Either upgrade to Enterprise Edition or use the default 'neo4j' database

- **"Authentication failed"**: Check your NEO4J_USER and NEO4J_PASSWORD settings

## Debugging Steps

1. Set `MCP_SEMMEM_DEBUG=true` in your environment to enable verbose logging
2. Check console output for session creation logs
3. Verify database name is being passed correctly to session objects
4. Try connecting directly to the database using Neo4j Browser or Cypher-shell with the same credentials
