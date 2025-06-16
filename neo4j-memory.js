class Neo4jMemory {
    constructor(neo4jDriver, database = 'neo4j') {
        if (!neo4jDriver) {
            throw new Error('Neo4j driver is required');
        }
        this.neo4jDriver = neo4jDriver;
        this.database = database;
        console.error(`Neo4jMemory initialized with database: ${database}`);

        // Import debug logger at runtime to avoid circular dependencies
        // This will be a no-op if MCP_SEMMEM_DEBUG is not set
        import('./utils/debug-logger.js').then(logger => {
            this.debugLogger = logger;
            this.debugLogger.debugLog('Neo4jMemory.constructor', { database }, 'init');
        }).catch(err => {
            console.error(`Failed to import debug logger: ${err.message}`);
        });
    }

    async loadGraph() {
        if (this.debugLogger) this.debugLogger.logFunctionStart('Neo4jMemory.loadGraph');
        console.error(`Creating session for database: '${this.database}'`);
        const session = this.neo4jDriver.session({database: this.database});
        try {
            console.error(`Loading graph from database: '${this.database}'`);
            if (this.debugLogger) this.debugLogger.debugLog('Neo4jMemory.loadGraph', { query: 'MATCH (entity:Memory) OPTIONAL MATCH (entity)-[r]->(other) RETURN entity, collect(r) as relations' });
            const res = await session.executeRead((tx) => tx.run(`
        MATCH (entity:Memory)
        OPTIONAL MATCH (entity)-[r]->(other)
        RETURN entity, collect(r) as relations
      `));
            const kgMemory = res.records.reduce(
                (kg, row) => {
                    const entityNode = row.get('entity');
                    const entityRelationships = row.get('relations');
                    kg.entities.push(entityNode.properties);
                    kg.relations.push(...entityRelationships.map((r) => r.properties));
                    return kg;
                },
                {entities: [], relations: []}
            );
            console.error(`Loaded ${kgMemory.entities.length} entities and ${kgMemory.relations.length} relations`);
            if (kgMemory.entities.length < 10) { // Only log details if not too many
                console.error(`Entities: ${JSON.stringify(kgMemory.entities)}`);
                console.error(`Relations: ${JSON.stringify(kgMemory.relations)}`);
            }
            if (this.debugLogger) this.debugLogger.logFunctionEnd('Neo4jMemory.loadGraph', { entityCount: kgMemory.entities.length, relationCount: kgMemory.relations.length });
            return kgMemory;
        } catch (error) {
            console.error(`Error loading graph from database ${this.database}: ${error.message}`);
            if (error.code === 'Neo.ClientError.Database.DatabaseNotFound') {
                console.error(`Database '${this.database}' does not exist. Please check your Neo4j installation and configuration.`);
            }
            if (this.debugLogger) this.debugLogger.logFunctionError('Neo4jMemory.loadGraph', error);
            throw error; // Re-throw to allow proper handling upstream
        } finally {
            await session.close();
        }
        // Unreachable code removed
    }

            async saveGraph(graph, tz = 'UTC') {
        if (this.debugLogger) this.debugLogger.logFunctionStart('Neo4jMemory.saveGraph', { entityCount: graph.entities.length, relationCount: graph.relations.length, tz });
        const session = this.neo4jDriver.session({database: this.database});

        // Create a deep copy of the graph
        const processedGraph = JSON.parse(JSON.stringify(graph));

        return session.executeWrite(async (txc) => {
            await txc.run(
                `
        UNWIND $memoryGraph.entities as entity
        MERGE (entityMemory:Memory { entityID: entity.name })
        ON CREATE SET
          entityMemory += entity,
          entityMemory.createdAt = datetime({timezone: $tz}),
          entityMemory.updatedAt = datetime({timezone: $tz})
        ON MATCH SET
          entityMemory += entity,
          entityMemory.updatedAt = datetime({timezone: $tz})
        `,
                {
                    memoryGraph: processedGraph,
                    tz: tz
                }
            );
            await txc.run(
                `
        UNWIND $memoryGraph.relations as relation
        MATCH (from:Memory),(to:Memory)
        WHERE from.entityID = relation.from
          AND  to.entityID = relation.to
        MERGE (from)-[r:Memory {relationType:relation.relationType}]->(to)
        `,
                {
                    memoryGraph: graph
                }
            );
            if (this.debugLogger) this.debugLogger.logFunctionEnd('Neo4jMemory.saveGraph', { success: true });
            return 'Graph saved successfully';
        }).catch(error => {
            if (this.debugLogger) this.debugLogger.logFunctionError('Neo4jMemory.saveGraph', error);
            throw error;
        });
    }

            async createEntities(entities, tz) {
        const graph = await this.loadGraph();

        // Prepare entities with observations
        const processedEntities = entities.map(entity => {
            // Make a copy of the entity to avoid mutating the original
            const processedEntity = {...entity};

            // Ensure observations is an array
            if (!processedEntity.observations || !Array.isArray(processedEntity.observations)) {
                processedEntity.observations = [];
            }

            return processedEntity;
        });

        const newEntities = processedEntities.filter((e) => !graph.entities.some((existingEntity) => existingEntity.name === e.name));
        graph.entities.push(...newEntities);
        await this.saveGraph(graph, tz);
        return newEntities;
    }

    async createRelations(relations) {
        const graph = await this.loadGraph();
        const newRelations = relations.filter((r) => !graph.relations.some(
            (existingRelation) => existingRelation.from === r.from && existingRelation.to === r.to && existingRelation.relationType === r.relationType
        ));
        graph.relations.push(...newRelations);
        await this.saveGraph(graph);
        return newRelations;
    }

            async addObservations(observations, tz) {
        const graph = await this.loadGraph();
        const results = observations.map((o) => {
            const entity = graph.entities.find((e) => e.name === o.entityName);
            if (!entity) {
                throw new Error(`Entity with name ${o.entityName} not found`);
            }

            // If observations is not initialized yet, create it as an array
            if (!entity.observations) {
                entity.observations = [];
            }

            // Filter out observations that already exist
            const newObservations = o.contents.filter((content) => !entity.observations.includes(content));

            // Add the new observations
            entity.observations.push(...newObservations);

            return {entityName: o.entityName, addedObservations: newObservations};
        });
        await this.saveGraph(graph, tz);
        return results;
    }

    async deleteEntities(entityNames) {
        if (!entityNames || entityNames.length === 0) {
            console.error('No entity names provided for deletion');
            return;
        }

        const session = this.neo4jDriver.session({database: this.database});
        try {
            console.error(`Deleting entities: ${JSON.stringify(entityNames)}`);

            // Execute a Cypher query to delete entities by name
            // Using DETACH DELETE to also remove all relationships
            const result = await session.executeWrite(tx => {
                return tx.run(
                    `MATCH (entity:Memory)
                     WHERE entity.name IN $entityNames
                     DETACH DELETE entity
                     RETURN count(entity) as deletedCount`,
                    { entityNames }
                );
            });

            const deletedCount = result.records[0]?.get('deletedCount')?.toNumber() || 0;
            console.error(`Deleted ${deletedCount} entities`);

            if (deletedCount !== entityNames.length) {
                console.error(`Warning: Requested to delete ${entityNames.length} entities, but only deleted ${deletedCount}`);
            }
        } catch (error) {
            console.error(`Error deleting entities: ${error.message}`);
            throw error;
        } finally {
            await session.close();
        }
    }

    async deleteObservations(deletions) {
        const graph = await this.loadGraph();
        deletions.forEach((d) => {
            const entity = graph.entities.find((e) => e.name === d.entityName);
            if (entity && entity.observations) {
                // For each observation to delete, find its index and remove it
                const indicesToRemove = [];
                d.observations.forEach(obsToDelete => {
                    const index = entity.observations.indexOf(obsToDelete);
                    if (index !== -1) {
                        indicesToRemove.push(index);
                    }
                });

                // Sort indices in descending order to avoid shifting problems when removing
                indicesToRemove.sort((a, b) => b - a);

                // Remove observations by index
                indicesToRemove.forEach(index => {
                    entity.observations.splice(index, 1);
                });
            }
        });
        await this.saveGraph(graph);
    }

    async deleteRelations(relations) {
        const graph = await this.loadGraph();
        graph.relations = graph.relations.filter((r) => !relations.some(
            (delRelation) => r.from === delRelation.from && r.to === delRelation.to && r.relationType === delRelation.relationType
        ));
        await this.saveGraph(graph);
    }

    async readGraph() {
        return this.loadGraph();
    }

    // Very basic search function
    async searchNodes(query) {
        const graph = await this.loadGraph();
        const filteredEntities = graph.entities.filter(
            (e) => query.toLowerCase().includes(e.name.toLowerCase()) || query.toLowerCase().includes(e.entityType.toLowerCase()) || e.observations.some((o) => o.toLowerCase().includes(query.toLowerCase()))
        );
        const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));
        const filteredRelations = graph.relations.filter(
            (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
        );
        const filteredGraph = {
            entities: filteredEntities,
            relations: filteredRelations
        };
        return filteredGraph;
    }

    async openNodes(names) {
        const graph = await this.loadGraph();
        const filteredEntities = graph.entities.filter((e) => names.includes(e.name));
        const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));
        const filteredRelations = graph.relations.filter(
            (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
        );
        const filteredGraph = {
            entities: filteredEntities,
            relations: filteredRelations
        };
        return filteredGraph;
    }

    /**
     * Executes a Cypher query against the Neo4j database
     * @param {string} query - The Cypher query to execute
     * @param {Object} params - Parameters for the query
     * @param {boolean} isWrite - Whether this is a write operation
     * @returns {Array} - The query results
     */
    async executeCypherQuery(query, params = {}, isWrite = false) {
        if (this.debugLogger) this.debugLogger.logFunctionStart('Neo4jMemory.executeCypherQuery', { query, params, isWrite });
        const session = this.neo4jDriver.session({database: this.database});
        try {
            let result;

            if (isWrite) {
                result = await session.executeWrite(tx => tx.run(query, params));
            } else {
                result = await session.executeRead(tx => tx.run(query, params));
            }

            if (this.debugLogger) this.debugLogger.logFunctionEnd('Neo4jMemory.executeCypherQuery', { resultCount: result.records.length });

            // Transform the Neo4j result into a more usable format
            return result.records.map(record => {
                const obj = {};
                record.keys.forEach(key => {
                    const value = record.get(key);

                    // Handle Neo4j types appropriately
                    if (value && typeof value === 'object' && value.constructor.name === 'Node') {
                        // For Neo4j nodes, return properties and labels
                        obj[key] = {
                            ...value.properties,
                            _labels: value.labels
                        };
                    } else if (value && typeof value === 'object' && value.constructor.name === 'Relationship') {
                        // For relationships, return properties and type
                        obj[key] = {
                            ...value.properties,
                            _type: value.type,
                            _startNodeId: value.startNodeElementId,
                            _endNodeId: value.endNodeElementId
                        };
                    } else if (value && typeof value === 'object' && value.constructor.name === 'Path') {
                        // For paths, return segments
                        obj[key] = {
                            segments: value.segments.map(seg => ({
                                start: {...seg.start.properties, _labels: seg.start.labels},
                                relationship: {
                                    ...seg.relationship.properties,
                                    _type: seg.relationship.type
                                },
                                end: {...seg.end.properties, _labels: seg.end.labels}
                            }))
                        };
                    } else if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
                        // For Neo4j DateTime objects, convert to ISO string
                        obj[key] = value.toString();
                    } else {
                        // For primitive values and other objects
                        obj[key] = value;
                    }
                });
                return obj;
            });
        } catch (error) {
            if (this.debugLogger) this.debugLogger.logFunctionError('Neo4jMemory.executeCypherQuery', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Creates a security node with the given name
     * This is used as a security token for write operations
     * @param {string} name - The unique name for the security node
     * @returns {Object} - Result of the operation
     */
    async createSecurityNode(name) {
        const query = `
      CREATE (s:SecurityNode {
        name: $name,
        createdAt: datetime(),
        expiresAt: datetime() + duration({minutes: 5})
      })
      RETURN s
    `;

        return this.executeCypherQuery(query, {name}, true);
    }

    /**
     * Removes a security node with the given name
     * @param {string} name - The name of the security node to remove
     * @returns {Object} - Result of the operation
     */
    async removeSecurityNode(name) {
        const query = `
      MATCH (s:SecurityNode {name: $name})
      DELETE s
      RETURN count(*) as nodesDeleted
    `;

        return this.executeCypherQuery(query, {name}, true);
    }
}

export {
    Neo4jMemory
};
