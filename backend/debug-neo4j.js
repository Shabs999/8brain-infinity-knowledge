const neo4j = require('neo4j-driver');

async function debugNeo4j() {
  console.log('🔍 Debugging Neo4j database contents...');
  
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const username = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;
  
  if (!password) {
    console.error('❌ NEO4J_PASSWORD not found in environment');
    return;
  }
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();
  
  try {
    console.log('🔗 Connected to Neo4j');
    
    // Check available labels
    const labelsResult = await session.run('CALL db.labels()');
    const labels = labelsResult.records.map(r => r.get(0));
    console.log('📋 Available labels:', labels);
    
    // Count total nodes
    const totalResult = await session.run('MATCH (n) RETURN count(n) as count');
    const totalCount = totalResult.records[0]?.get('count').toNumber() || 0;
    console.log('📊 Total nodes:', totalCount);
    
    // Sample each label type
    for (const label of labels) {
      if (['Document', 'Concept', 'Entity', 'Term'].includes(label)) {
        const sampleQuery = `MATCH (n:${label}) RETURN n LIMIT 3`;
        const sampleResult = await session.run(sampleQuery);
        console.log(`\n🏷️  Label: ${label} (${sampleResult.records.length} samples)`);
        
        for (const record of sampleResult.records) {
          const node = record.get('n');
          console.log('   Node:', {
            identity: node.identity.toString(),
            labels: node.labels,
            properties: Object.keys(node.properties || {}),
            sampleProps: node.properties
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Neo4j debug error:', error);
  } finally {
    await session.close();
    await driver.close();
    console.log('✅ Neo4j connection closed');
  }
}

// Load environment from .env file
require('dotenv').config();
debugNeo4j();