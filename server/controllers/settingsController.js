const { query } = require('../config/db');

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeConditionType(value) {
  const allowed = ['keyword', 'response_speed', 'message_count', 'asked_callback'];
  return allowed.includes(value) ? value : null;
}

function normalizeTagColor(value) {
  const color = String(value || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  return color.toLowerCase();
}

function normalizeMatchType(value) {
  const allowed = ['contains', 'exact'];
  return allowed.includes(value) ? value : null;
}

function normalizeTriggerAction(value) {
  const allowed = ['reply', 'escalate', 'menu'];
  return allowed.includes(value) ? value : null;
}

async function listScoringRules(req, res) {
  try {
    const rows = await query(
      'SELECT id, condition_type, value, points, enabled, created_at, updated_at FROM scoring_rules ORDER BY id DESC'
    );
    const rules = rows.map((r) => ({
      id: String(r.id),
      conditionType: r.condition_type,
      value: r.value || '',
      points: Number(r.points || 0),
      enabled: Boolean(r.enabled),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ rules });
  } catch (err) {
    console.error('List scoring rules error:', err);
    return res.status(500).json({ error: 'Failed to list scoring rules' });
  }
}

async function createScoringRule(req, res) {
  try {
    const conditionType = normalizeConditionType(req.body?.conditionType);
    const value = String(req.body?.value || '').trim();
    const points = toInt(req.body?.points, -1);
    const enabled = req.body?.enabled === undefined ? true : Boolean(req.body.enabled);

    if (!conditionType) {
      return res.status(400).json({ error: 'Invalid conditionType' });
    }
    if (conditionType !== 'asked_callback' && !value) {
      return res.status(400).json({ error: 'Value is required for this condition type' });
    }
    if (points < 0 || points > 1000) {
      return res.status(400).json({ error: 'Points must be between 0 and 1000' });
    }

    const result = await query(
      'INSERT INTO scoring_rules (condition_type, value, points, enabled) VALUES (?, ?, ?, ?)',
      [conditionType, value || null, points, enabled ? 1 : 0]
    );

    const [row] = await query(
      'SELECT id, condition_type, value, points, enabled, created_at, updated_at FROM scoring_rules WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      rule: {
        id: String(row.id),
        conditionType: row.condition_type,
        value: row.value || '',
        points: Number(row.points || 0),
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Create scoring rule error:', err);
    return res.status(500).json({ error: 'Failed to create scoring rule' });
  }
}

async function updateScoringRule(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.conditionType !== undefined) {
      const conditionType = normalizeConditionType(req.body.conditionType);
      if (!conditionType) {
        return res.status(400).json({ error: 'Invalid conditionType' });
      }
      updates.push('condition_type = ?');
      params.push(conditionType);
    }

    if (req.body?.value !== undefined) {
      updates.push('value = ?');
      params.push(String(req.body.value || '').trim() || null);
    }

    if (req.body?.points !== undefined) {
      const points = toInt(req.body.points, -1);
      if (points < 0 || points > 1000) {
        return res.status(400).json({ error: 'Points must be between 0 and 1000' });
      }
      updates.push('points = ?');
      params.push(points);
    }

    if (req.body?.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(Boolean(req.body.enabled) ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(`UPDATE scoring_rules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }

    const [row] = await query(
      'SELECT id, condition_type, value, points, enabled, created_at, updated_at FROM scoring_rules WHERE id = ?',
      [id]
    );

    return res.json({
      rule: {
        id: String(row.id),
        conditionType: row.condition_type,
        value: row.value || '',
        points: Number(row.points || 0),
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Update scoring rule error:', err);
    return res.status(500).json({ error: 'Failed to update scoring rule' });
  }
}

async function deleteScoringRule(req, res) {
  try {
    const result = await query('DELETE FROM scoring_rules WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete scoring rule error:', err);
    return res.status(500).json({ error: 'Failed to delete scoring rule' });
  }
}

async function getLeadThreshold(req, res) {
  try {
    const [row] = await query('SELECT warm_threshold, hot_threshold FROM lead_scoring_config WHERE id = 1');
    if (!row) {
      return res.json({ warmThreshold: 40, hotThreshold: 70 });
    }
    return res.json({
      warmThreshold: Number(row.warm_threshold || 0),
      hotThreshold: Number(row.hot_threshold || 0),
    });
  } catch (err) {
    console.error('Get lead threshold error:', err);
    return res.status(500).json({ error: 'Failed to get lead threshold' });
  }
}

async function updateLeadThreshold(req, res) {
  try {
    const warmThreshold = toInt(req.body?.warmThreshold, -1);
    const hotThreshold = toInt(req.body?.hotThreshold, -1);

    if (warmThreshold < 0 || warmThreshold > 100 || hotThreshold < 0 || hotThreshold > 100) {
      return res.status(400).json({ error: 'Thresholds must be between 0 and 100' });
    }
    if (warmThreshold >= hotThreshold) {
      return res.status(400).json({ error: 'warmThreshold must be lower than hotThreshold' });
    }

    await query(
      `INSERT INTO lead_scoring_config (id, warm_threshold, hot_threshold)
       VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE warm_threshold = VALUES(warm_threshold), hot_threshold = VALUES(hot_threshold), updated_at = NOW()`,
      [warmThreshold, hotThreshold]
    );

    return res.json({ warmThreshold, hotThreshold });
  } catch (err) {
    console.error('Update lead threshold error:', err);
    return res.status(500).json({ error: 'Failed to update lead threshold' });
  }
}

async function listKeywordWeights(req, res) {
  try {
    const rows = await query('SELECT id, keyword, weight, created_at, updated_at FROM keyword_weights ORDER BY id DESC');
    const weights = rows.map((r) => ({
      id: String(r.id),
      keyword: r.keyword,
      weight: Number(r.weight || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ weights });
  } catch (err) {
    console.error('List keyword weights error:', err);
    return res.status(500).json({ error: 'Failed to list keyword weights' });
  }
}

async function createKeywordWeight(req, res) {
  try {
    const keyword = String(req.body?.keyword || '').trim().toLowerCase();
    const weight = toInt(req.body?.weight, -1);

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    if (weight < 0 || weight > 1000) {
      return res.status(400).json({ error: 'Weight must be between 0 and 1000' });
    }

    const result = await query('INSERT INTO keyword_weights (keyword, weight) VALUES (?, ?)', [keyword, weight]);
    const [row] = await query('SELECT id, keyword, weight, created_at, updated_at FROM keyword_weights WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      keywordWeight: {
        id: String(row.id),
        keyword: row.keyword,
        weight: Number(row.weight || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Keyword already exists' });
    }
    console.error('Create keyword weight error:', err);
    return res.status(500).json({ error: 'Failed to create keyword weight' });
  }
}

async function updateKeywordWeight(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.keyword !== undefined) {
      const keyword = String(req.body.keyword || '').trim().toLowerCase();
      if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
      }
      updates.push('keyword = ?');
      params.push(keyword);
    }

    if (req.body?.weight !== undefined) {
      const weight = toInt(req.body.weight, -1);
      if (weight < 0 || weight > 1000) {
        return res.status(400).json({ error: 'Weight must be between 0 and 1000' });
      }
      updates.push('weight = ?');
      params.push(weight);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(`UPDATE keyword_weights SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Keyword weight not found' });
    }

    const [row] = await query('SELECT id, keyword, weight, created_at, updated_at FROM keyword_weights WHERE id = ?', [id]);
    return res.json({
      keywordWeight: {
        id: String(row.id),
        keyword: row.keyword,
        weight: Number(row.weight || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Keyword already exists' });
    }
    console.error('Update keyword weight error:', err);
    return res.status(500).json({ error: 'Failed to update keyword weight' });
  }
}

async function deleteKeywordWeight(req, res) {
  try {
    const result = await query('DELETE FROM keyword_weights WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Keyword weight not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete keyword weight error:', err);
    return res.status(500).json({ error: 'Failed to delete keyword weight' });
  }
}

async function listLeadTags(req, res) {
  try {
    const rows = await query('SELECT id, name, color, created_at, updated_at FROM lead_tags ORDER BY id DESC');
    const tags = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      color: r.color,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ tags });
  } catch (err) {
    console.error('List lead tags error:', err);
    return res.status(500).json({ error: 'Failed to list lead tags' });
  }
}

async function createLeadTag(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const color = normalizeTagColor(req.body?.color);

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    if (!color) {
      return res.status(400).json({ error: 'Color must be a hex value like #22c55e' });
    }

    const result = await query('INSERT INTO lead_tags (name, color) VALUES (?, ?)', [name, color]);
    const [row] = await query('SELECT id, name, color, created_at, updated_at FROM lead_tags WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      tag: {
        id: String(row.id),
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Create lead tag error:', err);
    return res.status(500).json({ error: 'Failed to create lead tag' });
  }
}

async function updateLeadTag(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Tag name is required' });
      }
      updates.push('name = ?');
      params.push(name);
    }

    if (req.body?.color !== undefined) {
      const color = normalizeTagColor(req.body.color);
      if (!color) {
        return res.status(400).json({ error: 'Color must be a hex value like #22c55e' });
      }
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(`UPDATE lead_tags SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const [row] = await query('SELECT id, name, color, created_at, updated_at FROM lead_tags WHERE id = ?', [id]);
    return res.json({
      tag: {
        id: String(row.id),
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Update lead tag error:', err);
    return res.status(500).json({ error: 'Failed to update lead tag' });
  }
}

async function deleteLeadTag(req, res) {
  try {
    const result = await query('DELETE FROM lead_tags WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete lead tag error:', err);
    return res.status(500).json({ error: 'Failed to delete lead tag' });
  }
}

async function listAutoReplies(req, res) {
  try {
    const rows = await query(
      'SELECT id, trigger_text, reply_text, match_type, enabled, created_at, updated_at FROM auto_reply_rules ORDER BY id DESC'
    );
    const rules = rows.map((r) => ({
      id: String(r.id),
      trigger: r.trigger_text,
      reply: r.reply_text,
      matchType: r.match_type,
      enabled: Boolean(r.enabled),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ rules });
  } catch (err) {
    console.error('List auto replies error:', err);
    return res.status(500).json({ error: 'Failed to list auto replies' });
  }
}

async function createAutoReply(req, res) {
  try {
    const trigger = String(req.body?.trigger || '').trim();
    const reply = String(req.body?.reply || '').trim();
    const matchType = normalizeMatchType(req.body?.matchType || 'contains');
    const enabled = req.body?.enabled === undefined ? true : Boolean(req.body.enabled);

    if (!trigger) {
      return res.status(400).json({ error: 'Trigger is required' });
    }
    if (!reply) {
      return res.status(400).json({ error: 'Reply is required' });
    }
    if (!matchType) {
      return res.status(400).json({ error: 'Invalid matchType' });
    }

    const result = await query(
      'INSERT INTO auto_reply_rules (trigger_text, reply_text, match_type, enabled) VALUES (?, ?, ?, ?)',
      [trigger, reply, matchType, enabled ? 1 : 0]
    );
    const [row] = await query(
      'SELECT id, trigger_text, reply_text, match_type, enabled, created_at, updated_at FROM auto_reply_rules WHERE id = ?',
      [result.insertId]
    );
    return res.status(201).json({
      rule: {
        id: String(row.id),
        trigger: row.trigger_text,
        reply: row.reply_text,
        matchType: row.match_type,
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Create auto reply error:', err);
    return res.status(500).json({ error: 'Failed to create auto reply' });
  }
}

async function updateAutoReply(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.trigger !== undefined) {
      const trigger = String(req.body.trigger || '').trim();
      if (!trigger) return res.status(400).json({ error: 'Trigger is required' });
      updates.push('trigger_text = ?');
      params.push(trigger);
    }

    if (req.body?.reply !== undefined) {
      const reply = String(req.body.reply || '').trim();
      if (!reply) return res.status(400).json({ error: 'Reply is required' });
      updates.push('reply_text = ?');
      params.push(reply);
    }

    if (req.body?.matchType !== undefined) {
      const matchType = normalizeMatchType(req.body.matchType);
      if (!matchType) return res.status(400).json({ error: 'Invalid matchType' });
      updates.push('match_type = ?');
      params.push(matchType);
    }

    if (req.body?.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(Boolean(req.body.enabled) ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(`UPDATE auto_reply_rules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Auto reply rule not found' });
    }

    const [row] = await query(
      'SELECT id, trigger_text, reply_text, match_type, enabled, created_at, updated_at FROM auto_reply_rules WHERE id = ?',
      [id]
    );
    return res.json({
      rule: {
        id: String(row.id),
        trigger: row.trigger_text,
        reply: row.reply_text,
        matchType: row.match_type,
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Update auto reply error:', err);
    return res.status(500).json({ error: 'Failed to update auto reply' });
  }
}

async function deleteAutoReply(req, res) {
  try {
    const result = await query('DELETE FROM auto_reply_rules WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Auto reply rule not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete auto reply error:', err);
    return res.status(500).json({ error: 'Failed to delete auto reply' });
  }
}

async function getWelcomeMessage(req, res) {
  try {
    const [row] = await query('SELECT welcome_enabled, welcome_message FROM bot_message_settings WHERE id = 1');
    if (!row) {
      return res.json({
        enabled: true,
        message: "Hello! Thanks for reaching out. I'm your assistant and I'm here to help. How can I assist you today?",
      });
    }
    return res.json({
      enabled: Boolean(row.welcome_enabled),
      message: row.welcome_message,
    });
  } catch (err) {
    console.error('Get welcome message error:', err);
    return res.status(500).json({ error: 'Failed to get welcome message' });
  }
}

async function updateWelcomeMessage(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    const enabled = req.body?.enabled === undefined ? true : Boolean(req.body.enabled);
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await query(
      `INSERT INTO bot_message_settings (id, welcome_enabled, welcome_message, fallback_enabled, fallback_message)
       VALUES (1, ?, ?, 1, 'I''m sorry, I didn''t quite understand that. Could you please rephrase or type ''help'' to see our options?')
       ON DUPLICATE KEY UPDATE welcome_enabled = VALUES(welcome_enabled), welcome_message = VALUES(welcome_message), updated_at = NOW()`,
      [enabled ? 1 : 0, message]
    );

    return res.json({ enabled, message });
  } catch (err) {
    console.error('Update welcome message error:', err);
    return res.status(500).json({ error: 'Failed to update welcome message' });
  }
}

async function listKeywordTriggers(req, res) {
  try {
    const rows = await query(
      'SELECT id, keywords, action, value_text, enabled, created_at, updated_at FROM keyword_triggers ORDER BY id DESC'
    );
    const triggers = rows.map((r) => ({
      id: String(r.id),
      keywords: r.keywords,
      action: r.action,
      value: r.value_text || '',
      enabled: Boolean(r.enabled),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ triggers });
  } catch (err) {
    console.error('List keyword triggers error:', err);
    return res.status(500).json({ error: 'Failed to list keyword triggers' });
  }
}

async function createKeywordTrigger(req, res) {
  try {
    const keywords = String(req.body?.keywords || '').trim();
    const action = normalizeTriggerAction(req.body?.action);
    const value = String(req.body?.value || '').trim();
    const enabled = req.body?.enabled === undefined ? true : Boolean(req.body.enabled);

    if (!keywords) return res.status(400).json({ error: 'Keywords are required' });
    if (!action) return res.status(400).json({ error: 'Invalid action' });
    if (action !== 'escalate' && !value) return res.status(400).json({ error: 'Value is required for this action' });

    const result = await query(
      'INSERT INTO keyword_triggers (keywords, action, value_text, enabled) VALUES (?, ?, ?, ?)',
      [keywords, action, value || null, enabled ? 1 : 0]
    );

    const [row] = await query(
      'SELECT id, keywords, action, value_text, enabled, created_at, updated_at FROM keyword_triggers WHERE id = ?',
      [result.insertId]
    );
    return res.status(201).json({
      trigger: {
        id: String(row.id),
        keywords: row.keywords,
        action: row.action,
        value: row.value_text || '',
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Create keyword trigger error:', err);
    return res.status(500).json({ error: 'Failed to create keyword trigger' });
  }
}

async function updateKeywordTrigger(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.keywords !== undefined) {
      const keywords = String(req.body.keywords || '').trim();
      if (!keywords) return res.status(400).json({ error: 'Keywords are required' });
      updates.push('keywords = ?');
      params.push(keywords);
    }

    if (req.body?.action !== undefined) {
      const action = normalizeTriggerAction(req.body.action);
      if (!action) return res.status(400).json({ error: 'Invalid action' });
      updates.push('action = ?');
      params.push(action);
    }

    if (req.body?.value !== undefined) {
      updates.push('value_text = ?');
      params.push(String(req.body.value || '').trim() || null);
    }

    if (req.body?.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(Boolean(req.body.enabled) ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(`UPDATE keyword_triggers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Keyword trigger not found' });

    const [row] = await query(
      'SELECT id, keywords, action, value_text, enabled, created_at, updated_at FROM keyword_triggers WHERE id = ?',
      [id]
    );
    return res.json({
      trigger: {
        id: String(row.id),
        keywords: row.keywords,
        action: row.action,
        value: row.value_text || '',
        enabled: Boolean(row.enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Update keyword trigger error:', err);
    return res.status(500).json({ error: 'Failed to update keyword trigger' });
  }
}

async function deleteKeywordTrigger(req, res) {
  try {
    const result = await query('DELETE FROM keyword_triggers WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Keyword trigger not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete keyword trigger error:', err);
    return res.status(500).json({ error: 'Failed to delete keyword trigger' });
  }
}

async function getFallbackMessage(req, res) {
  try {
    const [row] = await query('SELECT fallback_enabled, fallback_message FROM bot_message_settings WHERE id = 1');
    if (!row) {
      return res.json({
        enabled: true,
        message: "I'm sorry, I didn't quite understand that. Could you please rephrase or type 'help' to see our options?",
      });
    }
    return res.json({
      enabled: Boolean(row.fallback_enabled),
      message: row.fallback_message,
    });
  } catch (err) {
    console.error('Get fallback message error:', err);
    return res.status(500).json({ error: 'Failed to get fallback message' });
  }
}

async function updateFallbackMessage(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    const enabled = req.body?.enabled === undefined ? true : Boolean(req.body.enabled);
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await query(
      `INSERT INTO bot_message_settings (id, welcome_enabled, welcome_message, fallback_enabled, fallback_message)
       VALUES (1, 1, 'Hello! Thanks for reaching out. I''m your assistant and I''m here to help. How can I assist you today?', ?, ?)
       ON DUPLICATE KEY UPDATE fallback_enabled = VALUES(fallback_enabled), fallback_message = VALUES(fallback_message), updated_at = NOW()`,
      [enabled ? 1 : 0, message]
    );

    return res.json({ enabled, message });
  } catch (err) {
    console.error('Update fallback message error:', err);
    return res.status(500).json({ error: 'Failed to update fallback message' });
  }
}

async function getBotStatus(req, res) {
  try {
    const [row] = await query(
      'SELECT bot_enabled, away_enabled, away_message FROM bot_status_settings WHERE id = 1'
    );

    const [botConversationsRow] = await query(
      'SELECT COUNT(*) AS cnt FROM conversations WHERE status = ?',
      ['bot']
    );
    const [botTodayRow] = await query(
      "SELECT COUNT(*) AS cnt FROM messages WHERE direction = 'out' AND sender = 'business' AND DATE(created_at) = CURDATE()"
    );
    const [avgRow] = await query(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, m1.created_at, (
          SELECT MIN(m2.created_at)
          FROM messages m2
          WHERE m2.conversation_id = m1.conversation_id
            AND m2.created_at >= m1.created_at
            AND m2.direction = 'out'
            AND m2.sender = 'business'
        ))) AS avg_seconds
       FROM messages m1
       WHERE m1.direction = 'in'
         AND DATE(m1.created_at) = CURDATE()`
    );

    const avgSecondsRaw = Number(avgRow?.avg_seconds || 0);
    const avgResponseSeconds = Number.isFinite(avgSecondsRaw) ? Math.max(0, Math.round(avgSecondsRaw)) : 0;

    return res.json({
      botEnabled: row ? Boolean(row.bot_enabled) : true,
      awayEnabled: row ? Boolean(row.away_enabled) : false,
      awayMessage: row
        ? row.away_message
        : "Our team is currently away. We'll respond as soon as possible. For urgent matters, please leave your contact details.",
      stats: {
        botActiveConversations: Number(botConversationsRow?.cnt || 0),
        botMessagesToday: Number(botTodayRow?.cnt || 0),
        avgResponseSeconds,
      },
    });
  } catch (err) {
    console.error('Get bot status error:', err);
    return res.status(500).json({ error: 'Failed to get bot status' });
  }
}

async function updateBotStatus(req, res) {
  try {
    const botEnabled = req.body?.botEnabled === undefined ? true : Boolean(req.body.botEnabled);
    const awayEnabled = req.body?.awayEnabled === undefined ? false : Boolean(req.body.awayEnabled);
    const awayMessage = String(req.body?.awayMessage || '').trim();

    if (!awayMessage) {
      return res.status(400).json({ error: 'awayMessage is required' });
    }

    await query(
      `INSERT INTO bot_status_settings (id, bot_enabled, away_enabled, away_message)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bot_enabled = VALUES(bot_enabled), away_enabled = VALUES(away_enabled), away_message = VALUES(away_message), updated_at = NOW()`,
      [botEnabled ? 1 : 0, awayEnabled ? 1 : 0, awayMessage]
    );

    return res.json({
      botEnabled,
      awayEnabled,
      awayMessage,
    });
  } catch (err) {
    console.error('Update bot status error:', err);
    return res.status(500).json({ error: 'Failed to update bot status' });
  }
}

module.exports = {
  listScoringRules,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
  getLeadThreshold,
  updateLeadThreshold,
  listKeywordWeights,
  createKeywordWeight,
  updateKeywordWeight,
  deleteKeywordWeight,
  listLeadTags,
  createLeadTag,
  updateLeadTag,
  deleteLeadTag,
  listAutoReplies,
  createAutoReply,
  updateAutoReply,
  deleteAutoReply,
  getWelcomeMessage,
  updateWelcomeMessage,
  listKeywordTriggers,
  createKeywordTrigger,
  updateKeywordTrigger,
  deleteKeywordTrigger,
  getFallbackMessage,
  updateFallbackMessage,
  getBotStatus,
  updateBotStatus,
};
