const cookies = require('cookie');
const jwt = require('jsonwebtoken');
const openIdClient = require('openid-client');
const { logger, activeExpirationFilter, runAsSystem, getTenantId } = require('@librechat/data-schemas');
const mongoose = require('mongoose');
const {
  math,
  isEnabled,
  createGuestUser,
  findOpenIDUser,
  getOpenIdIssuer,
  shouldUseSecureCookie,
  buildOpenIDRefreshParams,
} = require('@librechat/api');
const {
  requestPasswordReset,
  setOpenIDAuthTokens,
  setCloudFrontAuthCookies,
  resetPassword,
  setAuthTokens,
  registerUser,
} = require('~/server/services/AuthService');
const {
  deleteAllUserSessions,
  getUserById,
  findSession,
  updateUser,
  findUser,
  createUser,
} = require('~/models');
const { getGraphApiToken } = require('~/server/services/GraphTokenService');
const { getAppConfig } = require('~/server/services/Config');
const { getOpenIdConfig, getOpenIdEmail } = require('~/strategies');

const AUTH_REFRESH_USER_PROJECTION = '-password -__v -totpSecret -backupCodes -federatedTokens';
const FAILED_REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
};

const clearFailedRefreshCookies = (res) => {
  const options = {
    ...FAILED_REFRESH_COOKIE_OPTIONS,
    secure: shouldUseSecureCookie(),
  };
  res.clearCookie('refreshToken', options);
  res.clearCookie('token_provider', options);
};
const OPENID_REUSE_EXPIRY_BUFFER_SECONDS = 30;
/**
 * Max age (ms) LibreChat reuses a cached OpenID session token before forcing an IdP refresh.
 * Env-overridable (accepts an arithmetic expression, e.g. `60 * 60 * 24 * 1000`, like
 * `SESSION_EXPIRY`): deployments whose IdP revokes the previous access token on refresh can
 * widen this to the access-token lifetime so a still-valid token is not rotated/revoked out
 * from under downstream consumers (e.g. MCP servers that introspect the bearer). Defaults to
 * 15 minutes.
 */
const OPENID_REUSE_MAX_SESSION_AGE_MS = math(
  process.env.OPENID_REUSE_MAX_SESSION_AGE_MS,
  15 * 60 * 1000,
);

const registrationController = async (req, res) => {
  try {
    const response = await registerUser(req.body);
    const { status, message } = response;
    res.status(status).send({ message });
  } catch (err) {
    logger.error('[registrationController]', err);
    return res.status(500).json({ message: err.message });
  }
};

const guestController = async (req, res) => {
  if (!isEnabled(process.env.PUBLIC_GUEST_MODE)) {
    return res.sendStatus(404);
  }

  try {
    const appConfig = await getAppConfig();
    const user = await createUser(createGuestUser(), appConfig?.balance, false, true);
    const token = await setAuthTokens(user._id, res, null, req);
    return res.status(200).send({ token, user: sanitizeUserForAuthResponse(user) });
  } catch (err) {
    logger.error('[guestController]', err);
    return res.status(500).json({ message: 'Unable to start a guest session' });
  }
};

const sanitizeUserForAuthResponse = (user) => {
  const source = (typeof user?.toObject === 'function' ? user.toObject() : user) || {};
  const {
    password: _pw,
    __v: _v,
    totpSecret: _ts,
    backupCodes: _bc,
    federatedTokens: _ft,
    ...safeUser
  } = source;
  return safeUser;
};

const getValidOpenIDReuseUserId = (parsedCookies) => {
  const openidUserId = parsedCookies.openid_user_id;
  if (!openidUserId || !process.env.JWT_REFRESH_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(openidUserId, process.env.JWT_REFRESH_SECRET);
    return typeof payload === 'object' && payload != null && typeof payload.id === 'string'
      ? payload.id
      : null;
  } catch {
    return null;
  }
};

const isRecentOpenIDSessionRefresh = (openidTokens) => {
  const lastRefreshedAt = Number(openidTokens?.lastRefreshedAt);
  const elapsed = Date.now() - lastRefreshedAt;
  return (
    Number.isFinite(lastRefreshedAt) && elapsed >= 0 && elapsed <= OPENID_REUSE_MAX_SESSION_AGE_MS
  );
};

const getReusableOpenIDSessionToken = (openidTokens) => {
  if (!isRecentOpenIDSessionRefresh(openidTokens)) {
    return null;
  }

  const candidates = [
    { token: openidTokens?.idToken, type: 'id_token' },
    { token: openidTokens?.accessToken, type: 'access_token' },
  ];
  const now = Math.floor(Date.now() / 1000);

  for (const candidate of candidates) {
    if (!candidate.token) {
      continue;
    }
    /** Decode only: tokens are from the trusted server-side session; expiry gates reuse. */
    const decoded = jwt.decode(candidate.token);
    if (
      decoded &&
      typeof decoded === 'object' &&
      decoded.exp > now + OPENID_REUSE_EXPIRY_BUFFER_SECONDS
    ) {
      return candidate;
    }
  }

  return null;
};

const resetPasswordRequestController = async (req, res) => {
  try {
    const resetService = await requestPasswordReset(req);
    if (resetService instanceof Error) {
      return res.status(400).json(resetService);
    } else {
      return res.status(200).json(resetService);
    }
  } catch (e) {
    logger.error('[resetPasswordRequestController]', e);
    return res.status(400).json({ message: e.message });
  }
};

const resetPasswordController = async (req, res) => {
  try {
    const resetPasswordService = await resetPassword(
      req.body.userId,
      req.body.token,
      req.body.password,
    );
    if (resetPasswordService instanceof Error) {
      return res.status(400).json(resetPasswordService);
    } else {
      await deleteAllUserSessions({ userId: req.body.userId });
      return res.status(200).json(resetPasswordService);
    }
  } catch (e) {
    logger.error('[resetPasswordController]', e);
    return res.status(400).json({ message: e.message });
  }
};

const refreshController = async (req, res) => {
  const parsedCookies = req.headers.cookie ? cookies.parse(req.headers.cookie) : {};
  const token_provider = parsedCookies.token_provider;

  if (token_provider === 'openid' && isEnabled(process.env.OPENID_REUSE_TOKENS)) {
    /** For OpenID users, read refresh token from session to avoid large cookie issues */
    const refreshToken = req.session?.openidTokens?.refreshToken || parsedCookies.refreshToken;

    if (!refreshToken) {
      return res.status(200).send('Refresh token not provided');
    }

    try {
      /**
       * Reuse skips an IdP refresh only for recently-refreshed server-side tokens.
       * Stale, missing, or near-expiry tokens fall through to refreshTokenGrant so
       * upstream revocations and cookie/session extension are checked regularly.
       */
      const reusableSessionToken = getReusableOpenIDSessionToken(req.session?.openidTokens);
      const reuseUserId = reusableSessionToken ? getValidOpenIDReuseUserId(parsedCookies) : null;
      if (reuseUserId) {
        const user = await getUserById(reuseUserId, AUTH_REFRESH_USER_PROJECTION);
        if (user) {
          const cloudFrontCookiesSet = setCloudFrontAuthCookies(req, res, user);
          logger.debug('[refreshController] OpenID session token reused', {
            token_type: reusableSessionToken.type,
            has_id_token: Boolean(req.session?.openidTokens?.idToken),
            has_access_token: Boolean(req.session?.openidTokens?.accessToken),
            cloudfront_cookies_set: cloudFrontCookiesSet,
          });
          return res.status(200).send({
            token: reusableSessionToken.token,
            user: sanitizeUserForAuthResponse(user),
          });
        }
      }

      const openIdConfig = getOpenIdConfig();
      const refreshParams = buildOpenIDRefreshParams();
      logger.debug('[refreshController] OpenID refresh params', {
        has_scope: Boolean(process.env.OPENID_SCOPE),
        has_refresh_audience: Boolean(process.env.OPENID_REFRESH_AUDIENCE),
      });
      const tokenset = await openIdClient.refreshTokenGrant(
        openIdConfig,
        refreshToken,
        refreshParams,
      );
      logger.debug('[refreshController] OpenID refresh succeeded', {
        has_access_token: Boolean(tokenset.access_token),
        has_id_token: Boolean(tokenset.id_token),
        has_refresh_token: Boolean(tokenset.refresh_token),
        expires_in: tokenset.expires_in,
      });
      const claims = tokenset.claims();
      const openidIssuer = getOpenIdIssuer(claims, openIdConfig);
      const { user, error, migration } = await findOpenIDUser({
        findUser,
        email: getOpenIdEmail(claims),
        openidId: claims.sub,
        openidIssuer,
        idOnTheSource: claims.oid,
        strategyName: 'refreshController',
      });

      logger.debug(
        `[refreshController] findOpenIDUser result: user=${user?.email ?? 'null'}, error=${error ?? 'null'}, migration=${migration}, userOpenidId=${user?.openidId ?? 'null'}, claimsSub=${claims.sub}`,
      );

      if (error || !user) {
        logger.warn(
          `[refreshController] Redirecting to /login: error=${error ?? 'null'}, user=${user ? 'exists' : 'null'}`,
        );
        clearFailedRefreshCookies(res);
        return res.status(401).redirect('/login');
      }

      // Handle migration: update user with openidId if found by email without openidId
      // Also handle case where user has mismatched openidId (e.g., after database switch)
      if (migration || user.openidId !== claims.sub) {
        const reason = migration ? 'migration' : 'openidId mismatch';
        await updateUser(user._id.toString(), {
          provider: 'openid',
          openidId: claims.sub,
          ...(openidIssuer ? { openidIssuer } : {}),
        });
        logger.info(
          `[refreshController] Updated user ${user.email} openidId (${reason}): ${user.openidId ?? 'null'} -> ${claims.sub}`,
        );
      }

      const token = setOpenIDAuthTokens(tokenset, req, res, {
        userId: user._id.toString(),
        existingRefreshToken: refreshToken,
        tenantId: user.tenantId,
      });

      return res.status(200).send({ token, user: sanitizeUserForAuthResponse(user) });
    } catch (error) {
      logger.error('[refreshController] OpenID token refresh error', error);
      clearFailedRefreshCookies(res);
      return res.status(403).send('Invalid OpenID refresh token');
    }
  }

  /** For non-OpenID users, read refresh token from cookies */
  const refreshToken = parsedCookies.refreshToken;
  if (!refreshToken) {
    return res.status(200).send('Refresh token not provided');
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await getUserById(payload.id, AUTH_REFRESH_USER_PROJECTION);
    if (!user) {
      clearFailedRefreshCookies(res);
      return res.status(401).redirect('/login');
    }

    const userId = payload.id;

    if (process.env.NODE_ENV === 'CI') {
      const token = await setAuthTokens(userId, res, null, req);
      return res.status(200).send({ token, user: sanitizeUserForAuthResponse(user) });
    }

    /** Session with the hashed refresh token */
    const session = await findSession(
      {
        userId: userId,
        refreshToken: refreshToken,
      },
      { lean: false },
    );

    if (session && session.expiration > new Date()) {
      const token = await setAuthTokens(userId, res, session, req);

      res.status(200).send({ token, user: sanitizeUserForAuthResponse(user) });
    } else if (req?.query?.retry) {
      clearFailedRefreshCookies(res);
      res.status(403).send('No session found');
    } else if (payload.exp < Date.now() / 1000) {
      clearFailedRefreshCookies(res);
      res.status(403).redirect('/login');
    } else {
      clearFailedRefreshCookies(res);
      res.status(401).send('Refresh token expired or not found for this user');
    }
  } catch (err) {
    logger.error(`[refreshController] Invalid refresh token:`, err);
    clearFailedRefreshCookies(res);
    res.status(403).send('Invalid refresh token');
  }
};

const graphTokenController = async (req, res) => {
  try {
    // Validate user is authenticated via Entra ID
    if (!req.user.openidId || req.user.provider !== 'openid') {
      return res.status(403).json({
        message: 'Microsoft Graph access requires Entra ID authentication',
      });
    }

    // Check if OpenID token reuse is active (required for on-behalf-of flow)
    if (!isEnabled(process.env.OPENID_REUSE_TOKENS)) {
      return res.status(403).json({
        message: 'SharePoint integration requires OpenID token reuse to be enabled',
      });
    }

    const scopes = req.query.scopes;
    if (!scopes) {
      return res.status(400).json({
        message: 'Graph API scopes are required as query parameter',
      });
    }

    const accessToken = req.user.federatedTokens?.access_token;
    if (!accessToken) {
      return res.status(401).json({
        message: 'No federated access token available for token exchange',
      });
    }

    const tokenResponse = await getGraphApiToken(req.user, accessToken, scopes);

    res.json(tokenResponse);
  } catch (error) {
    logger.error('[graphTokenController] Failed to obtain Graph API token:', error);
    res.status(500).json({
      message: 'Failed to obtain Microsoft Graph token',
    });
  }
};

/**
 * Initialize an "authorized embed" guest session. Unlike PUBLIC_GUEST_MODE,
 * this is gated by an admin-generated embedId (the allowed embed sites are
 * enforced via CSP `frame-ancestors` on the `/embed/:embedId` document).
 */
const guestEmbedController = async (req, res) => {
  const { embedId } = req.params;

  if (!embedId) {
    return res.status(400).json({ message: 'Missing embedId' });
  }

  const EmbedWidgetLink = mongoose.models.EmbedWidgetLink;
  const viewerTenantId = getTenantId();

  const findEmbed = async () =>
    (await EmbedWidgetLink.findOne({ embedId, ...activeExpirationFilter() }).lean()) ?? null;

  // Resolve within the viewer tenant first, then broaden to system scope so
  // a share owned by another tenant can still resolve (authorization remains
  // gated by allowedOrigins below).
  let rawEmbed = viewerTenantId ? await findEmbed() : await runAsSystem(findEmbed);
  if (!rawEmbed && viewerTenantId) {
    rawEmbed = await runAsSystem(findEmbed);
  }

  if (!rawEmbed) {
    return res.status(404).json({ message: 'Embed not found' });
  }

  /**
   * Security: the browser doesn't reliably provide the embedding site's
   * origin to an iframe's same-origin API calls. Instead, we use
   * `Sec-Fetch-Site` to reject direct cross-site calls to this endpoint.
   *
   * - Requests coming from an embedded iframe to the same origin typically
   *   report `same-origin`.
   * - A caller from a random external site calling this API directly reports
   *   `cross-site` and is rejected.
   */
  const secFetchSite = req.headers['sec-fetch-site'];
  if (typeof secFetchSite === 'string' && secFetchSite.toLowerCase() === 'cross-site') {
    return res.status(403).json({ message: 'Cross-site embed initialization is forbidden' });
  }

  try {
    const appConfig = await getAppConfig();
    const user = await createUser(createGuestUser(), appConfig?.balance, false, true);
    const token = await setAuthTokens(user._id, res, null, req);

    return res.status(200).send({
      token,
      user: sanitizeUserForAuthResponse(user),
      agent_id: rawEmbed.agentId,
    });
  } catch (err) {
    logger.error('[guestEmbedController]', err);
    return res.status(500).json({ message: 'Unable to start an embed guest session' });
  }
};

module.exports = {
  guestController,
  guestEmbedController,
  refreshController,
  registrationController,
  resetPasswordController,
  resetPasswordRequestController,
  graphTokenController,
};
