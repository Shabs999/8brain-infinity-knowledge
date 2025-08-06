import neo4j, { Driver } from 'neo4j-driver';
import { ExtractionResult, ExtractedEntity, ExtractedConcept } from './EntityExtractionService';

export interface GraphDocument {
  id: string;
  filename: string;
  title: string;
  uploadedAt: Date;
  fileType: string;
  fileSize: number;
  userId: string;
  summary?: string;
  embedding?: number[];
}

export interface GraphQueryResult {
  documents: GraphDocument[];
  concepts: ExtractedConcept[];
  entities: ExtractedEntity[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    confidence: number;
    context?: string;
  }>;
  paths: Array<{
    path: any[];
    score: number;
  }>;
}

export class KnowledgeGraphService {
  private driver: Driver;

  constructor() {
    const uri = process.env['NEO4J_URI'];
    const username = process.env['NEO4J_USERNAME'] || 'neo4j';
    const password = process.env['NEO4J_PASSWORD'];

    if (!uri || !password) {
      console.warn('⚠️  NEO4J_URI or NEO4J_PASSWORD not found - Neo4j features will be disabled');
      this.driver = null as any;
      return;
    }

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      console.log('🔗 Neo4j driver initialized for KnowledgeGraph');
    } catch (error) {
      console.error('Failed to initialize Neo4j driver:', error);
      this.driver = null as any;
    }
  }

  async initialize(): Promise<void> {
    if (!this.driver) {
      console.log('🔗 Neo4j driver not available - skipping KnowledgeGraph initialization');
      return;
    }

    try {
      await this.driver.verifyConnectivity();
      console.log('🔗 Connected to Neo4j for KnowledgeGraph');
      await this.createEnhancedSchema();
      console.log('🧠 Knowledge Graph schema initialized');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph:', error);
      throw error;
    }
  }

  /**
   * Create enhanced schema with all node types and relationships
   */
  private async createEnhancedSchema(): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Create constraints for unique nodes
      const constraints = [
        'CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
        'CREATE CONSTRAINT concept_id_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE',
        'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
        'CREATE CONSTRAINT term_id_unique IF NOT EXISTS FOR (t:Term) REQUIRE t.id IS UNIQUE',
        'CREATE CONSTRAINT chunk_id_unique IF NOT EXISTS FOR (ch:Chunk) REQUIRE ch.id IS UNIQUE'
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.warn(`Warning creating constraint: ${error.message}`);
          }
        }
      }

      // Create indexes for performance
      const indexes = [
        'CREATE INDEX document_user_index IF NOT EXISTS FOR (d:Document) ON (d.userId)',
        'CREATE INDEX document_uploaded_index IF NOT EXISTS FOR (d:Document) ON (d.uploadedAt)',
        'CREATE INDEX concept_name_index IF NOT EXISTS FOR (c:Concept) ON (c.name)',
        'CREATE INDEX concept_category_index IF NOT EXISTS FOR (c:Concept) ON (c.category)',
        'CREATE INDEX entity_name_index IF NOT EXISTS FOR (e:Entity) ON (e.name)',
        'CREATE INDEX entity_type_index IF NOT EXISTS FOR (e:Entity) ON (e.type)',
        'CREATE INDEX term_value_index IF NOT EXISTS FOR (t:Term) ON (t.value)',
        'CREATE INDEX term_domain_index IF NOT EXISTS FOR (t:Term) ON (t.domain)'
      ];

      for (const index of indexes) {
        try {
          await session.run(index);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.warn(`Warning creating index: ${error.message}`);
          }
        }
      }

      // Create full-text search indexes
      try {
        await session.run(`
          CALL db.index.fulltext.createNodeIndex("documentSearch", ["Document"], ["title", "summary"])
        `);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.warn(`Warning creating full-text index: ${error.message}`);
        }
      }

      try {
        await session.run(`
          CALL db.index.fulltext.createNodeIndex("conceptSearch", ["Concept"], ["name", "description"])
        `);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.warn(`Warning creating concept search index: ${error.message}`);
        }
      }

    } finally {
      await session.close();
    }
  }

  /**
   * Store complete extraction results in the knowledge graph
   */
  async storeExtractionResults(
    documentData: GraphDocument,
    extractionResults: ExtractionResult
  ): Promise<void> {
    if (!this.driver) {
      console.log('📊 Neo4j not available - skipping graph storage');
      return;
    }

    const session = this.driver.session();
    
    try {
      console.log(`🧠 Storing extraction results for document: ${documentData.filename}`);
      
      // Start transaction for atomic operations
      const txc = session.beginTransaction();

      try {
        // 1. Create/update document node
        await txc.run(`
          MERGE (d:Document {id: $id})
          SET d.filename = $filename,
              d.title = $title,
              d.uploadedAt = datetime($uploadedAt),
              d.fileType = $fileType,
              d.fileSize = $fileSize,
              d.userId = $userId,
              d.summary = $summary,
              d.lastProcessed = datetime()
        `, {
          id: documentData.id,
          filename: documentData.filename,
          title: documentData.title,
          uploadedAt: documentData.uploadedAt.toISOString(),
          fileType: documentData.fileType,
          fileSize: documentData.fileSize,
          userId: documentData.userId,
          summary: extractionResults.summary
        });

        // 2. Create concept nodes and relationships
        for (const concept of extractionResults.concepts) {
          const conceptId = this.generateConceptId(concept.name);
          
          await txc.run(`
            MERGE (c:Concept {id: $id})
            SET c.name = $name,
                c.description = $description,
                c.category = $category,
                c.importance = $importance,
                c.lastUpdated = datetime()
          `, {
            id: conceptId,
            name: concept.name,
            description: concept.description,
            category: concept.category,
            importance: concept.importance
          });

          // Link document to concept
          await txc.run(`
            MATCH (d:Document {id: $docId})
            MATCH (c:Concept {id: $conceptId})
            MERGE (d)-[r:CONTAINS]->(c)
            SET r.confidence = $confidence,
                r.relatedTerms = $relatedTerms
          `, {
            docId: documentData.id,
            conceptId,
            confidence: concept.confidence,
            relatedTerms: concept.relatedTerms
          });
        }

        // 3. Create entity nodes and relationships
        for (const entity of extractionResults.entities) {
          const entityId = this.generateEntityId(entity.name, entity.type);
          
          await txc.run(`
            MERGE (e:Entity {id: $id})
            SET e.name = $name,
                e.type = $type,
                e.description = $description,
                e.aliases = $aliases,
                e.lastUpdated = datetime()
          `, {
            id: entityId,
            name: entity.name,
            type: entity.type,
            description: entity.description || '',
            aliases: entity.aliases || []
          });

          // Link document to entity
          await txc.run(`
            MATCH (d:Document {id: $docId})
            MATCH (e:Entity {id: $entityId})
            MERGE (d)-[r:CONTAINS]->(e)
            SET r.confidence = $confidence,
                r.positions = $positions
          `, {
            docId: documentData.id,
            entityId,
            confidence: entity.confidence,
            positions: entity.positions || []
          });
        }

        // 4. Create term nodes and relationships
        for (const term of extractionResults.terms) {
          const termId = this.generateTermId(term.value);
          
          await txc.run(`
            MERGE (t:Term {id: $id})
            SET t.value = $value,
                t.definition = $definition,
                t.domain = $domain,
                t.importance = $importance,
                t.lastUpdated = datetime()
          `, {
            id: termId,
            value: term.value,
            definition: term.definition || '',
            domain: term.domain,
            importance: term.importance
          });

          // Link document to term
          await txc.run(`
            MATCH (d:Document {id: $docId})
            MATCH (t:Term {id: $termId})
            MERGE (d)-[r:CONTAINS]->(t)
            SET r.frequency = $frequency
          `, {
            docId: documentData.id,
            termId,
            frequency: term.frequency
          });
        }

        // 5. Create relationships between entities/concepts
        for (const relationship of extractionResults.relationships) {
          const fromId = this.findNodeId(relationship.from, extractionResults);
          const toId = this.findNodeId(relationship.to, extractionResults);
          
          if (fromId && toId) {
            await txc.run(`
              MATCH (from {id: $fromId})
              MATCH (to {id: $toId})
              MERGE (from)-[r:${relationship.type}]->(to)
              SET r.confidence = $confidence,
                  r.context = $context,
                  r.documentId = $docId
            `, {
              fromId,
              toId,
              confidence: relationship.confidence,
              context: relationship.context,
              docId: documentData.id
            });
          }
        }

        // 6. Create co-occurrence relationships
        await this.createCoOccurrenceRelationships(txc, documentData.id, extractionResults);

        // Commit transaction
        await txc.commit();
        console.log(`✅ Successfully stored extraction results in knowledge graph`);

      } catch (error) {
        await txc.rollback();
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to store extraction results:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Query the knowledge graph for related content
   */
  async queryKnowledgeGraph(
    query: string,
    options: {
      userId?: string;
      maxDepth?: number;
      limit?: number;
      includeRelationships?: boolean;
    } = {}
  ): Promise<GraphQueryResult> {
    if (!this.driver) {
      return {
        documents: [],
        concepts: [],
        entities: [],
        relationships: [],
        paths: []
      };
    }

    const session = this.driver.session();
    
    try {
      const { limit = 20, includeRelationships = true } = options;

      // Search for matching concepts and entities
      const searchResult = await session.run(`
        CALL db.index.fulltext.queryNodes("conceptSearch", $query) YIELD node as concept, score as conceptScore
        WITH collect({node: concept, score: conceptScore, type: 'concept'}) as concepts
        
        MATCH (e:Entity)
        WHERE e.name CONTAINS $query OR any(alias in e.aliases WHERE alias CONTAINS $query)
        WITH concepts + collect({node: e, score: 1.0, type: 'entity'}) as allNodes
        
        UNWIND allNodes as item
        WITH item.node as node, item.score as score, item.type as nodeType
        
        MATCH (node)<-[:CONTAINS]-(d:Document)
        ${options.userId ? 'WHERE d.userId = $userId' : ''}
        
        RETURN DISTINCT node, d, score, nodeType
        ORDER BY score DESC
        LIMIT $limit
      `, {
        query: query.trim(),
        userId: options.userId,
        limit
      });

      // Process results
      const documents: GraphDocument[] = [];
      const concepts: ExtractedConcept[] = [];
      const entities: ExtractedEntity[] = [];
      const documentIds = new Set<string>();

      for (const record of searchResult.records) {
        const node = record.get('node');
        const doc = record.get('d');
        const nodeType = record.get('nodeType');

        // Add document if not already added
        if (!documentIds.has(doc.properties.id)) {
          documents.push({
            id: doc.properties.id,
            filename: doc.properties.filename,
            title: doc.properties.title,
            uploadedAt: new Date(doc.properties.uploadedAt),
            fileType: doc.properties.fileType,
            fileSize: doc.properties.fileSize.toNumber(),
            userId: doc.properties.userId,
            summary: doc.properties.summary
          });
          documentIds.add(doc.properties.id);
        }

        // Add node based on type
        if (nodeType === 'concept') {
          concepts.push({
            name: node.properties.name,
            description: node.properties.description,
            category: node.properties.category,
            importance: node.properties.importance,
            confidence: 1.0,
            relatedTerms: []
          });
        } else if (nodeType === 'entity') {
          entities.push({
            name: node.properties.name,
            type: node.properties.type,
            description: node.properties.description,
            aliases: node.properties.aliases,
            confidence: 1.0,
            positions: [],
            metadata: {}
          });
        }
      }

      // Get relationships if requested
      let relationships: Array<{
        from: string;
        to: string;
        type: string;
        confidence: number;
        context?: string;
      }> = [];

      if (includeRelationships && (concepts.length > 0 || entities.length > 0)) {
        const relationshipResult = await session.run(`
          MATCH (n1)-[r]->(n2)
          WHERE (n1:Concept OR n1:Entity) AND (n2:Concept OR n2:Entity)
          AND (n1.name IN $nodeNames OR n2.name IN $nodeNames)
          RETURN n1.name as fromName, n2.name as toName, type(r) as relType, 
                 r.confidence as confidence, r.context as context
          LIMIT 100
        `, {
          nodeNames: [...concepts.map(c => c.name), ...entities.map(e => e.name)]
        });

        relationships = relationshipResult.records.map(record => ({
          from: record.get('fromName'),
          to: record.get('toName'),
          type: record.get('relType'),
          confidence: record.get('confidence') || 0.5,
          context: record.get('context') || ''
        }));
      }

      return {
        documents,
        concepts,
        entities,
        relationships,
        paths: [] // Will implement path finding in future iterations
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Find documents related to a specific document through the knowledge graph
   */
  async findRelatedDocuments(
    documentId: string,
    options: {
      maxDepth?: number;
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<GraphDocument[]> {
    if (!this.driver) return [];

    const session = this.driver.session();
    
    try {
      const { limit = 10, minSimilarity = 0.3 } = options;

      const result = await session.run(`
        MATCH (d1:Document {id: $documentId})-[:CONTAINS]->(node)
        WHERE node:Concept OR node:Entity
        
        MATCH (node)<-[:CONTAINS]-(d2:Document)
        WHERE d1.id <> d2.id
        
        WITH d2, count(DISTINCT node) as sharedNodes
        WHERE sharedNodes >= $minSharedNodes
        
        RETURN d2, sharedNodes
        ORDER BY sharedNodes DESC
        LIMIT $limit
      `, {
        documentId,
        minSharedNodes: Math.max(1, Math.floor(minSimilarity * 10)),
        limit
      });

      return result.records.map(record => {
        const doc = record.get('d2');
        return {
          id: doc.properties.id,
          filename: doc.properties.filename,
          title: doc.properties.title,
          uploadedAt: new Date(doc.properties.uploadedAt),
          fileType: doc.properties.fileType,
          fileSize: doc.properties.fileSize.toNumber(),
          userId: doc.properties.userId,
          summary: doc.properties.summary
        };
      });

    } finally {
      await session.close();
    }
  }

  // Helper methods
  private generateConceptId(name: string): string {
    return `concept_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private generateEntityId(name: string, type: string): string {
    return `${type.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private generateTermId(value: string): string {
    return `term_${value.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private findNodeId(name: string, extraction: ExtractionResult): string | null {
    // Try to find in concepts
    const concept = extraction.concepts.find(c => c.name === name);
    if (concept) return this.generateConceptId(concept.name);

    // Try to find in entities
    const entity = extraction.entities.find(e => e.name === name);
    if (entity) return this.generateEntityId(entity.name, entity.type);

    // Try to find in terms
    const term = extraction.terms.find(t => t.value === name);
    if (term) return this.generateTermId(term.value);

    return null;
  }

  private async createCoOccurrenceRelationships(
    txc: any,
    documentId: string,
    extraction: ExtractionResult
  ): Promise<void> {
    // Create co-occurrence relationships between concepts that appear in the same document
    const allNodes = [
      ...extraction.concepts.map(c => ({ name: c.name, id: this.generateConceptId(c.name) })),
      ...extraction.entities.map(e => ({ name: e.name, id: this.generateEntityId(e.name, e.type) }))
    ];

    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const node1 = allNodes[i];
        const node2 = allNodes[j];
        
        if (node1?.id && node2?.id) {
          await txc.run(`
            MATCH (n1 {id: $id1})
            MATCH (n2 {id: $id2})
            MERGE (n1)-[r:CO_OCCURS]-(n2)
            ON CREATE SET r.frequency = 1, r.documents = [$docId]
            ON MATCH SET r.frequency = r.frequency + 1, 
                         r.documents = CASE WHEN $docId IN r.documents 
                                       THEN r.documents 
                                       ELSE r.documents + [$docId] END
          `, {
            id1: node1.id,
            id2: node2.id,
            docId: documentId
          });
        }
      }
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.driver) return false;

    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      console.error('Knowledge Graph health check failed:', error);
      return false;
    }
  }

  async getGraphStats(): Promise<{
    available: boolean;
    nodes: {
      documents: number;
      concepts: number;
      entities: number;
      terms: number;
    };
    relationships: {
      total: number;
      types: { [key: string]: number };
    };
    lastUpdated: string;
  }> {
    if (!this.driver) {
      return {
        available: false,
        nodes: { documents: 0, concepts: 0, entities: 0, terms: 0 },
        relationships: { total: 0, types: {} },
        lastUpdated: new Date().toISOString()
      };
    }

    const session = this.driver.session();
    try {
      // Debug: Check what labels exist first
      const labelsResult = await session.run('CALL db.labels()');
      console.log('Available labels in Neo4j:', labelsResult.records.map(r => r.get(0)));
      
      // Check total nodes
      const totalResult = await session.run('MATCH (n) RETURN count(n) as count');
      console.log('Total nodes in Neo4j:', totalResult.records[0]?.get('count').toNumber() || 0);
      
      // Simple queries to count each type
      const docResult = await session.run('MATCH (d:Document) RETURN count(d) as count');
      const conceptResult = await session.run('MATCH (c:Concept) RETURN count(c) as count');
      const entityResult = await session.run('MATCH (e:Entity) RETURN count(e) as count');
      const termResult = await session.run('MATCH (t:Term) RETURN count(t) as count');
      const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');

      return {
        available: true,
        nodes: {
          documents: docResult.records[0]?.get('count').toNumber() || 0,
          concepts: conceptResult.records[0]?.get('count').toNumber() || 0,
          entities: entityResult.records[0]?.get('count').toNumber() || 0,
          terms: termResult.records[0]?.get('count').toNumber() || 0
        },
        relationships: {
          total: relResult.records[0]?.get('count').toNumber() || 0,
          types: {}
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting graph stats:', error);
      return {
        available: true, // Neo4j is available, just query failed
        nodes: { documents: 0, concepts: 0, entities: 0, terms: 0 },
        relationships: { total: 0, types: {} },
        lastUpdated: new Date().toISOString()
      };
    } finally {
      await session.close();
    }
  }

  async getGraphVisualizationData(options: {
    limit?: number;
    includeRelationships?: boolean;
  } = {}): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      type: string;
      properties: any;
    }>;
    links: Array<{
      source: string;
      target: string;
      type: string;
      properties?: any;
    }>;
    debug?: any;
  }> {
    if (!this.driver) {
      return { nodes: [], links: [] };
    }

    const { limit = 100, includeRelationships = true } = options;
    const session = this.driver.session();
    
    try {
      // Use the exact same pattern as getGraphStats
      console.log(`🔍 Starting visualization query with limit: ${limit}`);
      
      // First test - just get counts like the stats method
      const docCountResult = await session.run('MATCH (d:Document) RETURN count(d) as count');
      const docCount = docCountResult.records[0]?.get('count').toNumber() || 0;
      console.log(`📄 Document count: ${docCount}`);
      
      // Now try to get the actual nodes
      const docResult = await session.run('MATCH (d:Document) RETURN d LIMIT $limit', { limit });
      console.log(`📄 Found ${docResult.records.length} document records`);
      
      const conceptResult = await session.run('MATCH (c:Concept) RETURN c LIMIT $limit', { limit });
      console.log(`💡 Found ${conceptResult.records.length} concepts`);
      
      const entityResult = await session.run('MATCH (e:Entity) RETURN e LIMIT $limit', { limit });
      console.log(`🏷️  Found ${entityResult.records.length} entities`);
      
      const termResult = await session.run('MATCH (t:Term) RETURN t LIMIT $limit', { limit });
      console.log(`📝 Found ${termResult.records.length} terms`);
      
      const nodes = [];
      
      // Process documents
      for (const record of docResult.records) {
        const node = record.get('d');
        
        if (node && node.properties) {
          // More flexible ID handling - use node identity if no id property
          const nodeId = node.properties.id || node.identity?.toString() || `doc_${Date.now()}_${Math.random()}`;
          const nodeName = node.properties.title || node.properties.filename || node.properties.name || `Document ${nodeId}`;
          
          console.log('📄 Processing document:', { id: nodeId, name: nodeName });
          
          nodes.push({
            id: nodeId,
            name: nodeName,
            type: 'document',
            properties: node.properties
          });
        }
      }
      
      // Process concepts  
      for (const record of conceptResult.records) {
        const node = record.get('c');
        
        if (node && node.properties) {
          // More flexible ID handling
          const nodeId = node.properties.id || node.identity?.toString() || `concept_${Date.now()}_${Math.random()}`;
          const nodeName = node.properties.name || node.properties.value || `Concept ${nodeId}`;
          
          nodes.push({
            id: nodeId,
            name: nodeName,
            type: 'concept',
            properties: node.properties
          });
        }
      }
      
      // Process entities
      for (const record of entityResult.records) {
        const node = record.get('e');
        if (node && node.properties) {
          const nodeId = node.properties.id || node.identity?.toString() || `entity_${Date.now()}_${Math.random()}`;
          const nodeName = node.properties.name || `Entity ${nodeId}`;
          
          nodes.push({
            id: nodeId,
            name: nodeName,
            type: 'entity',
            properties: node.properties
          });
        }
      }
      
      // Process terms
      for (const record of termResult.records) {
        const node = record.get('t');
        if (node && node.properties) {
          const nodeId = node.properties.id || node.identity?.toString() || `term_${Date.now()}_${Math.random()}`;
          const nodeName = node.properties.value || node.properties.name || `Term ${nodeId}`;
          
          nodes.push({
            id: nodeId,
            name: nodeName,
            type: 'term',
            properties: node.properties
          });
        }
      }
      
      console.log(`📊 Processed ${nodes.length} total nodes`);

      let links: Array<{
        source: string;
        target: string;
        type: string;
        properties?: any;
      }> = [];

      if (includeRelationships && nodes.length > 0) {
        // Get relationships between the nodes
        const nodeIds = nodes.map(n => n.id);
        const relationshipsResult = await session.run(`
          MATCH (a)-[r]->(b)
          WHERE a.id IN $nodeIds AND b.id IN $nodeIds
          RETURN a.id as sourceId, b.id as targetId, type(r) as relType, properties(r) as relProps
          LIMIT $relationshipLimit
        `, { 
          nodeIds,
          relationshipLimit: limit * 5
        });

        links = relationshipsResult.records.map(record => ({
          source: record.get('sourceId'),
          target: record.get('targetId'), 
          type: record.get('relType'),
          properties: record.get('relProps')
        }));
      }
      
      return { 
        nodes, 
        links,
        debug: {
          docCount,
          nodeCount: nodes.length,
          limitUsed: limit
        }
      };

    } catch (error) {
      console.error('Error getting graph visualization data:', error);
      return { nodes: [], links: [] };
    } finally {
      await session.close();
    }
  }

  async debugQuery(): Promise<any> {
    if (!this.driver) {
      return { error: 'Neo4j driver not available' };
    }

    const session = this.driver.session();
    
    try {
      // Get basic database info
      const totalResult = await session.run('MATCH (n) RETURN count(n) as totalNodes');
      const labelResult = await session.run('CALL db.labels()');
      const relTypeResult = await session.run('CALL db.relationshipTypes()');
      
      // Get sample nodes
      const sampleResult = await session.run(`
        MATCH (n) 
        RETURN n, labels(n) as nodeLabels, keys(n) as nodeKeys
        LIMIT 5
      `);
      
      const samples = sampleResult.records.map(record => ({
        labels: record.get('nodeLabels'),
        keys: record.get('nodeKeys'),
        properties: record.get('n').properties
      }));
      
      return {
        totalNodes: totalResult.records[0]?.get('totalNodes')?.toNumber() || 0,
        availableLabels: labelResult.records.map(r => r.get(0)),
        relationshipTypes: relTypeResult.records.map(r => r.get(0)),
        sampleNodes: samples
      };
      
    } finally {
      await session.close();
    }
  }
}

// Export singleton instance
export const knowledgeGraphService = new KnowledgeGraphService();