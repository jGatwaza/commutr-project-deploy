# Commutr Database Migration Plan

## Executive Summary

This document outlines the complete plan for migrating Commutr from JSON file-based storage to MongoDB. The migration will enable scalability, better performance, and support for future features.

---

## Current State Analysis

### Authentication (No Changes)
**Firebase Auth remains the sole authentication system:**
- ✅ Google OAuth via Firebase Authentication
- ✅ Frontend uses Firebase SDK (`client/context/AuthContext.jsx`)
- ✅ Backend verifies Firebase ID tokens
- ✅ No authentication data migrated to MongoDB
- ✅ `firebaseUid` is the primary user identifier

### Existing Data Storage
- **Location**: `data/` directory with JSON files
- **Files**:
  - `sessions.json` - Playlist/session metadata
  - `watched.json` - Video watch history
  - `commute-history.json` - Commute session data
- **Issues**:
  - ❌ Not scalable (single file reads/writes)
  - ❌ No concurrent access support
  - ❌ No query optimization
  - ❌ No backup/recovery strategy
  - ❌ File corruption risk
  - ❌ Limited analytics capabilities

### Data Volume (Current)
- Sessions: ~10 records
- Watch History: ~350 video entries
- Commute History: ~6 sessions per user
- Users: Unknown (using Firebase Auth only)

### Code Dependencies
**Files that access JSON storage:**
- `src/history/store.ts` - Session storage
- `src/history/watchHistory.ts` - Watch history
- `src/history/commuteHistory.ts` - Commute sessions
- `src/achievements/service.ts` - Achievement calculations (reads from above)
- `src/web/agent.ts` - Agent endpoint (reads watch history)
- `src/web/playlist.ts` - Playlist endpoints

---

## Proposed Solution: MongoDB

### Why MongoDB?

1. **Document-Oriented**: Perfect match for JSON-like data structures
2. **Flexible Schema**: Easy to evolve as features grow
3. **Scalable**: Handles millions of documents efficiently
4. **Rich Queries**: Powerful aggregation pipeline for analytics
5. **Atlas Free Tier**: 512MB free hosting with MongoDB Atlas
6. **Community Support**: Large ecosystem and documentation
7. **TypeScript Integration**: Excellent TypeScript support

### Database Structure

**7 Collections** (see `DATABASE_SCHEMA.md` for details):
1. `users` - User preferences and metadata **(NOT authentication)**
2. `playlists` - Generated playlists with videos
3. `watch_history` - Individual video watches
4. `commute_sessions` - Complete commute sessions
5. `mastery` - Topic mastery tracking
6. `achievements` - Badge progress
7. `sessions` - Legacy session data (optional)

**Important Notes:**
- **Authentication stays 100% on Firebase** (Google Auth only)
- Agent conversations remain in client-side Redux state only
- Users created in MongoDB on first app usage (after Firebase auth)

---

## Migration Timeline

### Week 1: Planning & Setup
**Duration**: 3-5 days

- [x] **Day 1**: Design database schema
- [x] **Day 2**: Create documentation and ERD
- [x] **Day 3**: Write implementation guide
- [ ] **Day 4**: Review and approve schema with team
- [ ] **Day 5**: Set up MongoDB Atlas account or local MongoDB

**Deliverables**:
- ✅ `DATABASE_SCHEMA.md`
- ✅ `DATABASE_RELATIONSHIPS.md`
- ✅ `MONGODB_IMPLEMENTATION.md`
- ⏳ MongoDB environment ready

---

### Week 2: Development
**Duration**: 5-7 days

#### Day 1-2: Foundation
- [ ] Install MongoDB dependencies (`mongodb` npm package)
- [ ] Create database connection module (`src/db/connection.ts`)
- [ ] Set up environment variables (`.env`)
- [ ] Create TypeScript type definitions (`src/db/types.ts`)
- [ ] Write index creation script
- [ ] Test connection locally

**Acceptance Criteria**:
- MongoDB connection successful
- Indexes created automatically on startup
- Health check endpoint working
- Firebase Auth integration unchanged

#### Day 3-4: Service Layer
- [ ] Implement `userService.ts` (create, read, update users)
- [ ] Implement `playlistService.ts` (CRUD operations)
- [ ] Implement `watchHistoryService.ts` (upsert, list, get watched IDs)
- [ ] Implement `commuteSessionService.ts` (save, list, get)
- [ ] Implement `masteryService.ts` (track topic mastery)
- [ ] Implement `achievementService.ts` (calculate and update badges)
- [ ] Write unit tests for each service

**Acceptance Criteria**:
- All services pass unit tests
- Type safety enforced
- Error handling implemented

#### Day 5: Migration Script
- [ ] Write data migration script (`scripts/migrateToMongoDB.ts`)
- [ ] Test migration with development data
- [ ] Verify data integrity after migration
- [ ] Document rollback procedures

**Acceptance Criteria**:
- Migration script successfully transfers all JSON data
- No data loss or corruption
- IDs maintained for backward compatibility

#### Day 6-7: API Integration
- [ ] Update playlist endpoints to use MongoDB
- [ ] Update watch history endpoints
- [ ] Update commute session endpoints
- [ ] Update achievement endpoints
- [ ] Update agent endpoints
- [ ] Add database health check endpoint

**Acceptance Criteria**:
- All API endpoints work with MongoDB
- Response format matches existing API
- Performance meets or exceeds JSON file approach
- Firebase Auth flow remains unchanged
- Users auto-created in MongoDB on first use

---

### Week 3: Testing & Deployment
**Duration**: 5-7 days

#### Day 1-2: Integration Testing
- [ ] Test playlist creation flow
- [ ] Test video watch recording
- [ ] Test commute session tracking
- [ ] Test achievement calculation
- [ ] Test agent mode with conversation persistence
- [ ] Test sharing features (share tokens)
- [ ] Load testing with concurrent users

**Acceptance Criteria**:
- All features work end-to-end
- No regression in existing functionality
- Performance benchmarks met

#### Day 3: User Acceptance Testing
- [ ] Deploy to staging environment
- [ ] Manual testing of all features
- [ ] Test with real Firebase users
- [ ] Verify data privacy and security
- [ ] Test backup and restore procedures

**Acceptance Criteria**:
- Staging environment stable
- User experience unchanged
- No data leaks or security issues

#### Day 4-5: Production Deployment
- [ ] Create production MongoDB database
- [ ] Run migration script in production
- [ ] Deploy updated backend code
- [ ] Monitor error logs and metrics
- [ ] Verify all users can access their data

**Acceptance Criteria**:
- Zero downtime deployment
- No user-facing errors
- All historical data accessible

#### Day 6-7: Monitoring & Optimization
- [ ] Monitor query performance
- [ ] Optimize slow queries
- [ ] Set up database alerts (Atlas monitoring)
- [ ] Document operational procedures
- [ ] Create runbooks for common issues

**Acceptance Criteria**:
- Query latency < 100ms for 95th percentile
- Zero database errors
- Monitoring dashboards operational

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data loss during migration** | Critical | - Run migration on backup data first<br>- Keep JSON files as backup for 30 days<br>- Test rollback procedures |
| **Production downtime** | High | - Use blue-green deployment<br>- Deploy during low-traffic hours<br>- Have rollback plan ready |
| **Performance degradation** | High | - Load test before production<br>- Optimize indexes<br>- Use connection pooling |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Schema changes needed post-launch** | Medium | - Use flexible schema design<br>- Version schema if needed<br>- Plan for data migrations |
| **MongoDB costs exceed budget** | Medium | - Start with Atlas free tier<br>- Monitor usage closely<br>- Optimize queries to reduce reads |
| **Learning curve for team** | Medium | - Provide training and documentation<br>- Pair programming sessions<br>- Code reviews |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Backward compatibility issues** | Low | - Maintain same API response format<br>- Keep legacy IDs (playlistId, watchId) |
| **Testing gaps** | Low | - Comprehensive test coverage<br>- Manual testing checklist |

---

## Rollback Plan

If critical issues occur during/after migration:

### Immediate Rollback (< 1 hour)
1. **Redeploy previous version** of backend code
2. **Switch reads back to JSON files**
3. **Investigate issue** without user impact
4. **Fix and redeploy** when ready

### Data Rollback (if data corruption)
1. **Stop all writes** to MongoDB
2. **Restore JSON files** from backup
3. **Verify data integrity**
4. **Redeploy old code**
5. **Investigate root cause**

### Partial Rollback (feature flag)
- Use environment variable to switch between MongoDB and JSON
- Roll back specific features while keeping others on MongoDB
- Example:
  ```javascript
  const USE_MONGODB = process.env.USE_MONGODB === 'true';
  
  if (USE_MONGODB) {
    return await getPlaylistFromMongoDB(id);
  } else {
    return await getPlaylistFromJSON(id);
  }
  ```

---

## Success Metrics

### Performance Metrics
- [ ] Average query latency < 50ms
- [ ] 95th percentile latency < 100ms
- [ ] 99th percentile latency < 200ms
- [ ] Zero database timeouts
- [ ] Database uptime > 99.9%

### Functional Metrics
- [ ] 100% feature parity with JSON files
- [ ] Zero data loss during migration
- [ ] All existing users can access their data
- [ ] New features enabled (user preferences, advanced analytics)

### Operational Metrics
- [ ] Automated backups configured
- [ ] Monitoring alerts set up
- [ ] Documentation complete
- [ ] Team trained on MongoDB operations

---

## Post-Migration Enhancements

Once MongoDB is stable in production, we can add:

### Immediate Benefits (Week 4)
- ✅ **Scalable Data Storage**: Production-ready database
- ✅ **User Preferences**: Save default commute duration, topics
- ✅ **Playlist History**: Show all playlists created by user
- ✅ **Advanced Search**: Search playlists by topic, date, duration
- ✅ **Firebase Auth**: Continues working exactly as before

### Future Enhancements (Post-Migration)
- 📊 **Analytics Dashboard**: Visualize learning patterns
- 📈 **Advanced Topic Mastery**: Detailed progress tracking
- 🎯 **Personalized Recommendations**: Suggest videos based on history
- 🔄 **Multi-device Sync**: Continue learning across devices

---

## Budget Considerations

### MongoDB Atlas Free Tier
- **Storage**: 512MB (sufficient for ~10,000 users)
- **Bandwidth**: Shared
- **Backups**: Daily backups included
- **Cost**: $0/month

### Estimated Growth
- **Average user data**: ~50KB (playlists + history)
- **Capacity**: 10,000 users on free tier
- **When to upgrade**: > 8,000 users or 400MB used

### Paid Tier (if needed)
- **M2 Cluster**: 2GB storage, 8GB RAM
- **Cost**: ~$9/month
- **Capacity**: ~40,000 users

---

## Team Responsibilities

### Backend Developer
- Implement MongoDB service layer
- Write migration scripts
- Update API endpoints (data only, not auth)
- Ensure Firebase Auth integration remains unchanged
- Write unit tests

### Frontend Developer
- Verify API response compatibility
- Test all user flows
- Report any issues

### DevOps/Infrastructure
- Set up MongoDB Atlas account
- Configure database users and access control
- Set up monitoring and alerts
- Plan deployment strategy

### QA/Testing
- Create test plan
- Execute integration tests
- Perform load testing
- Sign off on production readiness

---

## Documentation Deliverables

- [x] **DATABASE_SCHEMA.md** - Complete schema design
- [x] **DATABASE_RELATIONSHIPS.md** - ERD and relationship docs
- [x] **MONGODB_IMPLEMENTATION.md** - Code implementation guide
- [x] **DATABASE_MIGRATION_PLAN.md** - This document
- [ ] **RUNBOOK.md** - Operational procedures
- [ ] **API_DOCUMENTATION.md** - Updated API docs with MongoDB
- [ ] **TRAINING_GUIDE.md** - Team training materials

---

## Questions to Answer Before Starting

1. **MongoDB Hosting**: Atlas cloud or self-hosted?
   - **Recommendation**: Start with Atlas free tier

2. **User ID Strategy**: Create users in MongoDB or rely on Firebase Auth?
   - **Recommendation**: Sync Firebase users to MongoDB on first login

3. **Data Retention**: How long to keep watch history and sessions?
   - **Recommendation**: Unlimited for now, implement TTL later

4. **Backup Strategy**: Daily, weekly, or real-time replication?
   - **Recommendation**: Daily backups with 30-day retention

5. **Migration Window**: When to run production migration?
   - **Recommendation**: Weekend during low-traffic hours

6. **Feature Flags**: Use feature flags for gradual rollout?
   - **Recommendation**: Yes, environment variable to toggle MongoDB

7. **Monitoring**: What metrics to track?
   - **Recommendation**: Query latency, error rate, connection pool usage

---

## Getting Started

### Immediate Next Steps

1. **Review and approve** this migration plan
2. **Set up MongoDB Atlas** free tier account
3. **Create `.env` file** with MongoDB URI
4. **Run connection test**: `npx tsx src/db/connection.ts`
5. **Begin Week 2 development** tasks

### Commands to Run

```bash
# Install dependencies
npm install mongodb

# Set up environment
cp .env.example .env
# Edit .env and add MONGODB_URI

# Test connection
npx tsx -e "import { connectToDatabase } from './src/db/connection.js'; await connectToDatabase(); console.log('✅ Connected!');"

# Create indexes
npm run db:setup

# Run migration (development)
npm run migrate

# Run tests
npm test -- --grep="MongoDB"

# Start server with MongoDB
npm run dev
```

---

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning Commutr from JSON files to MongoDB. The plan emphasizes:

- **Safety**: Multiple safeguards against data loss
- **Testing**: Thorough testing at every stage
- **Rollback**: Clear procedures if issues arise
- **Scalability**: Foundation for future growth
- **Documentation**: Complete guides for implementation

**Estimated Total Time**: 2-3 weeks
**Risk Level**: Medium (with proper execution)
**ROI**: High (enables future features and scales to thousands of users)

---

**Ready to proceed?** Review the schema proposal in `DATABASE_SCHEMA.md` and let's discuss any questions or concerns before starting development.

---

*Document prepared by AI Senior Data Architect | Last updated: 2025-11-30*
