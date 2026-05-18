import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  ADMIN_USERNAME: Joi.string().required(),
  ADMIN_PASSWORD: Joi.string().min(6).required(),
  ADMIN_FULL_NAME: Joi.string().required(),
});
