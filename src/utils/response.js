function success(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

function created(res, data) {
  return success(res, data, 201);
}

function error(res, message, statusCode = 500) {
  return res.status(statusCode).json({ error: message });
}

module.exports = { success, created, error };
