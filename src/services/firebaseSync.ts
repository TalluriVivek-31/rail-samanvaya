// src/services/firebaseSync.ts
// Realtime bidirectional sync manager between Rail Samnvay store and Firebase Realtime Database

import { rtdb, ref, set, get, onValue } from './firebase';
import { getSamnvayState, setSamnvayState, subscribeSamnvayState, type SamnvayState } from '../store/useSamnvayStore';

let isApplyingRemoteUpdate = false;
let isInitialized = false;
let syncStatusListener: ((status: 'connected' | 'connecting' | 'permission_denied' | 'offline' | 'error', detail?: string) => void) | null = null;

export function onFirebaseSyncStatus(callback: (status: 'connected' | 'connecting' | 'permission_denied' | 'offline' | 'error', detail?: string) => void) {
  syncStatusListener = callback;
}

export function initFirebaseSync() {
  if (isInitialized) return;
  isInitialized = true;

  if (syncStatusListener) syncStatusListener('connecting');

  // Monitor Firebase connection status
  const connectedRef = ref(rtdb, '.info/connected');
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log('⚡ Firebase RTDB: Connected to server.');
    } else {
      console.log('⚡ Firebase RTDB: Disconnected / Offline.');
    }
  });

  // Listen to remote changes on the 'samnvay' node
  const samnvayRootRef = ref(rtdb, 'samnvay');

  onValue(
    samnvayRootRef,
    (snapshot) => {
      const remoteData = snapshot.val();
      if (!remoteData) {
        // First-time setup: Push local initial data to Firebase so cloud database is populated
        console.log('⚡ Firebase RTDB: Empty database detected, seeding initial state...');
        pushLocalStateToFirebase(getSamnvayState());
        if (syncStatusListener) syncStatusListener('connected');
        return;
      }

      // Received remote updates from Firebase
      try {
        isApplyingRemoteUpdate = true;
        setSamnvayState((prevState: SamnvayState) => {
          return {
            ...prevState,
            ...(remoteData.requests ? { requests: remoteData.requests } : {}),
            ...(remoteData.blockPlans ? { blockPlans: remoteData.blockPlans } : {}),
            ...(remoteData.liveConflicts ? { liveConflicts: remoteData.liveConflicts } : {}),
            ...(remoteData.conversations ? { conversations: remoteData.conversations } : {}),
            ...(remoteData.auditLogs ? { auditLogs: remoteData.auditLogs } : {}),
            ...(remoteData.executionSteps ? { executionSteps: remoteData.executionSteps } : {})
          };
        });
        if (syncStatusListener) syncStatusListener('connected');
      } catch (err) {
        console.error('Error applying remote update from Firebase:', err);
      } finally {
        isApplyingRemoteUpdate = false;
      }
    },
    (error) => {
      console.warn('⚡ Firebase RTDB notice:', error.message);
      if (error.message.includes('Permission denied')) {
        if (syncStatusListener) {
          syncStatusListener('permission_denied', 'Database rules set to private. Set .read and .write to true in Firebase Console.');
        }
      } else {
        if (syncStatusListener) {
          syncStatusListener('error', error.message);
        }
      }
    }
  );

  // Subscribe to local store changes and publish to Firebase (debounced)
  let debounceTimeout: any = null;
  subscribeSamnvayState((latestState) => {
    if (isApplyingRemoteUpdate) {
      return; // Do not push back updates received from Firebase
    }

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      pushLocalStateToFirebase(latestState);
    }, 400);
  });
}

function pushLocalStateToFirebase(state: SamnvayState) {
  const samnvayRootRef = ref(rtdb, 'samnvay');
  const payload = {
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser?.name || 'System',
    requests: state.requests || [],
    blockPlans: state.blockPlans || [],
    liveConflicts: state.liveConflicts || [],
    conversations: state.conversations || [],
    auditLogs: state.auditLogs || [],
    executionSteps: state.executionSteps || []
  };

  set(samnvayRootRef, payload).catch((err) => {
    if (!err.message?.includes('Permission denied')) {
      console.warn('⚡ Firebase sync write notice:', err.message);
    }
  });
}
