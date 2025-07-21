# Sandwich Totals Calculation Fix

## Problem Summary

The application was displaying **1,118,317 total sandwiches** instead of the expected **2+ million sandwiches**. Analysis revealed multiple issues:

1. **Group collection parsing bug**: API only handled `group.sandwichCount` but newer records use `group.count`
2. **Database completeness**: Only 1,801 records showing vs expected complete dataset
3. **Inconsistent calculation logic**: Different components handled group data differently

## Root Cause Analysis

### Expected vs Actual Totals
- **Expected total (from backup)**: 2,183,360 sandwiches
  - Individual sandwiches: 1,820,447
  - Group sandwiches (sandwichCount): 351,703
  - Group sandwiches (count): 11,210
- **Current total**: 1,118,317 sandwiches
- **Missing**: 1,065,043 sandwiches (~49% of data)

### Data Format Issues
The system has two different JSON formats for group collections:
```json
// Older format
[{"groupName": "Team A", "sandwichCount": 100}]

// Newer format  
[{"name": "Team B", "count": 150}]
```

## Fixes Applied

### 1. Server-Side API Fix
**File**: `server/routes.ts`
- Fixed `/api/sandwich-collections/stats` endpoint to handle both `sandwichCount` and `count` properties
- Added cache refresh parameter (`?refresh=true`)
- Added debug information to API response

### 2. Client-Side Component Fixes
Updated calculation logic in multiple components to handle all format variations:

**Files Updated**:
- `client/src/pages/impact-dashboard.tsx` (2 locations)
- `client/src/pages/landing.tsx` (1 location)
- `client/src/components/analytics-dashboard.tsx` (2 locations)
- `client/src/components/strategic-analytics.tsx` (2 locations)
- `client/src/components/sandwich-collection-log.tsx` (2 locations)

**Change Pattern**:
```javascript
// Before
group.sandwichCount || group.sandwich_count || 0

// After  
group.sandwichCount || group.sandwich_count || group.count || 0
```

### 3. Debug Tools Created
**Files Created**:
- `scripts/debug-sandwich-totals.js` - Analyzes current calculation accuracy
- `scripts/import-missing-collections.js` - Identifies missing database records
- `client/src/components/debug-panel.tsx` - Frontend debug interface

**Package.json Scripts Added**:
```json
{
  "debug:sandwich-totals": "node scripts/debug-sandwich-totals.js",
  "analyze:missing-collections": "node scripts/import-missing-collections.js"
}
```

## Testing the Fix

### 1. Test API Endpoint
```bash
# Test cached stats
curl http://localhost:5000/api/sandwich-collections/stats

# Force refresh cache
curl http://localhost:5000/api/sandwich-collections/stats?refresh=true
```

### 2. Run Debug Scripts
```bash
# Analyze current calculation accuracy
npm run debug:sandwich-totals

# Check for missing database records
npm run analyze:missing-collections
```

### 3. Use Debug Panel
Add the debug panel to any React component:
```jsx
import { DebugPanel } from '@/components/debug-panel';

// In your component
<DebugPanel />
```

## Expected Results After Fix

### Immediate Improvements
- Group collections using `count` property will now be included (+11,210 sandwiches)
- All calculation components will use consistent logic
- Cache can be refreshed to get latest data

### Remaining Issues to Address
- **Database completeness**: If database is missing records from backup, total may still be low
- **Data sync**: Ensure ongoing data capture includes all records

## Verification Checklist

- [ ] Landing page shows updated totals
- [ ] Dashboard shows updated totals  
- [ ] Collections log shows updated totals
- [ ] Impact dashboard shows updated totals
- [ ] Analytics components show updated totals
- [ ] Cache refresh works (`?refresh=true`)
- [ ] Debug scripts run successfully
- [ ] All 1,801 records are being processed

## Next Steps

1. **Deploy the fixes** to your environment
2. **Test the API endpoint** with cache refresh
3. **Run the debug scripts** to verify calculations
4. **Check database completeness** if totals are still low
5. **Verify data sync process** to prevent future discrepancies

## Technical Notes

### Cache Invalidation
- Stats are cached for 60 seconds by default
- Cache is automatically invalidated when new collections are created/updated/deleted
- Manual refresh available via `?refresh=true` parameter

### Performance Impact
- Minimal performance impact from the fixes
- Caching ensures API remains fast
- Debug tools can be removed in production if desired

### Backward Compatibility
- All fixes maintain backward compatibility
- Existing data formats continue to work
- No database schema changes required

## Contact

If you encounter issues with these fixes, check:
1. Browser cache (hard refresh)
2. API cache (use `?refresh=true`)
3. Database connectivity
4. Recent data synchronization

The debug tools provided will help identify remaining issues quickly.