To create a new database in a Neo4j Enterprise Edition service, you can use the Cypher command `CREATE DATABASE` executed against the `system` database. Below are the steps to achieve this, assuming you have access to a Neo4j Enterprise instance (e.g., via Neo4j Desktop, AuraDB, or a self-hosted server). The process varies slightly depending on your deployment, but the core Cypher command remains the same.

### Prerequisites
- **Neo4j Enterprise Edition**: Ensure you are using the Enterprise Edition, as the Community Edition supports only one database.[](https://neo4j.com/docs/operations-manual/current/database-administration/)
- **Access to the `system` database**: Administrative privileges are required to run database management commands.
- **Neo4j Browser or Cypher Shell**: Use these tools to execute Cypher commands.
- **Running Neo4j instance**: Your Neo4j service (local, cloud, or cluster) must be up and running.

### Steps to Create a New Database

1. **Connect to the Neo4j Instance**
    - **Neo4j Browser**:
        - Open the Neo4j Browser (e.g., at `http://localhost:7474` for a local instance or the provided URL for AuraDB).
        - Log in with your credentials (default username is `neo4j`; password is set during setup or provided by AuraDB).
    - **Cypher Shell**:
        - Run `cypher-shell` from your terminal:
          ```bash
          cypher-shell -u neo4j -p <your-password>
          ```
        - For AuraDB, use the connection URI provided (e.g., `neo4j+s://<instance>.databases.neo4j.io`).
    - **Neo4j Desktop**:
        - Open Neo4j Desktop, select your project, and start the DBMS.
        - Open the Neo4j Browser from the Desktop interface.

2. **Switch to the `system` Database**
    - Administrative commands must be executed against the `system` database. In the Neo4j Browser or Cypher Shell, switch to the `system` database:
      ```cypher
      :use system
      ```
    - If using Neo4j Browser, you can also select the `system` database from the database dropdown.

3. **Create the New Database**
    - Run the `CREATE DATABASE` command to create a new database. Replace `<database-name>` with your desired database name (e.g., `mydb`):
      ```cypher
      CREATE DATABASE <database-name>
      ```
      Example:
      ```cypher
      CREATE DATABASE mydb
      ```
    - **Optional Clauses**:
        - **Idempotency**: To avoid errors if the database already exists, use `IF NOT EXISTS`:
          ```cypher
          CREATE DATABASE mydb IF NOT EXISTS
          ```
        - **Replace Existing Database**: To delete and recreate a database, use `OR REPLACE` (note: this removes indexes and constraints):
          ```cypher
          CREATE OR REPLACE DATABASE mydb
          ```
        - **Wait for Completion**: To ensure the command completes before proceeding, use the `WAIT` clause:
          ```cypher
          CREATE DATABASE mydb WAIT
          ```
        - **Store Format**: Specify a store format if needed (e.g., for compatibility or performance):
          ```cypher
          CREATE DATABASE mydb OPTIONS {storeFormat: 'aligned'}
          ```

4. **Verify the Database Creation**
    - Check the status of the new database to confirm it’s online:
      ```cypher
      SHOW DATABASE mydb
      ```
      Expected output:
      ```
      +-----------------------------------------------+
      | name   | requestedStatus | currentStatus |
      +-----------------------------------------------+
      | "mydb" | "online"        | "online"      |
      +-----------------------------------------------+
      ```
    - List all databases to see your new database:
      ```cypher
      SHOW DATABASES
      ```

5. **Start Using the New Database**
    - Switch to the new database to start creating nodes and relationships:
      ```cypher
      :use mydb
      ```
    - Example: Create a node in the new database:
      ```cypher
      CREATE (n:Person {name: "Alice"}) RETURN n
      ```

### Additional Considerations for Enterprise Edition

- **Multi-Database Support**: Neo4j Enterprise Edition supports multiple standard databases, unlike the Community Edition, which is limited to one. Each database is a separate physical structure of files.[](https://neo4j.com/docs/operations-manual/current/database-administration/)
- **Cluster Environments**:
    - In a clustered setup, the `CREATE DATABASE` command allocates the database across servers. You may need to specify server IDs or use `REALLOCATE DATABASES` to balance the load.[](https://neo4j.com/docs/operations-manual/current/clustering/databases/)
    - Example for a cluster:
      ```cypher
      CREATE DATABASE foo TOPOLOGY 3 PRIMARY
      ```
      This creates a database `foo` hosted on three servers in primary mode.
- **Neo4j AuraDB**:
    - If using AuraDB Enterprise, you typically create instances via the Aura Console (not Cypher). Follow these steps:
        - Navigate to the Neo4j Aura Console.
        - Select “New Instance” and choose “Business Critical” for Enterprise features.
        - Set the instance name, cloud provider, region, and size.
        - Save the credentials (.txt file) provided after creation.
        - Connect to the instance using Neo4j Browser or a driver.[](https://neo4j.com/docs/aura/classic/auradb/getting-started/create-database/)
    - To create additional databases within an AuraDB instance, use the `CREATE DATABASE` command as described above.
- **Indexes and Constraints**:
    - If using `CREATE OR REPLACE`, indexes and constraints are dropped. To preserve them, run:
      ```cypher
      SHOW CONSTRAINTS YIELD createStatement AS statement
      SHOW INDEXES YIELD createStatement, owningConstraint WHERE owningConstraint IS NULL RETURN createStatement AS statement
      ```
      Save the output and reapply after creating the database.[](https://neo4j.com/docs/operations-manual/current/database-administration/standard-databases/create-databases/)
- **Security**:
    - Ensure the user executing the command has administrative privileges. You may need to grant roles like `admin` to the user:
      ```cypher
      GRANT ROLE admin TO <username>
      ```
- **Configuration**:
    - For self-hosted instances, you can set the default store format for new databases in `neo4j.conf`:
      ```conf
      db.format=aligned
      ```
      Alternatively, specify it in the `CREATE DATABASE` command.[](https://neo4j.com/docs/operations-manual/current/database-administration/standard-databases/create-databases/)

### Troubleshooting
- **Database Already Exists**: If the database exists and you don’t want to replace it, use `IF NOT EXISTS` or check with `SHOW DATABASES`.
- **Permission Denied**: Verify that your user has the necessary privileges. Run `SHOW ROLES` to check.
- **Database Not Online**: If `currentStatus` is not `online`, check logs (e.g., `/var/lib/neo4j/logs/neo4j.log`) for errors.
- **AuraDB Limitations**: Free or Professional AuraDB tiers may have restrictions on database creation. Enterprise tiers offer more flexibility.

### Example Workflow
```cypher
:use system
CREATE DATABASE mydb IF NOT EXISTS WAIT
SHOW DATABASE mydb
:use mydb
CREATE (n:Person {name: "Bob"}) RETURN n
```

### Notes
- Always back up existing databases before using `OR REPLACE` to avoid data loss.[](https://neo4j.com/docs/operations-manual/current/clustering/databases/)
- For large-scale or production environments, consider seeding databases from backups or URIs for consistency across clusters.[](https://neo4j.com/docs/operations-manual/current/clustering/databases/)
- If you’re using Neo4j Desktop, you can also create a new DBMS via the GUI, but this creates a new instance rather than a database within an existing instance.[](https://neo4j.com/docs/desktop-manual/current/operations/create-dbms/)

For further details, refer to the [Neo4j Operations Manual](https://neo4j.com/docs/operations-manual/current/) or contact Neo4j support for Enterprise-specific guidance.[](https://neo4j.com/docs/operations-manual/current/database-administration/standard-databases/create-databases/)
