const express = require('express');
const {
  listQuestionsHandler,
  listFeedbackHandler,
  submitFeedbackHandler,
} = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');
const checkAdmin = require('~/server/middleware/roles/admin');

const router = express.Router();

router.use(requireJwtAuth);
router.post('/feedback', submitFeedbackHandler);
router.get('/feedback', checkAdmin, listFeedbackHandler);
router.get('/questions', checkAdmin, listQuestionsHandler);

module.exports = router;
