  // ============================================================================
  // 17. SUPER EMPLOYEE v15: SUPABASE REALTIME MULTI-DEVICE CLOUD SYNC ENGINE
  //     Instant cross-device push notifications, live task ticks & Last Order
  // ============================================================================
  (function (FOH) {
    'use strict';
    function getSession() {
      return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    }
    function getCurrentSuperRoleKey() {
      return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    }
    function loadMidSections() {
      return FOH.sheetState ? FOH.sheetState.loadMidSections() : [];
    }
    function loadClosingSections() {
      return FOH.sheetState ? FOH.sheetState.loadClosingSections() : [];
    }
    function saveMidSections(s) {
      if (FOH.sheetState) FOH.sheetState.saveMidSections(s);
    }
    function fireNativeLockScreenNotification(t, b, id) {
      if (FOH.snoozeEngine) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, id);
    }
    function notifyMobileOnNewTaskAdded(t) {
      if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
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

      ws.onopen = () => {
        wsConnecting = false;
        wsConnected = true;
        updateRealtimeIndicator('online');

        // Join the CEEN Restaurant live shift broadcast topic
        ws.send(JSON.stringify({
          topic: REALTIME_TOPIC,
          event: 'phx_join',
          payload: { config: { broadcast: { self: false } } },
          ref: nextRef(),
        }));

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
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'broadcast' && msg.payload && msg.payload.payload) {
            handleIncomingRealtimeBroadcast(msg.payload.payload);
          }
        } catch {}
      };

      ws.onerror = () => {
        wsConnected = false;
        updateRealtimeIndicator('offline');
      };

      ws.onclose = () => {
        wsConnected = false;
        wsConnecting = false;
        updateRealtimeIndicator('offline');
        clearInterval(heartbeatInterval);
        scheduleReconnect();
      };
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
        topic: REALTIME_TOPIC,
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

    // Handle messages received live from other phones
    function handleIncomingRealtimeBroadcast(data) {
      if (!data || !data.type) return;
      const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
      const sess = typeof getSession === 'function' ? getSession() : null;
      const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
      const curRole = typeof getCurrentSuperRoleKey === 'function' ? getCurrentSuperRoleKey() : 'staff';
      const S = FOH.state;

      // 1. New Task Assigned by Manager / Captain from their phone
      if (data.type === 'TASK_ASSIGNED' && data.item) {
        const item = data.item;
        const targetSheet = data.targetSheet || 'opening';
        const isForMe = !item.assignedUsername || item.assignedUsername === curUser ||
                        item.assignedRoleKey === 'all' || item.assignedRoleKey === curRole ||
                        curRole === 'super_manager' || curRole === 'super_captain';

        // Add to local target template
        let targetSections = S.tpl.sections;
        if (targetSheet === 'mid' && typeof loadMidSections === 'function') {
          targetSections = loadMidSections();
        } else if (targetSheet === 'closing' && typeof loadClosingSections === 'function') {
          targetSections = loadClosingSections();
        }

        const sec = targetSections.find((s) => s.id === item.sectionId) || targetSections[0];
        if (sec && !sec.items.some((it) => it.id === item.id)) {
          sec.items.unshift(item);
          if (targetSheet === 'mid' && typeof saveMidSections === 'function') saveMidSections(targetSections);
          else if (targetSheet === 'closing') localStorage.setItem('foh-opening.closingSections.v1', JSON.stringify(targetSections));
          else FOH.store.saveTemplate(S.tpl);
        }

        // Add to scheduled tasks if for this user
        if (isForMe && !S.tpl.tasks.some((tk) => tk.id === item.id)) {
          S.tpl.tasks.unshift({
            id: item.id,
            text: item.text,
            textAr: item.textAr || item.text,
            icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
            rule: { type: 'once', date: S.date },
            start: S.date,
            time: item.due || '14:00',
            lateAfter: 60,
            role: '',
            person: item.assignedRoleLabel || '',
            assignedRoleKey: item.assignedRoleKey,
            assignedUsername: item.assignedUsername,
            assignedSheet: targetSheet,
            carry: true,
            paused: false,
          });
          FOH.store.saveTemplate(S.tpl);
        }

        if (isForMe) {
          const alertTitle = ar
            ? '📲 مهمة جديدة موكلة لك من ' + (data.senderName || 'المدير')
            : '📲 New Task from ' + (data.senderName || 'Manager');
          const alertBody = (item.textAr || item.text) + (item.due ? (' · ⏰ ' + item.due) : '');

          if (typeof fireNativeLockScreenNotification === 'function') {
            fireNativeLockScreenNotification(alertTitle, alertBody, item.id);
          }
          if (typeof notifyMobileOnNewTaskAdded === 'function') {
            notifyMobileOnNewTaskAdded({
              titleEn: item.text,
              titleAr: item.textAr || item.text,
              dueHM: item.due,
              sectionLabel: targetSheet,
              roleLabel: item.assignedRoleLabel,
            });
          }
          if (FOH.edit && FOH.edit.toast) {
            FOH.edit.toast('📲 ' + alertTitle + ': ' + alertBody);
          }
        }

        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 2. Task Ticked in Real Time on another device
      if (data.type === 'TASK_TICKED' && data.itemId) {
        if (data.checked) {
          S.run.checked[data.itemId] = data.at || FOH.time.nowHM();
        } else {
          delete S.run.checked[data.itemId];
        }
        if (data.sheetType === 'closing') {
          try {
            const cr = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{}');
            cr.checked = cr.checked || {};
            if (data.checked) cr.checked[data.itemId] = S.run.checked[data.itemId];
            else delete cr.checked[data.itemId];
            localStorage.setItem('foh-opening.closingRun.' + S.date, JSON.stringify(cr));
          } catch {}
        } else {
          FOH.store.saveRun(S.date, S.run);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 3. Last Order Declared by Manager or Captain
      if (data.type === 'LAST_ORDER_TRIGGERED') {
        const title = ar
          ? '🔔 إعلان Last Order ' + (data.kind === 'kitchen' ? 'المطبخ 🍳' : 'البار 🍸') + ' من ' + data.byName
          : '🔔 Last Order Declared for ' + data.kind + ' by ' + data.byName;
        const body = ar
          ? 'الساعة ' + data.at + ' · يرجى البدء بإجراءات إغلاق القسم.'
          : 'At ' + data.at + ' · Please initiate department closing.';

        if (typeof fireNativeLockScreenNotification === 'function') {
          fireNativeLockScreenNotification(title, body, 'lo_' + Date.now());
        }
        if (FOH.edit && FOH.edit.toast) {
          FOH.edit.toast(title);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 4. Restaurant Closed
      if (data.type === 'RESTAURANT_CLOSED') {
        const title = ar
          ? '🔒 تم إغلاق المطعم رسمياً من ' + data.closedBy
          : '🔒 Restaurant Officially Closed by ' + data.closedBy;
        if (typeof fireNativeLockScreenNotification === 'function') {
          fireNativeLockScreenNotification(title, ar ? 'اكتمل يوم العمل بنجاح ✓' : 'Shift day completed ✓', 'rc_' + Date.now());
        }
        if (FOH.edit && FOH.edit.toast) {
          FOH.edit.toast(title);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
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

