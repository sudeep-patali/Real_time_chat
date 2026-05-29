exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = req.protocol + '://' + req.get('host')
                + '/uploads/' + req.file.filename;
    res.json({ url });
  } catch (err) { next(err); }
};