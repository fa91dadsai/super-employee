// ============================================================================
// 17. SUPER EMPLOYEE v15: SUPABASE REALTIME MULTI-DEVICE CLOUD SYNC ENGINE
//     Instant cross-device push notifications, live task ticks & Last Order
// ============================================================================
(function (FOH) {
  'use strict';
  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }
  const REALTIME_WS_URL = 'wss://jncnbwwhjmouxptqfjaz.supabase.co/realtime/v1/websocket?apikey=sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1&vsn=1.0.0';
  const REALTIME_TOPIC = 'realtime:oasis_ceen_shift_live';

  let ws = null;
  let wsConnected = false;
  let wsConnecting = false;
  let heartbeatInterval = 0;
  let reconnectTimeout = 0;
  let msgRef = 0;

  function nextRef() {
    return String(++msgRef);
  }

  function updateRealtimeIndicator(status) {
    const el = document.getElementById('cloudRealtimeIndicator');
    if (!el) return;
    const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
    el.className = 'realtime-status-pill ' + status;
    if (status === 'online') {
      el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '⚡ متصل لحظياً' : '⚡ Live Cloud');
      el.title = ar ? 'متصل لحظياً بالسحابة مع جميع هواتف الفريق (Supabase Realtime)' : 'Connected live to all staff devices';
    } else if (status === 'connecting') {
      el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '⏳ جاري الاتصال...' : '⏳ Connecting...');
      el.title = ar ? 'جاري الاتصال بالسحابة...' : 'Connecting to cloud...';
    } else {
      el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '📡 وضع أوفلاين' : '📡 Offline Mode');
      el.title = ar ? 'يعمل دون إنترنت وسيتم المزامنة تلقائياً عند الاتصال' : 'Working offline; auto-reconnects when online';
    }
  }

  function getRealtimeTopic() {
    const sess = typeof getSession === 'function' ? getSession() : null;
    if (sess && sess.tenantId && sess.branchId) {
      return `realtime:oasis_${sess.tenantId}_${sess.branchId}_shift_live`;
    }
    return REALTIME_TOPIC;
  }

  function handleSocketOpen(socket) {
    wsConnecting = false;
    wsConnected = true;
    updateRealtimeIndicator('online');

    // Join the CEEN Restaurant live shift broadcast topic
    socket.send(JSON.stringify({
      topic: getRealtimeTopic(),
      event: 'phx_join',
      payload: { config: { broadcast: { self: false } } },
      ref: nextRef(),
    }));

    if (FOH.cloudOutbox && typeof FOH.cloudOutbox.flush === 'function') {
      FOH.cloudOutbox.flush();
    }

    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: nextRef(),
        }));
      }
    }, 25000);
  }

  function setupWebSocketHandlers(socket) {
    socket.onopen = () => handleSocketOpen(socket);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'broadcast' && msg.payload && msg.payload.payload) {
          if (FOH.realtimeHandlers && typeof FOH.realtimeHandlers.handleIncomingBroadcast === 'function') {
            FOH.realtimeHandlers.handleIncomingBroadcast(msg.payload.payload);
          }
        }
      } catch (err) { /* Malformed websocket payload */ }
    };

    socket.onerror = () => {
      wsConnected = false;
      updateRealtimeIndicator('offline');
    };

    socket.onclose = () => {
      wsConnected = false;
      wsConnecting = false;
      updateRealtimeIndicator('offline');
      clearInterval(heartbeatInterval);
      scheduleReconnect();
    };
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    wsConnecting = true;
    updateRealtimeIndicator('connecting');

    try {
      ws = new WebSocket(REALTIME_WS_URL);
    } catch (err) {
      wsConnecting = false;
      wsConnected = false;
      updateRealtimeIndicator('offline');
      scheduleReconnect();
      return;
    }

    setupWebSocketHandlers(ws);
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      if (!wsConnected) connect();
    }, 5000);
  }

  function broadcast(eventType, payloadData) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
    }
    const pkt = {
      topic: getRealtimeTopic(),
      event: 'broadcast',
      payload: {
        type: 'broadcast',
        event: eventType,
        payload: Object.assign({}, payloadData, {
          _sentAt: Date.now(),
          _senderUsername: (FOH.state && FOH.state.me && FOH.state.me.name) || 'Staff',
        }),
      },
      ref: nextRef(),
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(pkt));
    }
  }

  FOH.realtime = FOH.cloudRealtime = {
    connect,
    broadcast,
    isConnected: () => wsConnected,
    updateRealtimeIndicator,
  };

  document.addEventListener('DOMContentLoaded', connect);
})(window.FOH = window.FOH || {});
