const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const config = require('../config');
const { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');

async function register({ email, password, companyName }) {
  const existing = await Partner.findOne({ email });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const partner = await Partner.create({ email, passwordHash, companyName });

  // Auto-create an empty showroom for the new partner
  await Showroom.create({ partner: partner._id });

  const token = signToken(partner);

  return {
    token,
    partner: formatPartner(partner),
  };
}

async function login({ email, password }) {
  const partner = await Partner.findOne({ email });
  if (!partner) {
    throw new UnauthorizedError();
  }

  const valid = await bcrypt.compare(password, partner.passwordHash);
  if (!valid) {
    throw new UnauthorizedError();
  }

  if (!partner.isActive) {
    throw new ForbiddenError('Account is deactivated');
  }

  const token = signToken(partner);

  return {
    token,
    partner: formatPartner(partner),
  };
}

async function getProfile(partnerId) {
  const partner = await Partner.findById(partnerId).select('-passwordHash');
  if (!partner) {
    throw new NotFoundError('Partner');
  }
  return { partner };
}

async function updateProfile(partnerId, updates) {
  const allowed = {};
  if (updates.companyName !== undefined) allowed.companyName = updates.companyName;
  if (updates.email !== undefined) {
    // Check uniqueness
    const existing = await Partner.findOne({ email: updates.email, _id: { $ne: partnerId } });
    if (existing) {
      throw new ConflictError('Email already in use');
    }
    allowed.email = updates.email;
  }

  const partner = await Partner.findByIdAndUpdate(partnerId, allowed, { new: true }).select('-passwordHash');
  if (!partner) {
    throw new NotFoundError('Partner');
  }
  return { partner };
}

async function changePassword(partnerId, { currentPassword, newPassword }) {
  const partner = await Partner.findById(partnerId);
  if (!partner) {
    throw new NotFoundError('Partner');
  }

  const valid = await bcrypt.compare(currentPassword, partner.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  partner.passwordHash = await bcrypt.hash(newPassword, 12);
  await partner.save();

  return { message: 'Password updated successfully' };
}

function signToken(partner) {
  return jwt.sign(
    { id: partner._id, email: partner.email, companyName: partner.companyName, role: partner.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function formatPartner(partner) {
  return {
    id: partner._id,
    email: partner.email,
    companyName: partner.companyName,
    role: partner.role,
    createdAt: partner.createdAt,
  };
}

module.exports = { register, login, getProfile, updateProfile, changePassword };
