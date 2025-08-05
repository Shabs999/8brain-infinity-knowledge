import neo4j, { Driver } from 'neo4j-driver';

// Local type definitions to avoid import issues
interface Concept {
  id: string;
  name: string;
  type: string;
  description?: string;
  documentIds: string[];
  embedding?: number[];
}

interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  evidence: string[];
}

export class GraphService {
  private driver: Driver;

  constructor() {
    const uri = process.env['NEO4J_URI'];
    const username = process.env['NEO4J_USERNAME'] || 'neo4j';
    const password = process.env['NEO4J_PASSWORD'];

    if (!uri || !password) {
      throw new Error('NEO4J_URI and NEO4J_PASSWORD environment variables are required');
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.driver.verifyConnectivity();
      console.log('Connected to Neo4j successfully');

      // Create constraints and indexes
      await this.createSchema();
      console.log('Neo4j schema initialized');
    } catch (error) {
      console.error('Failed to initialize Neo4j:', error);
      throw error;
    }
  }

  private async createSchema(): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Create constraints for unique nodes
      const constraints = [
        'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
        'CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
        'CREATE CONSTRAINT concept_id_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE'
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error: any) {
          // Ignore if constraint already exists
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }

      // Create indexes for performance
      const indexes = [
        'CREATE INDEX concept_name_index IF NOT EXISTS FOR (c:Concept) ON (c.name)',
        'CREATE INDEX document_user_index IF NOT EXISTS FOR (d:Document) ON (d.userId)',
        'CREATE INDEX concept_type_index IF NOT EXISTS FOR (c:Concept) ON (c.type)'
      ];

      for (const index of indexes) {
        try {
          await session.run(index);
        } catch (error: any) {
          // Ignore if index already exists
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    } finally {
      await session.close();
    }
  }

  async createUser(userId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  }): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        `CREATE (u:User {
          id: $userId,
          email: $email,
          firstName: $firstName,
          lastName: $lastName,
          createdAt: datetime($createdAt)
        })`,
        {
          userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          createdAt: userData.createdAt.toISOString()
        }
      );
    } finally {
      await session.close();
    }
  }

  async createDocument(documentId: string, documentData: {
    userId: string;
    title: string;
    content: string;
    type: string;
    uploadedAt: Date;
  }): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        `MATCH (u:User {id: $userId})
         CREATE (d:Document {
           id: $documentId,
           title: $title,
           content: $content,
           type: $type,
           uploadedAt: datetime($uploadedAt)
         })
         CREATE (u)-[:OWNS]->(d)`,
        {
          userId: documentData.userId,
          documentId,
          title: documentData.title,
          content: documentData.content,
          type: documentData.type,
          uploadedAt: documentData.uploadedAt.toISOString()
        }
      );
    } finally {
      await session.close();
    }
  }

  async createConcept(concept: Concept): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        `CREATE (c:Concept {
          id: $id,
          name: $name,
          type: $type,
          description: $description
        })`,
        {
          id: concept.id,
          name: concept.name,
          type: concept.type,
          description: concept.description || ''
        }
      );
    } finally {
      await session.close();
    }
  }

  async linkConceptToDocument(conceptId: string, documentId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        `MATCH (c:Concept {id: $conceptId})
         MATCH (d:Document {id: $documentId})
         MERGE (d)-[:CONTAINS]->(c)`,
        { conceptId, documentId }
      );
    } finally {
      await session.close();
    }
  }

  async createRelationship(relationship: Relationship): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Use a standard relationship type for now
      await session.run(
        `MATCH (c1:Concept {id: $sourceId})
         MATCH (c2:Concept {id: $targetId})
         CREATE (c1)-[r:RELATES_TO {
           id: $relationshipId,
           type: $relType,
           weight: $weight,
           evidence: $evidence
         }]->(c2)
         RETURN r`,
        {
          sourceId: relationship.source,
          targetId: relationship.target,
          relType: relationship.type,
          relationshipId: relationship.id,
          weight: relationship.weight,
          evidence: relationship.evidence
        }
      );
    } finally {
      await session.close();
    }
  }

  async findRelatedConcepts(
    conceptIds: string[],
    options: {
      maxDepth?: number;
      userId?: string;
      limit?: number;
    } = {}
  ): Promise<{
    concepts: Concept[];
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }>;
  }> {
    const session = this.driver.session();
    
    try {
      const maxDepth = options.maxDepth || 2;
      const limit = options.limit || 50;
      
      let query = `
        MATCH (start:Concept)
        WHERE start.id IN $conceptIds
      `;
      
      if (options.userId) {
        query += `
          MATCH (u:User {id: $userId})-[:OWNS]->(d:Document)-[:CONTAINS]->(start)
        `;
      }
      
      query += `
        MATCH path = (start)-[*1..${maxDepth}]-(related:Concept)
        WITH DISTINCT related, start
        LIMIT ${limit}
        RETURN related.id as id, related.name as name, related.type as type, related.description as description
      `;

      const conceptResult = await session.run(query, {
        conceptIds,
        userId: options.userId
      });

      const concepts: Concept[] = conceptResult.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        type: record.get('type'),
        description: record.get('description'),
        documentIds: [] // Will be populated separately if needed
      }));

      // Get relationships between found concepts
      const relationshipQuery = `
        MATCH (c1:Concept)-[r]-(c2:Concept)
        WHERE c1.id IN $allConceptIds AND c2.id IN $allConceptIds
        RETURN c1.id as source, c2.id as target, type(r) as relType, 
               COALESCE(r.weight, 1.0) as weight
      `;

      const allConceptIds = [...conceptIds, ...concepts.map(c => c.id)];
      const relationshipResult = await session.run(relationshipQuery, { allConceptIds });

      const relationships = relationshipResult.records.map(record => ({
        source: record.get('source'),
        target: record.get('target'),
        type: record.get('relType'),
        weight: record.get('weight')
      }));

      return { concepts, relationships };
    } finally {
      await session.close();
    }
  }

  async getUserDocuments(userId: string): Promise<Array<{
    id: string;
    title: string;
    type: string;
    uploadedAt: Date;
    conceptCount: number;
  }>> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[:OWNS]->(d:Document)
         OPTIONAL MATCH (d)-[:CONTAINS]->(c:Concept)
         RETURN d.id as id, d.title as title, d.type as type, 
                d.uploadedAt as uploadedAt, count(c) as conceptCount
         ORDER BY d.uploadedAt DESC`,
        { userId }
      );

      return result.records.map(record => ({
        id: record.get('id'),
        title: record.get('title'),
        type: record.get('type'),
        uploadedAt: new Date(record.get('uploadedAt')),
        conceptCount: record.get('conceptCount').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        `MATCH (d:Document {id: $documentId})
         DETACH DELETE d`,
        { documentId }
      );
    } finally {
      await session.close();
    }
  }

  async getGraphStats(): Promise<{
    userCount: number;
    documentCount: number;
    conceptCount: number;
    relationshipCount: number;
  }> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (u:User)
        WITH count(u) as userCount
        MATCH (d:Document)
        WITH userCount, count(d) as documentCount
        MATCH (c:Concept)
        WITH userCount, documentCount, count(c) as conceptCount
        MATCH ()-[r]->()
        RETURN userCount, documentCount, conceptCount, count(r) as relationshipCount
      `);

      const record = result.records[0];
      return {
        userCount: record?.get('userCount').toNumber() || 0,
        documentCount: record?.get('documentCount').toNumber() || 0,
        conceptCount: record?.get('conceptCount').toNumber() || 0,
        relationshipCount: record?.get('relationshipCount').toNumber() || 0
      };
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      console.error('Neo4j health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}