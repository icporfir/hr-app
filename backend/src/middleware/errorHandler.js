// =====================================================
// Middleware pentru gestionarea centralizată a erorilor
// Orice eroare aruncată cu next(err) ajunge aici
// =====================================================

export const errorHandler = (err, req, res, next) => {
  console.error('[EROARE]', err.stack);

  // Eroare Prisma — cod specific
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Această valoare există deja (duplicat).',
    });
  }

  // Eroare JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalid.',
    });
  }

  // Eroare validare (vom adăuga mai târziu)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Eroare generică
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Eroare internă de server.',
    // În dezvoltare, trimitem și stack-ul
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Handler pentru rute inexistente (404)
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} nu a fost găsită.`,
  });
};