const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { DEFAULT_EMBED_WIDGET_SETTINGS, SystemRoles } = require('librechat-data-provider');

jest.mock('@librechat/data-schemas', () => ({
  ...jest.requireActual('@librechat/data-schemas'),
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, res, next) => next(),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn().mockResolvedValue({ paths: { uploads: '/tmp/uploads' } }),
}));

require('~/db/models');
const embedsRouter = require('../embeds');

let mongoServer;
let app;
let role = SystemRoles.ADMIN;

const ORIGIN = 'https://shop.example.com';

const createEmbed = (body = {}) =>
  request(app)
    .post('/api/embeds')
    .send({ agent_id: 'agent_1', allowedOrigins: [ORIGIN], ...body });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 'admin-1', role };
    next();
  });
  app.use('/api/embeds', embedsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  role = SystemRoles.ADMIN;
  await mongoose.connection.dropDatabase();
});

describe('embeds routes', () => {
  describe('create', () => {
    it('returns complete default settings when none are provided', async () => {
      const res = await createEmbed();
      expect(res.status).toBe(201);
      expect(res.body.settings).toEqual(DEFAULT_EMBED_WIDGET_SETTINGS);
    });

    it('normalises provided settings', async () => {
      const res = await createEmbed({
        settings: { color: '#FF0000', title: 'Help', bogus: 1, theme: 'neon' },
      });
      expect(res.status).toBe(201);
      expect(res.body.settings).toEqual({
        ...DEFAULT_EMBED_WIDGET_SETTINGS,
        color: '#ff0000',
        title: 'Help',
      });
      expect(res.body.settings.bogus).toBeUndefined();
    });

    it('rejects non-object settings', async () => {
      const res = await createEmbed({ settings: 'nope' });
      expect(res.status).toBe(400);
    });

    it('rejects non-admins', async () => {
      role = SystemRoles.USER;
      const res = await createEmbed();
      expect(res.status).toBe(403);
    });
  });

  describe('patch', () => {
    it('merges partial settings over stored settings and normalises', async () => {
      const { body: created } = await createEmbed({
        settings: { title: 'Keep', color: '#00ff00' },
      });
      const res = await request(app)
        .patch(`/api/embeds/${created.embedId}`)
        .send({
          settings: {
            color: 'red',
            subtitle: 'Hi',
            starters: ['a', 'b', 'c', 'd', 'e', 'f'],
            junk: true,
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.settings.title).toBe('Keep');
      expect(res.body.settings.color).toBe(DEFAULT_EMBED_WIDGET_SETTINGS.color);
      expect(res.body.settings.subtitle).toBe('Hi');
      expect(res.body.settings.starters).toEqual(['a', 'b', 'c', 'd']);
      expect(res.body.settings.junk).toBeUndefined();
      expect(res.body.allowedOrigins).toEqual([ORIGIN]);
    });

    it('updates allowedOrigins without touching settings', async () => {
      const { body: created } = await createEmbed({ settings: { title: 'Keep' } });
      const res = await request(app)
        .patch(`/api/embeds/${created.embedId}`)
        .send({ allowedOrigins: ['https://other.example.com/path'] });
      expect(res.status).toBe(200);
      expect(res.body.allowedOrigins).toEqual(['https://other.example.com']);
      expect(res.body.settings.title).toBe('Keep');
    });

    it('requires allowedOrigins or settings', async () => {
      const { body: created } = await createEmbed();
      const res = await request(app).patch(`/api/embeds/${created.embedId}`).send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown embeds', async () => {
      const res = await request(app).patch('/api/embeds/missing').send({ settings: {} });
      expect(res.status).toBe(404);
    });

    it('list includes normalised settings', async () => {
      const { body: created } = await createEmbed({ settings: { title: 'Listed' } });
      await mongoose.models.EmbedWidgetLink.updateOne(
        { embedId: created.embedId },
        { $set: { settings: { color: 'bad' } } },
      );
      const res = await request(app).get('/api/embeds').query({ agent_id: 'agent_1' });
      expect(res.status).toBe(200);
      expect(res.body.widgets[0].settings).toEqual(DEFAULT_EMBED_WIDGET_SETTINGS);
    });
  });

  describe('public endpoints', () => {
    let embedId;

    beforeEach(async () => {
      role = SystemRoles.USER;
      const doc = await mongoose.models.EmbedWidgetLink.create({
        embedId: 'pub_1',
        agentId: 'agent_1',
        allowedOrigins: [ORIGIN],
        user: 'admin-1',
        tenantId: 'tenant-secret',
        settings: { title: 'Public', color: '#123456' },
      });
      embedId = doc.embedId;
    });

    it('iframe config exposes agentId, iconUrl and settings only', async () => {
      const res = await request(app).get(`/api/embeds/${embedId}`);
      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['agentId', 'iconUrl', 'settings']);
      expect(res.body.settings.title).toBe('Public');
      expect(res.body.settings.color).toBe('#123456');
      expect(res.headers['cache-control']).toBe('no-cache');
    });

    it('launcher exposes iconUrl and settings only, with no-cache', async () => {
      const res = await request(app).get(`/api/embeds/${embedId}/launcher`);
      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['iconUrl', 'settings']);
      expect(JSON.stringify(res.body)).not.toContain(ORIGIN);
      expect(res.headers['cache-control']).toBe('no-cache');
    });

    it('returns 404 for unknown embeds', async () => {
      const res = await request(app).get('/api/embeds/nope/launcher');
      expect(res.status).toBe(404);
    });
  });

  describe('buildFrameAncestors', () => {
    it("always includes 'self' and the allow-list", () => {
      expect(embedsRouter.buildFrameAncestors([ORIGIN, 'https://b.com'])).toBe(
        `'self' ${ORIGIN} https://b.com`,
      );
      expect(embedsRouter.buildFrameAncestors([])).toBe("'self'");
      expect(embedsRouter.buildFrameAncestors(undefined)).toBe("'self'");
    });
  });
});
