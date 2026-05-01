const Joi = require("joi");
const Player = require("../models/Player");
const Academy = require("../models/Academy");
const {
  PLAYER_POSITION_VALUES,
  AVAILABILITY_STATUSES,
} = require("../utils/profile.constants");

const profileUpdateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  dateOfBirth: Joi.date().iso(),
  primaryPosition: Joi.string().valid(...PLAYER_POSITION_VALUES),
  secondaryPosition: Joi.string().valid(...PLAYER_POSITION_VALUES, ""),
  preferredFoot: Joi.string().valid("left", "right", "both"),
  jerseyNumber: Joi.number().integer().min(1).max(99),
  clubHistory: Joi.array().items(
    Joi.object({
      clubName: Joi.string().trim().min(1).max(120).required(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().allow(null),
    }),
  ),
  playingStyleTags: Joi.array().items(Joi.string().trim().min(1).max(50)),
  technicalStrengths: Joi.string().trim().max(4000).allow(""),
  technicalWeaknesses: Joi.string().trim().max(4000).allow(""),
  availabilityStatus: Joi.string().valid(...AVAILABILITY_STATUSES),
  birthCertificateUrl: Joi.string().uri().allow(""),
  passportUrl: Joi.string().uri().allow(""),
  isAgeVerified: Joi.boolean(),
  isVerified: Joi.boolean(),
  disciplinaryRecord: Joi.object({
    yellowCards: Joi.number().integer().min(0),
    redCards: Joi.number().integer().min(0),
    notes: Joi.string().trim().max(1000).allow(""),
  }),
})
  .min(1)
  .unknown(false);

const normalizeProfilePayload = (body) => ({
  fullName: body.fullName,
  dateOfBirth: body.dateOfBirth,
  primaryPosition:
    body.primaryPosition ?? body.primary_position ?? body.position,
  secondaryPosition: body.secondaryPosition ?? body.secondary_position,
  preferredFoot: body.preferredFoot ?? body.preferred_foot ?? body.strongFoot,
  jerseyNumber: body.jerseyNumber ?? body.jersey_no,
  clubHistory: body.clubHistory ?? body.club_history,
  playingStyleTags: body.playingStyleTags ?? body.playing_style_tags,
  technicalStrengths: body.technicalStrengths ?? body.technical_strengths,
  technicalWeaknesses: body.technicalWeaknesses ?? body.technical_weaknesses,
  availabilityStatus: body.availabilityStatus ?? body.availability_status,
  birthCertificateUrl: body.birthCertificateUrl ?? body.birth_certificate_url,
  passportUrl: body.passportUrl ?? body.passport_url,
  isAgeVerified: body.isAgeVerified ?? body.is_age_verified,
  isVerified: body.isVerified ?? body.is_verified,
  disciplinaryRecord: body.disciplinaryRecord ?? body.disciplinary_record,
});

const updateProfile = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player profile not found",
      });
    }

    const academy =
      req.user.role === "academy"
        ? await Academy.findOne({ user: req.user._id })
        : null;

    const isAdmin = req.user.role === "admin";
    const isPlayerOwner =
      req.user.role === "player" &&
      player.user &&
      player.user.toString() === req.user._id.toString();
    const isSameAcademy =
      academy &&
      player.academy &&
      player.academy.toString() === academy._id.toString();
    const isAcademyRep =
      req.user.role === "academy" && req.user.isAcademyRep && isSameAcademy;

    if (!isAdmin && !isPlayerOwner && !isSameAcademy) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    const normalizedPayload = normalizeProfilePayload(req.body);
    const { error, value } = profileUpdateSchema.validate(normalizedPayload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const restrictedFieldsRequested =
      value.isVerified !== undefined || value.disciplinaryRecord !== undefined;

    if (restrictedFieldsRequested && !(isAdmin || isAcademyRep)) {
      return res.status(403).json({
        success: false,
        message:
          "Only an admin or academy rep can update verification or disciplinary record fields",
      });
    }

    if (value.fullName !== undefined) player.fullName = value.fullName;
    if (value.dateOfBirth !== undefined) player.dateOfBirth = value.dateOfBirth;
    if (value.primaryPosition !== undefined) {
      player.primaryPosition = value.primaryPosition;
      player.position = value.primaryPosition;
    }
    if (value.secondaryPosition !== undefined)
      player.secondaryPosition = value.secondaryPosition;
    if (value.preferredFoot !== undefined)
      player.strongFoot = value.preferredFoot;
    if (value.jerseyNumber !== undefined)
      player.jerseyNumber = value.jerseyNumber;
    if (value.clubHistory !== undefined) player.clubHistory = value.clubHistory;
    if (value.playingStyleTags !== undefined)
      player.playingStyleTags = value.playingStyleTags;
    if (value.technicalStrengths !== undefined)
      player.technicalStrengths = value.technicalStrengths;
    if (value.technicalWeaknesses !== undefined)
      player.technicalWeaknesses = value.technicalWeaknesses;
    if (value.availabilityStatus !== undefined)
      player.availabilityStatus = value.availabilityStatus;
    if (value.birthCertificateUrl !== undefined)
      player.birthCertificateUrl = value.birthCertificateUrl;
    if (value.passportUrl !== undefined) player.passportUrl = value.passportUrl;
    if (value.isAgeVerified !== undefined)
      player.isAgeVerified = value.isAgeVerified;

    if (value.isVerified !== undefined) {
      player.verificationStatus = value.isVerified ? "verified" : "pending";
      if (value.isVerified) {
        player.verifiedBy = req.user._id;
        player.verifiedAt = new Date();
      }
    }

    if (value.disciplinaryRecord !== undefined) {
      player.disciplinaryRecord = {
        ...(player.disciplinaryRecord?.toObject
          ? player.disciplinaryRecord.toObject()
          : player.disciplinaryRecord || {}),
        ...value.disciplinaryRecord,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      };
    }

    await player.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: player,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  updateProfile,
};
