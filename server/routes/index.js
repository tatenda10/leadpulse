const express = require('express');
const authController = require('../controllers/authController');
const webhookController = require('../controllers/webhookController');
const conversationsController = require('../controllers/conversationsController');
const settingsController = require('../controllers/settingsController');
const contactsController = require('../controllers/contactsController');
const campaignsController = require('../controllers/campaignsController');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Auth
router.post('/auth/login', authController.login);

// WhatsApp webhook (Meta: GET verify; POST is mounted in index.js with raw body)
router.get('/webhook', webhookController.verify);

// Conversations API (protected)
router.get('/conversations', authMiddleware, conversationsController.list);
router.get('/conversations/:id/messages', authMiddleware, conversationsController.getMessages);
router.post('/conversations/:id/messages', authMiddleware, conversationsController.sendMessage);
router.patch('/conversations/:id', authMiddleware, conversationsController.update);

// Lead intelligence settings (protected)
router.get('/settings/scoring-rules', authMiddleware, settingsController.listScoringRules);
router.post('/settings/scoring-rules', authMiddleware, settingsController.createScoringRule);
router.patch('/settings/scoring-rules/:id', authMiddleware, settingsController.updateScoringRule);
router.delete('/settings/scoring-rules/:id', authMiddleware, settingsController.deleteScoringRule);

router.get('/settings/hot-lead-threshold', authMiddleware, settingsController.getLeadThreshold);
router.put('/settings/hot-lead-threshold', authMiddleware, settingsController.updateLeadThreshold);

router.get('/settings/keyword-weights', authMiddleware, settingsController.listKeywordWeights);
router.post('/settings/keyword-weights', authMiddleware, settingsController.createKeywordWeight);
router.patch('/settings/keyword-weights/:id', authMiddleware, settingsController.updateKeywordWeight);
router.delete('/settings/keyword-weights/:id', authMiddleware, settingsController.deleteKeywordWeight);

router.get('/settings/lead-tags', authMiddleware, settingsController.listLeadTags);
router.post('/settings/lead-tags', authMiddleware, settingsController.createLeadTag);
router.patch('/settings/lead-tags/:id', authMiddleware, settingsController.updateLeadTag);
router.delete('/settings/lead-tags/:id', authMiddleware, settingsController.deleteLeadTag);

// Chatbot settings (protected)
router.get('/settings/auto-replies', authMiddleware, settingsController.listAutoReplies);
router.post('/settings/auto-replies', authMiddleware, settingsController.createAutoReply);
router.patch('/settings/auto-replies/:id', authMiddleware, settingsController.updateAutoReply);
router.delete('/settings/auto-replies/:id', authMiddleware, settingsController.deleteAutoReply);

router.get('/settings/welcome-message', authMiddleware, settingsController.getWelcomeMessage);
router.put('/settings/welcome-message', authMiddleware, settingsController.updateWelcomeMessage);

router.get('/settings/keyword-triggers', authMiddleware, settingsController.listKeywordTriggers);
router.post('/settings/keyword-triggers', authMiddleware, settingsController.createKeywordTrigger);
router.patch('/settings/keyword-triggers/:id', authMiddleware, settingsController.updateKeywordTrigger);
router.delete('/settings/keyword-triggers/:id', authMiddleware, settingsController.deleteKeywordTrigger);

router.get('/settings/fallback-message', authMiddleware, settingsController.getFallbackMessage);
router.put('/settings/fallback-message', authMiddleware, settingsController.updateFallbackMessage);

router.get('/settings/bot-status', authMiddleware, settingsController.getBotStatus);
router.put('/settings/bot-status', authMiddleware, settingsController.updateBotStatus);

// Contacts module (protected)
router.get('/contacts', authMiddleware, contactsController.listContacts);
router.post('/contacts', authMiddleware, contactsController.createContact);
router.patch('/contacts/:id', authMiddleware, contactsController.updateContact);
router.delete('/contacts/:id', authMiddleware, contactsController.deleteContact);

router.get('/contacts/notes', authMiddleware, contactsController.listContactNotes);
router.post('/contacts/notes', authMiddleware, contactsController.createContactNote);
router.delete('/contacts/notes/:id', authMiddleware, contactsController.deleteContactNote);

router.get('/contacts/segments', authMiddleware, contactsController.listContactSegments);
router.post('/contacts/segments', authMiddleware, contactsController.createContactSegment);
router.patch('/contacts/segments/:id', authMiddleware, contactsController.updateContactSegment);
router.delete('/contacts/segments/:id', authMiddleware, contactsController.deleteContactSegment);

router.get('/contacts/tags', authMiddleware, contactsController.listContactTags);
router.post('/contacts/tags', authMiddleware, contactsController.createContactTag);
router.patch('/contacts/tags/:id', authMiddleware, contactsController.updateContactTag);
router.delete('/contacts/tags/:id', authMiddleware, contactsController.deleteContactTag);

// Campaigns + Facebook integration (protected)
router.get('/campaigns', authMiddleware, campaignsController.listCampaigns);
router.get('/campaigns/:id', authMiddleware, campaignsController.getCampaignDetails);
router.get('/campaigns/:id/breakdowns', authMiddleware, campaignsController.getCampaignBreakdown);
router.post('/campaigns/sync', authMiddleware, campaignsController.syncCampaigns);
router.get('/integrations/facebook/status', authMiddleware, campaignsController.getFacebookStatus);
router.put('/integrations/facebook/connection', authMiddleware, campaignsController.saveFacebookConnection);

// Dashboard analytics (protected)
router.get('/analytics/overview', authMiddleware, analyticsController.getOverview);
router.get('/analytics/activity', authMiddleware, analyticsController.getActivity);
router.get('/analytics/performance', authMiddleware, analyticsController.getPerformance);
router.get('/analytics/conversation-trends', authMiddleware, analyticsController.getConversationTrends);
router.get('/analytics/hot-lead-trends', authMiddleware, analyticsController.getHotLeadTrends);
router.get('/analytics/bot-performance', authMiddleware, analyticsController.getBotPerformance);
router.get('/analytics/agent-performance', authMiddleware, analyticsController.getAgentPerformance);
router.get('/analytics/response-time', authMiddleware, analyticsController.getResponseTime);

module.exports = router;
