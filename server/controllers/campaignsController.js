const { query } = require('../config/db');

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v20.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function toSafeInt(value) {
  const parsed = Number.parseInt(String(value || 0), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toSafeFloat(value) {
  const parsed = Number.parseFloat(String(value || 0));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapCampaignStatus(rawStatus) {
  const s = String(rawStatus || '').toUpperCase();
  if (s.includes('ACTIVE')) return 'active';
  if (s.includes('PAUSED')) return 'paused';
  return 'draft';
}

function parseLeadCount(actions) {
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const action of actions) {
    const type = String(action.action_type || '');
    if (
      type === 'lead' ||
      type.includes('lead') ||
      type.includes('onsite_conversion.lead_grouped') ||
      type.includes('offsite_conversion.fb_pixel_lead')
    ) {
      total += toSafeInt(action.value);
    }
  }
  return total;
}

function metricsFromInsightRow(row) {
  const clicks = toSafeInt(row?.clicks);
  const leads = parseLeadCount(row?.actions);
  const inlineLinkClicks = row?.inline_link_clicks !== undefined ? toSafeInt(row.inline_link_clicks) : null;
  const uniqueInlineLinkClicks =
    row?.unique_inline_link_clicks !== undefined ? toSafeInt(row.unique_inline_link_clicks) : null;
  let costPerInlineLinkClick = null;
  if (Array.isArray(row?.cost_per_inline_link_click) && row.cost_per_inline_link_click[0]?.value !== undefined) {
    costPerInlineLinkClick = toSafeFloat(row.cost_per_inline_link_click[0].value);
  } else if (row?.cost_per_inline_link_click !== undefined) {
    costPerInlineLinkClick = toSafeFloat(row.cost_per_inline_link_click);
  }

  return {
    leads,
    clicks,
    conversionRate: clicks > 0 ? Number(((leads / clicks) * 100).toFixed(2)) : 0,
    impressions: row?.impressions !== undefined ? toSafeInt(row.impressions) : null,
    reach: row?.reach !== undefined ? toSafeInt(row.reach) : null,
    frequency: row?.frequency !== undefined ? toSafeFloat(row.frequency) : null,
    spend: row?.spend !== undefined ? toSafeFloat(row.spend) : null,
    cpc: row?.cpc !== undefined ? toSafeFloat(row.cpc) : null,
    cpm: row?.cpm !== undefined ? toSafeFloat(row.cpm) : null,
    ctr: row?.ctr !== undefined ? toSafeFloat(row.ctr) : null,
    inlineLinkClicks,
    uniqueInlineLinkClicks,
    costPerInlineLinkClick,
  };
}

function extractCreativeMedia(creative = {}) {
  const objectStorySpec = creative.object_story_spec || {};
  const linkData = objectStorySpec.link_data || {};
  const photoData = objectStorySpec.photo_data || {};
  const videoData = objectStorySpec.video_data || {};
  const templateData = objectStorySpec.template_data || {};

  const imageUrl =
    creative.image_url ||
    creative.thumbnail_url ||
    photoData.image_url ||
    linkData.picture ||
    templateData.picture ||
    null;

  const videoId = creative.video_id || videoData.video_id || null;
  const videoUrl = videoData.video_url || null;

  return {
    mediaType: videoId || videoUrl ? 'video' : imageUrl ? 'image' : null,
    imageUrl,
    thumbnailUrl: creative.thumbnail_url || imageUrl || null,
    videoId: videoId ? String(videoId) : null,
    videoUrl: videoUrl || null,
    permalinkUrl: creative.effective_object_story_id
      ? `https://www.facebook.com/${creative.effective_object_story_id}`
      : null,
  };
}

function normalizeAccountId(id) {
  if (!id) return '';
  const raw = String(id).trim();
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

async function getStoredAccessToken() {
  const [row] = await query('SELECT access_token FROM facebook_connections WHERE id = 1 AND is_active = 1');
  if (row && row.access_token) return row.access_token;
  return process.env.FACEBOOK_MARKETING_TOCKEN || process.env.FACEBOOK_MARKETING_TOKEN || process.env.FB_ACCESS_TOKEN || '';
}

async function graphGet(path, token, params = {}) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`Facebook API error: ${msg}`);
  }
  return data;
}

async function fetchAllCampaignsForAccount(accountId, token) {
  const campaigns = [];
  let nextUrl = null;

  while (true) {
    let data;
    if (!nextUrl) {
      data = await graphGet(`${accountId}/campaigns`, token, {
        fields: 'id,name,status,effective_status,objective,created_time,updated_time',
        limit: 200,
      });
    } else {
      const res = await fetch(nextUrl);
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `${res.status} ${res.statusText}`;
        throw new Error(`Facebook API error: ${msg}`);
      }
    }

    if (Array.isArray(data.data)) campaigns.push(...data.data);
    nextUrl = data?.paging?.next || null;
    if (!nextUrl) break;
  }

  return campaigns;
}

async function fetchInsightsByCampaign(accountId, token, dateFrom, dateTo) {
  const insightsMap = new Map();
  let nextUrl = null;

  while (true) {
    let data;
    if (!nextUrl) {
      const params = {
        level: 'campaign',
        fields: 'campaign_id,clicks,actions',
        time_increment: 'all_days',
      };

      if (dateFrom && dateTo) {
        params.time_range = JSON.stringify({ since: dateFrom, until: dateTo });
      } else {
        // Meta Marketing API accepts "maximum" for full available history.
        params.date_preset = 'maximum';
      }

      data = await graphGet(`${accountId}/insights`, token, params);
    } else {
      const res = await fetch(nextUrl);
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `${res.status} ${res.statusText}`;
        throw new Error(`Facebook API error: ${msg}`);
      }
    }

    const rows = Array.isArray(data.data) ? data.data : [];
    for (const row of rows) {
      const campaignId = String(row.campaign_id || '');
      if (!campaignId) continue;
      const clicks = toSafeInt(row.clicks);
      const leads = parseLeadCount(row.actions);
      const convRate = clicks > 0 ? Number(((leads / clicks) * 100).toFixed(2)) : 0;
      insightsMap.set(campaignId, { clicks, leads, convRate });
    }

    nextUrl = data?.paging?.next || null;
    if (!nextUrl) break;
  }

  return insightsMap;
}

async function ensureAccountsFromToken(token) {
  const data = await graphGet('me/adaccounts', token, {
    fields: 'id,name,currency,account_status',
    limit: 200,
  });

  const accounts = Array.isArray(data.data) ? data.data : [];
  for (const acc of accounts) {
    const accountId = normalizeAccountId(acc.id);
    await query(
      `INSERT INTO facebook_ad_accounts (account_id, account_name, currency, is_selected)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), currency = VALUES(currency), updated_at = NOW()`,
      [accountId, acc.name || accountId, acc.currency || null]
    );
  }
}

async function listCampaigns(req, res) {
  try {
    const status = String(req.query.status || 'all').toLowerCase();
    const params = [];
    let where = 'WHERE 1=1';

    if (status === 'active' || status === 'paused' || status === 'draft') {
      where += ' AND c.status = ?';
      params.push(status);
    }

    const rows = await query(
      `SELECT c.campaign_id, c.account_id, c.name, c.status, c.clicks, c.leads, c.conv_rate, c.started_at,
              a.account_name
       FROM facebook_campaigns c
       LEFT JOIN facebook_ad_accounts a ON a.account_id = c.account_id
       ${where}
       ORDER BY c.started_at DESC, c.campaign_id DESC
       LIMIT 500`,
      params
    );

    const [metaRow] = await query('SELECT MAX(last_synced_at) AS last_synced_at FROM facebook_ad_accounts');

    const campaigns = rows.map((r) => ({
      id: String(r.campaign_id),
      name: r.name,
      source: 'facebook',
      status: r.status,
      leads: Number(r.leads || 0),
      clicks: Number(r.clicks || 0),
      conversions: Number(r.conv_rate || 0),
      started: r.started_at ? String(r.started_at).slice(0, 10) : '--',
      externalUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${String(r.account_id || '').replace('act_', '')}&selected_campaign_ids=${r.campaign_id}`,
      accountId: r.account_id,
      accountName: r.account_name || r.account_id,
    }));

    return res.json({
      campaigns,
      meta: {
        total: campaigns.length,
        lastSyncedAt: metaRow?.last_synced_at || null,
      },
    });
  } catch (err) {
    console.error('List campaigns error:', err);
    return res.status(500).json({ error: 'Failed to list campaigns' });
  }
}

async function getFacebookStatus(req, res) {
  try {
    const [connection] = await query('SELECT is_active, token_label, updated_at FROM facebook_connections WHERE id = 1');
    const accounts = await query(
      'SELECT account_id AS id, account_name AS name, currency, is_selected, last_synced_at FROM facebook_ad_accounts ORDER BY account_name ASC'
    );

    const envToken = process.env.FACEBOOK_MARKETING_TOCKEN || process.env.FACEBOOK_MARKETING_TOKEN || process.env.FB_ACCESS_TOKEN || '';
    const connected = Boolean((connection && connection.is_active) || envToken);

    return res.json({
      connected,
      tokenLabel: connection?.token_label || (envToken ? 'env' : null),
      updatedAt: connection?.updated_at || null,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name || a.id,
        currency: a.currency || null,
        selected: Boolean(a.is_selected),
        lastSyncedAt: a.last_synced_at || null,
      })),
    });
  } catch (err) {
    console.error('Facebook status error:', err);
    return res.status(500).json({ error: 'Failed to load Facebook integration status' });
  }
}

async function saveFacebookConnection(req, res) {
  try {
    const accessToken = String(req.body?.accessToken || '').trim();
    const tokenLabel = String(req.body?.tokenLabel || 'manual').trim() || 'manual';
    const accountIds = Array.isArray(req.body?.accountIds) ? req.body.accountIds : [];

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    await query(
      `INSERT INTO facebook_connections (id, access_token, token_label, is_active)
       VALUES (1, ?, ?, 1)
       ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), token_label = VALUES(token_label), is_active = 1, updated_at = NOW()`,
      [accessToken, tokenLabel]
    );

    await ensureAccountsFromToken(accessToken);

    if (accountIds.length > 0) {
      const normalized = accountIds.map(normalizeAccountId).filter(Boolean);
      await query('UPDATE facebook_ad_accounts SET is_selected = 0');
      for (const accountId of normalized) {
        await query(
          'UPDATE facebook_ad_accounts SET is_selected = 1, updated_at = NOW() WHERE account_id = ?',
          [accountId]
        );
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Save Facebook connection error:', err);
    return res.status(500).json({ error: 'Failed to save Facebook connection' });
  }
}

async function syncCampaigns(req, res) {
  try {
    const token = await getStoredAccessToken();
    if (!token) {
      return res.status(400).json({ error: 'Facebook access token is not configured' });
    }

    await ensureAccountsFromToken(token);

    const requestedAccountIds = Array.isArray(req.body?.accountIds) ? req.body.accountIds.map(normalizeAccountId) : [];
    let accountRows;

    if (requestedAccountIds.length > 0) {
      accountRows = await query(
        `SELECT account_id FROM facebook_ad_accounts WHERE account_id IN (${requestedAccountIds.map(() => '?').join(',')})`,
        requestedAccountIds
      );
    } else {
      accountRows = await query('SELECT account_id FROM facebook_ad_accounts WHERE is_selected = 1');
      if (!accountRows.length) {
        accountRows = await query('SELECT account_id FROM facebook_ad_accounts');
      }
    }

    if (!accountRows.length) {
      return res.status(400).json({ error: 'No ad accounts available for sync' });
    }

    const dateFrom = req.body?.dateFrom ? String(req.body.dateFrom) : '';
    const dateTo = req.body?.dateTo ? String(req.body.dateTo) : '';

    let syncedCampaigns = 0;
    const startedAt = new Date();

    for (const row of accountRows) {
      const accountId = row.account_id;
      const campaigns = await fetchAllCampaignsForAccount(accountId, token);
      const insightsMap = await fetchInsightsByCampaign(accountId, token, dateFrom, dateTo);

      for (const campaign of campaigns) {
        const campaignId = String(campaign.id);
        const insight = insightsMap.get(campaignId) || { clicks: 0, leads: 0, convRate: 0 };
        const status = mapCampaignStatus(campaign.effective_status || campaign.status);
        const startedAtDate = campaign.created_time ? String(campaign.created_time).slice(0, 10) : null;
        const sourceUpdated = campaign.updated_time ? String(campaign.updated_time).replace('T', ' ').slice(0, 19) : null;

        await query(
          `INSERT INTO facebook_campaigns
            (campaign_id, account_id, name, status, objective, clicks, leads, conv_rate, started_at, last_source_update_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             account_id = VALUES(account_id),
             name = VALUES(name),
             status = VALUES(status),
             objective = VALUES(objective),
             clicks = VALUES(clicks),
             leads = VALUES(leads),
             conv_rate = VALUES(conv_rate),
             started_at = VALUES(started_at),
             last_source_update_at = VALUES(last_source_update_at),
             synced_at = CURRENT_TIMESTAMP`,
          [
            campaignId,
            accountId,
            campaign.name || `Campaign ${campaignId}`,
            status,
            campaign.objective || null,
            insight.clicks,
            insight.leads,
            insight.convRate,
            startedAtDate,
            sourceUpdated,
          ]
        );
        syncedCampaigns += 1;
      }

      await query('UPDATE facebook_ad_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE account_id = ?', [accountId]);
    }

    const finishedAt = new Date();

    return res.json({
      ok: true,
      syncedCampaigns,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    });
  } catch (err) {
    console.error('Sync campaigns error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync campaigns' });
  }
}

async function getCampaignDetails(req, res) {
  try {
    const campaignId = String(req.params.id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign id is required' });
    }

    const rows = await query(
      `SELECT c.campaign_id, c.account_id, c.name, c.status, c.objective, c.clicks, c.leads, c.conv_rate, c.started_at,
              c.last_source_update_at, c.synced_at, a.account_name, a.currency
       FROM facebook_campaigns c
       LEFT JOIN facebook_ad_accounts a ON a.account_id = c.account_id
       WHERE c.campaign_id = ?
       LIMIT 1`,
      [campaignId]
    );

    const campaign = rows[0];
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const details = {
      id: String(campaign.campaign_id),
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective || null,
      accountId: campaign.account_id,
      accountName: campaign.account_name || campaign.account_id,
      started: campaign.started_at ? String(campaign.started_at).slice(0, 10) : null,
      lastSourceUpdateAt: campaign.last_source_update_at || null,
      syncedAt: campaign.synced_at || null,
      metrics: {
        leads: Number(campaign.leads || 0),
        clicks: Number(campaign.clicks || 0),
        conversionRate: Number(campaign.conv_rate || 0),
        impressions: null,
        reach: null,
        spend: null,
        cpc: null,
        cpm: null,
        ctr: null,
      },
      billing: {
        currency: campaign.currency || null,
        accountSpend: null,
        accountBalance: null,
        accountSpendCap: null,
      },
      adSets: [],
      ads: [],
      locationBreakdown: [],
      externalUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${String(campaign.account_id || '').replace('act_', '')}&selected_campaign_ids=${campaign.campaign_id}`,
    };

    const token = await getStoredAccessToken();
    if (!token) {
      return res.json({ campaign: details });
    }

    try {
      const campaignData = await graphGet(campaign.campaign_id, token, {
        fields:
          'id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,bid_strategy,created_time,start_time,stop_time',
      });

      details.status = mapCampaignStatus(campaignData.effective_status || campaignData.status || campaign.status);
      details.objective = campaignData.objective || details.objective;
      details.buyingType = campaignData.buying_type || null;
      details.bidStrategy = campaignData.bid_strategy || null;
      details.dailyBudget = campaignData.daily_budget ? toSafeFloat(campaignData.daily_budget) / 100 : null;
      details.lifetimeBudget = campaignData.lifetime_budget ? toSafeFloat(campaignData.lifetime_budget) / 100 : null;
      details.startTime = campaignData.start_time || null;
      details.stopTime = campaignData.stop_time || null;
      details.createdTime = campaignData.created_time || null;
    } catch (err) {
      console.warn('Campaign details API fallback (campaign fields):', err.message);
    }

    try {
      const insights = await graphGet(`${campaign.account_id}/insights`, token, {
        level: 'campaign',
        fields:
          'campaign_id,impressions,reach,frequency,clicks,inline_link_clicks,unique_inline_link_clicks,cost_per_inline_link_click,spend,cpc,cpm,ctr,actions',
        filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaign.campaign_id }]),
        date_preset: 'maximum',
        limit: 1,
      });
      const row = Array.isArray(insights.data) ? insights.data[0] : null;
      if (row) {
        details.metrics = metricsFromInsightRow(row);
      }
    } catch (err) {
      console.warn('Campaign details API fallback (insights):', err.message);
    }

    try {
      const adSetsData = await graphGet(`${campaign.campaign_id}/adsets`, token, {
        fields: 'id,name,status,effective_status,start_time,end_time,daily_budget,lifetime_budget,bid_strategy',
        limit: 200,
      });
      const adSets = Array.isArray(adSetsData.data) ? adSetsData.data : [];
      details.adSets = adSets.map((adSet) => ({
        id: String(adSet.id),
        name: adSet.name || `Ad Set ${adSet.id}`,
        status: mapCampaignStatus(adSet.effective_status || adSet.status),
        startTime: adSet.start_time || null,
        endTime: adSet.end_time || null,
        bidStrategy: adSet.bid_strategy || null,
        dailyBudget: adSet.daily_budget !== undefined ? toSafeFloat(adSet.daily_budget) / 100 : null,
        lifetimeBudget: adSet.lifetime_budget !== undefined ? toSafeFloat(adSet.lifetime_budget) / 100 : null,
        metrics: null,
        ads: [],
      }));
    } catch (err) {
      console.warn('Campaign details API fallback (ad sets):', err.message);
    }

    try {
      const adSetInsights = await graphGet(`${campaign.account_id}/insights`, token, {
        level: 'adset',
        fields:
          'adset_id,impressions,reach,frequency,clicks,inline_link_clicks,unique_inline_link_clicks,cost_per_inline_link_click,spend,cpc,cpm,ctr,actions',
        filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaign.campaign_id }]),
        date_preset: 'maximum',
        limit: 500,
      });
      const rows = Array.isArray(adSetInsights.data) ? adSetInsights.data : [];
      const byId = new Map(rows.map((row) => [String(row.adset_id), metricsFromInsightRow(row)]));
      details.adSets = details.adSets.map((adSet) => ({
        ...adSet,
        metrics: byId.get(String(adSet.id)) || null,
      }));
    } catch (err) {
      console.warn('Campaign details API fallback (ad set insights):', err.message);
    }

    try {
      const adsData = await graphGet(`${campaign.campaign_id}/ads`, token, {
        fields:
          'id,name,status,effective_status,adset_id,created_time,creative{id,name,image_url,thumbnail_url,video_id,effective_object_story_id,object_story_spec}',
        limit: 500,
      });
      const ads = Array.isArray(adsData.data) ? adsData.data : [];
      details.ads = ads.map((ad) => ({
        id: String(ad.id),
        name: ad.name || `Ad ${ad.id}`,
        status: mapCampaignStatus(ad.effective_status || ad.status),
        adSetId: ad.adset_id ? String(ad.adset_id) : null,
        createdTime: ad.created_time || null,
        creative: extractCreativeMedia(ad.creative || {}),
        metrics: null,
      }));
    } catch (err) {
      console.warn('Campaign details API fallback (ads):', err.message);
    }

    try {
      const adInsights = await graphGet(`${campaign.account_id}/insights`, token, {
        level: 'ad',
        fields:
          'ad_id,impressions,reach,frequency,clicks,inline_link_clicks,unique_inline_link_clicks,cost_per_inline_link_click,spend,cpc,cpm,ctr,actions',
        filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaign.campaign_id }]),
        date_preset: 'maximum',
        limit: 1000,
      });
      const rows = Array.isArray(adInsights.data) ? adInsights.data : [];
      const byId = new Map(rows.map((row) => [String(row.ad_id), metricsFromInsightRow(row)]));
      details.ads = details.ads.map((ad) => ({
        ...ad,
        metrics: byId.get(String(ad.id)) || null,
      }));
    } catch (err) {
      console.warn('Campaign details API fallback (ad insights):', err.message);
    }

    try {
      const locationInsights = await graphGet(`${campaign.account_id}/insights`, token, {
        level: 'campaign',
        // Breakdown dimensions (like country) are returned by the API when requested in `breakdowns`.
        fields:
          'impressions,reach,frequency,clicks,inline_link_clicks,unique_inline_link_clicks,cost_per_inline_link_click,spend,cpc,cpm,ctr,actions',
        breakdowns: 'country',
        filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaign.campaign_id }]),
        date_preset: 'maximum',
        limit: 500,
      });
      const rows = Array.isArray(locationInsights.data) ? locationInsights.data : [];
      details.locationBreakdown = rows
        .map((row) => ({
          country: row.country || 'Unknown',
          ...metricsFromInsightRow(row),
        }))
        .sort((a, b) => (b.spend || 0) - (a.spend || 0));
    } catch (err) {
      console.warn('Campaign details API fallback (location breakdown):', err.message);
    }

    if (details.adSets.length > 0 && details.ads.length > 0) {
      const groupedAds = new Map();
      for (const adSet of details.adSets) {
        groupedAds.set(String(adSet.id), []);
      }
      for (const ad of details.ads) {
        const key = String(ad.adSetId || '');
        if (groupedAds.has(key)) groupedAds.get(key).push(ad);
      }
      details.adSets = details.adSets.map((adSet) => ({
        ...adSet,
        ads: groupedAds.get(String(adSet.id)) || [],
      }));
    }

    try {
      const account = await graphGet(campaign.account_id, token, {
        fields: 'id,name,currency,amount_spent,balance,spend_cap',
      });
      details.billing.currency = account.currency || details.billing.currency;
      details.billing.accountSpend = account.amount_spent !== undefined ? toSafeFloat(account.amount_spent) / 100 : null;
      details.billing.accountBalance = account.balance !== undefined ? toSafeFloat(account.balance) / 100 : null;
      details.billing.accountSpendCap = account.spend_cap !== undefined ? toSafeFloat(account.spend_cap) / 100 : null;
    } catch (err) {
      console.warn('Campaign details API fallback (account billing):', err.message);
    }

    return res.json({ campaign: details });
  } catch (err) {
    console.error('Campaign details error:', err);
    return res.status(500).json({ error: 'Failed to get campaign details' });
  }
}

const ALLOWED_MAIN_BREAKDOWNS = new Set([
  'country',
  'age',
  'gender',
  'region',
  'dma',
  'impression_device',
  'publisher_platform',
  'platform_position',
  'device_platform',
  'hourly_stats_aggregated_by_advertiser_time_zone',
]);

const ALLOWED_ACTION_BREAKDOWNS = new Set([
  'action_type',
  'action_destination',
  'action_device',
  'action_reaction',
  'action_video_sound',
  'action_target_id',
]);

function getBreakdownLabel(row, mainBreakdown, actionBreakdown) {
  const parts = [];
  if (mainBreakdown) {
    parts.push(String(row?.[mainBreakdown] || 'Unknown'));
  }
  if (actionBreakdown) {
    parts.push(String(row?.[actionBreakdown] || 'Unknown'));
  }
  return parts.length ? parts.join(' | ') : 'All';
}

async function getCampaignBreakdown(req, res) {
  try {
    const campaignId = String(req.params.id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign id is required' });
    }

    const mainBreakdown = String(req.query.main || 'country').trim();
    const actionBreakdownRaw = String(req.query.action || '').trim();
    const actionBreakdown = actionBreakdownRaw || null;

    if (!ALLOWED_MAIN_BREAKDOWNS.has(mainBreakdown)) {
      return res.status(400).json({ error: `Unsupported main breakdown: ${mainBreakdown}` });
    }
    if (actionBreakdown && !ALLOWED_ACTION_BREAKDOWNS.has(actionBreakdown)) {
      return res.status(400).json({ error: `Unsupported action breakdown: ${actionBreakdown}` });
    }

    const [campaign] = await query(
      'SELECT campaign_id, account_id FROM facebook_campaigns WHERE campaign_id = ? LIMIT 1',
      [campaignId]
    );
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const token = await getStoredAccessToken();
    if (!token) {
      return res.status(400).json({ error: 'Facebook access token is not configured' });
    }

    const params = {
      level: 'campaign',
      fields:
        'impressions,reach,frequency,clicks,inline_link_clicks,unique_inline_link_clicks,cost_per_inline_link_click,spend,cpc,cpm,ctr,actions',
      breakdowns: mainBreakdown,
      filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaign.campaign_id }]),
      date_preset: 'maximum',
      limit: 500,
    };
    let rows = [];
    let usedActionBreakdown = actionBreakdown;
    let fallbackWarning = null;

    try {
      if (actionBreakdown) {
        params.action_breakdowns = actionBreakdown;
      }
      const insights = await graphGet(`${campaign.account_id}/insights`, token, params);
      rows = Array.isArray(insights.data) ? insights.data : [];
    } catch (err) {
      const message = String(err?.message || '');
      const messageLower = message.toLowerCase();
      const isInvalidCombo =
        actionBreakdown &&
        (messageLower.includes('current combination of data breakdown columns') ||
          messageLower.includes('is invalid') ||
          messageLower.includes('invalid for fields param'));

      if (!isInvalidCombo) {
        throw err;
      }

      // Fallback: retry with only main breakdown so UI still gets usable data.
      const retryParams = {
        ...params,
      };
      delete retryParams.action_breakdowns;
      const retryInsights = await graphGet(`${campaign.account_id}/insights`, token, retryParams);
      rows = Array.isArray(retryInsights.data) ? retryInsights.data : [];
      usedActionBreakdown = null;
      fallbackWarning = `The combination "${mainBreakdown} + ${actionBreakdown}" is not supported by Meta. Showing "${mainBreakdown}" only.`;
    }

    const breakdown = rows
      .map((row) => ({
        key: getBreakdownLabel(row, mainBreakdown, usedActionBreakdown),
        dimension: mainBreakdown,
        dimensionValue: String(row?.[mainBreakdown] || 'Unknown'),
        actionDimension: usedActionBreakdown,
        actionDimensionValue: usedActionBreakdown ? String(row?.[usedActionBreakdown] || 'Unknown') : null,
        ...metricsFromInsightRow(row),
      }))
      .sort((a, b) => (b.spend || 0) - (a.spend || 0));

    return res.json({
      breakdown,
      meta: {
        mainBreakdown,
        actionBreakdown: usedActionBreakdown,
        fallbackWarning,
        total: breakdown.length,
      },
    });
  } catch (err) {
    console.error('Campaign breakdown error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get campaign breakdown' });
  }
}

module.exports = {
  listCampaigns,
  syncCampaigns,
  getFacebookStatus,
  saveFacebookConnection,
  getCampaignDetails,
  getCampaignBreakdown,
};
