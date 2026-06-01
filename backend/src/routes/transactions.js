const express = require('express');
const { getAll, create, update, remove, getSummary } = require('../controllers/transactionController');
const { rolloverUser, monthlyRolloverCheck } = require('../services/monthlyRolloverService');
const { getUserId } = require('../utils/auth');

const router = express.Router();

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/summary', getSummary);

// Manual monthly rollover trigger
router.post('/rollover', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const result = await rolloverUser(userId);
    res.json({
      success: true,
      message: 'Đã chuyển đổi dữ liệu sang tháng mới',
      data: result,
    });
  } catch (err) {
    console.error('[Rollover] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;