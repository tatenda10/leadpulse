const { query } = require('../config/db');

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeTagColor(value) {
  const color = String(value || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  return color.toLowerCase();
}

function normalizeCriteriaType(value) {
  const allowed = ['score', 'last_contact', 'tag', 'source'];
  return allowed.includes(value) ? value : null;
}

function generateManualWaId() {
  return `manual_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function formatRelativeTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toISOString().slice(0, 10);
}

function segmentCriteriaLabel(type, value) {
  if (type === 'score') return `Score >= ${value}`;
  if (type === 'last_contact') return `Last contact <= ${value} days`;
  if (type === 'tag') return `Tag: ${value}`;
  if (type === 'source') return `Source: ${value}`;
  return value || '--';
}

async function listContacts(req, res) {
  try {
    const rows = await query(
      `SELECT ct.id, ct.wa_id, ct.phone, ct.name AS profile_name,
        cp.display_name,
        COALESCE((SELECT lead_score FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), 0) AS lead_score,
        COALESCE((SELECT source FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), 'organic') AS source,
        (SELECT last_message_at FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1) AS last_contact_at
       FROM contacts ct
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       ORDER BY COALESCE((SELECT last_message_at FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), ct.updated_at) DESC, ct.id DESC`
    );

    const contacts = rows.map((r) => ({
      id: String(r.id),
      name: r.display_name || r.profile_name || r.phone || r.wa_id,
      profileName: r.profile_name || null,
      displayName: r.display_name || null,
      phone: r.phone || r.wa_id,
      waId: r.wa_id,
      score: Number(r.lead_score || 0),
      source: r.source || 'organic',
      lastContactAt: r.last_contact_at,
      lastContact: formatRelativeTime(r.last_contact_at),
    }));

    return res.json({ contacts });
  } catch (err) {
    console.error('List contacts error:', err);
    return res.status(500).json({ error: 'Failed to list contacts' });
  }
}

async function createContact(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const providedWaId = String(req.body?.waId || '').trim();

    if (!name && !phone && !providedWaId) {
      return res.status(400).json({ error: 'Provide at least name, phone, or waId' });
    }

    const waId = providedWaId || phone.replace(/\D/g, '') || generateManualWaId();
    const contactPhone = phone || waId;

    const result = await query(
      'INSERT INTO contacts (wa_id, phone, name) VALUES (?, ?, ?)',
      [waId, contactPhone, name || null]
    );

    if (name) {
      await query(
        'INSERT INTO contact_profiles (contact_id, display_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), updated_at = NOW()',
        [result.insertId, name]
      );
    }

    return res.status(201).json({ contactId: String(result.insertId) });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Contact with this waId/phone already exists' });
    }
    console.error('Create contact error:', err);
    return res.status(500).json({ error: 'Failed to create contact' });
  }
}

async function updateContact(req, res) {
  try {
    const id = req.params.id;
    const displayName = req.body?.displayName !== undefined ? String(req.body.displayName || '').trim() : undefined;
    const phone = req.body?.phone !== undefined ? String(req.body.phone || '').trim() : undefined;

    if (displayName === undefined && phone === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (phone !== undefined) {
      await query('UPDATE contacts SET phone = ?, updated_at = NOW() WHERE id = ?', [phone || null, id]);
    }

    if (displayName !== undefined) {
      if (displayName) {
        await query(
          'INSERT INTO contact_profiles (contact_id, display_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), updated_at = NOW()',
          [id, displayName]
        );
      } else {
        await query('DELETE FROM contact_profiles WHERE contact_id = ?', [id]);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Update contact error:', err);
    return res.status(500).json({ error: 'Failed to update contact' });
  }
}

async function deleteContact(req, res) {
  try {
    const id = req.params.id;
    const result = await query('DELETE FROM contacts WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete contact error:', err);
    return res.status(500).json({ error: 'Failed to delete contact' });
  }
}

async function listContactNotes(req, res) {
  try {
    const rows = await query(
      `SELECT n.id, n.contact_id, n.note_text, n.author, n.created_at,
        COALESCE(cp.display_name, ct.name, ct.phone, ct.wa_id) AS contact_name
       FROM contact_notes n
       JOIN contacts ct ON ct.id = n.contact_id
       LEFT JOIN contact_profiles cp ON cp.contact_id = ct.id
       ORDER BY n.created_at DESC`
    );

    const notes = rows.map((r) => ({
      id: String(r.id),
      contactId: String(r.contact_id),
      contactName: r.contact_name,
      text: r.note_text,
      author: r.author,
      createdAt: new Date(r.created_at).toLocaleString(),
    }));

    return res.json({ notes });
  } catch (err) {
    console.error('List contact notes error:', err);
    return res.status(500).json({ error: 'Failed to list notes' });
  }
}

async function createContactNote(req, res) {
  try {
    const contactId = String(req.body?.contactId || '').trim();
    const text = String(req.body?.text || '').trim();

    if (!contactId) return res.status(400).json({ error: 'contactId is required' });
    if (!text) return res.status(400).json({ error: 'text is required' });

    const existing = await query('SELECT id FROM contacts WHERE id = ?', [contactId]);
    if (!existing[0]) return res.status(404).json({ error: 'Contact not found' });

    const author = req.user?.username || 'system';
    const result = await query(
      'INSERT INTO contact_notes (contact_id, note_text, author) VALUES (?, ?, ?)',
      [contactId, text, author]
    );

    return res.status(201).json({ noteId: String(result.insertId) });
  } catch (err) {
    console.error('Create contact note error:', err);
    return res.status(500).json({ error: 'Failed to create note' });
  }
}

async function deleteContactNote(req, res) {
  try {
    const result = await query('DELETE FROM contact_notes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Note not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete contact note error:', err);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
}

async function countSegmentContacts(criteriaType, criteriaValue) {
  if (criteriaType === 'score') {
    const threshold = toInt(criteriaValue, 0);
    const [row] = await query(
      `SELECT COUNT(*) AS cnt FROM contacts ct
       WHERE COALESCE((SELECT lead_score FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), 0) >= ?`,
      [threshold]
    );
    return Number(row?.cnt || 0);
  }

  if (criteriaType === 'last_contact') {
    const days = toInt(criteriaValue, 7);
    const [row] = await query(
      `SELECT COUNT(*) AS cnt FROM contacts ct
       WHERE TIMESTAMPDIFF(DAY,
         COALESCE((SELECT last_message_at FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), ct.created_at),
         NOW()
       ) <= ?`,
      [days]
    );
    return Number(row?.cnt || 0);
  }

  if (criteriaType === 'source') {
    const [row] = await query(
      `SELECT COUNT(*) AS cnt FROM contacts ct
       WHERE LOWER(COALESCE((SELECT source FROM conversations c WHERE c.contact_id = ct.id ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC LIMIT 1), '')) = LOWER(?)`,
      [String(criteriaValue || '')]
    );
    return Number(row?.cnt || 0);
  }

  if (criteriaType === 'tag') {
    const [row] = await query(
      `SELECT COUNT(DISTINCT cta.contact_id) AS cnt
       FROM contact_tag_assignments cta
       JOIN contact_tags t ON t.id = cta.tag_id
       WHERE LOWER(t.name) = LOWER(?)`,
      [String(criteriaValue || '')]
    );
    return Number(row?.cnt || 0);
  }

  return 0;
}

async function listContactSegments(req, res) {
  try {
    const rows = await query(
      'SELECT id, name, description, criteria_type, criteria_value, created_at, updated_at FROM contact_segments ORDER BY id DESC'
    );

    const segments = [];
    for (const row of rows) {
      const contactCount = await countSegmentContacts(row.criteria_type, row.criteria_value);
      segments.push({
        id: String(row.id),
        name: row.name,
        description: row.description || '',
        criteriaType: row.criteria_type,
        criteriaValue: row.criteria_value,
        criteria: segmentCriteriaLabel(row.criteria_type, row.criteria_value),
        contactCount,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return res.json({ segments });
  } catch (err) {
    console.error('List contact segments error:', err);
    return res.status(500).json({ error: 'Failed to list segments' });
  }
}

async function createContactSegment(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const criteriaType = normalizeCriteriaType(req.body?.criteriaType);
    const criteriaValue = String(req.body?.criteriaValue || '').trim();

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!criteriaType) return res.status(400).json({ error: 'Invalid criteriaType' });
    if (!criteriaValue) return res.status(400).json({ error: 'criteriaValue is required' });

    const result = await query(
      'INSERT INTO contact_segments (name, description, criteria_type, criteria_value) VALUES (?, ?, ?, ?)',
      [name, description || null, criteriaType, criteriaValue]
    );

    return res.status(201).json({ segmentId: String(result.insertId) });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Segment name already exists' });
    }
    console.error('Create contact segment error:', err);
    return res.status(500).json({ error: 'Failed to create segment' });
  }
}

async function updateContactSegment(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name is required' });
      updates.push('name = ?');
      params.push(name);
    }
    if (req.body?.description !== undefined) {
      updates.push('description = ?');
      params.push(String(req.body.description || '').trim() || null);
    }
    if (req.body?.criteriaType !== undefined) {
      const criteriaType = normalizeCriteriaType(req.body.criteriaType);
      if (!criteriaType) return res.status(400).json({ error: 'Invalid criteriaType' });
      updates.push('criteria_type = ?');
      params.push(criteriaType);
    }
    if (req.body?.criteriaValue !== undefined) {
      const value = String(req.body.criteriaValue || '').trim();
      if (!value) return res.status(400).json({ error: 'criteriaValue is required' });
      updates.push('criteria_value = ?');
      params.push(value);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const result = await query(`UPDATE contact_segments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Segment not found' });

    return res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Segment name already exists' });
    }
    console.error('Update contact segment error:', err);
    return res.status(500).json({ error: 'Failed to update segment' });
  }
}

async function deleteContactSegment(req, res) {
  try {
    const result = await query('DELETE FROM contact_segments WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Segment not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete contact segment error:', err);
    return res.status(500).json({ error: 'Failed to delete segment' });
  }
}

async function listContactTags(req, res) {
  try {
    const rows = await query(
      `SELECT t.id, t.name, t.color, t.created_at, t.updated_at,
        COUNT(cta.id) AS contact_count
       FROM contact_tags t
       LEFT JOIN contact_tag_assignments cta ON cta.tag_id = t.id
       GROUP BY t.id, t.name, t.color, t.created_at, t.updated_at
       ORDER BY t.id DESC`
    );

    const tags = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      color: r.color,
      contactCount: Number(r.contact_count || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return res.json({ tags });
  } catch (err) {
    console.error('List contact tags error:', err);
    return res.status(500).json({ error: 'Failed to list contact tags' });
  }
}

async function createContactTag(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const color = normalizeTagColor(req.body?.color);

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!color) return res.status(400).json({ error: 'Invalid color' });

    const result = await query('INSERT INTO contact_tags (name, color) VALUES (?, ?)', [name, color]);
    return res.status(201).json({ tagId: String(result.insertId) });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Create contact tag error:', err);
    return res.status(500).json({ error: 'Failed to create tag' });
  }
}

async function updateContactTag(req, res) {
  try {
    const id = req.params.id;
    const updates = [];
    const params = [];

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name is required' });
      updates.push('name = ?');
      params.push(name);
    }
    if (req.body?.color !== undefined) {
      const color = normalizeTagColor(req.body.color);
      if (!color) return res.status(400).json({ error: 'Invalid color' });
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const result = await query(`UPDATE contact_tags SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Tag not found' });

    return res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Update contact tag error:', err);
    return res.status(500).json({ error: 'Failed to update tag' });
  }
}

async function deleteContactTag(req, res) {
  try {
    const result = await query('DELETE FROM contact_tags WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Tag not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete contact tag error:', err);
    return res.status(500).json({ error: 'Failed to delete tag' });
  }
}

module.exports = {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listContactNotes,
  createContactNote,
  deleteContactNote,
  listContactSegments,
  createContactSegment,
  updateContactSegment,
  deleteContactSegment,
  listContactTags,
  createContactTag,
  updateContactTag,
  deleteContactTag,
};
