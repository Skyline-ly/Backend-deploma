
export const JSCatch=(err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid JSON payload format. Check for trailing commas.' 
    });
  }
  next();
};
