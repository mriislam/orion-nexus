#!/usr/bin/env python3
"""
Migration script to move existing GCP resources from the unified gcp_resources collection
to service-specific collections.

This script:
1. Reads all resources from the old gcp_resources collection
2. Groups them by service_type
3. Moves them to the appropriate service-specific collections
4. Optionally removes the old collection after successful migration

Usage:
    python scripts/migrate_gcp_resources.py [--dry-run] [--remove-old]
"""

import asyncio
import argparse
import logging
from typing import Dict, List, Any
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_database, init_db
from core.gcp_collections import get_service_collection, GCP_SERVICE_COLLECTIONS
from models.gcp import GCPServiceType

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GCPResourceMigrator:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.db = None
        self.migration_stats = {
            'total_resources': 0,
            'migrated_resources': 0,
            'failed_resources': 0,
            'service_breakdown': {}
        }
    
    async def connect_db(self):
        """Initialize database connection"""
        await init_db()
        self.db = await get_database()
        logger.info("Connected to database")
    
    async def get_existing_resources(self) -> List[Dict[str, Any]]:
        """Fetch all resources from the old gcp_resources collection"""
        try:
            old_collection = self.db.gcp_resources
            cursor = old_collection.find({})
            resources = await cursor.to_list(length=None)
            
            self.migration_stats['total_resources'] = len(resources)
            logger.info(f"Found {len(resources)} resources in gcp_resources collection")
            
            return resources
        except Exception as e:
            logger.error(f"Failed to fetch existing resources: {e}")
            return []
    
    async def group_resources_by_service(self, resources: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group resources by their service_type"""
        grouped = {}
        
        for resource in resources:
            service_type = resource.get('service_type')
            if not service_type:
                logger.warning(f"Resource {resource.get('resource_id', 'unknown')} has no service_type, skipping")
                continue
            
            if service_type not in grouped:
                grouped[service_type] = []
            
            grouped[service_type].append(resource)
        
        # Log breakdown
        for service_type, service_resources in grouped.items():
            count = len(service_resources)
            self.migration_stats['service_breakdown'][service_type] = count
            logger.info(f"Found {count} resources for service type: {service_type}")
        
        return grouped
    
    async def migrate_service_resources(self, service_type: str, resources: List[Dict[str, Any]]) -> bool:
        """Migrate resources for a specific service type"""
        try:
            # Map string service type to enum
            service_type_enum = None
            for enum_val in GCPServiceType:
                if enum_val.value == service_type:
                    service_type_enum = enum_val
                    break
            
            if not service_type_enum:
                logger.warning(f"Unknown service type: {service_type}, skipping")
                return False
            
            # Get target collection
            target_collection = get_service_collection(self.db, service_type_enum)
            
            if self.dry_run:
                logger.info(f"[DRY RUN] Would migrate {len(resources)} resources to {target_collection.name}")
                return True
            
            # Prepare resources for insertion (remove service_type field as it's implicit in collection name)
            prepared_resources = []
            for resource in resources:
                # Create a copy and remove service_type field
                resource_copy = resource.copy()
                resource_copy.pop('service_type', None)
                
                # Add migration timestamp
                resource_copy['migrated_at'] = datetime.utcnow()
                
                prepared_resources.append(resource_copy)
            
            # Insert resources into target collection
            if prepared_resources:
                result = await target_collection.insert_many(prepared_resources, ordered=False)
                logger.info(f"Successfully migrated {len(result.inserted_ids)} resources to {target_collection.name}")
                self.migration_stats['migrated_resources'] += len(result.inserted_ids)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to migrate resources for service type {service_type}: {e}")
            self.migration_stats['failed_resources'] += len(resources)
            return False
    
    async def remove_old_collection(self):
        """Remove the old gcp_resources collection after successful migration"""
        try:
            if self.dry_run:
                logger.info("[DRY RUN] Would remove old gcp_resources collection")
                return
            
            await self.db.gcp_resources.drop()
            logger.info("Successfully removed old gcp_resources collection")
            
        except Exception as e:
            logger.error(f"Failed to remove old collection: {e}")
    
    async def run_migration(self, remove_old: bool = False):
        """Run the complete migration process"""
        logger.info(f"Starting GCP resources migration (dry_run={self.dry_run})")
        
        try:
            # Connect to database
            await self.connect_db()
            
            # Get existing resources
            resources = await self.get_existing_resources()
            if not resources:
                logger.info("No resources found to migrate")
                return
            
            # Group by service type
            grouped_resources = await self.group_resources_by_service(resources)
            
            # Migrate each service type
            migration_success = True
            for service_type, service_resources in grouped_resources.items():
                success = await self.migrate_service_resources(service_type, service_resources)
                if not success:
                    migration_success = False
            
            # Print migration statistics
            self.print_migration_stats()
            
            # Remove old collection if requested and migration was successful
            if remove_old and migration_success and not self.dry_run:
                if self.migration_stats['failed_resources'] == 0:
                    await self.remove_old_collection()
                else:
                    logger.warning("Not removing old collection due to failed migrations")
            
            logger.info("Migration completed")
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
    
    def print_migration_stats(self):
        """Print migration statistics"""
        logger.info("=== Migration Statistics ===")
        logger.info(f"Total resources: {self.migration_stats['total_resources']}")
        logger.info(f"Successfully migrated: {self.migration_stats['migrated_resources']}")
        logger.info(f"Failed migrations: {self.migration_stats['failed_resources']}")
        
        logger.info("\nService breakdown:")
        for service_type, count in self.migration_stats['service_breakdown'].items():
            logger.info(f"  {service_type}: {count} resources")

async def main():
    parser = argparse.ArgumentParser(description='Migrate GCP resources to service-specific collections')
    parser.add_argument('--dry-run', action='store_true', help='Run migration in dry-run mode (no actual changes)')
    parser.add_argument('--remove-old', action='store_true', help='Remove old gcp_resources collection after successful migration')
    
    args = parser.parse_args()
    
    migrator = GCPResourceMigrator(dry_run=args.dry_run)
    await migrator.run_migration(remove_old=args.remove_old)

if __name__ == "__main__":
    asyncio.run(main())