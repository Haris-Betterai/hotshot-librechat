const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { requireJwtAuth } = require('~/server/middleware');
const checkAdmin = require('~/server/middleware/roles/admin');
const { logger, runAsSystem, activeExpirationFilter } = require('@librechat/data-schemas');
const { getAppConfig } = require('~/server/services/Config');

const router = express.Router();

const ICON_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const iconUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ICON_TYPES[file.mimetype]) {
      cb(new Error('Icon must be PNG, JPEG, WebP, or GIF'));
      return;
    }
    cb(null, true);
  },
});

const parseOrigins = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((v) => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
};

const normalizeOrigins = (origins) => {
  const normalizedOrigins = [];
  for (const origin of origins) {
    const parsed = new URL(origin);
    normalizedOrigins.push(parsed.origin);
  }
  return [...new Set(normalizedOrigins)];
};

const isSafeEmbedId = (embedId) => typeof embedId === 'string' && /^[A-Za-z0-9_-]+$/.test(embedId);

const embedDir = (uploadsRoot, embedId) => path.join(uploadsRoot, 'embeds', embedId);

const iconFilePath = (uploadsRoot, embedId, iconExt) =>
  path.join(embedDir(uploadsRoot, embedId), `icon.${iconExt}`);

const publicIconUrl = (embedId, iconExt) =>
  iconExt ? `/api/embeds/${encodeURIComponent(embedId)}/icon` : undefined;

const serializeWidget = (req, doc) => {
  const proto =
    typeof req.headers['x-forwarded-proto'] === 'string'
      ? req.headers['x-forwarded-proto']
      : req.protocol;
  const host =
    typeof req.headers['x-forwarded-host'] === 'string'
      ? req.headers['x-forwarded-host']
      : req.get('host');
  const baseUrl = proto && host ? `${proto}://${host}` : '';
  const embedId = doc.embedId;
  return {
    embedId,
    agentId: doc.agentId,
    allowedOrigins: Array.isArray(doc.allowedOrigins) ? doc.allowedOrigins : [],
    iconUrl: publicIconUrl(embedId, doc.iconExt),
    embedUrl: baseUrl ? `${baseUrl}/embed/${embedId}` : undefined,
  };
};

const findEmbed = async (embedId) => {
  const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
  return (
    (await EmbedWidgetLink.findOne({ embedId, ...activeExpirationFilter() }).lean()) ?? null
  );
};

const serveLauncher = async (req, res) => {
  const { embedId } = req.params;
  if (!isSafeEmbedId(embedId)) {
    return res.status(400).json({ message: 'Invalid embedId' });
  }

  const embed = await runAsSystem(() => findEmbed(embedId));
  if (!embed) {
    return res.status(404).json({ message: 'Embed not found' });
  }

  return res.json({
    iconUrl: publicIconUrl(embedId, embed.iconExt) ?? null,
  });
};

const serveIcon = async (req, res) => {
  try {
    const { embedId } = req.params;
    if (!isSafeEmbedId(embedId)) {
      return res.status(400).end();
    }

    const embed = await runAsSystem(() => findEmbed(embedId));
    if (!embed?.iconExt) {
      return res.status(404).end();
    }

    const appConfig = await getAppConfig({ baseOnly: true });
    const filePath = iconFilePath(appConfig.paths.uploads, embedId, embed.iconExt);
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }

    res.set('Cache-Control', 'public, max-age=300');
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    logger.error('[serveEmbedIcon]', error);
    return res.status(500).end();
  }
};

const listEmbeds = async (req, res) => {
  try {
    const agentId = typeof req.query.agent_id === 'string' ? req.query.agent_id : '';
    if (!agentId) {
      return res.status(400).json({ message: 'agent_id is required' });
    }

    const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
    const widgets = await EmbedWidgetLink.find({
      agentId,
      ...activeExpirationFilter(),
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      widgets: widgets.map((doc) => serializeWidget(req, doc)),
    });
  } catch (error) {
    logger.error('[listEmbeds]', error);
    return res.status(500).json({ message: 'Unable to list embed widgets' });
  }
};

const createEmbedWidgetLinkController = async (req, res) => {
  try {
    const { agent_id: agentId, allowedOrigins, expiresAt } = req.body ?? {};

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ message: 'agent_id is required' });
    }

    let normalizedOrigins;
    try {
      normalizedOrigins = normalizeOrigins(parseOrigins(allowedOrigins));
    } catch {
      return res.status(400).json({ message: 'Invalid allowed origin' });
    }

    if (normalizedOrigins.length === 0) {
      return res.status(400).json({ message: 'allowedOrigins is required' });
    }

    let expiredDate = null;
    if (expiresAt != null) {
      const date = new Date(expiresAt);
      if (Number.isFinite(date.getTime())) {
        expiredDate = date;
      }
    }

    const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
    const existing = await EmbedWidgetLink.findOne({
      agentId,
      ...activeExpirationFilter(),
    }).sort({ updatedAt: -1 });

    if (existing) {
      const merged = [...new Set([...(existing.allowedOrigins ?? []), ...normalizedOrigins])];
      existing.allowedOrigins = merged;
      await existing.save();
      return res.status(200).json(serializeWidget(req, existing));
    }

    const created = await EmbedWidgetLink.create({
      embedId: nanoid(),
      agentId,
      allowedOrigins: normalizedOrigins,
      user: req.user?.id ?? req.user?._id?.toString?.(),
      expiredAt: expiredDate ?? undefined,
    });

    return res.status(201).json(serializeWidget(req, created));
  } catch (error) {
    logger.error('[createEmbedWidgetLinkController]', error);
    return res.status(500).json({ message: 'Unable to create embed widget link' });
  }
};

const updateEmbedWidgetLinkController = async (req, res) => {
  try {
    const { embedId } = req.params;
    if (!isSafeEmbedId(embedId)) {
      return res.status(400).json({ message: 'Invalid embedId' });
    }

    let normalizedOrigins;
    try {
      normalizedOrigins = normalizeOrigins(parseOrigins(req.body?.allowedOrigins));
    } catch {
      return res.status(400).json({ message: 'Invalid allowed origin' });
    }

    const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
    const updated = await EmbedWidgetLink.findOneAndUpdate(
      { embedId, ...activeExpirationFilter() },
      { $set: { allowedOrigins: normalizedOrigins } },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: 'Embed not found' });
    }

    return res.json(serializeWidget(req, updated));
  } catch (error) {
    logger.error('[updateEmbedWidgetLinkController]', error);
    return res.status(500).json({ message: 'Unable to update embed widget' });
  }
};

const uploadEmbedIconController = async (req, res) => {
  try {
    const { embedId } = req.params;
    if (!isSafeEmbedId(embedId)) {
      return res.status(400).json({ message: 'Invalid embedId' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Icon file is required' });
    }

    const iconExt = ICON_TYPES[req.file.mimetype];
    if (!iconExt) {
      return res.status(400).json({ message: 'Icon must be PNG, JPEG, WebP, or GIF' });
    }

    const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
    const embed = await EmbedWidgetLink.findOne({ embedId, ...activeExpirationFilter() });
    if (!embed) {
      return res.status(404).json({ message: 'Embed not found' });
    }

    const appConfig = await getAppConfig({ baseOnly: true });
    const dir = embedDir(appConfig.paths.uploads, embedId);
    fs.mkdirSync(dir, { recursive: true });
    if (embed.iconExt && embed.iconExt !== iconExt) {
      const previous = iconFilePath(appConfig.paths.uploads, embedId, embed.iconExt);
      if (fs.existsSync(previous)) {
        fs.unlinkSync(previous);
      }
    }
    fs.writeFileSync(iconFilePath(appConfig.paths.uploads, embedId, iconExt), req.file.buffer);

    embed.iconExt = iconExt;
    await embed.save();

    return res.json(serializeWidget(req, embed));
  } catch (error) {
    logger.error('[uploadEmbedIconController]', error);
    return res.status(500).json({ message: 'Unable to upload widget icon' });
  }
};

router.get('/:embedId/launcher', serveLauncher);
router.get('/:embedId/icon', serveIcon);

router.use(requireJwtAuth);
router.use(checkAdmin);
router.get('/', listEmbeds);
router.post('/', createEmbedWidgetLinkController);
router.patch('/:embedId', updateEmbedWidgetLinkController);
router.post('/:embedId/icon', (req, res, next) => {
  iconUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    return next();
  });
}, uploadEmbedIconController);

module.exports = router;
