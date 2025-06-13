class Neo4jMemory {
  constructor(neo4jDriver, database = "neo4j") {
    if (!neo4jDriver) {
      throw new Error('Neo4j driver is required');
    }
    this.neo4jDriver = neo4jDriver;
    this.database = database;
    console.error(`Neo4jMemory initialized with database: ${database}`);
  }
  async loadGraph() {
    const session = this.neo4jDriver.session({ database: this.database });
    try {
      console.error(`Loading graph from database: ${this.database}`);
      const res = await session.executeRead((tx) => tx.run(`
        MATCH (entity:Memory)
        OPTIONAL MATCH (entity)-[r]->(other)
        RETURN entity, collect(r) as relations
      `));
      const kgMemory = res.records.reduce(
        (kg, row) => {
          const entityNode = row.get("entity");
          const entityRelationships = row.get("relations");
          kg.entities.push(entityNode.properties);
          kg.relations.push(...entityRelationships.map((r) => r.properties));
          return kg;
        },
        { entities: [], relations: [] }
      );
      console.error(`Loaded ${kgMemory.entities.length} entities and ${kgMemory.relations.length} relations`);
      if (kgMemory.entities.length < 10) { // Only log details if not too many
        console.error(`Entities: ${JSON.stringify(kgMemory.entities)}`);
        console.error(`Relations: ${JSON.stringify(kgMemory.relations)}`);
      }
      return kgMemory;
    } catch (error) {
      console.error(`Error loading graph from database ${this.database}: ${error.message}`);
      if (error.code === 'Neo.ClientError.Database.DatabaseNotFound') {
        console.error(`Database '${this.database}' does not exist. Please check your Neo4j installation and configuration.`);
      }
      throw error; // Re-throw to allow proper handling upstream
    } finally {
      await session.close();
    }
    return {
      entities: [],
      relations: []
    };
  }
  async saveGraph(graph) {
    const session = this.neo4jDriver.session({ database: this.database });
    return session.executeWrite(async (txc) => {
      await txc.run(
        `
        UNWIND $memoryGraph.entities as entity
        MERGE (entityMemory:Memory { entityID: entity.name })
        SET entityMemory += entity
        `,
        {
          memoryGraph: graph
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
    });
  }
  async createEntities(entities) {
    const graph = await this.loadGraph();
    const newEntities = entities.filter((e) => !graph.entities.some((existingEntity) => existingEntity.name === e.name));
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
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
  async addObservations(observations) {
    const graph = await this.loadGraph();
    const results = observations.map((o) => {
      const entity = graph.entities.find((e) => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter((content) => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }
  async deleteEntities(entityNames) {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter((e) => !entityNames.includes(e.name));
    graph.relations = graph.relations.filter((r) => !entityNames.includes(r.from) && !entityNames.includes(r.to));
    await this.saveGraph(graph);
  }
  async deleteObservations(deletions) {
    const graph = await this.loadGraph();
    deletions.forEach((d) => {
      const entity = graph.entities.find((e) => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter((o) => !d.observations.includes(o));
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
}
export {
  Neo4jMemory
};
