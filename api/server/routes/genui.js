const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { getGenUi, getGenUiCatalog } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);

router.get('/catalog', async (req, res) => {
  try {
    res.json(await getGenUiCatalog(db));
  } catch (error) {
    logger.error('[genui] catalog failed', error);
    res.status(500).json({ message: 'Could not load the catalog' });
  }
});

router.post('/:messageId', async (req, res) => {
  try {
    const { conversationId, run } = req.body ?? {};
    const result = await getGenUi(db, {
      user: req.user.id,
      messageId: req.params.messageId,
      conversationId: typeof conversationId === 'string' ? conversationId : undefined,
      run: run === true,
    });
    res.json(result);
  } catch (error) {
    logger.error('[genui] request failed', error);
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;
