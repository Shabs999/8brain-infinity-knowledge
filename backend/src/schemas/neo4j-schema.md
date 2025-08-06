# Neo4j Knowledge Graph Schema for 8Brain

## Node Types

### 1. Document
Represents an uploaded document in the system.
```cypher
(:Document {
  id: String,           // UUID from file system
  filename: String,     // Original filename
  title: String,        // Extracted or inferred title
  uploadedAt: DateTime,
  fileType: String,     // pdf, docx, txt, md
  fileSize: Integer,
  userId: String,
  summary: String,      // AI-generated summary
  embedding: List<Float> // Vector embedding for similarity
})
```

### 2. Concept
High-level concepts or topics extracted from documents.
```cypher
(:Concept {
  id: String,
  name: String,         // e.g., "Machine Learning", "Graph Theory"
  description: String,
  category: String,     // e.g., "Technology", "Science", "Business"
  importance: Float,    // 0.0 to 1.0
  firstSeen: DateTime,
  lastUpdated: DateTime,
  embedding: List<Float>
})
```

### 3. Entity
Named entities extracted from documents.
```cypher
(:Entity {
  id: String,
  name: String,
  type: String,         // PERSON, ORGANIZATION, LOCATION, DATE, PRODUCT
  aliases: List<String>,
  description: String,
  metadata: Map         // Additional properties based on type
})
```

### 4. Term
Technical terms, keywords, or domain-specific vocabulary.
```cypher
(:Term {
  id: String,
  value: String,
  definition: String,
  domain: String,       // Field or domain of the term
  frequency: Integer,   // Global frequency across all documents
  tfidf: Float         // Term frequency-inverse document frequency
})
```

### 5. Chunk
Document chunks for granular analysis.
```cypher
(:Chunk {
  id: String,
  documentId: String,
  text: String,
  position: Integer,    // Position in document
  embedding: List<Float>,
  tokens: Integer
})
```

## Relationship Types

### 1. CONTAINS
Document contains entities, concepts, or terms.
```cypher
(:Document)-[:CONTAINS {
  frequency: Integer,
  positions: List<Integer>,
  confidence: Float
}]->(:Entity|:Concept|:Term)
```

### 2. MENTIONS
One entity mentions or references another.
```cypher
(:Entity)-[:MENTIONS {
  context: String,
  sentiment: Float,    // -1.0 to 1.0
  strength: Float      // 0.0 to 1.0
}]->(:Entity)
```

### 3. RELATES_TO
Concepts are related to each other.
```cypher
(:Concept)-[:RELATES_TO {
  type: String,        // "prerequisite", "similar", "opposite", "broader", "narrower"
  strength: Float,     // 0.0 to 1.0
  bidirectional: Boolean
}]->(:Concept)
```

### 4. CO_OCCURS
Entities or concepts appear together in documents.
```cypher
(:Entity|:Concept)-[:CO_OCCURS {
  frequency: Integer,
  documents: List<String>,  // Document IDs where they co-occur
  avgDistance: Float        // Average token distance
}]->(:Entity|:Concept)
```

### 5. DEFINED_BY
Terms are defined by their relationships to concepts.
```cypher
(:Term)-[:DEFINED_BY {
  source: String,
  confidence: Float
}]->(:Concept)
```

### 6. AUTHORED_BY
Documents authored by entities (if extractable).
```cypher
(:Document)-[:AUTHORED_BY {
  role: String,        // "author", "editor", "contributor"
  extractedFrom: String // Where this info was found
}]->(:Entity)
```

### 7. REFERENCES
Documents reference other documents.
```cypher
(:Document)-[:REFERENCES {
  type: String,        // "citation", "link", "mention"
  context: String
}]->(:Document)
```

### 8. HAS_CHUNK
Document has chunks.
```cypher
(:Document)-[:HAS_CHUNK {
  position: Integer
}]->(:Chunk)
```

### 9. SIMILAR_TO
Similarity relationships based on embeddings.
```cypher
(:Document|:Concept)-[:SIMILAR_TO {
  similarity: Float,    // Cosine similarity score
  method: String       // "embedding", "content", "structure"
}]->(:Document|:Concept)
```

## Indexes and Constraints

```cypher
// Unique constraints
CREATE CONSTRAINT ON (d:Document) ASSERT d.id IS UNIQUE;
CREATE CONSTRAINT ON (c:Concept) ASSERT c.id IS UNIQUE;
CREATE CONSTRAINT ON (e:Entity) ASSERT e.id IS UNIQUE;
CREATE CONSTRAINT ON (t:Term) ASSERT t.id IS UNIQUE;
CREATE CONSTRAINT ON (ch:Chunk) ASSERT ch.id IS UNIQUE;

// Indexes for performance
CREATE INDEX ON :Document(userId);
CREATE INDEX ON :Document(uploadedAt);
CREATE INDEX ON :Concept(name);
CREATE INDEX ON :Concept(category);
CREATE INDEX ON :Entity(name);
CREATE INDEX ON :Entity(type);
CREATE INDEX ON :Term(value);
CREATE INDEX ON :Term(domain);

// Full-text search indexes
CALL db.index.fulltext.createNodeIndex("documentSearch", ["Document"], ["title", "summary"]);
CALL db.index.fulltext.createNodeIndex("conceptSearch", ["Concept"], ["name", "description"]);
CALL db.index.fulltext.createNodeIndex("entitySearch", ["Entity"], ["name", "aliases"]);
```

## Query Examples

### 1. Find related concepts across documents
```cypher
MATCH (d:Document {id: $docId})-[:CONTAINS]->(c1:Concept)
MATCH (c1)-[:RELATES_TO*1..2]-(c2:Concept)
MATCH (c2)<-[:CONTAINS]-(d2:Document)
WHERE d.id <> d2.id
RETURN DISTINCT d2, c2, COUNT(*) as connections
ORDER BY connections DESC
```

### 2. Discover entity networks
```cypher
MATCH (e1:Entity {name: $entityName})
MATCH path = (e1)-[:MENTIONS|:CO_OCCURS*1..3]-(e2:Entity)
WHERE e1 <> e2
RETURN path
```

### 3. Find documents by concept similarity
```cypher
MATCH (d1:Document {id: $docId})-[:CONTAINS]->(c:Concept)
MATCH (c)-[:SIMILAR_TO]-(c2:Concept)<-[:CONTAINS]-(d2:Document)
WHERE d1 <> d2
WITH d2, COUNT(DISTINCT c2) as sharedConcepts
RETURN d2, sharedConcepts
ORDER BY sharedConcepts DESC
```

### 4. Knowledge graph traversal for context
```cypher
MATCH (c:Concept {name: $conceptName})
OPTIONAL MATCH (c)-[:RELATES_TO]-(related:Concept)
OPTIONAL MATCH (c)<-[:CONTAINS]-(d:Document)
OPTIONAL MATCH (c)<-[:DEFINED_BY]-(t:Term)
RETURN c, collect(DISTINCT related) as relatedConcepts, 
       collect(DISTINCT d) as documents,
       collect(DISTINCT t) as terms
```