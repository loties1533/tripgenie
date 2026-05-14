/**
 * @fileoverview Classe d'erreur personnalisée pour TripGenie.
 * Permet de capturer le code HTTP et de savoir si l'erreur est "opérationnelle"
 * (prévisible) ou s'il s'agit d'un bug système.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Message d'erreur
   * @param {number} statusCode - Code HTTP (400, 404, 500...)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de gestion d'erreurs global pour Express.
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Mode Production : ne pas exposer les détails techniques
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Erreur inconnue (ex: crash programmation)
      console.error('❌ ERROR:', err);
      res.status(500).json({
        status: 'error',
        message: 'Une erreur interne est survenue. Réessayez plus tard.'
      });
    }
  }
};
