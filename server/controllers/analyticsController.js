const { query } = require('../config/db');

function toNum(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function pct(current, previous) {
  const c = toNum(current);
  const p = toNum(previous);
  if (p <= 0) return { value: '+0%', trend: 'up' };
  const delta = ((c - p) / p) * 100;
  const sign = delta >= 0 ? '+' : '';
  return { value: `${sign}${delta.toFixed(0)}%`, trend: delta >= 0 ? 'up' : 'down' };
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function isoDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function makeDayLabels(daysBack) {
  const out = [];
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({
      key: isoDateOnly(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
    });
  }
  return out;
}

function bucketResponseTime(seconds) {
  if (seconds < 60) return '< 1 min';
  if (seconds < 180) return '1-3 min';
  if (seconds < 300) return '3-5 min';
  return '> 5 min';
}

async function loadResponseDiffRows(days = 30) {
  return query(
    `SELECT
       m_in.conversation_id,
       m_in.created_at AS incoming_at,
       m_out.created_at AS outgoing_at,
       m_out.sender AS outgoing_sender,
       TIMESTAMPDIFF(SECOND, m_in.created_at, m_out.created_at) AS diff_sec
     FROM messages m_in
     JOIN messages m_out
       ON m_out.conversation_id = m_in.conversation_id
      AND m_out.direction = 'out'
      AND m_out.created_at = (
        SELECT MIN(m2.created_at)
        FROM messages m2
        WHERE m2.conversation_id = m_in.conversation_id
          AND m2.direction = 'out'
          AND m2.created_at > m_in.created_at
      )
     WHERE m_in.direction = 'in'
       AND m_in.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days]
  );
}

async function getOverview(req, res) {
  try {
    const [threshold] = await query(
      'SELECT warm_threshold, hot_threshold FROM lead_scoring_config WHERE id = 1'
    );
    const warmThreshold = toNum(threshold?.warm_threshold || 40);
    const hotThreshold = toNum(threshold?.hot_threshold || 70);

    const [totals] = await query(
      `SELECT
         COUNT(*) AS total_conversations,
         SUM(CASE WHEN COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead' THEN 1 ELSE 0 END) AS hot_leads,
         SUM(CASE WHEN status = 'bot' THEN 1 ELSE 0 END) AS bot_count,
         SUM(CASE WHEN status = 'human' THEN 1 ELSE 0 END) AS human_count
       FROM conversations`,
      [hotThreshold]
    );

    const [periods] = await query(
      `SELECT
         SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS conv_7,
         SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS conv_prev_7,
         SUM(CASE WHEN (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS hot_7,
         SUM(CASE WHEN (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead') AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS hot_prev_7
       FROM conversations`,
      [hotThreshold, hotThreshold]
    );

    const responseDiffRows = await loadResponseDiffRows(30);
    const avgResponseSec =
      responseDiffRows.length > 0
        ? responseDiffRows.reduce((sum, r) => sum + toNum(r.diff_sec), 0) / responseDiffRows.length
        : 0;

    const responseRecent = responseDiffRows.filter(
      (r) => new Date(r.incoming_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const responsePrev = responseDiffRows.filter((r) => {
      const at = new Date(r.incoming_at).getTime();
      const now = Date.now();
      return at >= now - 14 * 24 * 60 * 60 * 1000 && at < now - 7 * 24 * 60 * 60 * 1000;
    });
    const avgRecent =
      responseRecent.length > 0
        ? responseRecent.reduce((sum, r) => sum + toNum(r.diff_sec), 0) / responseRecent.length
        : 0;
    const avgPrev =
      responsePrev.length > 0
        ? responsePrev.reduce((sum, r) => sum + toNum(r.diff_sec), 0) / responsePrev.length
        : 0;

    const totalConversations = toNum(totals?.total_conversations);
    const botHandledPct = totalConversations > 0 ? (toNum(totals?.bot_count) / totalConversations) * 100 : 0;

    const conversationDelta = pct(periods?.conv_7, periods?.conv_prev_7);
    const hotDelta = pct(periods?.hot_7, periods?.hot_prev_7);
    const botShareDelta = pct(
      toNum(totals?.bot_count),
      Math.max(toNum(totals?.human_count), 1)
    );
    const responseDeltaRaw = pct(avgRecent, avgPrev);

    const dayRows = await query(
      `SELECT DATE(created_at) AS d,
              SUM(CASE WHEN direction = 'in' THEN 1 ELSE 0 END) AS incoming,
              SUM(CASE WHEN direction = 'out' THEN 1 ELSE 0 END) AS outgoing
       FROM messages
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`
    );
    const dayMap = new Map(dayRows.map((r) => [isoDateOnly(r.d), r]));
    const conversationsByDay = makeDayLabels(7).map((d) => {
      const row = dayMap.get(d.key);
      return {
        day: d.label,
        incoming: toNum(row?.incoming),
        outgoing: toNum(row?.outgoing),
      };
    });

    const sourcesRows = await query(
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'other') AS source_name, COUNT(*) AS total
       FROM conversations
       GROUP BY source_name
       ORDER BY total DESC
       LIMIT 6`
    );
    const sourceColors = ['#7c3aed', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'];
    const leadSources = sourcesRows.map((r, i) => ({
      name: String(r.source_name || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value: toNum(r.total),
      color: sourceColors[i % sourceColors.length],
    }));

    const weekRows = await query(
      `SELECT YEARWEEK(COALESCE(last_message_at, created_at), 1) AS yw,
              COUNT(*) AS conversations,
              SUM(CASE WHEN COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead' THEN 1 ELSE 0 END) AS hot_leads
       FROM conversations
       WHERE COALESCE(last_message_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 27 DAY)
       GROUP BY yw
       ORDER BY yw ASC`,
      [hotThreshold]
    );
    const weeklyTrends = weekRows.map((r, i) => ({
      week: `W${i + 1}`,
      conversations: toNum(r.conversations),
      hotLeads: toNum(r.hot_leads),
    }));

    const botHumanRows = await query(
      `SELECT DATE(created_at) AS d,
              SUM(CASE WHEN sender = 'business' THEN 1 ELSE 0 END) AS bot,
              SUM(CASE WHEN sender = 'agent' THEN 1 ELSE 0 END) AS human
       FROM messages
       WHERE direction = 'out'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`
    );
    const botHumanMap = new Map(botHumanRows.map((r) => [isoDateOnly(r.d), r]));
    const botVsHuman = makeDayLabels(7).map((d) => {
      const row = botHumanMap.get(d.key);
      return {
        day: d.label,
        bot: toNum(row?.bot),
        human: toNum(row?.human),
      };
    });

    const leadsRows = await query(
      `SELECT DATE(m.created_at) AS d,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) >= ? OR c.segment = 'hot_lead' THEN 1 ELSE 0 END) AS hot,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) >= ? AND COALESCE(c.lead_score, 0) < ? THEN 1 ELSE 0 END) AS warm,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) < ? THEN 1 ELSE 0 END) AS cold
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.direction = 'in'
         AND m.created_at >= DATE_SUB(CURDATE(), INTERVAL 4 DAY)
       GROUP BY DATE(m.created_at)
       ORDER BY DATE(m.created_at) ASC`,
      [hotThreshold, warmThreshold, hotThreshold, warmThreshold]
    );
    const leadsMap = new Map(leadsRows.map((r) => [isoDateOnly(r.d), r]));
    const leadsByStatus = makeDayLabels(5).map((d) => {
      const row = leadsMap.get(d.key);
      return {
        day: d.label,
        hot: toNum(row?.hot),
        warm: toNum(row?.warm),
        cold: toNum(row?.cold),
      };
    });

    const distBuckets = new Map([
      ['< 1 min', 0],
      ['1-3 min', 0],
      ['3-5 min', 0],
      ['> 5 min', 0],
    ]);
    responseDiffRows.forEach((r) => {
      const key = bucketResponseTime(toNum(r.diff_sec));
      distBuckets.set(key, toNum(distBuckets.get(key)) + 1);
    });
    const responseTimeDist = [
      { name: '< 1 min', value: toNum(distBuckets.get('< 1 min')), fill: '#22c55e' },
      { name: '1-3 min', value: toNum(distBuckets.get('1-3 min')), fill: '#3b82f6' },
      { name: '3-5 min', value: toNum(distBuckets.get('3-5 min')), fill: '#f59e0b' },
      { name: '> 5 min', value: toNum(distBuckets.get('> 5 min')), fill: '#ef4444' },
    ];

    const [unreadRow] = await query(
      `SELECT COUNT(*) AS unread
       FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM messages mi
         WHERE mi.conversation_id = c.id
           AND mi.direction = 'in'
           AND mi.created_at > COALESCE(
             (SELECT MAX(mo.created_at) FROM messages mo WHERE mo.conversation_id = c.id AND mo.direction = 'out'),
             '1970-01-01'
           )
       )`
    );
    const [attentionRow] = await query(
      `SELECT COUNT(*) AS needs_attention
       FROM conversations
       WHERE status = 'human'
          OR (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead')`,
      [hotThreshold]
    );

    return res.json({
      kpis: {
        totalConversations: {
          value: totalConversations,
          change: conversationDelta.value,
          trend: conversationDelta.trend,
        },
        hotLeads: {
          value: toNum(totals?.hot_leads),
          change: hotDelta.value,
          trend: hotDelta.trend,
        },
        botHandled: {
          value: Number(botHandledPct.toFixed(1)),
          change: botShareDelta.value,
          trend: botShareDelta.trend,
        },
        avgResponseTimeMinutes: {
          value: Number((avgResponseSec / 60).toFixed(2)),
          change: responseDeltaRaw.value,
          trend: responseDeltaRaw.trend,
        },
      },
      quickStats: {
        liveChatsNow: toNum(unreadRow?.unread),
        unreadMessages: toNum(unreadRow?.unread),
        needsAttention: toNum(attentionRow?.needs_attention),
      },
      conversationsByDay,
      leadSources,
      weeklyTrends,
      botVsHuman,
      leadsByStatus,
      responseTimeDist,
    });
  } catch (err) {
    console.error('Overview analytics error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard overview analytics' });
  }
}

async function getActivity(req, res) {
  try {
    const [threshold] = await query(
      'SELECT hot_threshold FROM lead_scoring_config WHERE id = 1'
    );
    const hotThreshold = toNum(threshold?.hot_threshold || 70);

    const incoming = await query(
      `SELECT m.id, 'new_chat' AS type, COALESCE(cp.display_name, ct.name, ct.phone, ct.wa_id) AS contact,
              m.created_at AS event_time, 'Incoming message' AS meta
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN contacts ct ON ct.id = c.contact_id
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       WHERE m.direction = 'in'
       ORDER BY m.created_at DESC
       LIMIT 20`
    );

    const botReplies = await query(
      `SELECT m.id, 'bot_reply' AS type, COALESCE(cp.display_name, ct.name, ct.phone, ct.wa_id) AS contact,
              m.created_at AS event_time, 'Auto-replied' AS meta
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN contacts ct ON ct.id = c.contact_id
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       WHERE m.direction = 'out' AND m.sender = 'business'
       ORDER BY m.created_at DESC
       LIMIT 20`
    );

    const takeovers = await query(
      `SELECT c.id, 'takeover' AS type, COALESCE(cp.display_name, ct.name, ct.phone, ct.wa_id) AS contact,
              c.updated_at AS event_time, 'Agent took over' AS meta
       FROM conversations c
       JOIN contacts ct ON ct.id = c.contact_id
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       WHERE c.status = 'human'
       ORDER BY c.updated_at DESC
       LIMIT 20`
    );

    const hotLeads = await query(
      `SELECT c.id, 'hot_lead' AS type, COALESCE(cp.display_name, ct.name, ct.phone, ct.wa_id) AS contact,
              c.updated_at AS event_time, CONCAT('Score: ', COALESCE(c.lead_score, 0)) AS meta
       FROM conversations c
       JOIN contacts ct ON ct.id = c.contact_id
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       WHERE COALESCE(c.lead_score, 0) >= ? OR c.segment = 'hot_lead'
       ORDER BY c.updated_at DESC
       LIMIT 20`,
      [hotThreshold]
    );

    const merged = [...incoming, ...botReplies, ...takeovers, ...hotLeads]
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
      .slice(0, 80)
      .map((a, idx) => ({
        id: `${a.type}-${a.id}-${idx}`,
        type: a.type,
        contact: a.contact,
        time: formatRelativeTime(a.event_time),
        timeRaw: a.event_time,
        meta: a.meta,
      }));

    return res.json({ activities: merged });
  } catch (err) {
    console.error('Activity analytics error:', err);
    return res.status(500).json({ error: 'Failed to load activity feed analytics' });
  }
}

async function getPerformance(req, res) {
  try {
    const responseDiffRows = await loadResponseDiffRows(30);
    const botRows = responseDiffRows.filter((r) => r.outgoing_sender === 'business');
    const humanRows = responseDiffRows.filter((r) => r.outgoing_sender === 'agent');

    const avgBotSec =
      botRows.length > 0
        ? botRows.reduce((sum, r) => sum + toNum(r.diff_sec), 0) / botRows.length
        : 0;
    const avgHumanSec =
      humanRows.length > 0
        ? humanRows.reduce((sum, r) => sum + toNum(r.diff_sec), 0) / humanRows.length
        : 0;

    const [convTotals] = await query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'bot' THEN 1 ELSE 0 END) AS bot_count,
              SUM(CASE WHEN status = 'human' THEN 1 ELSE 0 END) AS human_count
       FROM conversations`
    );
    const total = toNum(convTotals?.total);
    const botResolutionRate = total > 0 ? (toNum(convTotals?.bot_count) / total) * 100 : 0;
    const humanTakeoverRate = total > 0 ? (toNum(convTotals?.human_count) / total) * 100 : 0;

    const [campaignTotals] = await query(
      'SELECT SUM(leads) AS leads, SUM(clicks) AS clicks FROM facebook_campaigns'
    );
    const leadConversion = toNum(campaignTotals?.clicks) > 0
      ? (toNum(campaignTotals?.leads) / toNum(campaignTotals?.clicks)) * 100
      : 0;

    const days = makeDayLabels(7);
    const dayMap = new Map(days.map((d) => [d.key, { day: d.label, bot: 0, human: 0 }]));
    responseDiffRows.forEach((r) => {
      const key = isoDateOnly(r.incoming_at);
      const bucket = dayMap.get(key);
      if (!bucket) return;
      if (r.outgoing_sender === 'business') {
        bucket.bot += toNum(r.diff_sec);
      } else if (r.outgoing_sender === 'agent') {
        bucket.human += toNum(r.diff_sec) / 60;
      }
    });
    const countsByDay = new Map(days.map((d) => [d.key, { bot: 0, human: 0 }]));
    responseDiffRows.forEach((r) => {
      const key = isoDateOnly(r.incoming_at);
      const c = countsByDay.get(key);
      if (!c) return;
      if (r.outgoing_sender === 'business') c.bot += 1;
      if (r.outgoing_sender === 'agent') c.human += 1;
    });
    const responseTimeTrend = days.map((d) => {
      const totalsDay = dayMap.get(d.key) || { day: d.label, bot: 0, human: 0 };
      const counts = countsByDay.get(d.key) || { bot: 0, human: 0 };
      return {
        day: d.label,
        bot: counts.bot > 0 ? Number((totalsDay.bot / counts.bot).toFixed(2)) : 0,
        human: counts.human > 0 ? Number((totalsDay.human / counts.human).toFixed(2)) : 0,
      };
    });

    const byHourRows = await query(
      `SELECT HOUR(created_at) AS hr,
              SUM(CASE WHEN sender = 'business' THEN 1 ELSE 0 END) AS bot,
              SUM(CASE WHEN sender = 'agent' THEN 1 ELSE 0 END) AS human
       FROM messages
       WHERE direction = 'out'
         AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY HOUR(created_at) ASC`
    );
    const resolutionByHour = byHourRows.map((r) => ({
      hour: `${String(r.hr).padStart(2, '0')}:00`,
      bot: toNum(r.bot),
      human: toNum(r.human),
    }));

    const weeklyRows = await query(
      `SELECT YEARWEEK(COALESCE(last_message_at, created_at), 1) AS yw,
              SUM(CASE WHEN status = 'bot' THEN 1 ELSE 0 END) AS resolved,
              SUM(CASE WHEN status = 'human' THEN 1 ELSE 0 END) AS escalated
       FROM conversations
       WHERE COALESCE(last_message_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 27 DAY)
       GROUP BY yw
       ORDER BY yw ASC`
    );
    const weeklyPerformance = weeklyRows.map((r, i) => ({
      week: `W${i + 1}`,
      resolved: toNum(r.resolved),
      escalated: toNum(r.escalated),
    }));

    return res.json({
      cards: {
        avgBotResponseSeconds: Number(avgBotSec.toFixed(2)),
        botResolutionRate: Number(botResolutionRate.toFixed(1)),
        humanTakeoverRate: Number(humanTakeoverRate.toFixed(1)),
        leadConversionRate: Number(leadConversion.toFixed(2)),
      },
      responseTimeTrend,
      resolutionByHour,
      weeklyPerformance,
    });
  } catch (err) {
    console.error('Performance analytics error:', err);
    return res.status(500).json({ error: 'Failed to load performance analytics' });
  }
}

async function getConversationTrends(req, res) {
  try {
    const [counts] = await query(
      `SELECT
         COUNT(*) AS total_conversations,
         SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new_week,
         SUM(CASE WHEN status = 'bot' THEN 1 ELSE 0 END) AS resolved,
         SUM(CASE WHEN status = 'human' THEN 1 ELSE 0 END) AS escalated
       FROM conversations`
    );

    const dailyRows = await query(
      `SELECT DATE(created_at) AS d, COUNT(*) AS new_count
       FROM conversations
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`
    );
    const resolvedDailyRows = await query(
      `SELECT DATE(updated_at) AS d, COUNT(*) AS resolved_count
       FROM conversations
       WHERE status = 'bot'
         AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(updated_at)
       ORDER BY DATE(updated_at) ASC`
    );
    const dailyMap = new Map(dailyRows.map((r) => [isoDateOnly(r.d), toNum(r.new_count)]));
    const resolvedMap = new Map(resolvedDailyRows.map((r) => [isoDateOnly(r.d), toNum(r.resolved_count)]));
    const dailyConversations = makeDayLabels(7).map((d) => ({
      day: d.label,
      new: toNum(dailyMap.get(d.key)),
      resolved: toNum(resolvedMap.get(d.key)),
    }));

    const weeklyRows = await query(
      `SELECT YEARWEEK(COALESCE(last_message_at, created_at), 1) AS yw, COUNT(*) AS conversations
       FROM conversations
       WHERE COALESCE(last_message_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 27 DAY)
       GROUP BY yw
       ORDER BY yw ASC`
    );
    const weeklyTrend = weeklyRows.map((r, i) => ({ week: `W${i + 1}`, conversations: toNum(r.conversations) }));

    const prevPeriodRows = await query(
      `SELECT
         SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS prev_new_week,
         SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 'bot' THEN 1 ELSE 0 END) AS prev_resolved,
         SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 'human' THEN 1 ELSE 0 END) AS prev_escalated
       FROM conversations`
    );
    const prev = prevPeriodRows[0] || {};

    return res.json({
      kpis: {
        totalConversations: { value: toNum(counts?.total_conversations), ...pct(toNum(counts?.total_conversations), toNum(counts?.total_conversations) - toNum(counts?.new_week)) },
        newThisWeek: { value: toNum(counts?.new_week), ...pct(counts?.new_week, prev.prev_new_week) },
        resolved: { value: toNum(counts?.resolved), ...pct(counts?.resolved, prev.prev_resolved) },
        escalated: { value: toNum(counts?.escalated), ...pct(counts?.escalated, prev.prev_escalated) },
      },
      dailyConversations,
      weeklyTrend,
    });
  } catch (err) {
    console.error('Conversation trends analytics error:', err);
    return res.status(500).json({ error: 'Failed to load conversation trends analytics' });
  }
}

async function getHotLeadTrends(req, res) {
  try {
    const [cfg] = await query('SELECT warm_threshold, hot_threshold FROM lead_scoring_config WHERE id = 1');
    const warm = toNum(cfg?.warm_threshold || 40);
    const hot = toNum(cfg?.hot_threshold || 70);

    const [totals] = await query(
      `SELECT
         SUM(CASE WHEN (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead') AND DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) AS hot_today,
         SUM(CASE WHEN (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead') AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS hot_7d,
         AVG(CASE WHEN (COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead') THEN COALESCE(lead_score, 0) END) AS avg_hot_score
       FROM conversations`,
      [hot, hot, hot]
    );
    const [campaign] = await query('SELECT SUM(leads) AS leads, SUM(clicks) AS clicks FROM facebook_campaigns');
    const conversionRate = toNum(campaign?.clicks) > 0 ? (toNum(campaign?.leads) / toNum(campaign?.clicks)) * 100 : 0;

    const dayRows = await query(
      `SELECT DATE(m.created_at) AS d,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) >= ? OR c.segment = 'hot_lead' THEN 1 ELSE 0 END) AS hot,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) >= ? AND COALESCE(c.lead_score, 0) < ? THEN 1 ELSE 0 END) AS warm,
              SUM(CASE WHEN COALESCE(c.lead_score, 0) < ? THEN 1 ELSE 0 END) AS cold
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.direction = 'in'
         AND m.created_at >= DATE_SUB(CURDATE(), INTERVAL 4 DAY)
       GROUP BY DATE(m.created_at)
       ORDER BY DATE(m.created_at) ASC`,
      [hot, warm, hot, warm]
    );
    const dayMap = new Map(dayRows.map((r) => [isoDateOnly(r.d), r]));
    const hotByDay = makeDayLabels(5).map((d) => {
      const row = dayMap.get(d.key);
      return { day: d.label, hot: toNum(row?.hot), warm: toNum(row?.warm), cold: toNum(row?.cold) };
    });

    const sourceRows = await query(
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'other') AS source_name, COUNT(*) AS total
       FROM conversations
       WHERE COALESCE(lead_score, 0) >= ? OR segment = 'hot_lead'
       GROUP BY source_name
       ORDER BY total DESC
       LIMIT 6`,
      [hot]
    );
    const colors = ['#1877f2', '#25d366', '#7c3aed', '#3b82f6', '#f59e0b', '#94a3b8'];
    const hotSources = sourceRows.map((r, i) => ({
      name: String(r.source_name || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: toNum(r.total),
      color: colors[i % colors.length],
    }));

    return res.json({
      kpis: {
        hotToday: { value: toNum(totals?.hot_today), change: '+0%', trend: 'up' },
        hot7d: { value: toNum(totals?.hot_7d), change: '+0%', trend: 'up' },
        conversionRate: { value: Number(conversionRate.toFixed(2)), change: '+0%', trend: 'up' },
        avgHotScore: { value: Number(toNum(totals?.avg_hot_score).toFixed(0)), change: '+0', trend: 'up' },
      },
      hotByDay,
      hotSources,
    });
  } catch (err) {
    console.error('Hot lead trends analytics error:', err);
    return res.status(500).json({ error: 'Failed to load hot lead trends analytics' });
  }
}

async function getBotPerformance(req, res) {
  try {
    const responseDiffRows = await loadResponseDiffRows(30);
    const botRows = responseDiffRows.filter((r) => r.outgoing_sender === 'business');
    const avgBotSec = botRows.length > 0 ? botRows.reduce((s, r) => s + toNum(r.diff_sec), 0) / botRows.length : 0;

    const [totals] = await query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'bot' THEN 1 ELSE 0 END) AS bot_count
       FROM conversations`
    );
    const botRate = toNum(totals?.total) > 0 ? (toNum(totals?.bot_count) / toNum(totals?.total)) * 100 : 0;

    const [handledTodayRow] = await query(
      `SELECT COUNT(*) AS total FROM messages
       WHERE direction = 'out' AND sender = 'business' AND DATE(created_at) = CURDATE()`
    );

    const [fallbackSetting] = await query('SELECT fallback_message FROM bot_message_settings WHERE id = 1');
    const fallbackMessage = String(fallbackSetting?.fallback_message || '').trim();
    let fallbackRate = 0;
    if (fallbackMessage) {
      const [fallbackRows] = await query(
        `SELECT
           SUM(CASE WHEN body = ? THEN 1 ELSE 0 END) AS fallback_count,
           COUNT(*) AS total_out
         FROM messages
         WHERE direction = 'out' AND sender = 'business' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [fallbackMessage]
      );
      fallbackRate = toNum(fallbackRows?.total_out) > 0 ? (toNum(fallbackRows?.fallback_count) / toNum(fallbackRows?.total_out)) * 100 : 0;
    }

    const dayRows = await query(
      `SELECT DATE(created_at) AS d,
              SUM(CASE WHEN sender = 'business' THEN 1 ELSE 0 END) AS resolved,
              SUM(CASE WHEN sender = 'agent' THEN 1 ELSE 0 END) AS escalated
       FROM messages
       WHERE direction = 'out' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 4 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`
    );
    const dayMap = new Map(dayRows.map((r) => [isoDateOnly(r.d), r]));
    const botByDay = makeDayLabels(5).map((d) => {
      const row = dayMap.get(d.key);
      return { day: d.label, resolved: toNum(row?.resolved), escalated: toNum(row?.escalated) };
    });

    const botRespMap = new Map(makeDayLabels(5).map((d) => [d.key, { sum: 0, count: 0, label: d.label }]));
    botRows.forEach((r) => {
      const key = isoDateOnly(r.incoming_at);
      const bucket = botRespMap.get(key);
      if (!bucket) return;
      bucket.sum += toNum(r.diff_sec);
      bucket.count += 1;
    });
    const responseTime = makeDayLabels(5).map((d) => {
      const b = botRespMap.get(d.key) || { sum: 0, count: 0 };
      return { day: d.label, bot: b.count > 0 ? Number((b.sum / b.count).toFixed(2)) : 0 };
    });

    return res.json({
      kpis: {
        botResolutionRate: { value: Number(botRate.toFixed(1)), change: '+0%', trend: 'up' },
        avgResponseSeconds: { value: Number(avgBotSec.toFixed(2)), change: '+0%', trend: 'down' },
        handledToday: { value: toNum(handledTodayRow?.total), change: '+0%', trend: 'up' },
        fallbackRate: { value: Number(fallbackRate.toFixed(2)), change: '+0%', trend: 'down' },
      },
      botByDay,
      responseTime,
    });
  } catch (err) {
    console.error('Bot performance analytics error:', err);
    return res.status(500).json({ error: 'Failed to load bot performance analytics' });
  }
}

async function getAgentPerformance(req, res) {
  try {
    const responseDiffRows = await loadResponseDiffRows(30);
    const humanRows = responseDiffRows.filter((r) => r.outgoing_sender === 'agent');
    const avgHumanMin = humanRows.length > 0
      ? humanRows.reduce((s, r) => s + toNum(r.diff_sec), 0) / humanRows.length / 60
      : 0;

    const [takeoversToday] = await query(
      `SELECT COUNT(*) AS total FROM conversations WHERE status = 'human' AND DATE(updated_at) = CURDATE()`
    );
    const [resolvedByAgents] = await query(
      `SELECT COUNT(*) AS total FROM messages
       WHERE direction = 'out' AND sender = 'agent' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const satisfactionProxy = toNum(resolvedByAgents?.total) > 0 ? 100 - Math.min(40, avgHumanMin * 5) : 0;

    const [teamRows] = await Promise.all([
      query(
        `SELECT 'Agent Team' AS name,
                SUM(CASE WHEN status = 'human' THEN 1 ELSE 0 END) AS takeovers,
                (SELECT COUNT(*) FROM messages WHERE direction = 'out' AND sender = 'agent' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS resolved
         FROM conversations`
      ),
    ]);
    const agentByName = teamRows.map((r) => ({
      name: r.name,
      takeovers: toNum(r.takeovers),
      resolved: toNum(r.resolved),
    }));

    const hourRows = await query(
      `SELECT HOUR(created_at) AS hr, COUNT(*) AS count
       FROM messages
       WHERE direction = 'out' AND sender = 'agent' AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY HOUR(created_at) ASC`
    );
    const takeoverByHour = hourRows.map((r) => ({
      hour: `${String(r.hr).padStart(2, '0')}:00`,
      count: toNum(r.count),
    }));

    return res.json({
      kpis: {
        takeoversToday: { value: toNum(takeoversToday?.total), change: '+0%', trend: 'up' },
        avgResponseMinutes: { value: Number(avgHumanMin.toFixed(2)), change: '+0%', trend: 'down' },
        resolvedByAgents: { value: toNum(resolvedByAgents?.total), change: '+0%', trend: 'up' },
        satisfaction: { value: Number(satisfactionProxy.toFixed(0)), change: '+0%', trend: 'up' },
      },
      agentByName,
      takeoverByHour,
    });
  } catch (err) {
    console.error('Agent performance analytics error:', err);
    return res.status(500).json({ error: 'Failed to load agent performance analytics' });
  }
}

async function getResponseTime(req, res) {
  try {
    const responseDiffRows = await loadResponseDiffRows(30);
    const botRows = responseDiffRows.filter((r) => r.outgoing_sender === 'business');
    const humanRows = responseDiffRows.filter((r) => r.outgoing_sender === 'agent');
    const avgBotSec = botRows.length > 0 ? botRows.reduce((s, r) => s + toNum(r.diff_sec), 0) / botRows.length : 0;
    const avgHumanMin = humanRows.length > 0 ? humanRows.reduce((s, r) => s + toNum(r.diff_sec), 0) / humanRows.length / 60 : 0;

    const dist = { lt1: 0, oneTo3: 0, threeTo5: 0, gt5: 0 };
    responseDiffRows.forEach((r) => {
      const sec = toNum(r.diff_sec);
      if (sec < 60) dist.lt1 += 1;
      else if (sec < 180) dist.oneTo3 += 1;
      else if (sec < 300) dist.threeTo5 += 1;
      else dist.gt5 += 1;
    });
    const totalDist = Math.max(1, responseDiffRows.length);
    const pctLt1 = (dist.lt1 / totalDist) * 100;
    const pctGt5 = (dist.gt5 / totalDist) * 100;

    const days = makeDayLabels(5);
    const map = new Map(days.map((d) => [d.key, { day: d.label, botSum: 0, botCount: 0, humanSum: 0, humanCount: 0 }]));
    responseDiffRows.forEach((r) => {
      const key = isoDateOnly(r.incoming_at);
      const b = map.get(key);
      if (!b) return;
      if (r.outgoing_sender === 'business') {
        b.botSum += toNum(r.diff_sec);
        b.botCount += 1;
      } else if (r.outgoing_sender === 'agent') {
        b.humanSum += toNum(r.diff_sec) / 60;
        b.humanCount += 1;
      }
    });
    const botVsHuman = days.map((d) => {
      const b = map.get(d.key) || { botSum: 0, botCount: 0, humanSum: 0, humanCount: 0 };
      return {
        day: d.label,
        bot: b.botCount > 0 ? Number((b.botSum / b.botCount).toFixed(2)) : 0,
        human: b.humanCount > 0 ? Number((b.humanSum / b.humanCount).toFixed(2)) : 0,
      };
    });

    const responseDist = [
      { range: '< 1 min', count: Number(((dist.lt1 / totalDist) * 100).toFixed(2)), fill: '#22c55e' },
      { range: '1-3 min', count: Number(((dist.oneTo3 / totalDist) * 100).toFixed(2)), fill: '#3b82f6' },
      { range: '3-5 min', count: Number(((dist.threeTo5 / totalDist) * 100).toFixed(2)), fill: '#f59e0b' },
      { range: '> 5 min', count: Number(((dist.gt5 / totalDist) * 100).toFixed(2)), fill: '#ef4444' },
    ];

    return res.json({
      kpis: {
        avgBotResponseSeconds: { value: Number(avgBotSec.toFixed(2)), change: '+0%', trend: 'down' },
        avgHumanResponseMinutes: { value: Number(avgHumanMin.toFixed(2)), change: '+0%', trend: 'down' },
        lt1MinPct: { value: Number(pctLt1.toFixed(2)), change: '+0%', trend: 'up' },
        gt5MinPct: { value: Number(pctGt5.toFixed(2)), change: '+0%', trend: 'down' },
      },
      botVsHuman,
      responseDist,
    });
  } catch (err) {
    console.error('Response time analytics error:', err);
    return res.status(500).json({ error: 'Failed to load response time analytics' });
  }
}

module.exports = {
  getOverview,
  getActivity,
  getPerformance,
  getConversationTrends,
  getHotLeadTrends,
  getBotPerformance,
  getAgentPerformance,
  getResponseTime,
};
