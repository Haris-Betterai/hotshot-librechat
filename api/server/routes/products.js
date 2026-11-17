const express = require('express');
const { isStaffUser, getCatalogHandler, pinProductHandler } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');
const { isStaffMember } = require('~/models');

const router = express.Router();

const requireStaff = async (req, res, next) => {
  if (await isStaffUser(req.user, isStaffMember)) {
    return next();
  }
  return res.status(403).json({ error: 'Staff only' });
};

router.use(requireJwtAuth, requireStaff);
router.get('/', getCatalogHandler);
router.put('/pin', pinProductHandler);

module.exports = router;
