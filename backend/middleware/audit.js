const AuditLog = require('../models/AuditLog');
const logger   = require('../config/logger');

const audit = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Log after successful response
    if (body?.success !== false && req.user) {
      AuditLog.create({
        user:       req.user._id,
        userName:   req.user.name,
        userRole:   req.user.role,
        action,
        entity,
        entityId:   body?.medicine?._id || body?.user?._id || body?.treatment?._id || req.params?.id,
        entityName: body?.medicine?.name || body?.user?.name || body?.treatment?.disease,
        ipAddress:  req.ip,
        userAgent:  req.headers['user-agent']?.slice(0, 200),
        changes:    req.method !== 'GET' ? { body: req.body } : undefined,
      }).catch(err => logger.error('Audit log failed', { error: err.message }));
    }
    return originalJson(body);
  };

  next();
};

module.exports = audit;
