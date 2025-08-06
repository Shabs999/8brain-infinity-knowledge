import fs from 'fs';
import path from 'path';
import { DocumentMetadataService } from '../services/DocumentMetadataService';

const uploadsDir = path.join(__dirname, '../../uploads');

// Migration script to populate metadata for existing documents
export function migrateExistingDocuments() {
  console.log('🔄 Starting document metadata migration...');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Uploads directory does not exist');
    return;
  }

  const files = fs.readdirSync(uploadsDir).filter(file => 
    file !== 'metadata.json' && !file.startsWith('.')
  );
  
  let migratedCount = 0;
  
  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    
    // Skip if metadata already exists
    if (DocumentMetadataService.get(filename)) {
      console.log(`⏭️  Metadata already exists for ${filename}`);
      continue;
    }
    
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      // Since we don't have the original filename, use a cleaned version of the UUID filename
      // Remove the UUID part and try to create a readable name
      let originalName = filename;
      
      // Try to guess original name - this is just for existing files
      // For PDFs, create a generic name based on file size and date
      if (ext === '.pdf') {
        const sizeMB = Math.round(stats.size / (1024 * 1024));
        const uploadDate = stats.birthtime.toISOString().split('T')[0];
        originalName = `Document_${sizeMB}MB_${uploadDate}.pdf`;
      } else if (ext === '.txt') {
        const uploadDate = stats.birthtime.toISOString().split('T')[0];
        originalName = `TextDocument_${uploadDate}.txt`;
      }
      
      const metadata = {
        id: filename.split('.')[0] || filename, // Use filename without extension as ID, fallback to full filename
        originalName,
        filename,
        mimetype: getMimeType(ext),
        size: stats.size,
        uploadedAt: stats.birthtime.toISOString(),
        status: 'processed' as const
      };
      
      DocumentMetadataService.store(metadata);
      migratedCount++;
      console.log(`✅ Migrated: ${filename} -> ${originalName}`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${filename}:`, error);
    }
  }
  
  console.log(`🎉 Migration complete! Migrated ${migratedCount} documents.`);
}

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.pdf': return 'application/pdf';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt': return 'text/plain';
    case '.md': return 'text/markdown';
    default: return 'application/octet-stream';
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateExistingDocuments();
}